import { Router } from "express";
import { db } from "@workspace/db";
import { users, sessions } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { randomUUID, createHash, scryptSync, randomBytes, timingSafeEqual } from "crypto";

const router = Router();

const LEGACY_SALT = "flamesafe-ops-salt-2026";
const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Legacy hash — kept so existing rows continue to log in during dual-read.
function hashLegacy(password: string): string {
  return createHash("sha256").update(password + LEGACY_SALT).digest("hex");
}

function hashScrypt(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
}

function verifyScrypt(password: string, salt: string, expected: string): boolean {
  const computed = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expectedBuf = Buffer.from(expected, "hex");
  if (computed.length !== expectedBuf.length) return false;
  return timingSafeEqual(computed, expectedBuf);
}

type SessionRecord = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  expiresAt: number;
};

// In-process cache in front of the DB-backed sessions table. Purely a latency optimisation;
// the source of truth is the `sessions` table so a process restart keeps users logged in.
const sessionCache = new Map<string, SessionRecord>();

async function loadSession(token: string): Promise<SessionRecord | null> {
  const cached = sessionCache.get(token);
  if (cached) {
    if (cached.expiresAt < Date.now()) {
      sessionCache.delete(token);
      await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
      return null;
    }
    return cached;
  }
  try {
    const [row] = await db.select().from(sessions).where(eq(sessions.token, token));
    if (!row) return null;
    const expiresAt = row.expiresAt.getTime();
    if (expiresAt < Date.now()) {
      await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
      return null;
    }
    const record: SessionRecord = {
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      role: row.role,
      expiresAt,
    };
    sessionCache.set(token, record);
    return record;
  } catch {
    return null;
  }
}

async function persistSession(token: string, record: SessionRecord): Promise<void> {
  sessionCache.set(token, record);
  await db.insert(sessions).values({
    token,
    userId: record.userId,
    username: record.username,
    displayName: record.displayName,
    role: record.role,
    expiresAt: new Date(record.expiresAt),
  }).onConflictDoNothing();
}

async function dropSession(token: string): Promise<void> {
  sessionCache.delete(token);
  await db.delete(sessions).where(eq(sessions.token, token)).catch(() => {});
}

// Best-effort periodic cleanup of expired rows. Runs once per process.
let cleanupStarted = false;
function startSessionCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  const tick = async () => {
    try {
      await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    } catch {
      // ignore — table may not exist yet on first boot before push
    }
  };
  setInterval(tick, 60 * 60 * 1000).unref?.();
  tick();
}

// Seed default users on first call.
//
// Preference order:
//   1. SEED_ADMIN_USERNAME + SEED_ADMIN_PASSWORD env vars → create a single admin.
//   2. ALLOW_LEGACY_SEED=1 (rollback path) → recreate the original three-user seed.
//   3. Otherwise → seed Casper as the default admin so a fresh deploy isn't locked out.
//      Existing rows are never touched.
let seeded = false;
async function seedUsers() {
  if (seeded) return;
  seeded = true;
  try {
    const existing = await db.select().from(users);
    if (existing.length > 0) return;

    const envUser = process.env["SEED_ADMIN_USERNAME"];
    const envPass = process.env["SEED_ADMIN_PASSWORD"];
    if (envUser && envPass) {
      const salt = randomBytes(16).toString("hex");
      await db.insert(users).values({
        id: randomUUID(),
        username: envUser.toLowerCase().trim(),
        displayName: process.env["SEED_ADMIN_DISPLAY_NAME"] || envUser,
        passwordHash: hashScrypt(envPass, salt),
        passwordAlgo: "scrypt",
        passwordSalt: salt,
        role: "admin",
        email: process.env["SEED_ADMIN_EMAIL"] || null,
        mustChangePassword: "true",
      }).onConflictDoNothing();
      console.log(`Seeded admin user '${envUser}' from environment.`);
      return;
    }

    if (process.env["ALLOW_LEGACY_SEED"] === "1") {
      console.warn("Seeding legacy default users (ALLOW_LEGACY_SEED=1). Rotate these passwords immediately.");
      const defaultUsers = [
        { id: randomUUID(), username: "casper", displayName: "Casper Tavitian", password: "Ramekin881!", role: "admin" as const, email: "casper@flamesafe.com.au", mustChangePassword: "false" },
        { id: randomUUID(), username: "jade", displayName: "Jade Ogony", password: "FlameSafe2026!", role: "manager" as const, email: "jade.ogony@flamesafe.com.au", mustChangePassword: "true" },
        { id: randomUUID(), username: "killian", displayName: "Killian Jordan", password: "OpsManager2026!", role: "manager" as const, email: "killian@flamesafe.com.au", mustChangePassword: "true" },
      ];
      for (const u of defaultUsers) {
        const salt = randomBytes(16).toString("hex");
        await db.insert(users).values({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          passwordHash: hashScrypt(u.password, salt),
          passwordAlgo: "scrypt",
          passwordSalt: salt,
          role: u.role,
          email: u.email,
          mustChangePassword: u.mustChangePassword,
        }).onConflictDoNothing();
      }
      return;
    }

    // Default bootstrap: seed Casper as admin so a fresh deploy can log in.
    const salt = randomBytes(16).toString("hex");
    await db.insert(users).values({
      id: randomUUID(),
      username: "casper",
      displayName: "Casper Tavitian",
      passwordHash: hashScrypt("Ramekin881!", salt),
      passwordAlgo: "scrypt",
      passwordSalt: salt,
      role: "admin",
      email: "casper@flamesafe.com.au",
      mustChangePassword: "false",
    }).onConflictDoNothing();
    console.log("Seeded default admin user 'casper'.");
  } catch (e) { console.error("User seeding error:", e); }
}

async function verifyAndUpgrade(user: typeof users.$inferSelect, password: string): Promise<boolean> {
  if (user.passwordAlgo === "scrypt" && user.passwordSalt) {
    return verifyScrypt(password, user.passwordSalt, user.passwordHash);
  }
  // Legacy sha256 path — verify with constant-time compare, then upgrade in place.
  const legacyHex = hashLegacy(password);
  const legacyBuf = Buffer.from(legacyHex, "hex");
  const storedBuf = Buffer.from(user.passwordHash, "hex");
  if (legacyBuf.length !== storedBuf.length || !timingSafeEqual(legacyBuf, storedBuf)) return false;
  const salt = randomBytes(16).toString("hex");
  await db.update(users)
    .set({
      passwordHash: hashScrypt(password, salt),
      passwordAlgo: "scrypt",
      passwordSalt: salt,
    })
    .where(eq(users.id, user.id));
  return true;
}

router.post("/auth/login", async (req, res) => {
  await seedUsers();
  startSessionCleanup();
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: "Username and password required" }); return; }

  const [user] = await db.select().from(users).where(eq(users.username, String(username).toLowerCase().trim()));
  if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

  const ok = await verifyAndUpgrade(user, String(password));
  if (!ok) { res.status(401).json({ error: "Invalid credentials" }); return; }

  const token = randomUUID();
  const record: SessionRecord = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  await persistSession(token, record);

  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, mustChangePassword: user.mustChangePassword === "true" },
  });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }

  const session = await loadSession(token);
  if (!session) { res.status(401).json({ error: "Session expired" }); return; }

  res.json({ id: session.userId, username: session.username, displayName: session.displayName, role: session.role });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) await dropSession(token);
  res.json({ ok: true });
});

router.post("/auth/change-password", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const session = await loadSession(token);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
  if (String(newPassword).length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) { res.status(401).json({ error: "Current password incorrect" }); return; }

  const ok = await verifyAndUpgrade(user, String(currentPassword));
  if (!ok) { res.status(401).json({ error: "Current password incorrect" }); return; }

  const salt = randomBytes(16).toString("hex");
  await db.update(users).set({
    passwordHash: hashScrypt(String(newPassword), salt),
    passwordAlgo: "scrypt",
    passwordSalt: salt,
    mustChangePassword: "false",
  }).where(eq(users.id, session.userId));
  res.json({ ok: true });
});

// Synchronous cache-only lookup for hot paths that can't wait for a DB round-trip.
// Returns null on miss; the caller falls back to "the user" etc. unchanged.
export function getSessionUser(token: string | undefined) {
  if (!token) return null;
  const t = token.replace("Bearer ", "");
  const session = sessionCache.get(t);
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

// Async version that falls through to the DB when the cache is cold (e.g. after a process restart).
export async function getSessionUserAsync(token: string | undefined): Promise<SessionRecord | null> {
  if (!token) return null;
  const t = token.replace("Bearer ", "");
  return loadSession(t);
}

// Expose a test hook so we can silence the once-per-process cleanup timer from tests.
export const __authInternals = { sessionCache, hashLegacy, hashScrypt, verifyScrypt };

export default router;

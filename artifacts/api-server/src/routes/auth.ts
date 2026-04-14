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

// Canonical bootstrap admin.
//
// Username is hardcoded so a fresh or partially-migrated deploy still
// has a working login. The PASSWORD is read from CASPER_PASSWORD env
// so it can be rotated without a code change (Pass 6 fix 1). The
// literal fallback is kept ONLY to preserve the operator's current
// deploy-day unbrick path — if/when the env is set on every known
// deploy target, the fallback should be removed.
const CASPER_USERNAME = "casper";
const CASPER_PASSWORD = process.env["CASPER_PASSWORD"] ?? "Ramekin881!";
const CASPER_DISPLAY_NAME = "Casper Tavitian";
const CASPER_EMAIL = "casper@flamesafe.com.au";

// Write casper's row to match the canonical password. Returns the row after
// the write (or null if the DB can't be reached). Safe to call on every
// login attempt — it's a single SELECT plus at most one INSERT or UPDATE.
async function upsertCasperAdmin(): Promise<typeof users.$inferSelect | null> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashScrypt(CASPER_PASSWORD, salt);
  const [existing] = await db.select().from(users).where(eq(users.username, CASPER_USERNAME));

  if (!existing) {
    const id = randomUUID();
    await db.insert(users).values({
      id,
      username: CASPER_USERNAME,
      displayName: CASPER_DISPLAY_NAME,
      passwordHash,
      passwordAlgo: "scrypt",
      passwordSalt: salt,
      role: "admin",
      email: CASPER_EMAIL,
      mustChangePassword: "false",
    }).onConflictDoNothing();
    const [inserted] = await db.select().from(users).where(eq(users.username, CASPER_USERNAME));
    console.log("[auth] casper row inserted");
    return inserted ?? null;
  }

  // Row exists. If the stored hash already verifies against the canonical
  // password, leave it alone so we don't churn the hash on every call.
  const alreadyValid =
    existing.passwordAlgo === "scrypt" &&
    !!existing.passwordSalt &&
    verifyScrypt(CASPER_PASSWORD, existing.passwordSalt, existing.passwordHash);

  if (alreadyValid) return existing;

  // Hash was generated with a different password, legacy sha256, or has a
  // missing/stale salt. Overwrite it in place with the canonical value.
  await db.update(users)
    .set({
      passwordHash,
      passwordAlgo: "scrypt",
      passwordSalt: salt,
      role: "admin",
      mustChangePassword: "false",
    })
    .where(eq(users.id, existing.id));
  const [refreshed] = await db.select().from(users).where(eq(users.id, existing.id));
  console.log("[auth] casper row reset to canonical password");
  return refreshed ?? null;
}

// Backwards-compatible name for external callers / server bootstrap.
async function ensureCasperAdmin(): Promise<void> {
  try {
    await upsertCasperAdmin();
  } catch (err) {
    console.error("[auth] ensureCasperAdmin failed:", err);
  }
}

// Seed any additional accounts requested via environment variables.
// Runs at most once per process; failures are logged and do NOT block
// subsequent login attempts (casper is handled separately and always runs).
let envSeedDone = false;
async function seedEnvUsers(): Promise<void> {
  if (envSeedDone) return;
  envSeedDone = true;
  try {
    const envUser = process.env["SEED_ADMIN_USERNAME"];
    const envPass = process.env["SEED_ADMIN_PASSWORD"];
    if (envUser && envPass && envUser.toLowerCase().trim() !== CASPER_USERNAME) {
      const [existing] = await db.select().from(users)
        .where(eq(users.username, envUser.toLowerCase().trim()));
      if (!existing) {
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
        console.log(`[auth] seeded env admin '${envUser}'`);
      }
    }

    if (process.env["ALLOW_LEGACY_SEED"] === "1") {
      const legacy = [
        { username: "jade", displayName: "Jade Ogony", password: "FlameSafe2026!", role: "manager" as const, email: "jade.ogony@flamesafe.com.au" },
        { username: "killian", displayName: "Killian Jordan", password: "OpsManager2026!", role: "manager" as const, email: "killian@flamesafe.com.au" },
      ];
      for (const u of legacy) {
        const [existing] = await db.select().from(users).where(eq(users.username, u.username));
        if (existing) continue;
        const salt = randomBytes(16).toString("hex");
        await db.insert(users).values({
          id: randomUUID(),
          username: u.username,
          displayName: u.displayName,
          passwordHash: hashScrypt(u.password, salt),
          passwordAlgo: "scrypt",
          passwordSalt: salt,
          role: u.role,
          email: u.email,
          mustChangePassword: "true",
        }).onConflictDoNothing();
      }
      console.log("[auth] legacy env seed applied");
    }
  } catch (err) {
    envSeedDone = false; // allow retry on next login
    console.error("[auth] seedEnvUsers failed:", err);
  }
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

function issueSession(user: typeof users.$inferSelect) {
  const token = randomUUID();
  const record: SessionRecord = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  return { token, record };
}

router.post("/auth/login", async (req, res) => {
  startSessionCleanup();

  const rawUsername = req.body?.username;
  const rawPassword = req.body?.password;
  if (!rawUsername || !rawPassword) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const username = String(rawUsername).toLowerCase().trim();
  const password = String(rawPassword);

  console.log(`[auth] login attempt for '${username}'`);

  // Fire-and-forget secondary seeding; never blocks the canonical path.
  seedEnvUsers().catch((err) => console.error("[auth] env seed error (non-fatal):", err));

  // Canonical casper path — self-healing. For every login as casper we
  // upsert the row with the canonical password before verifying. This means
  // the advertised credentials always work regardless of any stale state
  // left behind by earlier deploys. A stacktrace from any DB error will
  // surface in Replit logs instead of being silently swallowed.
  if (username === CASPER_USERNAME) {
    try {
      const casper = await upsertCasperAdmin();
      if (!casper) {
        console.error("[auth] upsertCasperAdmin returned null — DB unreachable?");
        res.status(500).json({ error: "Auth service unavailable. Check server logs." });
        return;
      }
      if (password !== CASPER_PASSWORD) {
        console.warn("[auth] casper login rejected — password mismatch");
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const { token, record } = issueSession(casper);
      await persistSession(token, record);
      console.log("[auth] casper login OK");
      res.json({
        token,
        user: {
          id: casper.id,
          username: casper.username,
          displayName: casper.displayName,
          role: casper.role,
          mustChangePassword: casper.mustChangePassword === "true",
        },
      });
      return;
    } catch (err) {
      console.error("[auth] casper login failed:", err);
      res.status(500).json({ error: "Auth service error. Check server logs." });
      return;
    }
  }

  // Non-casper path — standard lookup + verify.
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      console.warn(`[auth] unknown user '${username}'`);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await verifyAndUpgrade(user, password);
    if (!ok) {
      console.warn(`[auth] bad password for '${username}'`);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const { token, record } = issueSession(user);
    await persistSession(token, record);
    console.log(`[auth] '${username}' login OK`);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: user.mustChangePassword === "true",
      },
    });
  } catch (err) {
    console.error(`[auth] login error for '${username}':`, err);
    res.status(500).json({ error: "Auth service error. Check server logs." });
  }
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

export { ensureCasperAdmin, upsertCasperAdmin, seedEnvUsers };

export default router;

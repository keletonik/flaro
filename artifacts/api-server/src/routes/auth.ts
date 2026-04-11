import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";

const router = Router();

// Simple hash (not bcrypt — avoids native dependency for Replit compatibility)
function hashPassword(password: string): string {
  return createHash("sha256").update(password + "flamesafe-ops-salt-2026").digest("hex");
}

// In-memory session store (sufficient for single-instance Replit)
const sessions = new Map<string, { userId: string; username: string; displayName: string; role: string; expiresAt: number }>();

// Seed default users on first call
let seeded = false;
async function seedUsers() {
  if (seeded) return;
  seeded = true;
  try {
    const existing = await db.select().from(users);
    if (existing.length > 0) return;

    const defaultUsers = [
      { id: randomUUID(), username: "casper", displayName: "Casper Tavitian", passwordHash: hashPassword("Ramekin881!"), role: "admin" as const, email: "casper@flamesafe.com.au", mustChangePassword: "false" },
      { id: randomUUID(), username: "jade", displayName: "Jade Ogony", passwordHash: hashPassword("FlameSafe2026!"), role: "manager" as const, email: "jade.ogony@flamesafe.com.au", mustChangePassword: "true" },
      { id: randomUUID(), username: "killian", displayName: "Killian Jordan", passwordHash: hashPassword("OpsManager2026!"), role: "manager" as const, email: "killian@flamesafe.com.au", mustChangePassword: "true" },
    ];

    for (const u of defaultUsers) {
      await db.insert(users).values(u).onConflictDoNothing();
    }
  } catch (e) { console.error("User seeding error:", e); }
}

router.post("/auth/login", async (req, res) => {
  await seedUsers();
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: "Username and password required" }); return; }

  const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase().trim()));
  if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

  if (user.passwordHash !== hashPassword(password)) { res.status(401).json({ error: "Invalid credentials" }); return; }

  const token = randomUUID();
  sessions.set(token, {
    userId: user.id, username: user.username, displayName: user.displayName,
    role: user.role, expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, mustChangePassword: user.mustChangePassword === "true" },
  });
});

router.get("/auth/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  res.json({ id: session.userId, username: session.username, displayName: session.displayName, role: session.role });
});

router.post("/auth/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

router.post("/auth/change-password", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const session = sessions.get(token);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
  if (newPassword.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user || user.passwordHash !== hashPassword(currentPassword)) { res.status(401).json({ error: "Current password incorrect" }); return; }

  await db.update(users).set({ passwordHash: hashPassword(newPassword), mustChangePassword: "false" }).where(eq(users.id, session.userId));
  res.json({ ok: true });
});

// Export session lookup for other routes
export function getSessionUser(token: string | undefined) {
  if (!token) return null;
  const t = token.replace("Bearer ", "");
  const session = sessions.get(t);
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

export default router;

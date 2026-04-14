import type { Request, Response, NextFunction } from "express";
import { getSessionUser, getSessionUserAsync } from "../routes/auth";
import { logger } from "../lib/logger";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    username: string;
    displayName: string;
    role: string;
  };
}

// Paths that must always be reachable without auth, regardless of AUTH_ENFORCE.
// Everything else on /api goes through this middleware.
const ALWAYS_PUBLIC = new Set<string>([
  "/auth/login",
  "/auth/logout",
  "/auth/me",
  "/healthz",
  "/events",
  "/diag",
  "/diag/agent",
  "/diag/perf",
]);

function isPublic(req: Request): boolean {
  // `req.url` inside a router-mounted middleware is the path relative to the mount point.
  // The router is mounted at /api, and the public paths above are what routes declare.
  const path = req.url.split("?")[0];
  if (ALWAYS_PUBLIC.has(path)) return true;
  // Allow unauthenticated OPTIONS for CORS preflights regardless of flag.
  if (req.method === "OPTIONS") return true;
  return false;
}

/**
 * Authentication middleware with two modes:
 *
 *   AUTH_ENFORCE=true  → reject unauthenticated requests with 401.
 *   AUTH_ENFORCE=false → log the violation and let the request through unchanged.
 *
 * Default behaviour (Pass 6 fix 2): enforce in production, pass-through
 * in dev/test. To override, set AUTH_ENFORCE explicitly. Rollback from
 * prod enforcement is `AUTH_ENFORCE=false`.
 */
function shouldEnforceAuth(): boolean {
  const raw = process.env["AUTH_ENFORCE"];
  if (raw === "true") return true;
  if (raw === "false") return false;
  // Unset → default based on environment.
  return process.env["NODE_ENV"] === "production";
}
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isPublic(req)) {
    next();
    return;
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  let session = token ? getSessionUser(token) : null;
  if (!session && token) {
    // Cache miss (e.g. after a process restart) — fall through to the DB-backed lookup.
    session = await getSessionUserAsync(token);
  }

  const enforce = shouldEnforceAuth();

  if (!session) {
    if (enforce) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    logger.warn(
      { path: req.url.split("?")[0], method: req.method },
      "auth: unauthenticated request (AUTH_ENFORCE off)",
    );
    next();
    return;
  }

  req.auth = {
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
  };
  next();
}

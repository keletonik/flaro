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
  // Status probes — read-only, rendered on page load, never carry a
  // session cookie on mobile cold-start. Whitelisted so a missing
  // Bearer token can't flip a feature page into "disabled" state.
  "/fip/status",
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
 *   otherwise           → log the violation and let the request through.
 *
 * IMPORTANT — REGRESSION NOTE (April 2026):
 * Pass 6 fix 2 previously flipped the default to "enforce when
 * NODE_ENV=production". That silently broke the operator's Replit
 * deployment, which runs with the defaultUser bypass (no login page,
 * no frontend Bearer token). On mobile every /api/* call started
 * returning 401 and pages like /fip showed "Disabled" because the
 * frontend .catch handlers treated 401 as "feature off".
 *
 * Correct posture for THIS deployment: AUTH_ENFORCE stays opt-in.
 * The production-mode default is set by the explicit env var, not
 * inferred from NODE_ENV. When the operator decides to re-enable
 * login (proper Bearer flow), they can set AUTH_ENFORCE=true and
 * the middleware still works.
 */
function shouldEnforceAuth(): boolean {
  return process.env["AUTH_ENFORCE"] === "true";
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

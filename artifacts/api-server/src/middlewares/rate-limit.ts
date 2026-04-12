import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

type PassthroughMiddleware = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Rate limit for unauthenticated login attempts.
 *
 * Gated by RATE_LIMIT_DISABLED=1 for rollback — when set, the limiter becomes
 * a no-op middleware so deploys can fall back to the pre-patch behaviour.
 */
export function loginRateLimiter(): RateLimitRequestHandler | PassthroughMiddleware {
  if (process.env["RATE_LIMIT_DISABLED"] === "1") {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  const windowMs = Number(process.env["LOGIN_RATE_WINDOW_MS"]) || 15 * 60 * 1000;
  const max = Number(process.env["LOGIN_RATE_MAX"]) || 20;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again later." },
    // Only throttle failed+successful login posts; everything else in the router
    // is mounted outside this limiter.
    skip: (req) => req.method !== "POST",
  });
}

/**
 * Soft overall API limit. Very generous by default; exists so a runaway client
 * can't accidentally DOS a Replit instance. Rollback: RATE_LIMIT_DISABLED=1.
 */
export function apiRateLimiter(): RateLimitRequestHandler | PassthroughMiddleware {
  if (process.env["RATE_LIMIT_DISABLED"] === "1") {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  const windowMs = Number(process.env["API_RATE_WINDOW_MS"]) || 60 * 1000;
  const max = Number(process.env["API_RATE_MAX"]) || 600;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded. Please slow down." },
  });
}

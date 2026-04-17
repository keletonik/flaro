import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { addSSEClient, broadcastEvent } from "./lib/events";
import { invalidateAnalyticsCache } from "./routes/analytics";
import { requireAuth } from "./middlewares/require-auth";
import { apiRateLimiter, loginRateLimiter, visionRateLimiter } from "./middlewares/rate-limit";
import { perfMiddleware } from "./lib/perf-ring";

const app: Express = express();

// ───────────────────────────────────────────────────────────────────────────
// Security headers
// ───────────────────────────────────────────────────────────────────────────
// Helmet ships with sensible defaults. CSP is the one header that regularly
// breaks SPAs by blocking inline styles / vite runtime; disable it unless the
// operator explicitly opts in with HELMET_CSP=1. Rollback: set HELMET_DISABLED=1.
if (process.env["HELMET_DISABLED"] !== "1") {
  app.use(
    helmet({
      contentSecurityPolicy: process.env["HELMET_CSP"] === "1" ? undefined : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
}

// ───────────────────────────────────────────────────────────────────────────
// CORS
// ───────────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGIN can be a comma-separated list. If unset, we keep the previous
// wide-open behaviour so this change is a no-op until an operator configures it.
function buildCorsOptions(): CorsOptions {
  const raw = process.env["ALLOWED_ORIGIN"];
  if (!raw) return { origin: true, credentials: true };
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed`));
    },
    credentials: true,
  };
}
app.use(cors(buildCorsOptions()));

// Pass 5 §3.9 — rolling p50/p95/p99 tracker, exposed at /api/diag/perf.
app.use(perfMiddleware());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ───────────────────────────────────────────────────────────────────────────
// Body parsers
// ───────────────────────────────────────────────────────────────────────────
// Default 1 MB cap on every endpoint, with a targeted 50 MB limit mounted only
// on the anthropic message route and on /api/attachments (the new
// file-upload endpoint). Override with env. Rollback: set all to 50mb.
const defaultBodyLimit = process.env["DEFAULT_BODY_LIMIT"] || "1mb";
const chatBodyLimit = process.env["CHAT_BODY_LIMIT"] || "50mb";
const attachmentBodyLimit = process.env["ATTACHMENT_BODY_LIMIT"] || "25mb";

app.use(
  /^(?!\/api\/anthropic\/conversations\/[^\/]+\/messages$)(?!\/api\/attachments$).*/,
  express.json({ limit: defaultBodyLimit }),
);
app.use(
  "/api/anthropic/conversations/:id/messages",
  express.json({ limit: chatBodyLimit }),
);
app.use(
  "/api/attachments",
  express.json({ limit: attachmentBodyLimit }),
);
app.use(express.urlencoded({ extended: true, limit: defaultBodyLimit }));

// ───────────────────────────────────────────────────────────────────────────
// Rate limiting
// ───────────────────────────────────────────────────────────────────────────
app.use("/api/auth/login", loginRateLimiter());
// Expensive vision endpoint gets its own tight bucket so a runaway
// caller can't drain the Anthropic budget inside the global limit.
app.use("/api/fip/defect-analysis", visionRateLimiter());
app.use("/api", apiRateLimiter());

// SSE stream registered before the API router so the router 404 handler can't
// swallow it.
app.get("/api/events", (_req, res) => { addSSEClient(res); });

// Broadcast mutations + invalidate the analytics cache. MUST be installed before
// the API router so the res.json wrapper is in place when a handler responds.
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
    next();
    return;
  }
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode < 400) {
      const path = req.originalUrl.replace(/^\/api/, "");
      broadcastEvent("data_change", { path, method: req.method });
      invalidateAnalyticsCache();
    }
    return originalJson(body);
  };
  const originalEnd = res.end.bind(res);
  res.end = ((...args: any[]) => {
    if (res.statusCode < 400 && req.method === "DELETE") {
      const path = req.originalUrl.replace(/^\/api/, "");
      broadcastEvent("data_change", { path, method: req.method });
      invalidateAnalyticsCache();
    }
    return (originalEnd as any)(...args);
  }) as typeof res.end;
  next();
});

// Authentication. In AUTH_ENFORCE=true mode the middleware rejects unauthenticated
// requests with 401 (except /auth/*, /healthz, /events). Otherwise it passes
// through with a warning log, so the frontend Bearer-header change can ship
// ahead of the flag flip.
app.use("/api", requireAuth);

app.use("/api", router);

// 404 — must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — must have 4 params for Express to recognise it.
// In production (NODE_ENV=production and ERROR_VERBOSE!=1), only a generic
// message is returned to the client; the full error is still logged server-side.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  const verbose = process.env["NODE_ENV"] !== "production" || process.env["ERROR_VERBOSE"] === "1";
  const message = verbose
    ? (err instanceof Error ? err.message : "Internal server error")
    : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;

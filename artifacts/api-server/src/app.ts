import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors({
  origin: process.env.CORS_ORIGIN || true, // Restrict in production via env var
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Simple rate limiting for AI endpoints
const aiRateMap = new Map<string, { count: number; reset: number }>();
function aiRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  const now = Date.now();
  let entry = aiRateMap.get(key);
  if (!entry || now > entry.reset) { entry = { count: 0, reset: now + 60000 }; aiRateMap.set(key, entry); }
  entry.count++;
  if (entry.count > 20) { res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." }); return; }
  next();
}
app.use("/api/anthropic", aiRateLimit);
app.use("/api/chat", aiRateLimit);

app.use("/api", router);

// SSE event stream for real-time dashboard updates
import { addSSEClient, broadcastEvent } from "./lib/events";
app.get("/api/events", (req, res) => { addSSEClient(res); });

// Broadcast data changes for real-time dashboard updates
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "OPTIONS") { next(); return; }
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const path = req.originalUrl.replace("/api", "");
    if (res.statusCode < 400) {
      broadcastEvent("data_change", { path, method: req.method });
    }
    return originalJson(body);
  };
  next();
});

// 404 — must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — must have 4 params for Express to recognise it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, "Unhandled error");
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

export default app;

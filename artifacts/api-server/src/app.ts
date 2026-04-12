import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { addSSEClient, broadcastEvent } from "./lib/events";
import { invalidateAnalyticsCache } from "./routes/analytics";

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
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// SSE event stream for real-time dashboard updates.
// Registered before the API router so it isn't caught by the 404 handler.
app.get("/api/events", (req, res) => { addSSEClient(res); });

// Broadcast mutations + invalidate the analytics cache. MUST be installed before the
// API router — Express middleware runs in registration order, so wrapping res.json
// after the router is mounted never takes effect.
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
  // DELETE handlers typically use res.status(204).end() rather than res.json, so wrap end too.
  res.end = ((...args: any[]) => {
    if (res.statusCode < 400 && (req.method === "DELETE")) {
      const path = req.originalUrl.replace(/^\/api/, "");
      broadcastEvent("data_change", { path, method: req.method });
      invalidateAnalyticsCache();
    }
    return (originalEnd as any)(...args);
  }) as typeof res.end;
  next();
});

app.use("/api", router);

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

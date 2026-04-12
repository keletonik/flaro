import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// DB probe with a hard timeout so a stalled connection can't hang the Replit health check.
async function probeDatabase(timeoutMs = 1500): Promise<{ ok: true } | { ok: false; error: string }> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const probe = pool.query("SELECT 1");
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`db probe timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    await Promise.race([probe, timeout]);
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

router.get("/healthz", async (_req, res) => {
  const dbResult = await probeDatabase();
  if (!dbResult.ok) {
    res.status(503).json({ status: "degraded", db: "unavailable", error: dbResult.error });
    return;
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, db: "ok" });
});

export default router;

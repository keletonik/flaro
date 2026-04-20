/**
 * /api/agent-errors — read + acknowledge AI failure rows.
 *
 * Routes:
 *   GET   /api/agent-errors              list recent (filters: surface, severity, resolved, limit)
 *   GET   /api/agent-errors/stats        aggregate counts (last 7 days)
 *   POST  /api/agent-errors/:id/resolve  mark as resolved with optional note
 *   DELETE /api/agent-errors/:id         hard delete a row (cleanup tool)
 *
 * Read-only callers (the backoffice page) hit GET. POST/DELETE
 * are for an operator-level cleanup UI.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { agentErrorLog } from "@workspace/db";
import { and, desc, eq, gte, isNull, isNotNull, sql } from "drizzle-orm";

const router = Router();

router.get("/agent-errors", async (req, res, next) => {
  try {
    const { surface, severity, resolved } = req.query;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 500);

    const where: any[] = [];
    if (surface) where.push(eq(agentErrorLog.surface, String(surface)));
    if (severity) where.push(eq(agentErrorLog.severity, String(severity) as any));
    if (resolved === "true") where.push(isNotNull(agentErrorLog.resolvedAt));
    if (resolved === "false") where.push(isNull(agentErrorLog.resolvedAt));

    const rows = await db
      .select()
      .from(agentErrorLog)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(agentErrorLog.ts))
      .limit(limit);

    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/agent-errors/stats", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [byTotal] = await db
      .select({
        total: sql<number>`count(*)::int`,
        unresolved: sql<number>`count(*) filter (where ${agentErrorLog.resolvedAt} is null)::int`,
        critical: sql<number>`count(*) filter (where ${agentErrorLog.severity} = 'critical')::int`,
      })
      .from(agentErrorLog)
      .where(gte(agentErrorLog.ts, since));

    const bySurface = await db
      .select({
        surface: agentErrorLog.surface,
        count: sql<number>`count(*)::int`,
      })
      .from(agentErrorLog)
      .where(gte(agentErrorLog.ts, since))
      .groupBy(agentErrorLog.surface)
      .orderBy(sql`count(*) desc`);

    const byType = await db
      .select({
        errorType: agentErrorLog.errorType,
        count: sql<number>`count(*)::int`,
      })
      .from(agentErrorLog)
      .where(gte(agentErrorLog.ts, since))
      .groupBy(agentErrorLog.errorType)
      .orderBy(sql`count(*) desc`)
      .limit(20);

    res.json({
      windowDays: 7,
      total: byTotal?.total ?? 0,
      unresolved: byTotal?.unresolved ?? 0,
      critical: byTotal?.critical ?? 0,
      bySurface,
      byType,
    });
  } catch (err) { next(err); }
});

router.post("/agent-errors/:id/resolve", async (req, res, next) => {
  try {
    const note = req.body?.note ? String(req.body.note).slice(0, 500) : null;
    const [row] = await db
      .update(agentErrorLog)
      .set({ resolvedAt: new Date(), resolutionNote: note })
      .where(eq(agentErrorLog.id, req.params.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(row);
  } catch (err) { next(err); }
});

router.delete("/agent-errors/:id", async (req, res, next) => {
  try {
    await db.delete(agentErrorLog).where(eq(agentErrorLog.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

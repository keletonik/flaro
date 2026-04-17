import { Router } from "express";
import { db } from "@workspace/db";
import { changeLogs } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/change-logs", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const result = await db.select().from(changeLogs)
      .orderBy(desc(changeLogs.createdAt))
      .limit(limit);
    res.json(result.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) { next(err); }
});

router.get("/change-logs/stats", async (req, res, next) => {
  try {
    const [totals] = await db.select({
      totalImports: sql<number>`count(*)`,
      totalRows: sql<number>`coalesce(sum(${changeLogs.rowCount}), 0)`,
    }).from(changeLogs).where(eq(changeLogs.action, "import"));
    res.json({ totalImports: Number(totals.totalImports), totalRows: Number(totals.totalRows) });
  } catch (err) { next(err); }
});

export default router;

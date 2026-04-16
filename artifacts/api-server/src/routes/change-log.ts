import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/change-log", async (_req, res, next) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, batch_id, category, action, records_before, records_after,
             records_inserted, records_updated, records_unchanged,
             source_file, source_rows, summary, created_at
      FROM data_change_log
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) { next(err); }
});

router.get("/change-log/summary", async (_req, res, next) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        batch_id,
        min(created_at) as imported_at,
        json_agg(json_build_object(
          'category', category,
          'action', action,
          'source_file', source_file,
          'source_rows', source_rows,
          'records_after', records_after
        ) ORDER BY category) as categories
      FROM data_change_log
      GROUP BY batch_id
      ORDER BY min(created_at) DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) { next(err); }
});

export default router;

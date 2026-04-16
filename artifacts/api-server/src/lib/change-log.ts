import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function logDataChange(opts: {
  batchId: string;
  category: string;
  action?: string;
  recordsBefore?: number;
  recordsAfter?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  sourceFile?: string;
  sourceRows?: number;
  summary?: Record<string, unknown>;
}) {
  await db.execute(sql`
    INSERT INTO data_change_log (batch_id, category, action, records_before, records_after, records_inserted, records_updated, source_file, source_rows, summary)
    VALUES (
      ${opts.batchId},
      ${opts.category},
      ${opts.action ?? 'import'},
      ${opts.recordsBefore ?? null},
      ${opts.recordsAfter ?? null},
      ${opts.recordsInserted ?? 0},
      ${opts.recordsUpdated ?? 0},
      ${opts.sourceFile ?? null},
      ${opts.sourceRows ?? 0},
      ${JSON.stringify(opts.summary ?? {})}::jsonb
    )
  `);
}

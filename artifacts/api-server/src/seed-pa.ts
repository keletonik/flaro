/**
 * PA surface bootstrap.
 *
 * Runs the additive DDL for pa_reminders at every startup. Strictly
 * additive — never drops or truncates. Errors are logged and
 * swallowed so a bootstrap hiccup never crashes the server.
 */

import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { PA_DDL_STATEMENTS } from "./seed-pa-ddl";
import { ATTACHMENTS_DDL_STATEMENTS } from "./seed-attachments-ddl";
import { CYCLE_TIMES_DDL_STATEMENTS } from "./seed-cycle-times-ddl";

export async function seedPaSurface(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const stmt of PA_DDL_STATEMENTS) {
      await client.query(stmt);
    }
    for (const stmt of ATTACHMENTS_DDL_STATEMENTS) {
      await client.query(stmt);
    }
    for (const stmt of CYCLE_TIMES_DDL_STATEMENTS) {
      await client.query(stmt);
    }
    logger.info("PA + attachments + cycle times schema ensured");
  } catch (err) {
    logger.error({ err }, "PA seed failed (non-fatal)");
  } finally {
    client.release();
  }
}

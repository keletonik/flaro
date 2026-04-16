import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const changeLogs = pgTable("change_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  table: text("table").notNull(),
  batchId: text("batch_id"),
  rowCount: integer("row_count"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("change_logs_action_idx").on(table.action),
  index("change_logs_table_idx").on(table.table),
  index("change_logs_batch_id_idx").on(table.batchId),
  index("change_logs_created_at_idx").on(table.createdAt),
]);

export type ChangeLog = typeof changeLogs.$inferSelect;

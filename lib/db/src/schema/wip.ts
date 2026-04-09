import { index, pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wipRecords = pgTable("wip_records", {
  id: text("id").primaryKey(),
  taskNumber: text("task_number"),
  site: text("site").notNull(),
  address: text("address"),
  client: text("client").notNull(),
  jobType: text("job_type"),
  description: text("description"),
  status: text("status").notNull().$type<"Open" | "In Progress" | "Quoted" | "Scheduled" | "Completed" | "On Hold">().default("Open"),
  priority: text("priority").$type<"Critical" | "High" | "Medium" | "Low">().default("Medium"),
  assignedTech: text("assigned_tech"),
  dueDate: text("due_date"),
  dateCreated: text("date_created"),
  quoteAmount: numeric("quote_amount", { precision: 12, scale: 2 }),
  invoiceAmount: numeric("invoice_amount", { precision: 12, scale: 2 }),
  poNumber: text("po_number"),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  importBatchId: text("import_batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("wip_status_idx").on(table.status),
  index("wip_client_idx").on(table.client),
  index("wip_import_batch_idx").on(table.importBatchId),
  index("wip_created_at_idx").on(table.createdAt),
]);

export const insertWipSchema = createInsertSchema(wipRecords).omit({
  createdAt: true,
  updatedAt: true,
});

export type WipRecord = typeof wipRecords.$inferSelect;
export type InsertWipRecord = z.infer<typeof insertWipSchema>;

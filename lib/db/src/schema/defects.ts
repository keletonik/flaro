import { index, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const defects = pgTable("defects", {
  id: text("id").primaryKey(),
  taskNumber: text("task_number"),
  site: text("site").notNull(),
  address: text("address"),
  client: text("client").notNull(),
  description: text("description").notNull(),
  severity: text("severity").$type<"Critical" | "High" | "Medium" | "Low">().default("Medium"),
  status: text("status").notNull().$type<"Open" | "Quoted" | "Scheduled" | "Resolved" | "Deferred">().default("Open"),
  buildingClass: text("building_class"),
  assetType: text("asset_type"),
  location: text("location"),
  recommendation: text("recommendation"),
  dueDate: text("due_date"),
  dateIdentified: text("date_identified"),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  importBatchId: text("import_batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("defects_status_idx").on(table.status),
  index("defects_severity_idx").on(table.severity),
  index("defects_client_idx").on(table.client),
  index("defects_created_at_idx").on(table.createdAt),
]);

export const insertDefectSchema = createInsertSchema(defects).omit({
  createdAt: true,
  updatedAt: true,
});

export type Defect = typeof defects.$inferSelect;
export type InsertDefect = z.infer<typeof insertDefectSchema>;

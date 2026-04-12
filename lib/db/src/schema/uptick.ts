import { index, pgTable, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";

// An Uptick import run. One row per upload. The raw CSV rows live alongside
// in `uptick_raw_rows`; the normalized fact rows live in `uptick_facts`. All
// three are soft-deleted together (deleted_at) so nothing is ever lost.
export const uptickImports = pgTable("uptick_imports", {
  id: text("id").primaryKey(),
  dashboardType: text("dashboard_type").notNull(),
  sourceFilename: text("source_filename"),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  importedBy: text("imported_by"),
  rowCount: integer("row_count").notNull().default(0),
  factCount: integer("fact_count").notNull().default(0),
  rawHeaders: jsonb("raw_headers"),
  columnMap: jsonb("column_map"),
  detectedConfidence: numeric("detected_confidence", { precision: 5, scale: 4 }),
  warnings: jsonb("warnings"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("uptick_imports_dashboard_type_idx").on(table.dashboardType),
  index("uptick_imports_imported_at_idx").on(table.importedAt),
  index("uptick_imports_deleted_at_idx").on(table.deletedAt),
]);

// Immutable raw CSV rows. Never touched after insert. Deep analytics can
// re-derive any fact from these rows, so this table is the source of truth.
export const uptickRawRows = pgTable("uptick_raw_rows", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull(),
  rowIndex: integer("row_index").notNull(),
  data: jsonb("data").notNull(),
}, (table) => [
  index("uptick_raw_rows_import_idx").on(table.importId),
]);

// Normalized facts derived from the raw rows. Wide denormalized schema keyed
// by fact_type so we don't need one table per Uptick dashboard — a single
// analytics surface covers tasks, quotes, revenue lines, sessions, etc.
//
// Indexed columns are the common query dimensions. Everything else the
// detector parsed goes into `data` jsonb, so nothing is lost even if the
// indexed columns don't apply to a given fact_type.
export const uptickFacts = pgTable("uptick_facts", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull(),
  rawRowId: text("raw_row_id"),
  factType: text("fact_type").notNull(), // task | quote | remark | contract | session | revenue_line | pm_forecast | client_metric | workforce_metric

  // Common dimensions
  taskNumber: text("task_number"),
  quoteNumber: text("quote_number"),
  client: text("client"),
  site: text("site"),
  serviceGroup: text("service_group"),
  costCenter: text("cost_center"),
  branch: text("branch"),
  accountManager: text("account_manager"),
  technician: text("technician"),
  taskCategory: text("task_category"), // Reactive | Preventative | Project | Quote | ...
  status: text("status"),
  stage: text("stage"),
  severity: text("severity"),
  assetType: text("asset_type"),

  // Time dimension
  periodDate: text("period_date"), // YYYY-MM-DD, ISO
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),

  // Numeric measures
  revenue: numeric("revenue", { precision: 14, scale: 2 }),
  cost: numeric("cost", { precision: 14, scale: 2 }),
  labourCost: numeric("labour_cost", { precision: 14, scale: 2 }),
  materialCost: numeric("material_cost", { precision: 14, scale: 2 }),
  otherCost: numeric("other_cost", { precision: 14, scale: 2 }),
  hours: numeric("hours", { precision: 10, scale: 2 }),
  quantity: integer("quantity"),
  markup: numeric("markup", { precision: 10, scale: 4 }),

  // Catch-all for anything the detector didn't map
  data: jsonb("data"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("uptick_facts_import_idx").on(table.importId),
  index("uptick_facts_type_idx").on(table.factType),
  index("uptick_facts_client_idx").on(table.client),
  index("uptick_facts_technician_idx").on(table.technician),
  index("uptick_facts_service_group_idx").on(table.serviceGroup),
  index("uptick_facts_period_idx").on(table.periodDate),
  index("uptick_facts_status_idx").on(table.status),
  index("uptick_facts_deleted_at_idx").on(table.deletedAt),
]);

export type UptickImport = typeof uptickImports.$inferSelect;
export type UptickRawRow = typeof uptickRawRows.$inferSelect;
export type UptickFact = typeof uptickFacts.$inferSelect;

/**
 * Estimation workbench schema.
 *
 * These tables are created at runtime by seed-estimation-ddl.ts (same
 * CREATE TABLE IF NOT EXISTS statements) so a fresh database can boot
 * without having to pre-run a drizzle migration. This file adds Drizzle
 * type safety on top, so anywhere in the backend that wants type-safe
 * queries can `import { estimates, estimateLines } from "@workspace/db"`
 * instead of dropping to raw pg.
 *
 * The existing callsites in routes/estimates.ts and lib/chat-tool-exec.ts
 * still use raw pg because (a) the runtime DDL adds columns like
 * cost_price to supplier_products that drizzle doesn't know about, and
 * (b) the pg client is already threaded through those modules. New
 * callsites should prefer the drizzle tables declared below.
 */
import { index, pgTable, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const estimates = pgTable("estimates", {
  id: text("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  client: text("client"),
  site: text("site"),
  project: text("project"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  status: text("status").$type<"Draft" | "Sent" | "Accepted" | "Declined" | "Expired">().default("Draft").notNull(),
  defaultMarkupPct: numeric("default_markup_pct", { precision: 6, scale: 2 }).default("40").notNull(),
  labourRate: numeric("labour_rate", { precision: 10, scale: 2 }).default("120").notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("10").notNull(),
  subtotalCost: numeric("subtotal_cost", { precision: 14, scale: 2 }).default("0").notNull(),
  subtotalSell: numeric("subtotal_sell", { precision: 14, scale: 2 }).default("0").notNull(),
  marginTotal: numeric("margin_total", { precision: 14, scale: 2 }).default("0").notNull(),
  gstTotal: numeric("gst_total", { precision: 14, scale: 2 }).default("0").notNull(),
  grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  validUntil: text("valid_until"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("estimates_status_idx").on(table.status),
  index("estimates_client_idx").on(table.client),
  index("estimates_created_at_idx").on(table.createdAt),
  index("estimates_deleted_idx").on(table.deletedAt),
]);

export const estimateLines = pgTable("estimate_lines", {
  id: text("id").primaryKey(),
  estimateId: text("estimate_id").notNull(),
  kind: text("kind").$type<"product" | "labour" | "misc">().default("product").notNull(),
  productId: text("product_id"),
  productCode: text("product_code"),
  description: text("description").notNull(),
  supplierName: text("supplier_name"),
  category: text("category"),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).default("1").notNull(),
  unit: text("unit").default("each").notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).default("0").notNull(),
  markupPct: numeric("markup_pct", { precision: 6, scale: 2 }).default("40").notNull(),
  sellPrice: numeric("sell_price", { precision: 12, scale: 2 }).default("0").notNull(),
  lineCost: numeric("line_cost", { precision: 14, scale: 2 }).default("0").notNull(),
  lineSell: numeric("line_sell", { precision: 14, scale: 2 }).default("0").notNull(),
  lineMargin: numeric("line_margin", { precision: 14, scale: 2 }).default("0").notNull(),
  position: integer("position").default(0).notNull(),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("estimate_lines_estimate_idx").on(table.estimateId),
  index("estimate_lines_product_idx").on(table.productId),
  index("estimate_lines_deleted_idx").on(table.deletedAt),
]);

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertEstimateLineSchema = createInsertSchema(estimateLines).omit({
  createdAt: true,
  updatedAt: true,
});

export type Estimate = typeof estimates.$inferSelect;
export type EstimateLine = typeof estimateLines.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type InsertEstimateLine = z.infer<typeof insertEstimateLineSchema>;

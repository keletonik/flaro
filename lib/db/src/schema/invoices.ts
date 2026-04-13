import { index, pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Invoice table.
 *
 * MONEY CANONICAL FIELD: `totalAmount` is the single source of truth
 * for the invoice's gross amount (including GST). Every UI and every
 * analytics query must read `total_amount`, falling back to
 * `total_amount ?? amount` only when joining legacy imports that
 * pre-date the canonicalisation.
 *
 * `amount` is retained as the NET (ex-GST) component for legacy rows
 * and for importers that need to round-trip the original figure. New
 * writes should populate BOTH `amount` and `totalAmount`, with the
 * invariant `totalAmount = amount + gstAmount`.
 *
 * Anything reading `amount` without the `totalAmount ?? amount`
 * fallback is a bug — Pass 1 of the audit found four such sites
 * (see docs/audit/PASS_1_architecture.md §8.1).
 */
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number"),
  taskNumber: text("task_number"),
  site: text("site").notNull(),
  address: text("address"),
  client: text("client").notNull(),
  description: text("description"),
  /** NET (ex-GST) component. Legacy. See table-level doc comment. */
  amount: numeric("amount", { precision: 12, scale: 2 }),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }),
  /** CANONICAL gross (inc. GST). Prefer this in every read path. */
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  status: text("status").notNull().$type<"Draft" | "Sent" | "Overdue" | "Paid" | "Void" | "Partial">().default("Draft"),
  dateIssued: text("date_issued"),
  dateDue: text("date_due"),
  datePaid: text("date_paid"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  importBatchId: text("import_batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("invoices_status_idx").on(table.status),
  index("invoices_client_idx").on(table.client),
  index("invoices_created_at_idx").on(table.createdAt),
]);

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  createdAt: true,
  updatedAt: true,
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

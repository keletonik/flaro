import { index, pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number"),
  taskNumber: text("task_number"),
  site: text("site").notNull(),
  address: text("address"),
  client: text("client").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }),
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

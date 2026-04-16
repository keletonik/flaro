import { index, pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  taskNumber: text("task_number"),
  quoteNumber: text("quote_number"),
  site: text("site").notNull(),
  address: text("address"),
  client: text("client").notNull(),
  description: text("description"),
  quoteAmount: numeric("quote_amount", { precision: 12, scale: 2 }),
  status: text("status").notNull().$type<"Draft" | "Sent" | "Accepted" | "Declined" | "Expired" | "Revised">().default("Draft"),
  dateCreated: text("date_created"),
  dateSent: text("date_sent"),
  dateAccepted: text("date_accepted"),
  validUntil: text("valid_until"),
  assignedTech: text("assigned_tech"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  importBatchId: text("import_batch_id"),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("quotes_status_idx").on(table.status),
  index("quotes_client_idx").on(table.client),
  index("quotes_created_at_idx").on(table.createdAt),
  index("quotes_airtable_record_id_idx").on(table.airtableRecordId),
]);

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  createdAt: true,
  updatedAt: true,
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

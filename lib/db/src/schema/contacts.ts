import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  role: text("role"),
  email: text("email"),
  mobile: text("mobile"),
  type: text("type"),
  notes: text("notes"),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("contacts_name_idx").on(table.name),
  index("contacts_company_idx").on(table.company),
  index("contacts_type_idx").on(table.type),
  index("contacts_airtable_record_id_idx").on(table.airtableRecordId),
]);

export const insertContactSchema = createInsertSchema(contacts).omit({
  createdAt: true,
  updatedAt: true,
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

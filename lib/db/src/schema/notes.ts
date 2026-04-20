import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  category: text("category").notNull().$type<"Urgent" | "To Do" | "To Ask" | "Schedule" | "Quote" | "Follow Up" | "Investigate" | "Done">(),
  owner: text("owner").notNull().default("Casper"),
  status: text("status").notNull().$type<"Open" | "Done">().default("Open"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notes_status_idx").on(table.status),
  index("notes_category_idx").on(table.category),
  index("notes_created_at_idx").on(table.createdAt),
]);

export const insertNoteSchema = createInsertSchema(notes).omit({
  createdAt: true,
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

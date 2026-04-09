import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  category: text("category").notNull().$type<"Urgent" | "To Do" | "To Ask" | "Schedule" | "Done">(),
  owner: text("owner").notNull().default("Casper"),
  status: text("status").notNull().$type<"Open" | "Done">().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  createdAt: true,
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

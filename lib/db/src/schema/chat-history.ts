import { index, pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const chatHistory = pgTable("chat_history", {
  id: text("id").primaryKey(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("chat_history_section_idx").on(table.section),
  index("chat_history_updated_idx").on(table.updatedAt),
]);

export type ChatHistoryEntry = typeof chatHistory.$inferSelect;

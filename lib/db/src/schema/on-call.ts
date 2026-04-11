import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const onCallRoster = pgTable("on_call_roster", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  techName: text("tech_name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OnCallEntry = typeof onCallRoster.$inferSelect;

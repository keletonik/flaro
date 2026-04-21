import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Meetings — pulled from the Airtable Meetings table (tblyqxK2iKXtWxYY1)
 * by the polling sync every 30s. Local DB is a downstream cache; Airtable
 * remains source of truth so write-back is intentionally not wired here.
 */
export const meetings = pgTable("meetings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  startAt: text("start_at"),
  endAt: text("end_at"),
  location: text("location"),
  attendees: text("attendees"),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  airtableRecordId: text("airtable_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("meetings_start_at_idx").on(table.startAt),
  index("meetings_airtable_record_id_idx").on(table.airtableRecordId),
]);

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  createdAt: true,
  updatedAt: true,
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

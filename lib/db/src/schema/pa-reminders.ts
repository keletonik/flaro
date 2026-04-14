/**
 * pa_reminders — the table behind the PA reminder surface.
 *
 * Added in the PA rebuild (docs/pa-rebuild/BRIEF.md §4.2). Soft
 * deletable via deletedAt. One row per reminder. Status lifecycle:
 *
 *   pending ──[fires]──> fired ──[user acks]──> completed
 *      │                   │
 *      │                   └──[snooze]──> snoozed ──[tick]──> fired
 *      └──[cancel]──> cancelled
 *
 * Indexes cover the "due now" query (user_id, remind_at) with a
 * partial where clause so the reminder loop only scans pending rows.
 */
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paReminders = pgTable(
  "pa_reminders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    title: text("title").notNull(),
    body: text("body"),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    status: text("status")
      .notNull()
      .$type<"pending" | "fired" | "completed" | "snoozed" | "cancelled">()
      .default("pending"),
    firedAt: timestamp("fired_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    sourceMessageId: text("source_message_id"),
    sourceToolCallId: text("source_tool_call_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("pa_reminders_user_remind_idx").on(t.userId, t.remindAt),
    index("pa_reminders_status_idx").on(t.status),
    index("pa_reminders_deleted_idx").on(t.deletedAt),
  ],
);

export const insertPaReminderSchema = createInsertSchema(paReminders).omit({
  createdAt: true,
  updatedAt: true,
});
export type PaReminder = typeof paReminders.$inferSelect;
export type InsertPaReminder = z.infer<typeof insertPaReminderSchema>;

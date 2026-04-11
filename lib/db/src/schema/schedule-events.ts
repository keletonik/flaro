import { index, pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduleEvents = pgTable("schedule_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  startHour: integer("start_hour").notNull().default(9),
  endHour: integer("end_hour").notNull().default(10),
  location: text("location"),
  assignedTo: text("assigned_to"),
  color: text("color").default("#3B82F6"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("schedule_events_date_idx").on(table.date),
]);

export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({ createdAt: true });
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;

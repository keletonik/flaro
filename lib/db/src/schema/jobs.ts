import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  taskNumber: text("task_number"),
  site: text("site").notNull(),
  address: text("address"),
  client: text("client").notNull(),
  contactName: text("contact_name"),
  contactNumber: text("contact_number"),
  contactEmail: text("contact_email"),
  actionRequired: text("action_required").notNull(),
  priority: text("priority").notNull().$type<"Critical" | "High" | "Medium" | "Low">(),
  status: text("status").notNull().$type<"Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done">(),
  assignedTech: text("assigned_tech"),
  dueDate: text("due_date"),
  notes: text("notes"),
  uptickNotes: text("uptick_notes").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  createdAt: true,
  updatedAt: true,
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

import { index, pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const todos = pgTable("todos", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: text("priority").notNull().$type<"Critical" | "High" | "Medium" | "Low">().default("Medium"),
  category: text("category").$type<"Work" | "Personal" | "Follow-up" | "Compliance" | "Admin">().default("Work"),
  dueDate: text("due_date"),
  assignee: text("assignee"),
  urgencyTag: text("urgency_tag"),
  colorCode: text("color_code"),
  notes: text("notes"),
  nextSteps: text("next_steps"),
  dependencies: text("dependencies").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("todos_completed_idx").on(table.completed),
  index("todos_created_at_idx").on(table.createdAt),
]);

export const insertTodoSchema = createInsertSchema(todos).omit({
  createdAt: true,
  updatedAt: true,
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

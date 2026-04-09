import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const todos = pgTable("todos", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: text("priority").notNull().$type<"Critical" | "High" | "Medium" | "Low">().default("Medium"),
  category: text("category").$type<"Work" | "Personal" | "Follow-up" | "Compliance" | "Admin">().default("Work"),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  createdAt: true,
  updatedAt: true,
});

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

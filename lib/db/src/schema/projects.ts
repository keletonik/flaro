import { index, pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().$type<"Active" | "On Hold" | "Completed" | "Archived">().default("Active"),
  priority: text("priority").notNull().$type<"Critical" | "High" | "Medium" | "Low">().default("Medium"),
  colour: text("colour").default("#7C3AED"),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("projects_status_idx").on(table.status),
  index("projects_created_at_idx").on(table.createdAt),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  createdAt: true,
  updatedAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const projectTasks = pgTable("project_tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().$type<"To Do" | "In Progress" | "Review" | "Done">().default("To Do"),
  priority: text("priority").notNull().$type<"Critical" | "High" | "Medium" | "Low">().default("Medium"),
  assignee: text("assignee"),
  dueDate: text("due_date"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_tasks_project_id_idx").on(table.projectId),
  index("project_tasks_status_idx").on(table.status),
  index("project_tasks_position_idx").on(table.position),
]);

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  createdAt: true,
  updatedAt: true,
});

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

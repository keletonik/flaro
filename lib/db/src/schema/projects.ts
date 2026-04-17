import { index, pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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

export const projectMilestones = pgTable("project_milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  colour: text("colour").default("#10B981"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_milestones_project_id_idx").on(table.projectId),
  index("project_milestones_due_date_idx").on(table.dueDate),
  index("project_milestones_position_idx").on(table.position),
]);

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  createdAt: true,
  updatedAt: true,
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;

export const projectActivity = pgTable("project_activity", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id"),
  milestoneId: text("milestone_id"),
  action: text("action").notNull(),
  actor: text("actor"),
  summary: text("summary").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_activity_project_id_idx").on(table.projectId),
  index("project_activity_created_at_idx").on(table.createdAt),
]);

export const insertProjectActivitySchema = createInsertSchema(projectActivity).omit({
  createdAt: true,
});

export type ProjectActivity = typeof projectActivity.$inferSelect;
export type InsertProjectActivity = z.infer<typeof insertProjectActivitySchema>;

export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").$type<"Lead" | "Contributor" | "Reviewer" | "Stakeholder">().default("Contributor"),
  avatarColor: text("avatar_color").default("#6366F1"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_members_project_id_idx").on(table.projectId),
]);

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  createdAt: true,
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;

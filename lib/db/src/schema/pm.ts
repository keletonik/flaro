import { index, pgTable, text, integer, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Boards — top-level containers (like Monday.com boards)
export const pmBoards = pgTable("pm_boards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  template: text("template").$type<"blank" | "project-tracker" | "sprint-planning" | "task-management" | "client-onboarding" | "maintenance-schedule" | "compliance-tracker" | "resource-planning">().default("blank"),
  color: text("color").default("#3B82F6"),
  icon: text("icon").default("folder"),
  defaultView: text("default_view").$type<"table" | "kanban" | "gantt" | "timeline" | "calendar">().default("table"),
  archived: boolean("archived").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pm_boards_archived_idx").on(table.archived),
]);

export const insertPmBoardSchema = createInsertSchema(pmBoards).omit({ createdAt: true, updatedAt: true });
export type PmBoard = typeof pmBoards.$inferSelect;

// Groups — row groupings within a board (like Monday.com groups)
export const pmGroups = pgTable("pm_groups", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull().references(() => pmBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#3B82F6"),
  collapsed: boolean("collapsed").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pm_groups_board_id_idx").on(table.boardId),
]);

export const insertPmGroupSchema = createInsertSchema(pmGroups).omit({ createdAt: true });
export type PmGroup = typeof pmGroups.$inferSelect;

// Columns — custom field definitions per board
export const pmColumns = pgTable("pm_columns", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull().references(() => pmBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"text" | "number" | "status" | "date" | "person" | "dropdown" | "tags" | "priority" | "timeline" | "dependency" | "progress" | "link" | "file" | "checkbox" | "rating" | "formula">(),
  width: integer("width").default(150),
  options: jsonb("options"), // For status/dropdown: [{label, color}], for formula: {expression}
  required: boolean("required").default(false),
  hidden: boolean("hidden").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pm_columns_board_id_idx").on(table.boardId),
]);

export const insertPmColumnSchema = createInsertSchema(pmColumns).omit({ createdAt: true });
export type PmColumn = typeof pmColumns.$inferSelect;

// Items — rows in a board (tasks/items)
export const pmItems = pgTable("pm_items", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull().references(() => pmBoards.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => pmGroups.id, { onDelete: "set null" }),
  parentId: text("parent_id"), // For subitems
  name: text("name").notNull(),
  values: jsonb("values").notNull().default({}), // {columnId: value} — flexible field storage
  sortOrder: integer("sort_order").default(0),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pm_items_board_id_idx").on(table.boardId),
  index("pm_items_group_id_idx").on(table.groupId),
  index("pm_items_parent_id_idx").on(table.parentId),
]);

export const insertPmItemSchema = createInsertSchema(pmItems).omit({ createdAt: true, updatedAt: true });
export type PmItem = typeof pmItems.$inferSelect;

// Views — saved board view configurations
export const pmViews = pgTable("pm_views", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull().references(() => pmBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"table" | "kanban" | "gantt" | "timeline" | "calendar" | "chart">(),
  config: jsonb("config").notNull().default({}), // {filters, sorts, groupBy, hiddenColumns, kanbanColumn, chartType, etc.}
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pm_views_board_id_idx").on(table.boardId),
]);

export const insertPmViewSchema = createInsertSchema(pmViews).omit({ createdAt: true });
export type PmView = typeof pmViews.$inferSelect;

// Activity Log — audit trail for items
export const pmActivity = pgTable("pm_activity", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  itemId: text("item_id"),
  action: text("action").notNull(), // "created", "updated", "moved", "deleted", "comment"
  field: text("field"), // which column was changed
  oldValue: text("old_value"),
  newValue: text("new_value"),
  comment: text("comment"), // for comment-type actions
  userId: text("user_id").default("casper"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pm_activity_board_id_idx").on(table.boardId),
  index("pm_activity_item_id_idx").on(table.itemId),
  index("pm_activity_created_at_idx").on(table.createdAt),
]);

export type PmActivity = typeof pmActivity.$inferSelect;

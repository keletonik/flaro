import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolbox = pgTable("toolbox", {
  id: text("id").primaryKey(),
  ref: text("ref").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull().$type<"Active" | "Briefed">().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertToolboxSchema = createInsertSchema(toolbox).omit({
  createdAt: true,
});

export type Toolbox = typeof toolbox.$inferSelect;
export type InsertToolbox = z.infer<typeof insertToolboxSchema>;

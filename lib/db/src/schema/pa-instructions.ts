/**
 * pa_instructions — user-authored training rules for the PA.
 *
 * Each row is a single rule the operator wants the PA to follow. The
 * memory builder reads enabled rules filtered by scope before every
 * turn and injects them into the system prompt as a structured
 * numbered list (priority-sorted).
 *
 * Scope drives when a rule is injected:
 *   global          — injected on every PA turn
 *   on_open         — only when the user opens /pa with no history
 *   on_stale_check  — when the PA is deciding what to proactively ask
 *   on_todo_create  — when the PA is creating a todo
 *
 * Priority 1 (must obey) through 5 (nice to have) — higher priority
 * rules are listed first and the prompt tells the model to resolve
 * conflicts by priority.
 */
import { index, integer, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paInstructions = pgTable(
  "pa_instructions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    scope: text("scope")
      .notNull()
      .$type<"global" | "on_open" | "on_stale_check" | "on_todo_create">()
      .default("global"),
    priority: integer("priority").notNull().default(3),
    enabled: boolean("enabled").notNull().default(true),
    source: text("source").$type<"user" | "system" | "learned">().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("pa_instructions_scope_enabled_idx").on(t.scope, t.enabled),
    index("pa_instructions_priority_idx").on(t.priority),
    index("pa_instructions_deleted_idx").on(t.deletedAt),
  ],
);

export const insertPaInstructionSchema = createInsertSchema(paInstructions).omit({
  createdAt: true,
  updatedAt: true,
});
export type PaInstruction = typeof paInstructions.$inferSelect;
export type InsertPaInstruction = z.infer<typeof insertPaInstructionSchema>;

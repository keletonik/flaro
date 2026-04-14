/**
 * task_cycle_times — analytical cycle time for tasks.
 *
 * Sourced from Uptick's "Days to Complete Tasks" export. One row per
 * task with:
 *   task_ref            — Uptick task reference (T-XXXXX)
 *   task_property       — site / property string
 *   task_category       — Repair / Maintenance / Defect Quote / etc.
 *   task_service_group  — service group
 *   task_round          — round name
 *   task_status         — performed / invoiced / in progress
 *   task_author         — who created the task
 *   task_salesperson    — assigned salesperson
 *   created_date        — when the task was created (ISO)
 *   performed_date      — when the work was completed on site (ISO)
 *   invoiced_date       — when the invoice was raised (ISO)
 *   days_to_complete    — int — days between created and performed
 *   days_to_invoice     — int — days between performed and invoiced
 *   description         — free text scope
 *   source_defect_ref   — if the task came from a defect quote
 *   source_service_ref  — if the task came from a service quote
 *   authorisation_ref   — PO / client authorisation
 *   raw_data            — full row as JSONB for back-reference
 *
 * Natural key: task_ref. Dedup on re-import so nightly re-runs are
 * idempotent. Soft-deletable via deleted_at.
 */
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskCycleTimes = pgTable(
  "task_cycle_times",
  {
    id: text("id").primaryKey(),
    taskRef: text("task_ref").notNull(),
    taskProperty: text("task_property"),
    taskCategory: text("task_category"),
    taskServiceGroup: text("task_service_group"),
    taskRound: text("task_round"),
    taskSupportingTechnicians: text("task_supporting_technicians"),
    description: text("description"),
    sourceDefectRef: text("source_defect_ref"),
    sourceServiceRef: text("source_service_ref"),
    authorisationRef: text("authorisation_ref"),
    taskStatus: text("task_status"),
    taskAuthor: text("task_author"),
    taskSalesperson: text("task_salesperson"),
    createdDate: text("created_date"),
    performedDate: text("performed_date"),
    invoicedDate: text("invoiced_date"),
    daysToComplete: integer("days_to_complete"),
    daysToInvoice: integer("days_to_invoice"),
    rawData: jsonb("raw_data"),
    importBatchId: text("import_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("task_cycle_times_ref_idx").on(t.taskRef),
    index("task_cycle_times_category_idx").on(t.taskCategory),
    index("task_cycle_times_status_idx").on(t.taskStatus),
    index("task_cycle_times_deleted_idx").on(t.deletedAt),
  ],
);

export const insertTaskCycleTimeSchema = createInsertSchema(taskCycleTimes).omit({
  createdAt: true,
  updatedAt: true,
});
export type TaskCycleTime = typeof taskCycleTimes.$inferSelect;
export type InsertTaskCycleTime = z.infer<typeof insertTaskCycleTimeSchema>;

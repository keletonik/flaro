/**
 * Additive DDL for the task_cycle_times analytical table.
 * Runs alongside seed-pa-ddl on boot.
 */

export const CYCLE_TIMES_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS task_cycle_times (
     id text PRIMARY KEY,
     task_ref text NOT NULL,
     task_property text,
     task_category text,
     task_service_group text,
     task_round text,
     task_supporting_technicians text,
     description text,
     source_defect_ref text,
     source_service_ref text,
     authorisation_ref text,
     task_status text,
     task_author text,
     task_salesperson text,
     created_date text,
     performed_date text,
     invoiced_date text,
     days_to_complete integer,
     days_to_invoice integer,
     raw_data jsonb,
     import_batch_id text,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS task_cycle_times_ref_idx ON task_cycle_times (task_ref)`,
  `CREATE INDEX IF NOT EXISTS task_cycle_times_category_idx ON task_cycle_times (task_category)`,
  `CREATE INDEX IF NOT EXISTS task_cycle_times_status_idx ON task_cycle_times (task_status)`,
  `CREATE INDEX IF NOT EXISTS task_cycle_times_deleted_idx ON task_cycle_times (deleted_at)`,
];

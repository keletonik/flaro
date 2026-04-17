/**
 * Additive DDL for the projects v2 auxiliary tables.
 *
 * Runs on boot alongside other seed DDL. Strictly additive:
 * CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
 * Never drops, never truncates.
 */

export const PROJECTS_V2_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS project_milestones (
     id text PRIMARY KEY,
     project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     name text NOT NULL,
     description text,
     due_date text,
     completed_at timestamp with time zone,
     position integer NOT NULL DEFAULT 0,
     colour text DEFAULT '#10B981',
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS project_milestones_project_id_idx ON project_milestones (project_id)`,
  `CREATE INDEX IF NOT EXISTS project_milestones_due_date_idx ON project_milestones (due_date)`,
  `CREATE INDEX IF NOT EXISTS project_milestones_position_idx ON project_milestones (position)`,

  `CREATE TABLE IF NOT EXISTS project_activity (
     id text PRIMARY KEY,
     project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     task_id text,
     milestone_id text,
     action text NOT NULL,
     actor text,
     summary text NOT NULL,
     meta jsonb,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS project_activity_project_id_idx ON project_activity (project_id)`,
  `CREATE INDEX IF NOT EXISTS project_activity_created_at_idx ON project_activity (created_at)`,

  `CREATE TABLE IF NOT EXISTS project_members (
     id text PRIMARY KEY,
     project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     name text NOT NULL,
     role text DEFAULT 'Contributor',
     avatar_color text DEFAULT '#6366F1',
     active boolean NOT NULL DEFAULT true,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members (project_id)`,
];

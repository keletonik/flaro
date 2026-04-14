/**
 * Additive DDL for the PA surface.
 *
 * Runs on every startup alongside the other seed-*-ddl files. The only
 * table required for Phase 1 of the PA rebuild is pa_reminders — the
 * rest of the PA re-uses existing tables (todos, notes, chat_messages,
 * agent_tool_calls).
 *
 * See docs/pa-rebuild/BRIEF.md §3.4 for the per-column rationale.
 */

export const PA_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS pa_reminders (
     id text PRIMARY KEY,
     user_id text,
     title text NOT NULL,
     body text,
     remind_at timestamp with time zone NOT NULL,
     status text NOT NULL DEFAULT 'pending',
     fired_at timestamp with time zone,
     completed_at timestamp with time zone,
     snoozed_until timestamp with time zone,
     source_message_id text,
     source_tool_call_id text,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS pa_reminders_user_remind_idx
     ON pa_reminders (user_id, remind_at)`,
  `CREATE INDEX IF NOT EXISTS pa_reminders_status_idx
     ON pa_reminders (status)`,
  `CREATE INDEX IF NOT EXISTS pa_reminders_deleted_idx
     ON pa_reminders (deleted_at)`,

  // ── pa_instructions (Smart Mode phase A) ───────────────────────────────
  `CREATE TABLE IF NOT EXISTS pa_instructions (
     id text PRIMARY KEY,
     title text NOT NULL,
     content text NOT NULL,
     scope text NOT NULL DEFAULT 'global',
     priority integer NOT NULL DEFAULT 3,
     enabled boolean NOT NULL DEFAULT true,
     source text DEFAULT 'user',
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS pa_instructions_scope_enabled_idx
     ON pa_instructions (scope, enabled)`,
  `CREATE INDEX IF NOT EXISTS pa_instructions_priority_idx
     ON pa_instructions (priority)`,
  `CREATE INDEX IF NOT EXISTS pa_instructions_deleted_idx
     ON pa_instructions (deleted_at)`,
];

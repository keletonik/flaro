/**
 * agent_error_log — captures every AI / agent-side failure for
 * later analysis. Anything that throws inside an Anthropic call,
 * a tool execution, a forced tool-use that came back empty, or
 * an unexpected 4xx/5xx from a chat-related route gets a row.
 *
 * Designed to be cheap to insert (single INSERT, no joins, no
 * enums) and easy to scan from a backoffice page.
 */

import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const agentErrorLog = pgTable(
  "agent_error_log",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    // Where the error came from in the product. Free text so we
    // can add new surfaces without a migration. Examples:
    // "fip-defect", "fip-config", "chat-agent", "pa", "embedded-chat".
    surface: text("surface").notNull(),
    // Express route or call site. Examples:
    // "POST /api/fip/config-analysis", "chat-tool-exec.execute"
    route: text("route"),
    // Short error type / class. Examples:
    // "AnthropicAPIError", "ToolExecError", "ValidationError",
    // "MissingToolUseBlock", "AttachmentNotFound"
    errorType: text("error_type").notNull(),
    // The error.message (truncated to ~2 KB by the helper).
    message: text("message").notNull(),
    // Stack trace, also truncated. Optional.
    stack: text("stack"),
    // Severity hint. "warn" = degraded but handled, "error" = user-facing
    // failure, "critical" = data integrity / safety implications.
    severity: text("severity").$type<"warn" | "error" | "critical">().notNull().default("error"),
    // Free-form structured context. Whatever the call site can give us
    // that helps reproduce — attachmentId, conversationId, model name,
    // tool name, table name, sanitised input keys, etc. Never put a
    // secret in here.
    context: jsonb("context"),
    // Has a human looked at this row and decided what to do. UI sets this.
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
  },
  (t) => [
    index("agent_error_log_ts_idx").on(t.ts),
    index("agent_error_log_surface_idx").on(t.surface),
    index("agent_error_log_severity_idx").on(t.severity),
    index("agent_error_log_resolved_idx").on(t.resolvedAt),
  ],
);

export type AgentErrorLog = typeof agentErrorLog.$inferSelect;
export type NewAgentErrorLog = typeof agentErrorLog.$inferInsert;

/**
 * Agent observability.
 *
 * Every tool call logs one row into `agent_tool_calls`. The table is
 * created at runtime (CREATE TABLE IF NOT EXISTS) on first use, so
 * there's no migration to manage. Log-and-forget semantics — a failed
 * insert never breaks the agent loop.
 *
 * Inputs are serialised as JSON. If the agent is ever asked to store
 * secrets (API keys, tokens) they'd leak here — the REDACT_KEYS set
 * below filters any field whose name matches a common secret pattern
 * before the row is persisted.
 *
 * Exposed publicly via /api/diag/agent (added in the next commit).
 */

import { pool } from "@workspace/db";

const REDACT_KEYS = new Set(["password", "token", "api_key", "apikey", "secret", "authorization", "cookie"]);

let ensured = false;

async function ensureTable(): Promise<void> {
  if (ensured) return;
  ensured = true;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_tool_calls (
        id bigserial PRIMARY KEY,
        section text,
        tool text NOT NULL,
        input jsonb,
        duration_ms integer NOT NULL,
        ok boolean NOT NULL,
        error text,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS agent_tool_calls_tool_idx ON agent_tool_calls (tool)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS agent_tool_calls_created_at_idx ON agent_tool_calls (created_at DESC)`);
  } catch {
    ensured = false; // allow retry next call
  }
}

function redact(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

export interface ToolCallRecord {
  section: string | null;
  tool: string;
  input: unknown;
  durationMs: number;
  ok: boolean;
  error?: string;
}

export async function recordToolCall(r: ToolCallRecord): Promise<void> {
  await ensureTable();
  const redacted = redact(r.input);
  try {
    await pool.query(
      `INSERT INTO agent_tool_calls (section, tool, input, duration_ms, ok, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [r.section, r.tool, JSON.stringify(redacted), r.durationMs, r.ok, r.error ?? null],
    );
  } catch {
    // Non-fatal. Logging the agent is best-effort.
  }
}

export async function getRecentToolCalls(limit = 50): Promise<any[]> {
  await ensureTable();
  try {
    const res = await pool.query(
      `SELECT id, section, tool, input, duration_ms, ok, error, created_at
       FROM agent_tool_calls
       ORDER BY created_at DESC
       LIMIT $1`,
      [Math.max(1, Math.min(500, limit))],
    );
    return res.rows;
  } catch {
    return [];
  }
}

export async function getToolCallStats(): Promise<any> {
  await ensureTable();
  try {
    const res = await pool.query(`
      SELECT tool,
             COUNT(*)::int AS calls,
             COUNT(*) FILTER (WHERE ok) ::int AS ok_count,
             COUNT(*) FILTER (WHERE NOT ok) ::int AS error_count,
             ROUND(AVG(duration_ms)::numeric, 1) AS avg_ms,
             MAX(duration_ms) AS max_ms
      FROM agent_tool_calls
      WHERE created_at > now() - interval '24 hours'
      GROUP BY tool
      ORDER BY calls DESC
    `);
    return res.rows;
  } catch {
    return [];
  }
}

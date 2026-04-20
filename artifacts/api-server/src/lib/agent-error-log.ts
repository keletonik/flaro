/**
 * logAgentError — single entry point for capturing AI-side
 * failures into the agent_error_log table.
 *
 * Never throws. If the insert itself fails (DB down, schema
 * drift), it logs to the regular logger and returns. The caller
 * should never put error logging in a code path that can be
 * blocked by error logging.
 */

import { db } from "@workspace/db";
import { agentErrorLog } from "@workspace/db";
import { logger } from "./logger";

const MAX_MESSAGE = 2000;
const MAX_STACK = 6000;

// Best-effort scrub of obvious secret-looking substrings before persistence.
// We do not try to be exhaustive — the goal is to avoid the most common
// accidental leaks (Anthropic / OpenAI / GitHub tokens, Bearer headers,
// `password=...` in stack frames). Anything matched is replaced with
// the literal string "[REDACTED]".
const REDACT_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  /sk-[a-zA-Z0-9]{32,}/g,
  /ghp_[a-zA-Z0-9]{30,}/g,
  /github_pat_[a-zA-Z0-9_]{30,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["']?[^"'\s,}]{6,}/gi,
];

function redact(s: string | null): string | null {
  if (!s) return s;
  let out = s;
  for (const p of REDACT_PATTERNS) out = out.replace(p, "[REDACTED]");
  return out;
}

export interface LogAgentErrorInput {
  surface: string;
  route?: string;
  errorType?: string;
  err: unknown;
  context?: Record<string, unknown>;
  severity?: "warn" | "error" | "critical";
}

function classify(err: unknown): { errorType: string; message: string; stack: string | null } {
  if (err instanceof Error) {
    return {
      errorType: err.name || "Error",
      message: (err.message || "Unknown error").slice(0, MAX_MESSAGE),
      stack: err.stack ? err.stack.slice(0, MAX_STACK) : null,
    };
  }
  if (typeof err === "string") {
    return { errorType: "StringError", message: err.slice(0, MAX_MESSAGE), stack: null };
  }
  try {
    return {
      errorType: "UnknownError",
      message: JSON.stringify(err).slice(0, MAX_MESSAGE),
      stack: null,
    };
  } catch {
    return { errorType: "UnknownError", message: "Unserialisable error value", stack: null };
  }
}

export async function logAgentError(input: LogAgentErrorInput): Promise<void> {
  const { surface, route, err, context, severity = "error" } = input;
  const c = classify(err);
  try {
    await db.insert(agentErrorLog).values({
      surface,
      route: route ?? null,
      errorType: input.errorType ?? c.errorType,
      message: redact(c.message) ?? c.message,
      stack: redact(c.stack),
      severity,
      context: context ?? null,
    });
  } catch (insertErr) {
    logger.warn(
      { surface, route, severity, originalErr: c.message, insertErr },
      "agent-error-log: insert failed (non-fatal)",
    );
  }
}

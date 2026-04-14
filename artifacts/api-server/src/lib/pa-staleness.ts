/**
 * PA staleness scoring.
 *
 * Scores every active (non-completed, non-deleted) todo by how much
 * attention it deserves right now:
 *
 *   staleness_score = days_since_update × priority_weight
 *                   + overdue_bonus
 *                   - recency_penalty
 *
 * where:
 *   days_since_update = max(0, (now - updated_at) / 1 day)
 *   priority_weight    = Critical 5 · High 3 · Medium 1.5 · Low 1
 *   overdue_bonus      = +10 if due_date in the past
 *   recency_penalty    = -5 if updated_at is within the last 24h
 *
 * The score is a single number so the caller can sort and take the
 * top N without a second query. Ties broken by priority then by
 * oldest updated_at.
 *
 * Exposed via an agent tool (`pa_get_stale_tasks`) and consumed by
 * the memory builder (`lib/pa-memory.ts`) every turn.
 */

import { db } from "@workspace/db";
import { todos } from "@workspace/db";
import { eq } from "drizzle-orm";

const PRIORITY_WEIGHT: Record<string, number> = {
  Critical: 5,
  High: 3,
  Medium: 1.5,
  Low: 1,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ScoredTodo {
  id: string;
  text: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  createdAt: string;
  daysSinceUpdate: number;
  stalenessScore: number;
  overdue: boolean;
  reason: string;
}

export interface StalenessOptions {
  /** Min days stale to include (default 0 — include everything active) */
  minDays?: number;
  /** Max rows to return */
  limit?: number;
  /** Exclude todos whose text matches any of these substrings (case-insensitive).
   * Used by the memory builder to drop todos the user just discussed. */
  excludeSubstrings?: string[];
}

/**
 * Compute and return the top N stale todos, sorted by score descending.
 *
 * Pure DB read + in-memory scoring. No side effects. Safe to call on
 * every turn from the memory builder.
 */
export async function computeStaleTodos(
  opts: StalenessOptions = {},
): Promise<ScoredTodo[]> {
  const minDays = opts.minDays ?? 0;
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const excludeSubstrings = (opts.excludeSubstrings ?? []).map((s) => s.toLowerCase());

  const rows = await db
    .select()
    .from(todos)
    .where(eq(todos.completed, false));

  const now = Date.now();
  const scored: ScoredTodo[] = [];

  for (const r of rows) {
    const text = String(r.text ?? "");
    if (excludeSubstrings.some((s) => s && text.toLowerCase().includes(s))) continue;

    const updated = r.updatedAt ? new Date(r.updatedAt).getTime() : now;
    const daysSince = Math.max(0, (now - updated) / DAY_MS);
    if (daysSince < minDays) continue;

    const priority = String(r.priority ?? "Medium");
    const weight = PRIORITY_WEIGHT[priority] ?? 1;

    let score = daysSince * weight;
    let overdue = false;

    if (r.dueDate) {
      const dueMs = new Date(r.dueDate).getTime();
      if (Number.isFinite(dueMs) && dueMs < now) {
        score += 10;
        overdue = true;
      }
    }

    if (daysSince < 1) score -= 5;

    scored.push({
      id: String(r.id),
      text: text.slice(0, 300),
      priority,
      dueDate: r.dueDate ?? null,
      updatedAt: new Date(updated).toISOString(),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date(updated).toISOString(),
      daysSinceUpdate: Math.round(daysSince * 10) / 10,
      stalenessScore: Math.round(score * 10) / 10,
      overdue,
      reason: buildReason(daysSince, priority, overdue),
    });
  }

  scored.sort((a, b) => {
    if (b.stalenessScore !== a.stalenessScore) return b.stalenessScore - a.stalenessScore;
    const aw = PRIORITY_WEIGHT[a.priority] ?? 1;
    const bw = PRIORITY_WEIGHT[b.priority] ?? 1;
    if (bw !== aw) return bw - aw;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  return scored.slice(0, limit);
}

function buildReason(days: number, priority: string, overdue: boolean): string {
  const parts: string[] = [];
  if (overdue) parts.push("past due date");
  if (days >= 14) parts.push(`${Math.round(days)}d since any update`);
  else if (days >= 7) parts.push(`${Math.round(days)}d without an update`);
  else if (days >= 3) parts.push(`${Math.round(days)}d idle`);
  else if (days >= 1) parts.push("just starting to sit");
  if (priority === "Critical" || priority === "High") parts.push(`${priority.toLowerCase()} priority`);
  return parts.join(", ") || "active";
}

/**
 * Task cycle time distribution.
 *
 * Reads the task_cycle_times analytical table and buckets every task
 * with a non-null days_to_complete into seven bands:
 *
 *   0-1, 2-5, 6-14, 15-30, 31-60, 61-120, 120+
 *
 * Value per row = count of tasks in the band. Headline = median
 * days-to-complete across all tasks in the window.
 *
 * Sourced from the Uptick "Days to Complete Tasks" export imported
 * in docs/data-imports/2026-04-15_AUDIT.md. Adds visibility into
 * how long work actually sits before it's done — the top of the
 * distribution is where revenue leakage lives.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const BUCKETS = [
  { label: "0-1 days", min: 0, max: 1 },
  { label: "2-5 days", min: 2, max: 5 },
  { label: "6-14 days", min: 6, max: 14 },
  { label: "15-30 days", min: 15, max: 30 },
  { label: "31-60 days", min: 31, max: 60 },
  { label: "61-120 days", min: 61, max: 120 },
  { label: "120+ days", min: 121, max: 99_999 },
] as const;

export const taskCycleTimeDistribution: MetricDefinition = {
  id: "task_cycle_time_distribution",
  displayName: "Task cycle time distribution",
  description:
    "Count of tasks by days-to-complete band. Headline is the median days-to-complete across every task with a finite cycle time.",
  category: "ops",
  unit: "days",
  supportedPeriods: ["90d", "ytd"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "90d", params.startDate, params.endDate);
    const startIso = resolved.start.toISOString();
    const endIso = resolved.end.toISOString();

    const sql = `
      SELECT days_to_complete::int AS d
        FROM task_cycle_times
       WHERE deleted_at IS NULL
         AND days_to_complete IS NOT NULL
         AND performed_date IS NOT NULL
         AND performed_date >= $1
         AND performed_date <= $2
    `;
    const { rows } = await pool.query(sql, [startIso.slice(0, 10), endIso.slice(0, 10)]);

    const counts: number[] = BUCKETS.map(() => 0);
    const allDays: number[] = [];
    for (const r of rows) {
      const d = Number(r.d);
      if (!Number.isFinite(d) || d < 0) continue;
      allDays.push(d);
      const idx = BUCKETS.findIndex((b) => d >= b.min && d <= b.max);
      if (idx >= 0) counts[idx]! += 1;
    }

    // Median headline
    let headline = 0;
    if (allDays.length > 0) {
      const sorted = [...allDays].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      headline = sorted.length % 2 === 1
        ? sorted[mid]!
        : Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
    }

    const resultRows = BUCKETS.map((b, i) => ({
      label: b.label,
      value: counts[i]!,
      meta: { min: b.min, max: b.max },
    }));

    return {
      id: "task_cycle_time_distribution",
      displayName: "Task cycle time distribution",
      unit: "days",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "COUNT tasks in task_cycle_times bucketed by days_to_complete (0-1, 2-5, 6-14, 15-30, 31-60, 61-120, 120+). Window filtered on performed_date. Headline is the median days_to_complete across all tasks in the window.",
      computedAt: new Date().toISOString(),
    };
  },
};

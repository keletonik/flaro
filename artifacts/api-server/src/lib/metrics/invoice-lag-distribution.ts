/**
 * Invoice lag distribution — days between task performed and invoice raised.
 *
 * Sourced from task_cycle_times.days_to_invoice. One bucket per day
 * range:
 *   0, 1-3, 4-7, 8-14, 15-30, 31+
 *
 * Value per row = count of tasks that took that long to invoice.
 * Headline = average days_to_invoice across the window (mean, not
 * median — the operator cares about the billing lag in aggregate
 * for cash-flow planning, not the middle of the distribution).
 *
 * The distinction from task_cycle_time_distribution: that one
 * measures site delivery speed; this one measures billing speed.
 * Both drive cash flow but the bottlenecks are different teams.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const BUCKETS = [
  { label: "Same day", min: 0, max: 0 },
  { label: "1-3 days", min: 1, max: 3 },
  { label: "4-7 days", min: 4, max: 7 },
  { label: "8-14 days", min: 8, max: 14 },
  { label: "15-30 days", min: 15, max: 30 },
  { label: "31+ days", min: 31, max: 99_999 },
] as const;

export const invoiceLagDistribution: MetricDefinition = {
  id: "invoice_lag_distribution",
  displayName: "Invoice lag distribution",
  description:
    "Count of tasks by days between performed and invoiced. Headline is the mean billing lag.",
  category: "revenue",
  unit: "days",
  supportedPeriods: ["90d", "ytd"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "90d", params.startDate, params.endDate);
    const startIso = resolved.start.toISOString();
    const endIso = resolved.end.toISOString();

    const sql = `
      SELECT days_to_invoice::int AS d
        FROM task_cycle_times
       WHERE deleted_at IS NULL
         AND days_to_invoice IS NOT NULL
         AND invoiced_date IS NOT NULL
         AND invoiced_date >= $1
         AND invoiced_date <= $2
    `;
    const { rows } = await pool.query(sql, [startIso.slice(0, 10), endIso.slice(0, 10)]);

    const counts: number[] = BUCKETS.map(() => 0);
    let sum = 0;
    let n = 0;
    for (const r of rows) {
      const d = Number(r.d);
      if (!Number.isFinite(d) || d < 0) continue;
      sum += d;
      n += 1;
      const idx = BUCKETS.findIndex((b) => d >= b.min && d <= b.max);
      if (idx >= 0) counts[idx]! += 1;
    }

    const headline = n > 0 ? Math.round((sum / n) * 10) / 10 : 0;

    const resultRows = BUCKETS.map((b, i) => ({
      label: b.label,
      value: counts[i]!,
      meta: { min: b.min, max: b.max },
    }));

    return {
      id: "invoice_lag_distribution",
      displayName: "Invoice lag distribution",
      unit: "days",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "COUNT tasks in task_cycle_times bucketed by days_to_invoice. Window filtered on invoiced_date. Headline is the mean days_to_invoice across all tasks billed in the window — the average billing lag.",
      computedAt: new Date().toISOString(),
    };
  },
};

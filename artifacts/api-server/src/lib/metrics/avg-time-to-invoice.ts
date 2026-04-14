/**
 * Average time-to-invoice (days).
 *
 * For every invoice issued in the last 90 days, compute days between
 * the matching WIP record's date_created and the invoice's
 * date_issued. Join is on task_number (the shared business key).
 *
 * Rows bucket by week (0-1d / 2-5d / 6-14d / 15-30d / 30+). Value is
 * the count of invoices that fell in each bucket. Headline is the
 * average across all matched invoices.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const BUCKETS = [
  { label: "0-1 days", min: 0, max: 1 },
  { label: "2-5 days", min: 2, max: 5 },
  { label: "6-14 days", min: 6, max: 14 },
  { label: "15-30 days", min: 15, max: 30 },
  { label: "30+ days", min: 31, max: 9999 },
] as const;

export const avgTimeToInvoice: MetricDefinition = {
  id: "avg_time_to_invoice",
  displayName: "Avg time to invoice",
  description:
    "Days between WIP creation and invoice issued, averaged over invoices in the window.",
  category: "ops",
  unit: "days",
  supportedPeriods: ["90d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "90d", params.startDate, params.endDate);
    const startIso = resolved.start.toISOString();

    const sql = `
      SELECT i.date_issued, w.date_created
        FROM invoices i
        JOIN wip_records w ON w.task_number = i.task_number
       WHERE i.deleted_at IS NULL
         AND w.deleted_at IS NULL
         AND i.date_issued IS NOT NULL
         AND w.date_created IS NOT NULL
         AND i.created_at >= $1
    `;
    const { rows } = await pool.query(sql, [startIso]);

    const bucketCounts: number[] = BUCKETS.map(() => 0);
    let total = 0;
    let n = 0;
    for (const r of rows) {
      const issued = new Date(r.date_issued).getTime();
      const created = new Date(r.date_created).getTime();
      if (!Number.isFinite(issued) || !Number.isFinite(created)) continue;
      const days = Math.max(0, Math.floor((issued - created) / (1000 * 60 * 60 * 24)));
      const idx = BUCKETS.findIndex((b) => days >= b.min && days <= b.max);
      if (idx >= 0) bucketCounts[idx]! += 1;
      total += days;
      n += 1;
    }

    const resultRows = BUCKETS.map((b, i) => ({
      label: b.label,
      value: bucketCounts[i]!,
      meta: { min_days: b.min, max_days: b.max },
    }));

    const headline = n > 0 ? Math.round((total / n) * 10) / 10 : 0;

    return {
      id: "avg_time_to_invoice",
      displayName: "Avg time to invoice",
      unit: "days",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "JOIN invoices to wip_records on task_number. Compute " +
        "(date_issued - date_created) in days for every invoice " +
        "in the window. Bucket by day ranges. Headline is the mean.",
      computedAt: new Date().toISOString(),
    };
  },
};

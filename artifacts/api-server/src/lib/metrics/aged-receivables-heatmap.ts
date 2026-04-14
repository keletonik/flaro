/**
 * Aged receivables heatmap.
 *
 * Unpaid invoices bucketed by how far past due they are:
 *   - Current (not yet due)
 *   - 1-30 days
 *   - 31-60 days
 *   - 61-90 days
 *   - 90+ days
 *
 * One row per bucket with value = total $ owed in that bucket. The
 * headline is total outstanding receivables (all buckets summed).
 * Reads `total_amount` (canonical) with `amount` as fallback for
 * legacy rows — see lib/db/src/schema/invoices.ts doc comment.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const BUCKETS = [
  { label: "Current", min: -100000, max: 0 },
  { label: "1-30 days", min: 1, max: 30 },
  { label: "31-60 days", min: 31, max: 60 },
  { label: "61-90 days", min: 61, max: 90 },
  { label: "90+ days", min: 91, max: 100000 },
] as const;

export const agedReceivablesHeatmap: MetricDefinition = {
  id: "aged_receivables_heatmap",
  displayName: "Aged receivables heatmap",
  description:
    "Unpaid invoices bucketed by days overdue. Value is total $ owed per bucket.",
  category: "revenue",
  unit: "aud",
  supportedPeriods: ["today"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "today", params.startDate, params.endDate);

    const sql = `
      SELECT date_due,
             COALESCE(total_amount, amount) AS owing
        FROM invoices
       WHERE deleted_at IS NULL
         AND status NOT IN ('Paid', 'Void')
         AND COALESCE(total_amount, amount) IS NOT NULL
    `;
    const { rows } = await pool.query(sql);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bucketTotals: number[] = BUCKETS.map(() => 0);
    const bucketCounts: number[] = BUCKETS.map(() => 0);
    let headline = 0;

    for (const r of rows) {
      const owing = Number(r.owing) || 0;
      if (owing <= 0) continue;
      const due = r.date_due ? new Date(r.date_due) : null;
      const daysOverdue = due
        ? Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const idx = BUCKETS.findIndex((b) => daysOverdue >= b.min && daysOverdue <= b.max);
      if (idx >= 0) {
        bucketTotals[idx]! += owing;
        bucketCounts[idx]! += 1;
        headline += owing;
      }
    }

    const resultRows = BUCKETS.map((b, i) => ({
      label: b.label,
      value: Math.round(bucketTotals[i]! * 100) / 100,
      meta: { count: bucketCounts[i], min: b.min, max: b.max },
    }));

    return {
      id: "aged_receivables_heatmap",
      displayName: "Aged receivables heatmap",
      unit: "aud",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline: Math.round(headline * 100) / 100,
      explainQuery:
        "SELECT unpaid invoices (status NOT IN Paid,Void). Bucket each by " +
        "(today - date_due) into Current/1-30/31-60/61-90/90+. Value per " +
        "bucket is sum of COALESCE(total_amount, amount).",
      computedAt: new Date().toISOString(),
    };
  },
};

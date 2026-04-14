/**
 * Revenue vs monthly target — month-to-date.
 *
 * Primary metric for the dashboard. Replaces three competing
 * implementations scattered across routes/kpi.ts, routes/dashboard.ts
 * and routes/analytics.ts. Every surface reads the same number from
 * here.
 *
 * Query shape:
 *   - Sum `invoices.totalAmount` (canonical field — see Pass 1 fix 4)
 *     where status='Paid' and date_paid is in the MTD window.
 *   - Compare against pro-rata $180k monthly target
 *     (MONTHLY_REVENUE_TARGET env var with fallback).
 *   - Rows: one per day with actual + target bars.
 *   - Headline: today's MTD total.
 *   - previousHeadline: last month's full-month total.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const DEFAULT_MONTHLY_TARGET = 180000;

export const revenueVsTargetMtd: MetricDefinition = {
  id: "revenue_vs_target_mtd",
  displayName: "Revenue vs target (MTD)",
  description: "Month-to-date invoice revenue versus the $180k monthly target, broken down by day.",
  category: "revenue",
  unit: "aud",
  supportedPeriods: ["mtd", "30d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "mtd", params.startDate, params.endDate);
    const start = resolved.start;
    const end = resolved.end;

    const monthlyTarget = Number(process.env["MONTHLY_REVENUE_TARGET"]) || DEFAULT_MONTHLY_TARGET;
    const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    const dailyTarget = monthlyTarget / daysInMonth;

    // Aggregate paid invoices by date_paid into daily buckets.
    const sql = `
      SELECT date_paid::date AS day,
             COALESCE(SUM(total_amount), COALESCE(SUM(amount), 0)) AS total
        FROM invoices
       WHERE status = 'Paid'
         AND deleted_at IS NULL
         AND date_paid IS NOT NULL
         AND date_paid >= $1
         AND date_paid <= $2
       GROUP BY day
       ORDER BY day ASC
    `;
    const { rows } = await pool.query(sql, [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]);

    // Fill every day in the window so the line chart is contiguous.
    const byDay = new Map<string, number>();
    for (const r of rows) {
      byDay.set(String(r.day).slice(0, 10), Number(r.total) || 0);
    }
    const resultRows = [];
    let cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    let headline = 0;
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const value = byDay.get(key) ?? 0;
      headline += value;
      resultRows.push({ label: key, value, target: dailyTarget });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Previous full month for change-since-last comparison.
    const prevEnd = new Date(start);
    prevEnd.setDate(0);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    const prevSql = `
      SELECT COALESCE(SUM(total_amount), COALESCE(SUM(amount), 0)) AS total
        FROM invoices
       WHERE status = 'Paid'
         AND deleted_at IS NULL
         AND date_paid IS NOT NULL
         AND date_paid >= $1
         AND date_paid <= $2
    `;
    const prevRes = await pool.query(prevSql, [
      prevStart.toISOString().slice(0, 10),
      prevEnd.toISOString().slice(0, 10),
    ]);
    const previousHeadline = Number(prevRes.rows[0]?.total) || 0;

    return {
      id: "revenue_vs_target_mtd",
      displayName: "Revenue vs target (MTD)",
      unit: "aud",
      period: resolved.period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      rows: resultRows,
      headline,
      previousHeadline,
      explainQuery:
        "Sum of invoices.total_amount where status='Paid' grouped by date_paid, from " +
        `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}. ` +
        `Target line = $${monthlyTarget.toLocaleString()} / ${daysInMonth} days = ` +
        `$${dailyTarget.toFixed(2)}/day pro-rata.`,
      computedAt: new Date().toISOString(),
    };
  },
};

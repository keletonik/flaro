/**
 * Tech utilisation — last 7 days.
 *
 * Utilisation is approximated as scheduled hours per tech over the
 * last 7 days divided by a 40-hour nominal working week. The
 * schedule_events table stores startHour / endHour as integers, so
 * one event's hours = end_hour - start_hour. Rows come back one per
 * tech with the percentage value and raw hours in meta.
 *
 * Headline is the median utilisation across all techs — a single
 * number that says "is the team loaded" without being dragged by
 * one outlier.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const NOMINAL_HOURS_PER_WEEK = 40;

export const techUtilisation7d: MetricDefinition = {
  id: "tech_utilisation_7d",
  displayName: "Tech utilisation (7d)",
  description:
    "Scheduled hours per tech over the last 7 days, as % of a 40h nominal week.",
  category: "ops",
  unit: "pct",
  supportedPeriods: ["7d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "7d", params.startDate, params.endDate);
    const startDay = resolved.start.toISOString().slice(0, 10);
    const endDay = resolved.end.toISOString().slice(0, 10);

    const sql = `
      SELECT assigned_to,
             SUM(GREATEST(end_hour - start_hour, 0))::int AS hours
        FROM schedule_events
       WHERE assigned_to IS NOT NULL
         AND date >= $1
         AND date <= $2
       GROUP BY assigned_to
       ORDER BY hours DESC
    `;
    const { rows } = await pool.query(sql, [startDay, endDay]);

    const resultRows = rows.map((r) => {
      const hours = Number(r.hours) || 0;
      const pct = Math.round((hours / NOMINAL_HOURS_PER_WEEK) * 1000) / 10;
      return {
        label: String(r.assigned_to),
        value: pct,
        meta: { hours, nominal: NOMINAL_HOURS_PER_WEEK },
      };
    });

    const sorted = [...resultRows].map((r) => r.value).sort((a, b) => a - b);
    const headline =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 1
          ? sorted[Math.floor(sorted.length / 2)]!
          : Math.round(((sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2) * 10) / 10;

    return {
      id: "tech_utilisation_7d",
      displayName: "Tech utilisation (7d)",
      unit: "pct",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "SUM(end_hour - start_hour) grouped by assigned_to from " +
        "schedule_events in the last 7 days. Value is hours/40 * 100. " +
        "Headline is the median across techs.",
      computedAt: new Date().toISOString(),
    };
  },
};

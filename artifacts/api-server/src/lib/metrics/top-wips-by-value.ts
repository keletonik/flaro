/**
 * Top 5 outstanding WIP records ranked by quote_amount.
 *
 * The single most useful daily-standup number on the site: "where
 * is the money sitting today". Replaces the hand-rolled rollup in
 * routes/kpi.ts.
 *
 * Query:
 *   SELECT id, task_number, site, client, status, assigned_tech,
 *          quote_amount, created_at, due_date
 *   FROM wip_records
 *   WHERE deleted_at IS NULL
 *     AND status != 'Completed'
 *     AND status != 'On Hold'
 *     AND quote_amount IS NOT NULL
 *   ORDER BY quote_amount DESC
 *   LIMIT 5
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

export const topWipsByValue: MetricDefinition = {
  id: "top_wips_by_value",
  displayName: "Top outstanding WIPs by value",
  description: "Five highest-value WIP records that aren't completed or on hold.",
  category: "ops",
  unit: "aud",
  supportedPeriods: ["today"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "today", params.startDate, params.endDate);

    const sql = `
      SELECT id, task_number, site, client, status, assigned_tech,
             quote_amount, created_at, due_date
        FROM wip_records
       WHERE deleted_at IS NULL
         AND status NOT IN ('Completed', 'On Hold')
         AND quote_amount IS NOT NULL
       ORDER BY quote_amount::numeric DESC
       LIMIT 5
    `;
    const { rows } = await pool.query(sql);

    let headline = 0;
    const resultRows = rows.map((r) => {
      const value = Number(r.quote_amount) || 0;
      headline += value;
      const daysOpen = Math.floor(
        (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        label: `${r.task_number || r.id.slice(0, 8)} · ${r.site}`,
        value,
        meta: {
          id: r.id,
          task_number: r.task_number,
          site: r.site,
          client: r.client,
          status: r.status,
          assigned_tech: r.assigned_tech,
          due_date: r.due_date,
          days_open: daysOpen,
        },
      };
    });

    return {
      id: "top_wips_by_value",
      displayName: "Top outstanding WIPs by value",
      unit: "aud",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "SELECT top 5 wip_records where deleted_at IS NULL and status NOT IN " +
        "('Completed','On Hold') and quote_amount IS NOT NULL, ordered by " +
        "quote_amount DESC. Headline is the sum of those five quote_amount values.",
      computedAt: new Date().toISOString(),
    };
  },
};

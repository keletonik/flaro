/**
 * Repeat site frequency — last 180 days.
 *
 * How many times each site has had work logged against it (WIP
 * record created) in the last 180 days. Rows come back one per
 * site sorted by count descending, capped at 15. Any site with
 * count >= 3 is a "high churn" row (flagged in meta). Headline is
 * the number of sites with count >= 3.
 *
 * Operationally this surfaces "we keep going back to the same
 * address" — a leading signal for a latent compliance or build
 * quality issue that's eating margin.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

export const repeatSiteFrequency: MetricDefinition = {
  id: "repeat_site_frequency",
  displayName: "Repeat site frequency",
  description:
    "Sites with the most WIP records over the last 180 days. Flags repeats (>= 3 visits).",
  category: "quality",
  unit: "count",
  supportedPeriods: ["90d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "90d", params.startDate, params.endDate);

    const sql = `
      SELECT site, client, COUNT(*)::int AS visits
        FROM wip_records
       WHERE deleted_at IS NULL
         AND created_at >= now() - interval '180 days'
       GROUP BY site, client
      HAVING COUNT(*) >= 2
       ORDER BY visits DESC
       LIMIT 15
    `;
    const { rows } = await pool.query(sql);

    let headline = 0;
    const resultRows = rows.map((r) => {
      const visits = Number(r.visits) || 0;
      const isHighChurn = visits >= 3;
      if (isHighChurn) headline += 1;
      return {
        label: String(r.site),
        value: visits,
        meta: {
          client: r.client,
          high_churn: isHighChurn,
        },
      };
    });

    return {
      id: "repeat_site_frequency",
      displayName: "Repeat site frequency",
      unit: "count",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "COUNT(*) wip_records GROUP BY site,client WHERE created_at >= now() " +
        "- interval '180 days' HAVING count >= 2, top 15. Headline is number " +
        "of high-churn sites (count >= 3).",
      computedAt: new Date().toISOString(),
    };
  },
};

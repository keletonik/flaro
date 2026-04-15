/**
 * Top 10 clients by gross margin (last 90 days).
 *
 * Approximates gross margin per client as
 *   invoice_revenue - wip_quote_amount_sum
 * for matched rows on client+task_number, scoped to the last 90
 * days of invoice activity. Rows come back one per client, sorted
 * by absolute margin descending, capped at 10. Headline is the
 * total margin across those top 10.
 *
 * This is a provisional definition — the proper version reads
 * `uptick_facts.revenue / material_cost / labour_cost` once the
 * fact-table wiring lands (Pass 4 fix 10). For now it catches the
 * "who is making us money" question using only wip+invoice.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

export const marginByClientTop10: MetricDefinition = {
  id: "margin_by_client_top10",
  displayName: "Margin by client (top 10)",
  description:
    "Top 10 clients ranked by provisional gross margin (invoice revenue - WIP quote) over last 90 days.",
  category: "revenue",
  unit: "aud",
  supportedPeriods: ["90d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "90d", params.startDate, params.endDate);
    const startIso = resolved.start.toISOString();

    const sql = `
      WITH rev AS (
        SELECT client, COALESCE(SUM(COALESCE(total_amount, amount))::numeric, 0) AS revenue
          FROM invoices
         WHERE deleted_at IS NULL
           AND created_at >= $1
           AND status NOT IN ('Void')
         GROUP BY client
      ),
      cost AS (
        SELECT client, COALESCE(SUM(quote_amount)::numeric, 0) AS quoted
          FROM wip_records
         WHERE deleted_at IS NULL
           AND created_at >= $1
         GROUP BY client
      )
      SELECT rev.client,
             rev.revenue,
             COALESCE(cost.quoted, 0) AS quoted,
             (rev.revenue - COALESCE(cost.quoted, 0)) AS margin
        FROM rev
        LEFT JOIN cost ON cost.client = rev.client
       ORDER BY margin DESC
       LIMIT 10
    `;
    const { rows } = await pool.query(sql, [startIso]);

    let headline = 0;
    const resultRows = rows.map((r) => {
      const margin = Number(r.margin) || 0;
      headline += margin;
      return {
        label: String(r.client),
        value: Math.round(margin * 100) / 100,
        meta: {
          revenue: Math.round(Number(r.revenue) * 100) / 100,
          quoted: Math.round(Number(r.quoted) * 100) / 100,
        },
      };
    });

    return {
      id: "margin_by_client_top10",
      displayName: "Margin by client (top 10)",
      unit: "aud",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline: Math.round(headline * 100) / 100,
      explainQuery:
        "SUM(invoices.total_amount) per client - SUM(wip.quote_amount) per " +
        "client for the last 90 days. Top 10 by margin descending. " +
        "Provisional; uptick_facts version will replace this.",
      computedAt: new Date().toISOString(),
    };
  },
};

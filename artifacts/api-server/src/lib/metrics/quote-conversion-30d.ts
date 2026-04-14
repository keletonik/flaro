/**
 * Quote conversion rate over the last 30 days.
 *
 * Rows are the stages of the quote funnel:
 *   - Sent   (status in Sent/Accepted/Declined/Expired)
 *   - Accepted (status=Accepted)
 *   - Declined (status=Declined)
 *   - Expired  (status=Expired or past valid_until)
 *
 * Value is the count at each stage. Headline is the conversion
 * percentage (accepted / sent * 100), 0-100. Useful on the sales
 * dashboard and for the "how's our quote game" agent answers.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

export const quoteConversion30d: MetricDefinition = {
  id: "quote_conversion_30d",
  displayName: "Quote conversion (30d)",
  description:
    "Quote funnel counts over the last 30 days: Sent, Accepted, Declined, Expired. Headline is conversion %.",
  category: "pipeline",
  unit: "pct",
  supportedPeriods: ["30d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "30d", params.startDate, params.endDate);
    const startIso = resolved.start.toISOString();

    const sql = `
      SELECT status, COUNT(*)::int AS n
        FROM quotes
       WHERE deleted_at IS NULL
         AND created_at >= $1
       GROUP BY status
    `;
    const { rows } = await pool.query(sql, [startIso]);

    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[String(r.status)] = Number(r.n) || 0;

    const accepted = byStatus["Accepted"] ?? 0;
    const declined = byStatus["Declined"] ?? 0;
    const expired = byStatus["Expired"] ?? 0;
    const sent =
      (byStatus["Sent"] ?? 0) + accepted + declined + expired;

    const headline = sent > 0 ? Math.round((accepted / sent) * 1000) / 10 : 0;

    const resultRows = [
      { label: "Sent", value: sent },
      { label: "Accepted", value: accepted },
      { label: "Declined", value: declined },
      { label: "Expired", value: expired },
    ];

    return {
      id: "quote_conversion_30d",
      displayName: "Quote conversion (30d)",
      unit: "pct",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "COUNT quotes by status where created_at >= 30 days ago. Sent = " +
        "Sent+Accepted+Declined+Expired. Headline = accepted/sent * 100.",
      computedAt: new Date().toISOString(),
    };
  },
};

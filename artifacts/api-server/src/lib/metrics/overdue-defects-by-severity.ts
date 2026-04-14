/**
 * Overdue defects bucketed by severity.
 *
 * A defect is "overdue" when its due_date is before today AND its
 * status is not Resolved / Deferred. Rows come back as one row per
 * severity (Critical / High / Medium / Low), count value. Headline
 * is the total overdue across every severity.
 *
 * Replaces the hand-rolled severity rollup that used to live in
 * routes/analytics.ts.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"] as const;

export const overdueDefectsBySeverity: MetricDefinition = {
  id: "overdue_defects_by_severity",
  displayName: "Overdue defects by severity",
  description:
    "Count of defects past their due_date and still open, bucketed by severity.",
  category: "ops",
  unit: "count",
  supportedPeriods: ["today"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "today", params.startDate, params.endDate);

    const sql = `
      SELECT COALESCE(severity, 'Medium') AS severity, COUNT(*)::int AS n
        FROM defects
       WHERE deleted_at IS NULL
         AND status NOT IN ('Resolved', 'Deferred')
         AND due_date IS NOT NULL
         AND due_date < to_char(now(), 'YYYY-MM-DD')
       GROUP BY COALESCE(severity, 'Medium')
    `;
    const { rows } = await pool.query(sql);

    const counts: Record<string, number> = {};
    for (const r of rows) counts[String(r.severity)] = Number(r.n) || 0;

    let headline = 0;
    const resultRows = SEVERITY_ORDER.map((sev) => {
      const value = counts[sev] ?? 0;
      headline += value;
      return { label: sev, value, meta: { severity: sev } };
    });

    return {
      id: "overdue_defects_by_severity",
      displayName: "Overdue defects by severity",
      unit: "count",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: resultRows,
      headline,
      explainQuery:
        "COUNT defects grouped by severity WHERE deleted_at IS NULL " +
        "AND status NOT IN ('Resolved','Deferred') AND due_date < today. " +
        "Headline is the total count.",
      computedAt: new Date().toISOString(),
    };
  },
};

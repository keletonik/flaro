/**
 * Critical defect backlog — trend over the last 30 days.
 *
 * One row per day, value is the snapshot count of Critical-severity
 * defects that were "open" (status NOT IN Resolved/Deferred) as of
 * that day's end. The backlog shrinks only when criticals are
 * resolved — this is the leading compliance-risk indicator.
 *
 * Headline is today's backlog count. A rising line = we're falling
 * behind on criticals, the single thing a compliance officer cares
 * about first.
 */

import type { MetricDefinition, MetricResult, PgLikePool } from "./types";
import { resolvePeriod } from "./types";

export const criticalDefectBacklogTrend: MetricDefinition = {
  id: "critical_defect_backlog_trend",
  displayName: "Critical defect backlog trend",
  description:
    "Daily count of open Critical-severity defects over the last 30 days.",
  category: "compliance",
  unit: "count",
  supportedPeriods: ["30d"],

  async compute(pool: PgLikePool, params): Promise<MetricResult> {
    const resolved = resolvePeriod(params.period ?? "30d", params.startDate, params.endDate);

    const sql = `
      SELECT id, created_at, updated_at, status, severity
        FROM defects
       WHERE deleted_at IS NULL
         AND severity = 'Critical'
         AND created_at <= $2
    `;
    const { rows } = await pool.query(sql, [
      resolved.start.toISOString(),
      resolved.end.toISOString(),
    ]);

    const dayMs = 1000 * 60 * 60 * 24;
    const days: Array<{ label: string; value: number; meta?: Record<string, unknown> }> = [];

    for (let t = resolved.start.getTime(); t <= resolved.end.getTime(); t += dayMs) {
      const day = new Date(t);
      day.setHours(23, 59, 59, 999);
      const key = day.toISOString().slice(0, 10);
      let open = 0;
      for (const r of rows) {
        const created = new Date(r.created_at).getTime();
        if (created > day.getTime()) continue;
        // If resolved AND updated before/at this day, consider it closed by then.
        const isClosed =
          (r.status === "Resolved" || r.status === "Deferred") &&
          new Date(r.updated_at).getTime() <= day.getTime();
        if (!isClosed) open += 1;
      }
      days.push({ label: key, value: open });
    }

    const headline = days.length > 0 ? days[days.length - 1]!.value : 0;
    const previousHeadline = days.length > 0 ? days[0]!.value : 0;

    return {
      id: "critical_defect_backlog_trend",
      displayName: "Critical defect backlog trend",
      unit: "count",
      period: resolved.period,
      periodStart: resolved.start.toISOString(),
      periodEnd: resolved.end.toISOString(),
      rows: days,
      headline,
      previousHeadline,
      explainQuery:
        "For each day in the window, count Critical defects where " +
        "created_at <= day AND NOT (status in Resolved/Deferred " +
        "AND updated_at <= day). Headline is today's count.",
      computedAt: new Date().toISOString(),
    };
  },
};

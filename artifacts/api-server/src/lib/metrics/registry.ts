/**
 * Metric registry — the single source of truth.
 *
 * Every dashboard chart, every export, every agent tool looks up a
 * metric by id in this registry and calls its `compute`. Adding a new
 * metric:
 *
 *   1. Create `lib/metrics/<id>.ts` with a default export implementing
 *      `MetricDefinition`.
 *   2. Import + add it below.
 *   3. Write a line in the docstring's "supported metrics" list.
 *
 * No inline SQL anywhere in the route handlers or the frontend. If you
 * catch yourself writing a SELECT in a chart component, it belongs here
 * instead.
 *
 * Supported metrics (as of this commit):
 *   - revenue_vs_target_mtd
 *   - top_wips_by_value
 *   - overdue_defects_by_severity
 *   - aged_receivables_heatmap
 *   - quote_conversion_30d
 *   - tech_utilisation_7d
 *   - avg_time_to_invoice
 *   - margin_by_client_top10
 *   - repeat_site_frequency
 *   - critical_defect_backlog_trend
 *
 * All 10 metrics from Pass 4 fix set item 2 are now live.
 *   - tech_utilisation_7d
 *   - avg_time_to_invoice
 *   - margin_by_client_top10
 *   - repeat_site_frequency
 *   - critical_defect_backlog_trend
 *   - task_cycle_time_distribution    (added Apr 2026 — uses task_cycle_times)
 *   - invoice_lag_distribution        (added Apr 2026 — uses task_cycle_times)
 */

import type { MetricDefinition, MetricResult, MetricParams, PgLikePool } from "./types";
import { revenueVsTargetMtd } from "./revenue-vs-target-mtd";
import { topWipsByValue } from "./top-wips-by-value";
import { overdueDefectsBySeverity } from "./overdue-defects-by-severity";
import { agedReceivablesHeatmap } from "./aged-receivables-heatmap";
import { quoteConversion30d } from "./quote-conversion-30d";
import { techUtilisation7d } from "./tech-utilisation-7d";
import { avgTimeToInvoice } from "./avg-time-to-invoice";
import { marginByClientTop10 } from "./margin-by-client-top10";
import { repeatSiteFrequency } from "./repeat-site-frequency";
import { criticalDefectBacklogTrend } from "./critical-defect-backlog-trend";
import { taskCycleTimeDistribution } from "./task-cycle-time-distribution";
import { invoiceLagDistribution } from "./invoice-lag-distribution";

const DEFINITIONS: MetricDefinition[] = [
  revenueVsTargetMtd,
  topWipsByValue,
  overdueDefectsBySeverity,
  agedReceivablesHeatmap,
  quoteConversion30d,
  techUtilisation7d,
  avgTimeToInvoice,
  marginByClientTop10,
  repeatSiteFrequency,
  criticalDefectBacklogTrend,
  taskCycleTimeDistribution,
  invoiceLagDistribution,
];

const BY_ID = new Map(DEFINITIONS.map((d) => [d.id, d]));

/** Return every metric's metadata block. Used by the catalogue endpoint. */
export function listMetrics(): Array<Omit<MetricDefinition, "compute">> {
  return DEFINITIONS.map(({ compute: _c, ...rest }) => rest);
}

/** Fetch a metric by id. Returns null if unknown. */
export function getMetric(id: string): MetricDefinition | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Compute a metric end-to-end. The public entry point used by:
 *   - GET /api/metrics/:id
 *   - the metric_get agent tool
 *   - dashboard cards that migrate off their hand-rolled rollups
 */
export async function computeMetric(
  pool: PgLikePool,
  id: string,
  params: MetricParams = {},
): Promise<MetricResult> {
  const metric = BY_ID.get(id);
  if (!metric) throw new Error(`Unknown metric: ${id}`);
  return metric.compute(pool, params);
}

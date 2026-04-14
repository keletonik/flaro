/**
 * Shared types for the metric registry.
 *
 * A metric is a named, versioned query. Every dashboard chart, every
 * export and every agent tool reads from the registry by id — never
 * inlines its own SQL. This is the single source of truth for
 * "what does this number mean".
 *
 * Structure:
 *   - `id`             unique slug, also the agent tool argument
 *   - `displayName`    short label for UI rendering
 *   - `description`    one sentence explaining the metric in plain English
 *   - `category`       groups metrics in the analytics page navigation
 *   - `unit`           "aud" | "count" | "pct" | "days" — drives formatter
 *   - `supportedPeriods`  which period windows this metric accepts
 *   - `compute`        the actual query function
 *   - `drilldown`      optional — returns the underlying rows for a path
 *
 * Compute receives a pool + params and returns a MetricResult. The
 * result carries its own metadata so downstream consumers (agent,
 * chart, export) don't need a separate lookup.
 */

export type MetricUnit = "aud" | "count" | "pct" | "days" | "ratio";

export type Period = "today" | "7d" | "30d" | "mtd" | "90d" | "ytd" | "custom";

export interface MetricParams {
  period?: Period;
  /** For `period: "custom"` — ISO date strings. */
  startDate?: string;
  endDate?: string;
  /** Arbitrary filter map — e.g. { client: "Goodman", status: "Open" }. */
  filters?: Record<string, string>;
}

export interface MetricRow {
  /** Human-readable label for this datum (x-axis value). */
  label: string;
  /** Numeric value (y-axis). Always finite. */
  value: number;
  /** Optional secondary value (e.g. target, benchmark). */
  target?: number;
  /** Any extra fields the chart or drill-down might use. */
  meta?: Record<string, unknown>;
}

export interface MetricResult {
  id: string;
  displayName: string;
  unit: MetricUnit;
  /** The period actually used (resolved from the params). */
  period: Period;
  /** Windows in ISO format for the footer / audit trail. */
  periodStart: string;
  periodEnd: string;
  /** The series itself. */
  rows: MetricRow[];
  /** Aggregate headline number for summary cards. */
  headline?: number;
  /** Comparable value from the prior period (for % change). */
  previousHeadline?: number;
  /** Plain English explanation of the underlying query. */
  explainQuery: string;
  /** Computed at this moment. */
  computedAt: string;
}

// Loose pg client so we don't need @types/pg at type-check time.
export interface PgLikePool {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export interface MetricDefinition {
  id: string;
  displayName: string;
  description: string;
  category: "revenue" | "ops" | "compliance" | "pipeline" | "quality";
  unit: MetricUnit;
  supportedPeriods: Period[];
  compute: (pool: PgLikePool, params: MetricParams) => Promise<MetricResult>;
}

/**
 * Resolve a Period + optional start/end into ISO date strings. Used
 * inside every `compute` function so the period handling is consistent.
 */
export function resolvePeriod(
  p: Period | undefined,
  startDate?: string,
  endDate?: string,
): { period: Period; start: Date; end: Date } {
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  const period = p ?? "30d";
  let start = new Date(end);
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "mtd":
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "ytd":
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case "custom":
      if (startDate) start = new Date(startDate);
      else start.setDate(end.getDate() - 30);
      break;
  }
  return { period, start, end };
}

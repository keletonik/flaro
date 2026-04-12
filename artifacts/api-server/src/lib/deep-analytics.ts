/**
 * Deep analytics math — pure functions only. No DB, no IO.
 *
 * Every helper in this module is deterministic and directly unit-testable.
 * The Uptick routes consume these on pre-aggregated fact rows.
 */

// ───────────────────────────────────────────────────────────────────────────
// Time series: Holt-Winters additive exponential smoothing + linear trend
// ───────────────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  index: number;
  value: number;
  isForecast: boolean;
  lower?: number;
  upper?: number;
}

/**
 * Simple exponential smoothing (no seasonality). Robust to short series.
 * Returns a combined array of smoothed history points and horizon forecasts.
 *
 * If the series has fewer than 3 points, falls back to repeating the last value.
 */
export function simpleExponentialSmoothing(
  values: number[],
  horizon: number,
  alpha = 0.4,
): ForecastPoint[] {
  if (values.length === 0) return [];
  const smoothed: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
  }
  const last = smoothed[smoothed.length - 1];
  const history: ForecastPoint[] = values.map((v, i) => ({ index: i, value: v, isForecast: false }));
  const forecast: ForecastPoint[] = [];
  // Residual stdev → confidence band
  const residuals = values.map((v, i) => v - smoothed[i]);
  const resMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const resVar = residuals.reduce((a, b) => a + (b - resMean) ** 2, 0) / Math.max(1, residuals.length - 1);
  const resStd = Math.sqrt(Math.max(0, resVar));
  for (let h = 1; h <= horizon; h++) {
    const band = 1.96 * resStd * Math.sqrt(h); // grows with horizon
    forecast.push({
      index: values.length + h - 1,
      value: last,
      isForecast: true,
      lower: last - band,
      upper: last + band,
    });
  }
  return [...history, ...forecast];
}

/**
 * Holt's linear trend method — picks up on linear growth/decline. Good default
 * for revenue and labour-hour series where SES underfits.
 */
export function holtLinear(
  values: number[],
  horizon: number,
  alpha = 0.4,
  beta = 0.2,
): ForecastPoint[] {
  if (values.length === 0) return [];
  if (values.length < 2) return simpleExponentialSmoothing(values, horizon, alpha);
  let level = values[0];
  let trend = values[1] - values[0];
  const smoothed: number[] = [level];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(level);
  }
  const residuals = values.map((v, i) => v - smoothed[i]);
  const resMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const resVar = residuals.reduce((a, b) => a + (b - resMean) ** 2, 0) / Math.max(1, residuals.length - 1);
  const resStd = Math.sqrt(Math.max(0, resVar));
  const history: ForecastPoint[] = values.map((v, i) => ({ index: i, value: v, isForecast: false }));
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const yHat = level + h * trend;
    const band = 1.96 * resStd * Math.sqrt(h);
    forecast.push({
      index: values.length + h - 1,
      value: yHat,
      isForecast: true,
      lower: yHat - band,
      upper: yHat + band,
    });
  }
  return [...history, ...forecast];
}

// ───────────────────────────────────────────────────────────────────────────
// Z-score anomaly detection on a rolling window
// ───────────────────────────────────────────────────────────────────────────

export interface AnomalyPoint {
  index: number;
  value: number;
  mean: number;
  std: number;
  zScore: number;
  severity: "normal" | "watch" | "alert";
}

/**
 * Rolling-window Z-score anomaly detector. Any point more than `threshold`
 * standard deviations from the windowed mean is flagged.
 *
 *   "watch" → |z| >= threshold
 *   "alert" → |z| >= threshold * 1.5
 */
export function rollingZScoreAnomalies(
  values: number[],
  window = 7,
  threshold = 2,
): AnomalyPoint[] {
  const result: AnomalyPoint[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window);
    const slice = values.slice(start, i);
    if (slice.length < 3) {
      result.push({ index: i, value: values[i], mean: values[i], std: 0, zScore: 0, severity: "normal" });
      continue;
    }
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
    const std = Math.sqrt(variance);
    const z = std > 0 ? (values[i] - mean) / std : 0;
    const absZ = Math.abs(z);
    const severity: AnomalyPoint["severity"] = absZ >= threshold * 1.5 ? "alert" : absZ >= threshold ? "watch" : "normal";
    result.push({ index: i, value: values[i], mean, std, zScore: Math.round(z * 1000) / 1000, severity });
  }
  return result;
}

// ───────────────────────────────────────────────────────────────────────────
// Dynamic pivot
// ───────────────────────────────────────────────────────────────────────────

export type Aggregator = "sum" | "avg" | "count" | "min" | "max" | "median";

export interface PivotResult {
  rowDim: string;
  colDim: string | null;
  measure: string;
  aggregator: Aggregator;
  rows: string[];
  cols: string[];
  cells: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

function aggregate(values: number[], agg: Aggregator): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "count": return values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
  }
}

/**
 * Pivot an array of rows into a row×col table aggregating `measure` with
 * `aggregator`. Missing values are treated as zero. Row and column keys are
 * sorted alphabetically for determinism.
 */
export function pivot(
  rows: Record<string, any>[],
  rowDim: string,
  colDim: string | null,
  measure: string,
  aggregator: Aggregator,
): PivotResult {
  const grouped = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    const rk = String(r[rowDim] ?? "—");
    const ck = colDim ? String(r[colDim] ?? "—") : "value";
    const mv = Number(r[measure]);
    if (!Number.isFinite(mv)) continue;
    if (!grouped.has(rk)) grouped.set(rk, new Map());
    const sub = grouped.get(rk)!;
    if (!sub.has(ck)) sub.set(ck, []);
    sub.get(ck)!.push(mv);
  }

  const rowKeys = [...grouped.keys()].sort();
  const colKeySet = new Set<string>();
  for (const sub of grouped.values()) for (const ck of sub.keys()) colKeySet.add(ck);
  const colKeys = [...colKeySet].sort();

  const cells: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const rk of rowKeys) {
    cells[rk] = {};
    let rowSum = 0;
    for (const ck of colKeys) {
      const values = grouped.get(rk)?.get(ck) ?? [];
      const v = aggregate(values, aggregator);
      cells[rk][ck] = v;
      rowSum += v;
      colTotals[ck] = (colTotals[ck] ?? 0) + v;
    }
    rowTotals[rk] = rowSum;
    grandTotal += rowSum;
  }

  return {
    rowDim,
    colDim,
    measure,
    aggregator,
    rows: rowKeys,
    cols: colKeys,
    cells,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Client acquisition cohort retention
// ───────────────────────────────────────────────────────────────────────────

export interface CohortCell {
  cohort: string;       // YYYY-MM, the month the client first appeared
  monthsSince: number;  // 0..N
  clients: number;
  revenue: number;
}

export interface CohortResult {
  cohorts: string[];
  periods: number[];
  cells: CohortCell[];
  cohortSizes: Record<string, number>;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/**
 * Group events into client acquisition cohorts. Each row must have `client`
 * and `periodDate` (YYYY-MM-DD). Output is a cohort × months-since-acquisition
 * matrix where cells contain client count and aggregated revenue.
 */
export function clientCohortRetention(
  rows: { client: string; periodDate: string; revenue?: number }[],
): CohortResult {
  const firstSeen = new Map<string, string>();
  for (const r of rows) {
    if (!r.client || !r.periodDate) continue;
    const mk = monthKey(r.periodDate);
    const existing = firstSeen.get(r.client);
    if (!existing || mk < existing) firstSeen.set(r.client, mk);
  }

  // cohort → month-offset → { clientSet, revenueSum }
  const matrix = new Map<string, Map<number, { clients: Set<string>; revenue: number }>>();
  const cohortSizes: Record<string, number> = {};

  for (const [client, cohort] of firstSeen.entries()) {
    cohortSizes[cohort] = (cohortSizes[cohort] ?? 0) + 1;
  }

  for (const r of rows) {
    if (!r.client || !r.periodDate) continue;
    const cohort = firstSeen.get(r.client);
    if (!cohort) continue;
    const offset = monthsBetween(cohort, monthKey(r.periodDate));
    if (offset < 0) continue;
    if (!matrix.has(cohort)) matrix.set(cohort, new Map());
    const sub = matrix.get(cohort)!;
    if (!sub.has(offset)) sub.set(offset, { clients: new Set(), revenue: 0 });
    const cell = sub.get(offset)!;
    cell.clients.add(r.client);
    cell.revenue += r.revenue ?? 0;
  }

  const cohorts = [...matrix.keys()].sort();
  const periodSet = new Set<number>();
  for (const sub of matrix.values()) for (const p of sub.keys()) periodSet.add(p);
  const periods = [...periodSet].sort((a, b) => a - b);

  const cells: CohortCell[] = [];
  for (const cohort of cohorts) {
    for (const period of periods) {
      const cell = matrix.get(cohort)?.get(period);
      if (cell) {
        cells.push({
          cohort,
          monthsSince: period,
          clients: cell.clients.size,
          revenue: Math.round(cell.revenue * 100) / 100,
        });
      }
    }
  }

  return { cohorts, periods, cells, cohortSizes };
}

// ───────────────────────────────────────────────────────────────────────────
// Pearson correlation matrix
// ───────────────────────────────────────────────────────────────────────────

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 1000;
}

// ───────────────────────────────────────────────────────────────────────────
// Percentile rank — benchmarks a subject against a population
// ───────────────────────────────────────────────────────────────────────────

export interface PercentileRank {
  value: number;
  percentile: number; // 0..100
}

export function percentileRank(population: number[], value: number): PercentileRank {
  if (population.length === 0) return { value, percentile: 0 };
  const sorted = [...population].sort((a, b) => a - b);
  let below = 0;
  let equal = 0;
  for (const p of sorted) {
    if (p < value) below++;
    else if (p === value) equal++;
  }
  // Standard percentile rank: (B + 0.5 * E) / N * 100
  const pct = ((below + 0.5 * equal) / sorted.length) * 100;
  return { value, percentile: Math.round(pct * 10) / 10 };
}

// ───────────────────────────────────────────────────────────────────────────
// Leading indicators — quote stage conversion funnel
// ───────────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  conversionFromPrior?: number; // 0..1
  avgDaysToNext?: number;
}

/**
 * Compute the conversion funnel between quote stages. Rows must carry
 * `stage`, `value` (numeric revenue or quote value), and optionally
 * `startedAt` / `endedAt` ISO timestamps so stage dwell times can be derived.
 *
 * Stages are ordered by first appearance time so the caller can override the
 * natural order if needed.
 */
export function quoteFunnel(
  rows: { stage: string; value?: number; startedAt?: string; endedAt?: string }[],
  stageOrder: string[],
): FunnelStage[] {
  const buckets = new Map<string, { count: number; value: number; dwellMs: number[] }>();
  for (const stage of stageOrder) {
    buckets.set(stage, { count: 0, value: 0, dwellMs: [] });
  }
  for (const r of rows) {
    const b = buckets.get(r.stage);
    if (!b) continue;
    b.count++;
    b.value += r.value ?? 0;
    if (r.startedAt && r.endedAt) {
      const dt = Date.parse(r.endedAt) - Date.parse(r.startedAt);
      if (Number.isFinite(dt) && dt >= 0) b.dwellMs.push(dt);
    }
  }
  const result: FunnelStage[] = [];
  let prevCount = 0;
  for (let i = 0; i < stageOrder.length; i++) {
    const stage = stageOrder[i];
    const b = buckets.get(stage)!;
    const dwellAvg = b.dwellMs.length > 0
      ? b.dwellMs.reduce((a, c) => a + c, 0) / b.dwellMs.length / (24 * 60 * 60 * 1000)
      : undefined;
    result.push({
      stage,
      count: b.count,
      value: Math.round(b.value * 100) / 100,
      conversionFromPrior: i === 0 ? undefined : prevCount > 0 ? Math.round((b.count / prevCount) * 1000) / 1000 : 0,
      avgDaysToNext: dwellAvg !== undefined ? Math.round(dwellAvg * 100) / 100 : undefined,
    });
    prevCount = b.count;
  }
  return result;
}

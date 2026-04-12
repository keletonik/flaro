import { describe, it, expect } from "vitest";
import {
  simpleExponentialSmoothing,
  holtLinear,
  rollingZScoreAnomalies,
  pivot,
  clientCohortRetention,
  pearsonCorrelation,
  percentileRank,
  quoteFunnel,
} from "./deep-analytics";

describe("simpleExponentialSmoothing", () => {
  it("returns empty on empty input", () => {
    expect(simpleExponentialSmoothing([], 5)).toEqual([]);
  });

  it("produces history + horizon forecast points", () => {
    const out = simpleExponentialSmoothing([10, 12, 14, 16, 18], 3);
    expect(out).toHaveLength(8);
    const forecasts = out.filter((p) => p.isForecast);
    expect(forecasts).toHaveLength(3);
    for (const f of forecasts) {
      expect(f.lower).toBeDefined();
      expect(f.upper).toBeDefined();
      expect(f.upper!).toBeGreaterThanOrEqual(f.lower!);
    }
  });

  it("forecast value is deterministic given fixed alpha", () => {
    const a = simpleExponentialSmoothing([10, 20, 30], 1);
    const b = simpleExponentialSmoothing([10, 20, 30], 1);
    expect(a[a.length - 1].value).toBe(b[b.length - 1].value);
  });
});

describe("holtLinear", () => {
  it("captures upward linear trend", () => {
    const out = holtLinear([1, 2, 3, 4, 5, 6], 3);
    const forecasts = out.filter((p) => p.isForecast);
    expect(forecasts[0].value).toBeGreaterThan(6);
    expect(forecasts[2].value).toBeGreaterThan(forecasts[0].value);
  });

  it("handles a single-point series without throwing", () => {
    const out = holtLinear([42], 2);
    expect(out).toHaveLength(3);
    expect(out.filter((p) => p.isForecast)).toHaveLength(2);
  });
});

describe("rollingZScoreAnomalies", () => {
  it("flags a clear outlier", () => {
    const values = [10, 11, 9, 10, 11, 9, 10, 50, 10, 11];
    const out = rollingZScoreAnomalies(values, 5, 2);
    const spike = out.find((p) => p.value === 50);
    expect(spike).toBeDefined();
    expect(spike!.severity).not.toBe("normal");
  });

  it("labels normal points as normal", () => {
    const values = [10, 10, 10, 10, 10, 10, 10];
    const out = rollingZScoreAnomalies(values, 5, 2);
    expect(out.every((p) => p.severity === "normal")).toBe(true);
  });
});

describe("pivot", () => {
  it("aggregates a row × col table with sums", () => {
    const rows = [
      { client: "Acme", month: "2026-01", revenue: 100 },
      { client: "Acme", month: "2026-01", revenue: 50 },
      { client: "Acme", month: "2026-02", revenue: 200 },
      { client: "Globex", month: "2026-01", revenue: 75 },
    ];
    const p = pivot(rows, "client", "month", "revenue", "sum");
    expect(p.cells["Acme"]["2026-01"]).toBe(150);
    expect(p.cells["Acme"]["2026-02"]).toBe(200);
    expect(p.cells["Globex"]["2026-01"]).toBe(75);
    expect(p.rowTotals["Acme"]).toBe(350);
    expect(p.grandTotal).toBe(425);
  });

  it("supports avg and count aggregators", () => {
    const rows = [{ k: "a", v: 10 }, { k: "a", v: 20 }, { k: "b", v: 40 }];
    expect(pivot(rows, "k", null, "v", "avg").cells["a"]["value"]).toBe(15);
    expect(pivot(rows, "k", null, "v", "count").cells["a"]["value"]).toBe(2);
    expect(pivot(rows, "k", null, "v", "max").cells["a"]["value"]).toBe(20);
    expect(pivot(rows, "k", null, "v", "median").cells["a"]["value"]).toBe(15);
  });
});

describe("clientCohortRetention", () => {
  it("groups clients into monthly acquisition cohorts", () => {
    const rows = [
      { client: "Acme", periodDate: "2026-01-15", revenue: 100 },
      { client: "Acme", periodDate: "2026-02-10", revenue: 120 },
      { client: "Acme", periodDate: "2026-03-05", revenue: 150 },
      { client: "Globex", periodDate: "2026-02-20", revenue: 80 },
    ];
    const out = clientCohortRetention(rows);
    expect(out.cohorts).toEqual(["2026-01", "2026-02"]);
    expect(out.cohortSizes["2026-01"]).toBe(1);
    expect(out.cohortSizes["2026-02"]).toBe(1);
    const m0 = out.cells.find((c) => c.cohort === "2026-01" && c.monthsSince === 0);
    expect(m0?.clients).toBe(1);
    const m2 = out.cells.find((c) => c.cohort === "2026-01" && c.monthsSince === 2);
    expect(m2?.revenue).toBe(150);
  });
});

describe("pearsonCorrelation", () => {
  it("returns 1 for perfectly correlated series", () => {
    expect(pearsonCorrelation([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 3);
  });
  it("returns -1 for perfectly anti-correlated series", () => {
    expect(pearsonCorrelation([1, 2, 3], [30, 20, 10])).toBeCloseTo(-1, 3);
  });
  it("returns 0 for flat data", () => {
    expect(pearsonCorrelation([1, 1, 1], [5, 5, 5])).toBe(0);
  });
});

describe("percentileRank", () => {
  it("places the max at ~100", () => {
    const p = percentileRank([10, 20, 30, 40, 50], 50);
    expect(p.percentile).toBeGreaterThan(80);
  });
  it("places the min near 0", () => {
    const p = percentileRank([10, 20, 30, 40, 50], 10);
    expect(p.percentile).toBeLessThan(20);
  });
});

describe("quoteFunnel", () => {
  it("computes stage counts and conversion rates", () => {
    const rows = [
      { stage: "Draft", value: 100 },
      { stage: "Draft", value: 200 },
      { stage: "Submitted", value: 100 },
      { stage: "Approved", value: 100 },
    ];
    const out = quoteFunnel(rows, ["Draft", "Submitted", "Approved"]);
    expect(out[0].count).toBe(2);
    expect(out[1].count).toBe(1);
    expect(out[1].conversionFromPrior).toBe(0.5);
    expect(out[2].conversionFromPrior).toBe(1);
    expect(out[2].value).toBe(100);
  });

  it("computes dwell time from timestamps", () => {
    const rows = [
      { stage: "Submitted", value: 0, startedAt: "2026-01-01", endedAt: "2026-01-11" },
      { stage: "Submitted", value: 0, startedAt: "2026-02-01", endedAt: "2026-02-06" },
    ];
    const out = quoteFunnel(rows, ["Submitted"]);
    // (10 + 5) / 2 = 7.5 days
    expect(out[0].avgDaysToNext).toBe(7.5);
  });
});

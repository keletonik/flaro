import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { uptickImports, uptickRawRows, uptickFacts } from "@workspace/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  DASHBOARD_SPECS,
  detectDashboard,
  getDashboardSpec,
  normaliseRow,
  type UptickDashboardType,
} from "../lib/uptick-detector";
import {
  clientCohortRetention,
  holtLinear,
  pearsonCorrelation,
  percentileRank,
  pivot,
  quoteFunnel,
  rollingZScoreAnomalies,
  simpleExponentialSmoothing,
  type Aggregator,
} from "../lib/deep-analytics";

const router = Router();

const MAX_IMPORT_ROWS = Number(process.env["UPTICK_IMPORT_MAX_ROWS"] || process.env["MAX_IMPORT_ROWS"] || 10000);

function uptickEnabled(): boolean {
  return process.env["UPTICK_IMPORTS_ENABLED"] === "1";
}

function deepEnabled(): boolean {
  return process.env["UPTICK_DEEP_ANALYTICS_ENABLED"] === "1" || uptickEnabled();
}

function gate(enabled: () => boolean, res: any): boolean {
  if (!enabled()) {
    res.status(503).json({ error: "Uptick import/analytics disabled. Set UPTICK_IMPORTS_ENABLED=1 to enable." });
    return false;
  }
  return true;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/dashboard-specs — list every supported dashboard with its
// expected fields so the UI can render an import wizard without hard-coding.
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/dashboard-specs", (_req, res) => {
  res.json({
    enabled: uptickEnabled(),
    specs: DASHBOARD_SPECS.map((s) => ({
      type: s.type,
      factType: s.factType,
      label: s.label,
      fields: s.fields.map((f) => ({
        field: f.field,
        label: f.field,
        synonyms: f.synonyms,
        required: f.required === true,
        numeric: f.numeric === true,
        date: f.date === true,
      })),
    })),
  });
});

// ───────────────────────────────────────────────────────────────────────────
// POST /api/uptick/detect — dry-run detection (no DB writes)
// ───────────────────────────────────────────────────────────────────────────
router.post("/uptick/detect", (req, res) => {
  if (!gate(uptickEnabled, res)) return;
  const { headers } = req.body as { headers: string[] };
  if (!Array.isArray(headers) || headers.length === 0) {
    res.status(400).json({ error: "headers array required" });
    return;
  }
  const detection = detectDashboard(headers);
  res.json(detection);
});

// ───────────────────────────────────────────────────────────────────────────
// POST /api/uptick/import — import a parsed CSV
// Body: { rows: Record<string,string>[], originalHeaders: string[],
//         filename?: string, dashboardTypeHint?: string, columnMap?: Record<string,string> }
// ───────────────────────────────────────────────────────────────────────────
router.post("/uptick/import", async (req, res, next) => {
  if (!gate(uptickEnabled, res)) return;
  try {
    const { rows, originalHeaders, filename, dashboardTypeHint, columnMap: userMap } = req.body as {
      rows: Record<string, string>[];
      originalHeaders: string[];
      filename?: string;
      dashboardTypeHint?: UptickDashboardType;
      columnMap?: Record<string, string>;
    };
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "rows array required" });
      return;
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      res.status(413).json({ error: `Too many rows (${rows.length}). Limit is ${MAX_IMPORT_ROWS}.` });
      return;
    }
    const headers = Array.isArray(originalHeaders) && originalHeaders.length > 0
      ? originalHeaders
      : Object.keys(rows[0] ?? {});

    // Detect type from headers unless the caller explicitly provides a hint.
    let detection = detectDashboard(headers);
    if (dashboardTypeHint && dashboardTypeHint !== "unknown") {
      const spec = getDashboardSpec(dashboardTypeHint);
      if (spec) {
        const forced = detectDashboard(headers);
        detection = {
          ...forced,
          type: dashboardTypeHint,
          factType: spec.factType,
          confidence: Math.max(forced.confidence, 0.5),
        };
      }
    }
    const spec = getDashboardSpec(detection.type);
    if (!spec) {
      res.status(422).json({
        error: "Could not identify the Uptick dashboard type for this file.",
        detection,
      });
      return;
    }

    // Use the user-provided column map when supplied, otherwise fall back to
    // the auto-detected one.
    const columnMap = userMap && Object.keys(userMap).length > 0 ? userMap : detection.columnMap;

    const importId = randomUUID();
    const now = new Date();

    // Write import metadata + raw rows + normalized facts in a single pass.
    // Drizzle's node-pg driver doesn't support nested transactions here, so we
    // batch inserts and rely on the caller to retry if the connection blips.
    await db.insert(uptickImports).values({
      id: importId,
      dashboardType: detection.type,
      sourceFilename: filename ?? null,
      importedAt: now,
      importedBy: (req as any).auth?.username ?? null,
      rowCount: rows.length,
      factCount: 0,
      rawHeaders: headers as any,
      columnMap: columnMap as any,
      detectedConfidence: String(detection.confidence) as any,
      warnings: detection.warnings as any,
    });

    const rawRowInserts: any[] = [];
    const factInserts: any[] = [];

    rows.forEach((row, idx) => {
      const rawId = randomUUID();
      rawRowInserts.push({
        id: rawId,
        importId,
        rowIndex: idx,
        data: row as any,
      });
      const { fact, data } = normaliseRow(row, spec, columnMap);
      const factId = randomUUID();
      factInserts.push({
        id: factId,
        importId,
        rawRowId: rawId,
        factType: spec.factType,

        taskNumber: fact.taskNumber ?? null,
        quoteNumber: fact.quoteNumber ?? null,
        client: fact.client ?? null,
        site: fact.site ?? null,
        serviceGroup: fact.serviceGroup ?? null,
        costCenter: fact.costCenter ?? null,
        branch: fact.branch ?? null,
        accountManager: fact.accountManager ?? null,
        technician: fact.technician ?? null,
        taskCategory: fact.taskCategory ?? null,
        status: fact.status ?? null,
        stage: fact.stage ?? null,
        severity: fact.severity ?? null,
        assetType: fact.assetType ?? null,

        periodDate: fact.periodDate ?? null,
        startedAt: fact.startedAt ? new Date(fact.startedAt) : null,
        endedAt: fact.endedAt ? new Date(fact.endedAt) : null,

        revenue: toNumber(fact.revenue)?.toString() ?? null,
        cost: toNumber(fact.cost)?.toString() ?? null,
        labourCost: toNumber(fact.labourCost)?.toString() ?? null,
        materialCost: toNumber(fact.materialCost)?.toString() ?? null,
        otherCost: toNumber(fact.otherCost)?.toString() ?? null,
        hours: toNumber(fact.hours)?.toString() ?? null,
        quantity: toNumber(fact.quantity) !== null ? Math.round(toNumber(fact.quantity)!) : null,
        markup: toNumber(fact.markup)?.toString() ?? null,

        data: data as any,
        createdAt: now,
      });
    });

    // Insert in chunks of 500 so a single import can't explode the prepared-
    // statement parameter count.
    const CHUNK = 500;
    for (let i = 0; i < rawRowInserts.length; i += CHUNK) {
      await db.insert(uptickRawRows).values(rawRowInserts.slice(i, i + CHUNK));
    }
    for (let i = 0; i < factInserts.length; i += CHUNK) {
      await db.insert(uptickFacts).values(factInserts.slice(i, i + CHUNK));
    }
    await db.update(uptickImports).set({ factCount: factInserts.length }).where(eq(uptickImports.id, importId));

    res.status(201).json({
      importId,
      detection: {
        type: detection.type,
        factType: spec.factType,
        confidence: detection.confidence,
        warnings: detection.warnings,
        unmapped: detection.unmapped,
        missingRequired: detection.missingRequired,
      },
      rowCount: rows.length,
      factCount: factInserts.length,
    });
  } catch (err) {
    next(err);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/imports — list imports
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/imports", async (_req, res, next) => {
  if (!gate(uptickEnabled, res)) return;
  try {
    const rows = await db.select().from(uptickImports)
      .where(isNull(uptickImports.deletedAt))
      .orderBy(desc(uptickImports.importedAt));
    res.json(rows.map((r) => ({
      ...r,
      importedAt: r.importedAt.toISOString(),
      deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
    })));
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// DELETE /api/uptick/imports/:id — soft delete an import and its facts
// ───────────────────────────────────────────────────────────────────────────
router.delete("/uptick/imports/:id", async (req, res, next) => {
  if (!gate(uptickEnabled, res)) return;
  try {
    const id = req.params.id;
    const now = new Date();
    await db.update(uptickImports).set({ deletedAt: now }).where(eq(uptickImports.id, id));
    await db.update(uptickFacts).set({ deletedAt: now }).where(eq(uptickFacts.importId, id));
    res.status(204).end();
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/overview — counts, date ranges, totals
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/overview", async (_req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const imports = await db.select().from(uptickImports).where(isNull(uptickImports.deletedAt));
    const facts = await db.select().from(uptickFacts).where(isNull(uptickFacts.deletedAt));

    const byType: Record<string, { imports: number; facts: number; revenue: number; lastImport: string | null }> = {};
    for (const imp of imports) {
      const t = imp.dashboardType;
      if (!byType[t]) byType[t] = { imports: 0, facts: 0, revenue: 0, lastImport: null };
      byType[t].imports++;
      const iso = imp.importedAt.toISOString();
      if (!byType[t].lastImport || iso > byType[t].lastImport) byType[t].lastImport = iso;
    }
    for (const f of facts) {
      const t = f.factType;
      const bucket = byType[t] || { imports: 0, facts: 0, revenue: 0, lastImport: null };
      bucket.facts++;
      bucket.revenue += f.revenue ? Number(f.revenue) : 0;
      byType[t] = bucket;
    }

    const totalRevenue = facts.reduce((s, f) => s + (f.revenue ? Number(f.revenue) : 0), 0);
    const totalCost = facts.reduce((s, f) => s + (f.cost ? Number(f.cost) : 0), 0);
    const dates = facts.map((f) => f.periodDate).filter((d): d is string => !!d).sort();

    res.json({
      totals: {
        imports: imports.length,
        facts: facts.length,
        revenue: Math.round(totalRevenue * 100) / 100,
        cost: Math.round(totalCost * 100) / 100,
        margin: Math.round((totalRevenue - totalCost) * 100) / 100,
      },
      dateRange: {
        from: dates[0] ?? null,
        to: dates[dates.length - 1] ?? null,
      },
      byType,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

function loadFacts(filters: { factType?: string; from?: string; to?: string }) {
  const conds: any[] = [isNull(uptickFacts.deletedAt)];
  if (filters.factType) conds.push(eq(uptickFacts.factType, filters.factType));
  if (filters.from) conds.push(sql`${uptickFacts.periodDate} >= ${filters.from}`);
  if (filters.to) conds.push(sql`${uptickFacts.periodDate} <= ${filters.to}`);
  return db.select().from(uptickFacts).where(and(...conds));
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/pivot?rowDim=&colDim=&measure=&agg=&factType=
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/pivot", async (req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const rowDim = String(req.query.rowDim || "client");
    const colDim = req.query.colDim ? String(req.query.colDim) : null;
    const measure = String(req.query.measure || "revenue");
    const agg = String(req.query.agg || "sum") as Aggregator;
    const factType = req.query.factType ? String(req.query.factType) : undefined;

    const facts = await loadFacts({
      factType,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    });

    // Coerce numeric fields to numbers before pivoting
    const rows = facts.map((f) => ({
      ...f,
      revenue: f.revenue ? Number(f.revenue) : 0,
      cost: f.cost ? Number(f.cost) : 0,
      labourCost: f.labourCost ? Number(f.labourCost) : 0,
      materialCost: f.materialCost ? Number(f.materialCost) : 0,
      otherCost: f.otherCost ? Number(f.otherCost) : 0,
      hours: f.hours ? Number(f.hours) : 0,
      quantity: f.quantity ?? 0,
      margin: (f.revenue ? Number(f.revenue) : 0) - (f.cost ? Number(f.cost) : 0),
    }));

    const result = pivot(rows as any, rowDim, colDim, measure, agg);
    res.json(result);
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/forecast?metric=revenue&horizon=6&method=holt
// Aggregates the chosen metric by month, then forecasts the next `horizon`
// months.
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/forecast", async (req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const metric = String(req.query.metric || "revenue");
    const horizon = Math.min(24, Math.max(1, Number(req.query.horizon) || 6));
    const method = String(req.query.method || "holt");
    const factType = req.query.factType ? String(req.query.factType) : undefined;

    const facts = await loadFacts({ factType });
    const monthly: Record<string, number> = {};
    for (const f of facts) {
      if (!f.periodDate) continue;
      const key = f.periodDate.slice(0, 7);
      const v = (f as any)[metric];
      const n = v === null || v === undefined ? 0 : Number(v);
      if (!Number.isFinite(n)) continue;
      monthly[key] = (monthly[key] ?? 0) + n;
    }

    const months = Object.keys(monthly).sort();
    const values = months.map((m) => monthly[m]);
    const forecast = method === "ses"
      ? simpleExponentialSmoothing(values, horizon)
      : holtLinear(values, horizon);

    // Extend month labels for the forecast tail.
    const labels: string[] = [...months];
    if (months.length > 0) {
      const last = months[months.length - 1];
      let [y, m] = last.split("-").map(Number);
      for (let i = 0; i < horizon; i++) {
        m++;
        if (m > 12) { m = 1; y++; }
        labels.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    }

    res.json({
      metric,
      method,
      horizon,
      points: forecast.map((p, i) => ({ label: labels[i] ?? String(i), ...p })),
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/anomaly?metric=revenue&window=7&threshold=2
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/anomaly", async (req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const metric = String(req.query.metric || "revenue");
    const window = Math.min(60, Math.max(3, Number(req.query.window) || 7));
    const threshold = Math.max(1, Number(req.query.threshold) || 2);
    const factType = req.query.factType ? String(req.query.factType) : undefined;

    const facts = await loadFacts({ factType });
    const byDay: Record<string, number> = {};
    for (const f of facts) {
      if (!f.periodDate) continue;
      const v = (f as any)[metric];
      const n = v === null || v === undefined ? 0 : Number(v);
      if (!Number.isFinite(n)) continue;
      byDay[f.periodDate] = (byDay[f.periodDate] ?? 0) + n;
    }
    const days = Object.keys(byDay).sort();
    const values = days.map((d) => byDay[d]);
    const anomalies = rollingZScoreAnomalies(values, window, threshold);
    res.json({
      metric,
      window,
      threshold,
      points: anomalies.map((a, i) => ({ date: days[i], ...a })),
      flagged: anomalies.filter((a) => a.severity !== "normal").length,
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/cohort — client acquisition retention
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/cohort", async (_req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const facts = await db.select().from(uptickFacts).where(isNull(uptickFacts.deletedAt));
    const rows = facts
      .filter((f) => f.client && f.periodDate)
      .map((f) => ({
        client: f.client!,
        periodDate: f.periodDate!,
        revenue: f.revenue ? Number(f.revenue) : 0,
      }));
    const result = clientCohortRetention(rows);
    res.json(result);
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/benchmark?subject=technician&metric=revenue
// Percentile-ranks every subject against the population on the given metric.
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/benchmark", async (req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const subject = String(req.query.subject || "technician");
    const metric = String(req.query.metric || "revenue");
    const factType = req.query.factType ? String(req.query.factType) : undefined;

    const facts = await loadFacts({ factType });
    const agg: Record<string, number> = {};
    for (const f of facts) {
      const key = (f as any)[subject];
      if (!key) continue;
      const v = (f as any)[metric];
      const n = v === null || v === undefined ? 0 : Number(v);
      if (!Number.isFinite(n)) continue;
      agg[key] = (agg[key] ?? 0) + n;
    }
    const population = Object.values(agg);
    const ranked = Object.entries(agg)
      .map(([k, v]) => ({
        subject: k,
        value: Math.round(v * 100) / 100,
        percentile: percentileRank(population, v).percentile,
      }))
      .sort((a, b) => b.value - a.value);
    res.json({ subject, metric, count: ranked.length, results: ranked });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/correlation?a=revenue&b=hours
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/correlation", async (req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const a = String(req.query.a || "revenue");
    const b = String(req.query.b || "hours");
    const factType = req.query.factType ? String(req.query.factType) : undefined;

    const facts = await loadFacts({ factType });
    const aValues: number[] = [];
    const bValues: number[] = [];
    for (const f of facts) {
      const av = (f as any)[a];
      const bv = (f as any)[b];
      const an = av === null || av === undefined ? null : Number(av);
      const bn = bv === null || bv === undefined ? null : Number(bv);
      if (an !== null && bn !== null && Number.isFinite(an) && Number.isFinite(bn)) {
        aValues.push(an);
        bValues.push(bn);
      }
    }
    const r = pearsonCorrelation(aValues, bValues);
    res.json({ a, b, n: aValues.length, pearson: r });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/funnel?stages=Draft,Submitted,Approved,Won
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/funnel", async (req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const stagesParam = String(req.query.stages || "Draft,Finalised,Submitted,Approved,Actioned,Declined,Expired");
    const stageOrder = stagesParam.split(",").map((s) => s.trim()).filter(Boolean);
    const facts = await db.select().from(uptickFacts)
      .where(and(isNull(uptickFacts.deletedAt), eq(uptickFacts.factType, "quote")));
    const rows = facts.map((f) => ({
      stage: f.stage || f.status || "",
      value: f.revenue ? Number(f.revenue) : 0,
      startedAt: f.startedAt ? f.startedAt.toISOString() : undefined,
      endedAt: f.endedAt ? f.endedAt.toISOString() : undefined,
    }));
    const stages = quoteFunnel(rows, stageOrder);
    res.json({ stages });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// GET /api/uptick/analytics/margin-deep — multi-dim margin breakdown.
// Returns a nested structure keyed by taskCategory → serviceGroup → branch.
// ───────────────────────────────────────────────────────────────────────────
router.get("/uptick/analytics/margin-deep", async (_req, res, next) => {
  if (!gate(deepEnabled, res)) return;
  try {
    const facts = await db.select().from(uptickFacts).where(isNull(uptickFacts.deletedAt));
    const tree: Record<string, Record<string, Record<string, { revenue: number; cost: number }>>> = {};
    for (const f of facts) {
      const cat = f.taskCategory || "—";
      const svc = f.serviceGroup || "—";
      const br = f.branch || "—";
      if (!tree[cat]) tree[cat] = {};
      if (!tree[cat][svc]) tree[cat][svc] = {};
      if (!tree[cat][svc][br]) tree[cat][svc][br] = { revenue: 0, cost: 0 };
      tree[cat][svc][br].revenue += f.revenue ? Number(f.revenue) : 0;
      tree[cat][svc][br].cost += f.cost ? Number(f.cost) : 0;
    }
    res.json({ tree });
  } catch (err) { next(err); }
});

export default router;

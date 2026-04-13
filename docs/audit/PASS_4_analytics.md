# Pass 4 — Data Analytics & Insights

**Lead persona:** D (Data Analytics Architect)
**Reviewed at:** commit `c10affb`
**Scope:** every chart on every page, every metric, every query,
`lib/deep-analytics.ts`, `routes/analytics.ts`, the dashboard KPI
block, chart honesty, drill-down, export, agent integration.

---

## 1. Executive summary

Analytics is the **biggest gap between built infrastructure and
delivered capability** in the entire codebase. `lib/deep-analytics.ts`
ships 16 high-value primitives — Holt linear smoothing, simple
exponential smoothing, rolling z-score anomaly detection, pivot,
client cohort retention, Pearson correlation, percentile rank,
quote funnel, pluggable aggregators — **and almost none of them are
exposed to the user**. The analytics page uses two endpoints
(`/analytics/wip`, `/analytics/pipeline-gaps`), renders stacked bar
charts, and does no drill-down, no period selection beyond hard-coded
windows, no export, no honesty check on the axes.

The dashboard KPI cards were drill-linked in Pass 2 Target 4 but point
at destinations that don't yet have the metric registry behind them —
the links land on the analytics page with query params the page
doesn't read.

There is **no metric registry**. Every chart computes its numbers
inline in either `routes/analytics.ts` or the frontend page. The same
"revenue this month" calculation appears in `/kpi/metrics`,
`/dashboard/summary` and `/analytics/wip` with three different
implementations. Numbers are going to disagree across surfaces.

**Today's grade:** 4/10. Biggest miss on the site.
**With the Pass 4 fix set applied** (metric registry + 10 named
metrics + drill-down contract + export + agent tools): projected 8/10.

## 2. Inventory

### 2.1 Dark primitives in `lib/deep-analytics.ts`
- `simpleExponentialSmoothing(series, alpha)` — 30-line forecaster
- `holtLinear(series, alpha, beta)` — trend-aware forecaster
- `rollingZScoreAnomalies(series, window)` — anomaly detector
- `pivot(rows, rowKey, colKey, valueKey, aggregator)` — pivot table
- `clientCohortRetention(rows)` — cohort analysis
- `pearsonCorrelation(a, b)` — correlation
- `percentileRank(population, value)` — rank percentile
- `quoteFunnel(rows)` — funnel conversion
- `Aggregator` enum: sum / avg / count / min / max / median

**Used in the UI:** zero. Every primitive is exported, compiled, sits
in the api-server bundle, and is never called by any route.

### 2.2 Analytics endpoints
- `GET /api/analytics/wip` — 270 lines, hand-rolled aggregation
- `GET /api/analytics/pipeline-gaps` — pipeline stage counts
- `/api/kpi/metrics` (separate file) — hand-rolled rollups

### 2.3 Frontend analytics page
- `artifacts/aide/src/pages/analytics.tsx` — 576 lines
- Bundle: 455 KB / 120 KB gzipped (heaviest page on the site)
- Imports: `recharts` (BarChart, LineChart, AreaChart, PieChart)
- Fetches: one endpoint on mount
- Charts rendered: ~8 (WIP by status, WIP by tech, quote funnel, defect severity, invoice aging, revenue trend, quotes trend, tech workload)

### 2.4 Dashboard KPIs
- `pages/dashboard.tsx` calls `/kpi/metrics` + `/dashboard/summary` + `/dashboard/focus` + `/analytics/pipeline-gaps` on mount
- Eight KPI cards in a bento grid, now drill-linked (Pass 2 target 4)

### 2.5 Metric registry
- **Does not exist.** No `lib/metrics/` directory. No named query catalogue. No period window abstraction.

## 3. Findings

### 3.1 Numbers will disagree across surfaces
"Revenue this month" is computed three times:
- `routes/kpi.ts` sums `invoices.totalAmount` for the month
- `routes/dashboard.ts` uses `/dashboard/summary`
- `routes/analytics.ts` computes from a SUM + date filter

Each uses a slightly different filter (`status='Paid'` vs any status, `date_paid` vs `date_issued`, `totalAmount` vs `amount`). The Pass 1 finding about `invoices.amount` vs `invoices.totalAmount` compounds this.

**Persona D will reject any merge until there is ONE function that
returns this number and every surface reads from it.**

### 3.2 No honest axes
`analytics.tsx` uses `<BarChart>` with no `domain={[0, 'auto']}` prop. Recharts default zooms to fit, which truncates the y-axis and visually exaggerates small differences. Persona D:
> "Every bar chart on this page lies about its scale. Half of them
> look like they're at zero when the actual value is 80% of the
> maximum."

### 3.3 No drill-down anywhere
Clicking any chart element does nothing. The data behind the bar is unreachable without writing a new SQL query by hand.

### 3.4 No export
No CSV, no PDF, no "copy to clipboard". Every chart is a terminal read.

### 3.5 No period window selector
Hardcoded 30d / 90d / ytd in different places. No single `PeriodPicker` component. A user cannot ask "what did the last two weeks look like?" without writing code.

### 3.6 Agent cannot answer metric questions
`get_kpi_summary` returns raw totals. There are no `metric_get`, `metric_drilldown`, `metric_compare` tools (promised in `docs/FULL_AUDIT_REBUILD_PROMPT.md` §8.5). The agent falls back to `db_search` + prose summarisation, which is slow and often wrong on arithmetic.

### 3.7 `uptick_facts` dimensional model is entirely dark
The fact table exists (`lib/db/src/schema/uptick.ts`), with revenue / cost / labour_cost / material_cost / hours / markup columns and a full dimension star. Import route exists (`routes/uptick.ts`). Every analytics primitive would be 10x cheaper if it ran against `uptick_facts` instead of re-aggregating from `wip_records`. Zero routes use the fact table today.

## 4. Top 10 issues

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | No metric registry — three implementations of "revenue this month" will disagree | 🔴 high | M |
| 2 | `lib/deep-analytics.ts` primitives (16 exports) are entirely unused — built and dark | 🔴 high | M |
| 3 | Dashboard KPIs drill-link to the analytics page but the page ignores the `?view=` and `?period=` query params | 🔴 high | S |
| 4 | No agent `metric_get` / `metric_drilldown` / `metric_compare` tools — AI can't answer arithmetic | 🟠 medium | M |
| 5 | Bar charts don't pin y-axis zero — every chart visually exaggerates small differences | 🟠 medium | S |
| 6 | No drill-down from any chart — the data behind a bar is unreachable | 🟠 medium | M |
| 7 | No period picker — no way to ask "what did last 14 days look like?" | 🟠 medium | S |
| 8 | No CSV / PDF export on any chart | 🟡 low | S |
| 9 | `uptick_facts` star schema is dark — every rollup re-aggregates from wip_records | 🟡 low | L |
| 10 | 455KB / 120KB gz bundle on the analytics page — imports the full recharts barrel | 🟡 low | M |

---

## 5. 5-persona scoring

| Persona | Score | Reasoning |
|---|:---:|---|
| **A — Staff Engineer** | **4/10** | Same number computed three ways across three files. Agent tool output can't match UI chart output because they read different queries. Will drift. |
| **B — Product Designer** | **5/10** | Charts look fine individually, but every bar chart with a truncated y-axis is a visual lie. Drill-down is the single biggest UX miss on the site. |
| **C — AI Engineer** | **4/10** | Agent can't answer "how's revenue this month" without hallucinating. No `metric_*` tools means every arithmetic question routes through `db_search` + prose, which is slow and error-prone on sums. |
| **D — Data Analytics Architect** | **3/10** | The single biggest miss on the site. 16 analytics primitives built, zero used. Three competing definitions of every number. No registry, no drill-down, no export, no period picker, no honest axes. Would fail an audit from any CFO. |
| **E — Field Ops Principal** | **5/10** | Dashboard KPI numbers look right at a glance but I don't trust them because I can see three different revenue figures depending on which page I open. |

**Average:** 4.2 / 10. Lowest of any pass so far. This is the work that will move the needle the most.

## 6. Proposed fix set (ordered)

This is Phase 4 of the main brief. Each item is a dedicated commit.

1. **`lib/metrics/` directory with a registry** — one file per metric. Each file exports a `compute(pool, params): Promise<MetricResult>` function and a metadata block (id, displayName, description, period windows, drill-down). `registry.ts` lists all of them by id.

2. **The 10 metrics that matter** (per `FULL_AUDIT_REBUILD_PROMPT.md` §8.1):
   - `revenue_vs_target_mtd`
   - `overdue_defects_by_severity`
   - `aged_receivables_heatmap`
   - `top_wips_by_value`
   - `quote_conversion_30d`
   - `tech_utilisation_7d`
   - `avg_time_to_invoice`
   - `margin_by_client_top10`
   - `repeat_site_frequency`
   - `critical_defect_backlog_trend`

3. **`GET /api/metrics/:id` endpoint** — reads from the registry, returns a `MetricResult` with rows + metadata. Single endpoint for every dashboard chart, every agent tool, every export.

4. **Three agent tools**: `metric_get`, `metric_drilldown`, `metric_compare`. Added to `chat-tools.ts` + `chat-tool-exec.ts`.

5. **Dashboard KPI cards read from the registry** — replace all three competing revenue implementations with one `metric_get('revenue_vs_target_mtd')` call.

6. **`<PeriodPicker>` component** — today / 7d / 30d / 90d / ytd / custom. Wired into the analytics page and every chart that supports a window.

7. **`<ChartShell>` wrapper** — enforces `domain={[0, 'auto']}` on every numeric y-axis, adds a drill-down action, an export-to-CSV button, a period label in the footer.

8. **Drill-down contract** — clicking any chart element opens a side panel showing the underlying rows, the query in plain English, and a "copy SQL" button.

9. **Analytics page rebuild** — replace the hand-rolled aggregations with registry reads, swap recharts default imports for named imports to cut bundle size.

10. **`uptick_facts` wiring** — a follow-up metric file per domain (repairs, quotes, defects) that reads from `uptick_facts` instead of re-aggregating.

---

## 7. What comes next

- **Pass 4 fix set execution** — commit 1 first (the registry scaffolding), then commit 2 (first metric as proof), then the rest.
- **Pass 5** (Performance & reliability, Persona A + E).
- **Pass 6** (Security & access, Persona A + C).
- **Pass 7** (Operator efficiency, Persona E).
- **Phase 3** page-by-page rebuild proposals.

---

**End of Pass 4.**

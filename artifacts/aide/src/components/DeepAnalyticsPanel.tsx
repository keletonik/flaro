import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Layers,
  AlertTriangle,
  Activity,
  Users,
  GitCompare,
  Sigma,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { apiFetch, formatCurrency } from "@/lib/api";
import { cn } from "@/lib/utils";

type DeepTab = "overview" | "pivot" | "forecast" | "cohort" | "anomaly" | "funnel" | "benchmark" | "correlation";

const TABS: { key: DeepTab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: Sigma },
  { key: "pivot", label: "Pivot", icon: Layers },
  { key: "forecast", label: "Forecast", icon: TrendingUp },
  { key: "anomaly", label: "Anomaly", icon: AlertTriangle },
  { key: "cohort", label: "Cohort", icon: Users },
  { key: "funnel", label: "Quote Funnel", icon: BarChart3 },
  { key: "benchmark", label: "Benchmark", icon: Activity },
  { key: "correlation", label: "Correlation", icon: GitCompare },
];

const DIMS = [
  { key: "client", label: "Client" },
  { key: "site", label: "Site" },
  { key: "serviceGroup", label: "Service Group" },
  { key: "technician", label: "Technician" },
  { key: "branch", label: "Branch" },
  { key: "accountManager", label: "Account Manager" },
  { key: "taskCategory", label: "Task Category" },
  { key: "costCenter", label: "Cost Center" },
  { key: "status", label: "Status" },
  { key: "factType", label: "Fact Type" },
  { key: "periodDate", label: "Date" },
];

const MEASURES = [
  { key: "revenue", label: "Revenue" },
  { key: "cost", label: "Cost" },
  { key: "margin", label: "Margin" },
  { key: "labourCost", label: "Labour Cost" },
  { key: "materialCost", label: "Material Cost" },
  { key: "otherCost", label: "Other Cost" },
  { key: "hours", label: "Hours" },
  { key: "quantity", label: "Quantity" },
];

export default function DeepAnalyticsPanel() {
  const [tab, setTab] = useState<DeepTab>("overview");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide bg-muted/40 rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "overview" && <OverviewTab />}
      {tab === "pivot" && <PivotTab />}
      {tab === "forecast" && <ForecastTab />}
      {tab === "anomaly" && <AnomalyTab />}
      {tab === "cohort" && <CohortTab />}
      {tab === "funnel" && <FunnelTab />}
      {tab === "benchmark" && <BenchmarkTab />}
      {tab === "correlation" && <CorrelationTab />}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Overview
// ───────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    apiFetch("/uptick/analytics/overview").then(setData).catch(() => setData({ error: true }));
  }, []);
  if (!data) return <Loader />;
  if (data.error) return <EmptyState />;
  const { totals, dateRange, byType } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Imports" value={totals.imports.toLocaleString()} />
        <Metric label="Facts" value={totals.facts.toLocaleString()} />
        <Metric label="Revenue" value={formatCurrency(totals.revenue)} />
        <Metric label="Cost" value={formatCurrency(totals.cost)} />
        <Metric label="Margin" value={formatCurrency(totals.margin)} accent={totals.margin >= 0 ? "emerald" : "red"} />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">By Fact Type</h3>
        {Object.keys(byType).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(byType).map(([k, v]: any) => (
              <div key={k} className="flex items-center justify-between py-2 text-xs">
                <span className="font-semibold text-foreground capitalize">{k.replace(/_/g, " ")}</span>
                <div className="flex gap-5 text-muted-foreground">
                  <span>{v.imports} imports</span>
                  <span>{v.facts} facts</span>
                  <span className="font-mono">{formatCurrency(v.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-3">
          Data range: {dateRange.from ?? "—"} to {dateRange.to ?? "—"}
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Pivot
// ───────────────────────────────────────────────────────────────────────────
function PivotTab() {
  const [rowDim, setRowDim] = useState("client");
  const [colDim, setColDim] = useState("");
  const [measure, setMeasure] = useState("revenue");
  const [agg, setAgg] = useState("sum");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const q = new URLSearchParams({ rowDim, measure, agg });
    if (colDim) q.set("colDim", colDim);
    try {
      const d = await apiFetch(`/uptick/analytics/pivot?${q.toString()}`);
      setData(d);
    } catch { setData({ error: true }); }
    setLoading(false);
  }

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [rowDim, colDim, measure, agg]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select label="Rows" value={rowDim} onChange={setRowDim} options={DIMS} />
        <Select label="Columns" value={colDim} onChange={setColDim} options={[{ key: "", label: "— none —" }, ...DIMS]} />
        <Select label="Measure" value={measure} onChange={setMeasure} options={MEASURES} />
        <Select label="Aggregator" value={agg} onChange={setAgg} options={[
          { key: "sum", label: "Sum" }, { key: "avg", label: "Average" }, { key: "count", label: "Count" },
          { key: "median", label: "Median" }, { key: "min", label: "Min" }, { key: "max", label: "Max" },
        ]} />
      </div>
      {loading ? <Loader /> : !data || data.error ? <EmptyState /> : <PivotTable data={data} />}
    </div>
  );
}

function PivotTable({ data }: { data: any }) {
  const rows: string[] = data.rows;
  const cols: string[] = data.cols && data.cols.length > 1 ? data.cols : ["value"];
  return (
    <div className="bg-card border border-border rounded-2xl overflow-auto max-h-[560px]">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b border-border">{data.rowDim}</th>
            {cols.map((c) => (
              <th key={c} className="text-right px-3 py-2 font-semibold text-muted-foreground border-b border-border">{c === "value" ? data.measure : c}</th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-foreground border-b border-border">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r} className="hover:bg-muted/30">
              <td className="px-3 py-1.5 font-medium text-foreground border-b border-border/50">{r}</td>
              {cols.map((c) => (
                <td key={c} className="text-right px-3 py-1.5 font-mono text-muted-foreground border-b border-border/50">
                  {fmtNum(data.cells[r]?.[c] ?? 0)}
                </td>
              ))}
              <td className="text-right px-3 py-1.5 font-mono font-semibold text-foreground border-b border-border/50">
                {fmtNum(data.rowTotals[r] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 bg-muted/50">
          <tr>
            <td className="px-3 py-2 font-bold text-foreground border-t border-border">Grand Total</td>
            {cols.map((c) => (
              <td key={c} className="text-right px-3 py-2 font-mono font-semibold text-foreground border-t border-border">
                {fmtNum(data.colTotals[c] ?? 0)}
              </td>
            ))}
            <td className="text-right px-3 py-2 font-mono font-bold text-foreground border-t border-border">
              {fmtNum(data.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Forecast
// ───────────────────────────────────────────────────────────────────────────
function ForecastTab() {
  const [metric, setMetric] = useState("revenue");
  const [horizon, setHorizon] = useState(6);
  const [method, setMethod] = useState("holt");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const q = new URLSearchParams({ metric, horizon: String(horizon), method });
    try {
      const d = await apiFetch(`/uptick/analytics/forecast?${q.toString()}`);
      setData(d);
    } catch { setData({ error: true }); }
    setLoading(false);
  }

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [metric, horizon, method]);

  const points = data?.points ?? [];
  const historyCutoff = useMemo(() => {
    const lastHist = [...points].reverse().find((p: any) => !p.isForecast);
    return lastHist?.label;
  }, [points]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <Select label="Metric" value={metric} onChange={setMetric} options={MEASURES} />
        <Select label="Method" value={method} onChange={setMethod} options={[
          { key: "holt", label: "Holt Linear" },
          { key: "ses", label: "Simple Exponential" },
        ]} />
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Horizon (months)</label>
          <input type="number" min={1} max={24} value={horizon} onChange={(e) => setHorizon(Math.max(1, Math.min(24, Number(e.target.value) || 6)))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
        </div>
      </div>
      {loading ? <Loader /> : !points.length ? <EmptyState /> : (
        <div className="bg-card border border-border rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={points}>
              <defs>
                <linearGradient id="forecast-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#forecast-gradient)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--card))" />
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
              {historyCutoff && <ReferenceLine x={historyCutoff} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Forecast →", position: "top", fontSize: 10, fill: "#6366f1" }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Anomaly
// ───────────────────────────────────────────────────────────────────────────
function AnomalyTab() {
  const [metric, setMetric] = useState("revenue");
  const [window, setWindow] = useState(7);
  const [threshold, setThreshold] = useState(2);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ metric, window: String(window), threshold: String(threshold) });
    apiFetch(`/uptick/analytics/anomaly?${q.toString()}`)
      .then(setData).catch(() => setData({ error: true })).finally(() => setLoading(false));
  }, [metric, window, threshold]);

  if (loading) return <Loader />;
  if (!data || data.error || !data.points?.length) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select label="Metric" value={metric} onChange={setMetric} options={MEASURES} />
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Window (days)</label>
          <input type="number" min={3} max={60} value={window} onChange={(e) => setWindow(Math.max(3, Math.min(60, Number(e.target.value) || 7)))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Z threshold</label>
          <input type="number" min={1} max={5} step={0.5} value={threshold} onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 2))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs" />
        </div>
        <div className="flex items-end">
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-red-500">{data.flagged}</span> anomalies flagged
          </p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.points}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="value">
              {data.points.map((p: any, i: number) => (
                <Cell key={i} fill={p.severity === "alert" ? "#ef4444" : p.severity === "watch" ? "#f59e0b" : "#22d3ee"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Cohort
// ───────────────────────────────────────────────────────────────────────────
function CohortTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiFetch("/uptick/analytics/cohort").then(setData).catch(() => setData({ error: true })); }, []);
  if (!data) return <Loader />;
  if (data.error || !data.cohorts?.length) return <EmptyState />;
  const periods: number[] = data.periods;
  const cellFor = (cohort: string, period: number) =>
    (data.cells as any[]).find((c) => c.cohort === cohort && c.monthsSince === period);
  const maxRevenue = Math.max(...(data.cells as any[]).map((c) => c.revenue), 1);
  return (
    <div className="bg-card border border-border rounded-2xl p-5 overflow-auto">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Client Acquisition Cohort</h3>
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 text-muted-foreground">Cohort</th>
            {periods.map((p) => <th key={p} className="px-2 py-1 text-muted-foreground text-center">M+{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.cohorts.map((cohort: string) => (
            <tr key={cohort}>
              <td className="px-2 py-1 font-semibold text-foreground whitespace-nowrap">
                {cohort}
                <span className="ml-1 text-[10px] text-muted-foreground">({data.cohortSizes[cohort] ?? 0})</span>
              </td>
              {periods.map((p) => {
                const cell = cellFor(cohort, p);
                const intensity = cell ? cell.revenue / maxRevenue : 0;
                return (
                  <td key={p} className="px-1 py-1">
                    <div
                      className="rounded px-2 py-1 text-center font-mono text-[10px]"
                      style={{
                        background: cell ? `rgba(34, 211, 238, ${0.15 + intensity * 0.55})` : "transparent",
                        color: intensity > 0.6 ? "#fff" : "inherit",
                      }}
                    >
                      {cell ? cell.clients : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Funnel
// ───────────────────────────────────────────────────────────────────────────
function FunnelTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiFetch("/uptick/analytics/funnel").then(setData).catch(() => setData({ error: true })); }, []);
  if (!data) return <Loader />;
  if (data.error || !data.stages?.length) return <EmptyState />;
  const maxCount = Math.max(...data.stages.map((s: any) => s.count), 1);
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Quote Stage Funnel</h3>
      <div className="space-y-3">
        {data.stages.map((s: any) => (
          <div key={s.stage}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-foreground">{s.stage}</span>
              <span className="text-muted-foreground">
                {s.count} · {formatCurrency(s.value)}
                {s.conversionFromPrior !== undefined && <> · {Math.round(s.conversionFromPrior * 100)}% →</>}
                {s.avgDaysToNext !== undefined && <> · {s.avgDaysToNext}d avg</>}
              </span>
            </div>
            <div className="w-full h-6 bg-muted/30 rounded overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(s.count / maxCount) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Benchmark
// ───────────────────────────────────────────────────────────────────────────
function BenchmarkTab() {
  const [subject, setSubject] = useState("technician");
  const [metric, setMetric] = useState("revenue");
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const q = new URLSearchParams({ subject, metric });
    apiFetch(`/uptick/analytics/benchmark?${q.toString()}`)
      .then(setData).catch(() => setData({ error: true }));
  }, [subject, metric]);
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 gap-3">
        <Select label="Subject" value={subject} onChange={setSubject} options={DIMS} />
        <Select label="Metric" value={metric} onChange={setMetric} options={MEASURES} />
      </div>
      {!data ? <Loader /> : data.error || !data.results?.length ? <EmptyState /> : (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="space-y-2">
            {data.results.slice(0, 20).map((r: any) => (
              <div key={r.subject} className="flex items-center gap-3 text-xs">
                <span className="w-[30%] truncate font-semibold text-foreground">{r.subject}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden relative">
                  <div className="h-full bg-cyan-500/80" style={{ width: `${r.percentile}%` }} />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono text-foreground">
                    p{r.percentile.toFixed(0)} · {fmtNum(r.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Correlation
// ───────────────────────────────────────────────────────────────────────────
function CorrelationTab() {
  const [a, setA] = useState("revenue");
  const [b, setB] = useState("hours");
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const q = new URLSearchParams({ a, b });
    apiFetch(`/uptick/analytics/correlation?${q.toString()}`)
      .then(setData).catch(() => setData({ error: true }));
  }, [a, b]);
  const r = data?.pearson ?? 0;
  const strength = Math.abs(r) > 0.7 ? "Strong" : Math.abs(r) > 0.4 ? "Moderate" : Math.abs(r) > 0.2 ? "Weak" : "Negligible";
  const direction = r > 0 ? "positive" : r < 0 ? "negative" : "";
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 gap-3">
        <Select label="Variable A" value={a} onChange={setA} options={MEASURES} />
        <Select label="Variable B" value={b} onChange={setB} options={MEASURES} />
      </div>
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pearson r</p>
          <p className="text-5xl font-bold tracking-tight" style={{ color: Math.abs(r) > 0.4 ? "#22d3ee" : "hsl(var(--foreground))" }}>
            {r.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">
            {strength} {direction} correlation · n = {data?.n ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Shared widgets
// ───────────────────────────────────────────────────────────────────────────
function Metric({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "red" }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-xl font-bold tracking-tight mt-1",
        accent === "emerald" && "text-emerald-500",
        accent === "red" && "text-red-500",
      )}>
        {value}
      </p>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { key: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
      >
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Loader() {
  return <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

function EmptyState() {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
      <p className="text-sm text-muted-foreground">No Uptick data imported yet.</p>
      <p className="text-[11px] text-muted-foreground/60 mt-1">Import a CSV from the Uptick tab to populate analytics.</p>
    </div>
  );
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

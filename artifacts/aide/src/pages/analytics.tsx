import { useState, useEffect, useMemo, useCallback } from "react";
import { Target, DollarSign, Palette, ChevronDown, AlertTriangle, Upload } from "lucide-react";
import { SavedFiltersBar } from "@/components/SavedFiltersBar";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { apiFetch, formatCurrency } from "@/lib/api";
import LiveToggle from "@/components/LiveToggle";
import CSVImportModal from "@/components/CSVImportModal";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { CountUp } from "@/components/ui/CountUp";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";

type ChartType = "bar" | "line" | "area" | "pie";
type TimePeriod = "day" | "week" | "month";

const COLOR_THEMES: Record<string, string[]> = {
  "Default": ["#D97706", "#2563EB", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"],
  "Ocean": ["#0EA5E9", "#06B6D4", "#14B8A6", "#0284C7", "#0891B2", "#0D9488"],
  "Sunset": ["#F97316", "#EF4444", "#F59E0B", "#DC2626", "#EA580C", "#D97706"],
  "Forest": ["#16A34A", "#15803D", "#22C55E", "#84CC16", "#65A30D", "#4ADE80"],
  "Midnight": ["#6366F1", "#8B5CF6", "#A78BFA", "#7C3AED", "#6D28D9", "#C084FC"],
  "Corporate": ["#1E40AF", "#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
  "Monochrome": ["#374151", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB"],
};

const fmt = formatCurrency;
function fmtShort(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n); }

interface AnalyticsData {
  revenue: {
    today: number; thisWeek: number; thisMonth: number;
    monthlyTarget: number; proRataTarget: number; progressPercent: number;
    byDay: { date: string; revenue: number; target: number }[];
    byWeek: { week: string; revenue: number; target: number }[];
    byMonth: { month: string; revenue: number; target: number }[];
  };
  wip: {
    total: number; active: number; pipelineValue: number;
    byStatus: Record<string, number>;
    byTech: { tech: string; count: number; value: number; actualCost?: number; actualProfit?: number; hours?: number; uninvoiced?: number }[];
    byType: Record<string, number>;
    valueByStatus: Record<string, number>;
  };
  financials?: {
    totalQuotedCost: number; totalRevisedSell: number; totalActualCost: number;
    totalNetInvoiced: number; totalActualProfit: number; totalActualHours: number;
    totalUninvoiced: number; totalCashPosition: number;
    totalCommittedCost: number; totalBillable: number; avgMargin: number;
    profitByCategory: { category: string; revenue: number; cost: number; profit: number; count: number; margin: number }[];
    marginDistribution: { range: string; count: number }[];
    cashPositionByTech: { tech: string; value: number }[];
    overBudgetJobs: { taskNumber: string; description: string; client: string; cashPosition: number; revisedSell: number; actualCost: number }[];
  };
  tasks: {
    totalCompleted: number; activeJobs: number; avgCompletionDays: number;
    completedByDay: { date: string; completed: number }[];
  };
  quotes: {
    total: number; sent: number; accepted: number; declined: number; expired: number;
    totalValue: number; acceptedValue: number;
  };
  invoices: { outstanding: number; overdue: number; total: number };
  generatedAt: string;
}

function ChartTypeSelector({ value, onChange }: { value: ChartType; onChange: (t: ChartType) => void }) {
  const types: { key: ChartType; label: string }[] = [
    { key: "bar", label: "Bar" }, { key: "line", label: "Line" }, { key: "area", label: "Area" }, { key: "pie", label: "Pie" },
  ];
  return (
    <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
      {types.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={cn("px-2 py-1 rounded-md text-[10px] font-semibold transition-all",
            value === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>{t.label}</button>
      ))}
    </div>
  );
}

function ColorThemeSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-all">
        <Palette size={11} />
        <span>{value}</span>
        <ChevronDown size={10} />
      </button>
      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg p-2 hidden group-hover:block z-50 min-w-[140px]">
        {Object.entries(COLOR_THEMES).map(([name, colors]) => (
          <button key={name} onClick={() => onChange(name)}
            className={cn("w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all",
              value === name ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}>
            <div className="flex gap-0.5">
              {colors.slice(0, 4).map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />)}
            </div>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TargetGauge({ current, target, label }: { current: number; target: number; label?: string }) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 100 ? "#10B981" : pct >= 70 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[120px] h-[120px]">
        <svg className="w-[120px] h-[120px] -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[26px] font-bold text-foreground tracking-tight leading-none tabular-nums">{pct}%</span>
          <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-[0.15em] mt-1">of target</span>
        </div>
      </div>
      {label && <p className="font-mono text-[10px] text-muted-foreground mt-2 uppercase tracking-[0.1em]">{label}</p>}
    </div>
  );
}

interface MetricTileProps {
  label: string;
  value?: string;
  numericValue?: number;
  format?: (n: number) => string;
  sub?: string;
  color: string;
}

function MetricTile({ label, value, numericValue, format, sub, color }: MetricTileProps) {
  // Flat stat cell — no card wrapper. Used inside the dense KPI grids.
  // The accent variable stays for the label tint; value uses foreground.
  const accent = color.includes("emerald") ? "text-emerald-500"
    : color.includes("blue") ? "text-blue-500"
    : color.includes("amber") ? "text-amber-500"
    : color.includes("red") ? "text-red-500"
    : "text-primary";
  return (
    <div className="px-3 py-2">
      <p className={cn("font-mono text-[9px] uppercase tracking-[0.15em] opacity-70 mb-0.5", accent)}>{label}</p>
      {numericValue !== undefined
        ? <CountUp value={numericValue} format={format} className="block font-mono text-[20px] font-bold text-foreground tracking-tight tabular-nums leading-none" />
        : <p className="font-mono text-[20px] font-bold text-foreground tracking-tight tabular-nums leading-none">{value}</p>}
      {sub && <p className="font-mono text-[10px] text-muted-foreground/60 mt-1 truncate">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, chartType, onChartTypeChange, className }: {
  title: string; children: React.ReactNode; chartType?: ChartType; onChartTypeChange?: (t: ChartType) => void; className?: string;
}) {
  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
      <header className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{title}</span>
        {chartType && onChartTypeChange && <ChartTypeSelector value={chartType} onChange={onChartTypeChange} />}
      </header>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

function RenderChart({ type, data, dataKey, nameKey, colors, target }: {
  type: ChartType; data: any[]; dataKey: string; nameKey: string; colors: string[]; target?: number;
}) {
  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey={dataKey} nameKey={nameKey} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  const ChartComp = type === "area" ? AreaChart : type === "line" ? LineChart : BarChart;
  const DataComp = type === "area" ? Area : type === "line" ? Line : Bar;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ChartComp data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis dataKey={nameKey} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
        <Tooltip formatter={(v: number) => typeof v === "number" && v > 100 ? fmt(v) : v} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
        {target && <ReferenceLine y={target} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `Target: ${fmt(target)}`, position: "insideTopRight", fontSize: 10, fill: "#EF4444" }} />}
        {type === "area" ? (
          <Area type="monotone" dataKey={dataKey} fill={colors[0]} fillOpacity={0.15} stroke={colors[0]} strokeWidth={2} />
        ) : type === "line" ? (
          <Line type="monotone" dataKey={dataKey} stroke={colors[0]} strokeWidth={2.5} dot={{ r: 3, fill: colors[0] }} activeDot={{ r: 5 }} />
        ) : (
          <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
        )}
      </ChartComp>
    </ResponsiveContainer>
  );
}

function PatternInsights({ data }: { data: AnalyticsData }) {
  const insights: { type: "positive" | "negative" | "neutral"; text: string }[] = [];
  const r = data.revenue;

  // Revenue trend analysis
  if (r.progressPercent >= 80) insights.push({ type: "positive", text: `On track: ${r.progressPercent}% of monthly target achieved` });
  else if (r.progressPercent < 50) insights.push({ type: "negative", text: `Behind target: only ${r.progressPercent}% of $${(r.monthlyTarget/1000).toFixed(0)}k monthly target` });

  // Week-over-week comparison
  if (r.byWeek.length >= 2) {
    const lastWeek = r.byWeek[r.byWeek.length - 1]?.revenue || 0;
    const prevWeek = r.byWeek[r.byWeek.length - 2]?.revenue || 0;
    if (prevWeek > 0) {
      const change = ((lastWeek - prevWeek) / prevWeek * 100);
      if (change > 10) insights.push({ type: "positive", text: `Revenue up ${change.toFixed(0)}% week-over-week` });
      else if (change < -10) insights.push({ type: "negative", text: `Revenue down ${Math.abs(change).toFixed(0)}% week-over-week` });
    }
  }

  // Quote conversion
  if (data.quotes.total > 0) {
    const rate = Math.round(data.quotes.accepted / data.quotes.total * 100);
    if (rate < 40) insights.push({ type: "negative", text: `Low quote conversion: ${rate}% (${data.quotes.accepted}/${data.quotes.total})` });
    else if (rate > 70) insights.push({ type: "positive", text: `Strong quote conversion: ${rate}%` });
  }

  // Outstanding invoices
  if (data.invoices.overdue > 0) insights.push({ type: "negative", text: `${data.invoices.overdue} overdue invoices totalling ${fmt(data.invoices.outstanding)}` });

  // WIP pipeline
  if (data.wip.active > 0) insights.push({ type: "neutral", text: `${data.wip.active} active WIP items in pipeline (${fmt(data.wip.pipelineValue)})` });

  // Tech utilisation
  if (data.wip.byTech.length > 0) {
    const maxTech = data.wip.byTech.reduce((a, b) => a.count > b.count ? a : b);
    const minTech = data.wip.byTech.reduce((a, b) => a.count < b.count ? a : b);
    if (maxTech.count > minTech.count * 2) insights.push({ type: "negative", text: `Workload imbalance: ${maxTech.tech.split(" ")[0]} has ${maxTech.count} jobs vs ${minTech.tech.split(" ")[0]} with ${minTech.count}` });
  }

  // Completion rate
  if (data.tasks.avgCompletionDays > 14) insights.push({ type: "negative", text: `Slow completion: averaging ${data.tasks.avgCompletionDays} days per job` });
  else if (data.tasks.avgCompletionDays > 0 && data.tasks.avgCompletionDays <= 7) insights.push({ type: "positive", text: `Fast turnaround: ${data.tasks.avgCompletionDays} day average completion` });

  return (
    <section className="border border-border rounded-lg">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">briefing</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground tabular-nums">
          {insights.filter(i => i.type === "negative").length} alerts
        </span>
      </header>
      <div className="divide-y divide-border/60">
        {insights.map((ins, i) => (
          <div key={i} className={cn(
            "flex items-center gap-3 px-3 py-2 text-[12px] leading-tight font-mono",
            ins.type === "positive" ? "text-emerald-500" :
            ins.type === "negative" ? "text-red-500" :
            "text-muted-foreground",
          )}>
            <span className="shrink-0 w-3 text-center font-bold">
              {ins.type === "positive" ? "↑" : ins.type === "negative" ? "!" : ">"}
            </span>
            <span className="flex-1">{ins.text}</span>
          </div>
        ))}
        {insights.length === 0 && (
          <p className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
            Everything quiet. Import an Uptick CSV to populate the briefing.
          </p>
        )}
      </div>
    </section>
  );
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorTheme, setColorTheme] = useState("Default");
  const [advancedMode, setAdvancedMode] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState<TimePeriod>("week");
  const [revenueChartType, setRevenueChartType] = useState<ChartType>("bar");
  const [wipChartType, setWipChartType] = useState<ChartType>("bar");
  const [taskChartType, setTaskChartType] = useState<ChartType>("area");
  const [techChartType, setTechChartType] = useState<ChartType>("bar");
  const [quoteChartType, setQuoteChartType] = useState<ChartType>("pie");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const colors = COLOR_THEMES[colorTheme] || COLOR_THEMES.Default;

  const fetchData = useCallback(() => {
    apiFetch<AnalyticsData>("/analytics/wip").then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useLiveUpdates(() => { fetchData(); });

  const revenueData = useMemo(() => {
    if (!data) return [];
    if (revenuePeriod === "day") return data.revenue.byDay.map(d => ({ name: d.date.slice(5), value: d.revenue, target: d.target }));
    if (revenuePeriod === "week") return data.revenue.byWeek.map(d => ({ name: d.week, value: d.revenue, target: d.target }));
    return data.revenue.byMonth.map(d => ({ name: d.month, value: d.revenue, target: d.target }));
  }, [data, revenuePeriod]);

  const wipStatusData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.wip.byStatus).map(([name, value]) => ({ name, value }));
  }, [data]);

  const wipValueData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.wip.valueByStatus).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [data]);

  const techData = useMemo(() => {
    if (!data) return [];
    return data.wip.byTech.sort((a, b) => b.value - a.value);
  }, [data]);

  const quoteData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Sent", value: data.quotes.sent },
      { name: "Accepted", value: data.quotes.accepted },
      { name: "Declined", value: data.quotes.declined },
      { name: "Expired", value: data.quotes.expired },
    ].filter(d => d.value > 0);
  }, [data]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Analytics" subtitle="Loading metrics…" />
      <div className="px-4 sm:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="skeleton-shimmer h-3 w-1/2" />
              <div className="skeleton-shimmer h-6 w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="skeleton-shimmer h-3 w-1/3" />
              <div className="skeleton-shimmer h-[200px] w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Failed to load analytics data</p>
    </div>
  );

  const targetForPeriod = revenuePeriod === "day" ? data.revenue.monthlyTarget / 30
    : revenuePeriod === "week" ? data.revenue.monthlyTarget / 4.33
    : data.revenue.monthlyTarget;

  return (
      <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix=">>"
        title="Analytics"
        subtitle="Performance metrics and revenue tracking"
        wrap
        actions={
          <>
            <LiveToggle onTick={fetchData} interval={10_000} />
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Upload size={10} /> Import CSV
            </button>
            <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 mr-2">
              <button onClick={() => setAdvancedMode(false)} className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all", !advancedMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Simple</button>
              <button onClick={() => setAdvancedMode(true)} className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all", advancedMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Advanced</button>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" title="From date" />
              <span className="text-[10px] text-muted-foreground">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" title="To date" />
              {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>}
            </div>
            <ColorThemeSelector value={colorTheme} onChange={setColorTheme} />
          </>
        }
      />

      <div className="px-4 py-4 space-y-4 max-w-[1400px]">
        <SavedFiltersBar
          scope="analytics"
          currentValue={{ dateFrom, dateTo, revenuePeriod, advancedMode }}
          isEmpty={(v) => !v.dateFrom && !v.dateTo && v.revenuePeriod === "week" && v.advancedMode}
          onApply={(v) => {
            setDateFrom(v.dateFrom || "");
            setDateTo(v.dateTo || "");
            if (v.revenuePeriod) setRevenuePeriod(v.revenuePeriod);
            if (typeof v.advancedMode === "boolean") setAdvancedMode(v.advancedMode);
          }}
        />

        {/* Briefing — pattern detection as a dense hairline-separated list */}
        <PatternInsights data={data} />

        {/* Revenue target — compact strip. Donut at left, 4 KPI cells in a
            divided row to its right. One bordered section, no inner cards. */}
        <section className="border border-border rounded-lg overflow-hidden">
          <header className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
              <Target size={10} className="text-primary" />
              monthly revenue target · {fmt(data.revenue.monthlyTarget)}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground tabular-nums">
              day {new Date().getDate()} of month
            </span>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] items-center">
            <div className="flex items-center justify-center p-4 md:border-r border-border">
              <TargetGauge current={data.revenue.thisMonth} target={data.revenue.monthlyTarget} label="" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/60">
              <MetricTile label="today" numericValue={data.revenue.today} format={fmt} color="bg-emerald-500/8" />
              <MetricTile label="this week" numericValue={data.revenue.thisWeek} format={fmt} color="bg-blue-500/8" />
              <MetricTile label="this month" numericValue={data.revenue.thisMonth} format={fmt} sub={`${data.revenue.progressPercent}% of target`} color="bg-primary/8" />
              <MetricTile label="pro-rata" numericValue={data.revenue.proRataTarget} format={fmt} sub={`expected by today`} color="bg-amber-500/8" />
            </div>
          </div>
        </section>

        {/* Revenue Chart */}
        <ChartCard title="Revenue Over Time" chartType={revenueChartType} onChartTypeChange={setRevenueChartType}>
          <div className="flex items-center gap-1.5 mb-4">
            {(["day", "week", "month"] as TimePeriod[]).map(p => (
              <button key={p} onClick={() => setRevenuePeriod(p)}
                className={cn("px-3 py-1 rounded-lg text-[10px] font-semibold transition-all uppercase",
                  revenuePeriod === p ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>{p}</button>
            ))}
          </div>
          <RenderChart type={revenueChartType} data={revenueData} dataKey="value" nameKey="name" colors={colors} target={targetForPeriod} />
        </ChartCard>

        {/* Advanced mode — detailed breakdowns */}
        {advancedMode && <>

        {/* Financial KPIs — only when financials data present */}
        {data.financials && (
          <section className="border border-border rounded-lg overflow-hidden">
            <header className="px-3 py-2 border-b border-border flex items-center gap-2">
              <DollarSign size={10} className="text-emerald-500" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                financial summary · wip portfolio
              </span>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-border/60">
              <MetricTile label="revised sell" numericValue={data.financials.totalRevisedSell} format={fmt} color="bg-emerald-500/8" />
              <MetricTile label="actual cost" numericValue={data.financials.totalActualCost} format={fmt} color="bg-red-500/8" />
              <MetricTile label="actual profit" numericValue={data.financials.totalActualProfit} format={fmt} sub={`${data.financials.avgMargin}% margin`} color="bg-blue-500/8" />
              <MetricTile label="net invoiced" numericValue={data.financials.totalNetInvoiced} format={fmt} color="bg-emerald-500/8" />
              <MetricTile label="uninvoiced wip" numericValue={data.financials.totalUninvoiced} format={fmt} color="bg-amber-500/8" />
              <MetricTile label="total hours" numericValue={data.financials.totalActualHours} format={(n) => `${n.toFixed(0)}h`} sub={`cash: ${fmt(data.financials.totalCashPosition)}`} color="bg-primary/8" />
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="WIP by Status" chartType={wipChartType} onChartTypeChange={setWipChartType}>
            <RenderChart type={wipChartType} data={wipStatusData} dataKey="value" nameKey="name" colors={colors} />
          </ChartCard>

          <ChartCard title="Tasks Completed (30 Days)" chartType={taskChartType} onChartTypeChange={setTaskChartType}>
            <RenderChart type={taskChartType} data={data.tasks.completedByDay.map(d => ({ name: d.date.slice(5), value: d.completed }))} dataKey="value" nameKey="name" colors={[colors[2]]} />
          </ChartCard>
        </div>

        {/* Profit by Category + Margin Distribution */}
        {data.financials && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Profit by Category">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.financials.profitByCategory} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill={colors[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Cost" fill={colors[3] || "#EF4444"} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill={colors[2] || "#10B981"} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Margin Distribution">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.financials.marginDistribution.filter(d => d.count > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="count" nameKey="range" paddingAngle={2}>
                    {data.financials.marginDistribution.filter(d => d.count > 0).map((_, i) => <Cell key={i} fill={["#EF4444", "#F97316", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Tech Workload + Quotes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Revenue by Tech" chartType={techChartType} onChartTypeChange={setTechChartType}>
            <RenderChart type={techChartType} data={techData.map(t => ({ name: t.tech.split(" ")[0], value: t.value }))} dataKey="value" nameKey="name" colors={colors} />
          </ChartCard>

          <ChartCard title="Quote Pipeline" chartType={quoteChartType} onChartTypeChange={setQuoteChartType}>
            <RenderChart type={quoteChartType} data={quoteData} dataKey="value" nameKey="name" colors={colors} />
          </ChartCard>
        </div>

        {/* Cash Position by Tech */}
        {data.financials && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Cash Position by Tech">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.financials.cashPositionByTech.filter(t => t.tech !== "Unassigned")} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <YAxis dataKey="tech" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} tickFormatter={(v: string) => v.split(" ")[0]} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={2} />
                  <Bar dataKey="value" name="Cash Position" radius={[0, 4, 4, 0]}>
                    {data.financials.cashPositionByTech.filter(t => t.tech !== "Unassigned").map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tech Hours & Profit">
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                <div className="grid grid-cols-5 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-2 pb-1 border-b border-border">
                  <span>Tech</span><span className="text-right">Jobs</span><span className="text-right">Hours</span><span className="text-right">Revenue</span><span className="text-right">Profit</span>
                </div>
                {data.wip.byTech.filter(t => t.tech !== "Unassigned").sort((a, b) => (b.value || 0) - (a.value || 0)).map((t, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="font-medium text-foreground truncate">{t.tech.split(" ")[0]}</span>
                    <span className="text-right text-muted-foreground">{t.count}</span>
                    <span className="text-right text-muted-foreground">{(t.hours || 0).toFixed(0)}h</span>
                    <span className="text-right font-medium text-foreground">{fmt(t.value)}</span>
                    <span className={cn("text-right font-medium", (t.actualProfit || 0) >= 0 ? "text-emerald-500" : "text-red-500")}>{fmt(t.actualProfit || 0)}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        )}

        {/* Over Budget Jobs Alert */}
        {data.financials && data.financials.overBudgetJobs.length > 0 && (
          <div className="bg-card border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-red-500" />
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-wide">Over Budget Jobs ({data.financials.overBudgetJobs.length})</h3>
            </div>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-2 pb-1 border-b border-border">
                <span>Task</span><span>Client</span><span className="text-right">Revised Sell</span><span className="text-right">Actual Cost</span><span className="text-right">Cash Position</span>
              </div>
              {data.financials.overBudgetJobs.map((j, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-red-500/5 transition-colors">
                  <span className="font-mono text-foreground">{j.taskNumber}</span>
                  <span className="text-muted-foreground truncate">{j.client}</span>
                  <span className="text-right text-foreground">{fmt(j.revisedSell)}</span>
                  <span className="text-right text-red-400">{fmt(j.actualCost)}</span>
                  <span className="text-right font-bold text-red-500">{fmt(j.cashPosition)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WIP Value + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="WIP Value by Status" className="lg:col-span-2">
            <RenderChart type="bar" data={wipValueData} dataKey="value" nameKey="name" colors={[colors[1]]} />
          </ChartCard>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Pipeline Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">WIP Pipeline</span>
                <span className="text-[13px] font-bold text-foreground">{fmt(data.wip.pipelineValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Quote Pipeline</span>
                <span className="text-[13px] font-bold text-foreground">{fmt(data.quotes.totalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Accepted Quotes</span>
                <span className="text-[13px] font-bold text-emerald-500">{fmt(data.quotes.acceptedValue)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Outstanding Invoices</span>
                <span className="text-[13px] font-bold text-amber-500">{fmt(data.invoices.outstanding)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Overdue</span>
                <span className="text-[13px] font-bold text-red-500">{fmt(data.invoices.overdue)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Active WIPs</span>
                <span className="text-[13px] font-bold text-foreground">{data.wip.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Avg Completion Time</span>
                <span className="text-[13px] font-bold text-foreground">{data.tasks.avgCompletionDays} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">Total Completed</span>
                <span className="text-[13px] font-bold text-foreground">{data.tasks.totalCompleted}</span>
              </div>
            </div>
          </div>
        </div>
        </>}
      </div>

      <CSVImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (rows, columnMap) => {
          await apiFetch("/wip/import", { method: "POST", body: JSON.stringify({ rows, columnMap }) });
          fetchData();
          window.dispatchEvent(new CustomEvent("aide-analyse", { detail: { message: `I just imported ${rows.length} rows of WIP data. Analyse the import: check for duplicates, missing fields, data quality, and key patterns. Then summarise how the analytics have changed.` } }));
        }}
        availableFields={[
          { key: "taskNumber", label: "Task Number" }, { key: "site", label: "Site", required: true },
          { key: "address", label: "Address" }, { key: "client", label: "Client", required: true },
          { key: "jobType", label: "Job Type" }, { key: "description", label: "Description" },
          { key: "status", label: "Status" }, { key: "priority", label: "Priority" },
          { key: "assignedTech", label: "Assigned Tech" }, { key: "dueDate", label: "Due Date" },
          { key: "dateCreated", label: "Date Created" }, { key: "quoteAmount", label: "Quote Amount" },
          { key: "invoiceAmount", label: "Invoice Amount" }, { key: "poNumber", label: "PO Number" },
          { key: "notes", label: "Notes" },
        ]}
        title="Import WIP Data"
      />

      </div>
  );
}

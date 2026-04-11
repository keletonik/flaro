import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, Target, DollarSign, Clock, CheckCircle2, Settings2, Palette, ChevronDown } from "lucide-react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { apiFetch, formatCurrency } from "@/lib/api";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { cn } from "@/lib/utils";

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
    byTech: { tech: string; count: number; value: number }[];
    byType: Record<string, number>;
    valueByStatus: Record<string, number>;
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

function TargetGauge({ current, target, label }: { current: number; target: number; label: string }) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 100 ? "#10B981" : pct >= 70 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground tracking-tight">{pct}%</span>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">of target</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-foreground mt-2">{label}</p>
      <p className="text-[10px] text-muted-foreground">{fmt(current)} / {fmt(target)}</p>
    </div>
  );
}

function MetricTile({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={16} className={color.includes("emerald") ? "text-emerald-500" : color.includes("blue") ? "text-blue-500" : color.includes("amber") ? "text-amber-500" : color.includes("red") ? "text-red-500" : "text-primary"} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, chartType, onChartTypeChange, className }: {
  title: string; children: React.ReactNode; chartType?: ChartType; onChartTypeChange?: (t: ChartType) => void; className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">{title}</h3>
        {chartType && onChartTypeChange && <ChartTypeSelector value={chartType} onChange={onChartTypeChange} />}
      </div>
      {children}
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

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorTheme, setColorTheme] = useState("Default");
  const [revenuePeriod, setRevenuePeriod] = useState<TimePeriod>("week");
  const [revenueChartType, setRevenueChartType] = useState<ChartType>("bar");
  const [wipChartType, setWipChartType] = useState<ChartType>("bar");
  const [taskChartType, setTaskChartType] = useState<ChartType>("area");
  const [techChartType, setTechChartType] = useState<ChartType>("bar");
  const [quoteChartType, setQuoteChartType] = useState<ChartType>("pie");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const colors = COLOR_THEMES[colorTheme] || COLOR_THEMES.Default;

  useEffect(() => {
    apiFetch<AnalyticsData>("/analytics/wip").then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" /> Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Performance metrics and revenue tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" title="From date" />
              <span className="text-[10px] text-muted-foreground">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-card border border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20" title="To date" />
              {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>}
            </div>
            <ColorThemeSelector value={colorTheme} onChange={setColorTheme} />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5 max-w-[1400px]">
        {/* Revenue Target Section */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target size={15} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Monthly Revenue Target — {fmt(data.revenue.monthlyTarget)}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <TargetGauge current={data.revenue.thisMonth} target={data.revenue.monthlyTarget} label="This Month" />
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricTile label="Revenue Today" value={fmt(data.revenue.today)} icon={DollarSign} color="bg-emerald-500/8" />
              <MetricTile label="Revenue This Week" value={fmt(data.revenue.thisWeek)} icon={TrendingUp} color="bg-blue-500/8" />
              <MetricTile label="Revenue This Month" value={fmt(data.revenue.thisMonth)} sub={`${data.revenue.progressPercent}% of target`} icon={Target} color="bg-primary/8" />
              <MetricTile label="Pro-Rata Target" value={fmt(data.revenue.proRataTarget)} sub={`Day ${new Date().getDate()} of month`} icon={Clock} color="bg-amber-500/8" />
            </div>
          </div>
        </div>

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

        {/* WIP + Tasks Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="WIP by Status" chartType={wipChartType} onChartTypeChange={setWipChartType}>
            <RenderChart type={wipChartType} data={wipStatusData} dataKey="value" nameKey="name" colors={colors} />
          </ChartCard>

          <ChartCard title="Tasks Completed (30 Days)" chartType={taskChartType} onChartTypeChange={setTaskChartType}>
            <RenderChart type={taskChartType} data={data.tasks.completedByDay.map(d => ({ name: d.date.slice(5), value: d.completed }))} dataKey="value" nameKey="name" colors={[colors[2]]} />
          </ChartCard>
        </div>

        {/* Tech Workload + Quotes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Revenue by Tech" chartType={techChartType} onChartTypeChange={setTechChartType}>
            <RenderChart type={techChartType} data={techData.map(t => ({ name: t.tech.split(" ")[0], value: t.value }))} dataKey="value" nameKey="name" colors={colors} />
          </ChartCard>

          <ChartCard title="Quote Pipeline" chartType={quoteChartType} onChartTypeChange={setQuoteChartType}>
            <RenderChart type={quoteChartType} data={quoteData} dataKey="value" nameKey="name" colors={colors} />
          </ChartCard>
        </div>

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
      </div>

      <AnalyticsPanel section="dashboard" title="Analytics Analyst" />
    </div>
  );
}

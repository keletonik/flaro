import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Briefcase, TrendingUp, AlertTriangle, CheckCircle2, Clock, DollarSign,
  FileText, BarChart3, ArrowUpRight, ArrowDownRight, Activity, Zap,
  Plus, Circle, Check, X, StickyNote
} from "lucide-react";
import { apiFetch, formatCurrency } from "@/lib/api";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface KpiMetrics {
  overview: {
    activeJobs: number; completedToday: number; completedThisWeek: number;
    criticalJobs: number; activeTodos: number; overdueTodos: number;
  };
  wip: { total: number; active: number; totalQuoteValue: number; totalInvoiced: number; byStatus: Record<string, number>; byTech: Record<string, number> };
  quotes: { total: number; pending: number; accepted: number; totalValue: number; acceptedValue: number; conversionRate: number; byStatus: Record<string, number> };
  defects: { total: number; open: number; critical: number; bySeverity: Record<string, number>; byStatus: Record<string, number> };
  invoices: { total: number; outstanding: number; overdue: number; outstandingTotal: number; revenueThisWeek: number; revenueThisMonth: number; byStatus: Record<string, number> };
  generatedAt: string;
}

interface DashboardSummary {
  critical: number; high: number; open: number; active: number; doneToday: number; totalJobs: number; openNotes: number;
}

interface FocusData {
  points: string[]; generatedAt: string;
}

function MetricCard({ label, value, icon: Icon, trend, trendLabel, color, onClick, featured }: {
  label: string; value: string | number; icon: any; trend?: "up" | "down" | "neutral";
  trendLabel?: string; color?: string; onClick?: () => void; featured?: boolean;
}) {
  return (
    <button onClick={onClick} className={cn("metric-card text-left w-full h-full group", featured && "metric-card--featured")} disabled={!onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("rounded-xl flex items-center justify-center", featured ? "w-11 h-11" : "w-9 h-9", color || "bg-primary/8")}>
          <Icon size={featured ? 20 : 17} className={cn(color?.includes("emerald") ? "text-emerald-500" : color?.includes("amber") ? "text-amber-500" : color?.includes("red") ? "text-red-500" : color?.includes("blue") ? "text-blue-500" : "text-primary")} />
        </div>
        {trend && trend !== "neutral" && (
          <div className={cn("flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
            trend === "up" ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20" :
            "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
          )}>
            {trend === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trendLabel}
          </div>
        )}
      </div>
      <p className={cn("font-bold text-foreground tracking-tight metric-count", featured ? "text-[36px] leading-none" : "text-2xl")}>{value}</p>
      <p className={cn("text-muted-foreground font-medium", featured ? "text-[13px] mt-1.5" : "text-[11px] mt-0.5")}>{label}</p>
    </button>
  );
}

function StatusBar({ data, colors }: { data: Record<string, number>; colors: Record<string, string> }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0);
  if (!total) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-muted/50">
      {Object.entries(data).filter(([, v]) => v > 0).map(([key, val]) => (
        <div key={key} className="h-full transition-all duration-500" style={{ width: `${(val / total) * 100}%`, backgroundColor: colors[key] || "#94A3B8" }} title={`${key}: ${val}`} />
      ))}
    </div>
  );
}

function FocusCard({ points, loading }: { points: string[]; loading: boolean }) {
  if (loading) return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3"><Zap size={14} className="text-amber-500" /><span className="text-xs font-bold text-foreground uppercase tracking-wide">Today's Focus</span></div>
      <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-4 bg-muted rounded-lg skeleton-pulse" style={{ width: `${80 - i * 15}%` }} />)}</div>
    </div>
  );
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3"><Zap size={14} className="text-amber-500" /><span className="text-xs font-bold text-foreground uppercase tracking-wide">Today's Focus</span></div>
      <ul className="space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-relaxed">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />{p}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface QuickTodo { id: string; text: string; completed: boolean; priority: string; }
interface QuickNote { id: string; text: string; category: string; status: string; }

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [kpi, setKpi] = useState<KpiMetrics | null>(null);
  const [focus, setFocus] = useState<FocusData | null>(null);
  const [focusLoading, setFocusLoading] = useState(true);
  const [todos, setTodos] = useState<QuickTodo[]>([]);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newNote, setNewNote] = useState("");
  const [pipelineGaps, setPipelineGaps] = useState<any>(null);
  const [onCallToday, setOnCallToday] = useState("Loading...");
  const { toast } = useToast();

  const fetchAll = () => {
    apiFetch<{ techName: string | null }>("/on-call/today").then(d => setOnCallToday(d.techName || "Check roster")).catch(() => setOnCallToday("Check roster"));
    apiFetch<DashboardSummary>("/dashboard/summary").then(setSummary).catch(e => console.error(e));
    apiFetch<KpiMetrics>("/kpi/metrics").then(setKpi).catch(e => console.error(e));
    apiFetch("/analytics/pipeline-gaps").then(setPipelineGaps).catch(e => console.error(e));
    apiFetch<FocusData>("/dashboard/focus").then(d => { setFocus(d); setFocusLoading(false); }).catch(() => setFocusLoading(false));
    apiFetch<QuickTodo[]>("/todos").then(t => setTodos(t.filter((x: any) => !x.completed).slice(0, 12))).catch(e => console.error(e));
    apiFetch<QuickNote[]>("/notes?status=Open").then(n => setNotes(n.slice(0, 10))).catch(e => console.error(e));
  };

  useEffect(() => {
    fetchAll();
    // SSE real-time updates — listen for data changes and refetch
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${base}/api/events`);
      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === "data_change") fetchAll();
        } catch (e: any) { console.error(e); }
      };
      eventSource.onerror = () => { /* SSE reconnects automatically */ };
    } catch (e: any) { console.error(e); }
    // Fallback: refetch on tab focus
    const handleVisibility = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { eventSource?.close(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, []);

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      await apiFetch("/todos", { method: "POST", body: JSON.stringify({ text: newTodo.trim(), priority: "Medium", category: "Work" }) });
      setNewTodo("");
      fetchAll();
      toast({ title: "Task added" });
    } catch { toast({ title: "Failed to add task", variant: "destructive" }); }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      await apiFetch(`/todos/${id}`, { method: "PATCH", body: JSON.stringify({ completed: !completed }) });
      fetchAll();
    } catch (e: any) { console.error(e); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await apiFetch("/notes", { method: "POST", body: JSON.stringify({ text: newNote.trim(), category: "To Do", owner: "Casper" }) });
      setNewNote("");
      fetchAll();
      toast({ title: "Note added" });
    } catch { toast({ title: "Failed to add note", variant: "destructive" }); }
  };

  const markNoteDone = async (id: string) => {
    try {
      await apiFetch(`/notes/${id}`, { method: "PATCH", body: JSON.stringify({ status: "Done" }) });
      fetchAll();
    } catch (e: any) { console.error(e); }
  };

  const deleteTodo = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await apiFetch(`/todos/${id}`, { method: "DELETE" });
      fetchAll();
    } catch (e: any) { console.error(e); }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await apiFetch(`/notes/${id}`, { method: "DELETE" });
      fetchAll();
    } catch (e: any) { console.error(e); }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const fmt = formatCurrency;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">{greeting}, Casper</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              On Call: {onCallToday.split(" ")[0]}
            </div>
            {summary && summary.critical > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs font-semibold">
                <AlertTriangle size={12} /> {summary.critical} Critical
              </div>
            )}
            <button onClick={fetchAll} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors" title="Refresh data">
              <Activity size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5 max-w-[1400px]">
        {/* Bento Grid — featured metrics prominent, secondary compact */}
        <div className="bento-grid">
          <div className="bento-featured card-stagger" style={{ '--stagger-index': 0 } as React.CSSProperties}>
            <MetricCard label="Revenue This Week" value={kpi ? fmt(kpi.invoices.revenueThisWeek) : "-"} icon={DollarSign} color="bg-emerald-500/8" featured />
          </div>
          <div className="bento-featured card-stagger" style={{ '--stagger-index': 1 } as React.CSSProperties}>
            <MetricCard label="Active WIPs" value={summary?.active ?? "-"} icon={Briefcase} color="bg-primary/8" onClick={() => setLocation("/jobs")} featured />
          </div>
          <div className="bento-featured card-stagger" style={{ '--stagger-index': 2 } as React.CSSProperties}>
            <MetricCard label="Outstanding" value={kpi ? fmt(kpi.invoices.outstandingTotal) : "-"} icon={TrendingUp} color="bg-amber-500/8" onClick={() => setLocation("/operations")} featured />
          </div>
          <div className="bento-compact card-stagger" style={{ '--stagger-index': 3 } as React.CSSProperties}>
            <MetricCard label="Completed Today" value={summary?.doneToday ?? "-"} icon={CheckCircle2} color="bg-emerald-500/8" trend={summary && summary.doneToday > 0 ? "up" : "neutral"} trendLabel={`${summary?.doneToday ?? 0}`} />
          </div>
          <div className="bento-compact card-stagger" style={{ '--stagger-index': 4 } as React.CSSProperties}>
            <MetricCard label="Open WIP" value={kpi?.wip.active ?? "-"} icon={Activity} color="bg-blue-500/8" onClick={() => setLocation("/operations")} />
          </div>
          <div className="bento-compact card-stagger" style={{ '--stagger-index': 5 } as React.CSSProperties}>
            <MetricCard label="Pending Quotes" value={kpi?.quotes.pending ?? "-"} icon={FileText} color="bg-primary/8" onClick={() => setLocation("/operations")} />
          </div>
          <div className="bento-compact card-stagger" style={{ '--stagger-index': 6 } as React.CSSProperties}>
            <MetricCard label="Revenue (Month)" value={kpi ? fmt(kpi.invoices.revenueThisMonth) : "-"} icon={DollarSign} color="bg-emerald-500/8" />
          </div>
          <div className="bento-compact card-stagger" style={{ '--stagger-index': 7 } as React.CSSProperties}>
            <MetricCard label="Overdue Invoices" value={kpi?.invoices.overdue ?? "-"} icon={Clock} color="bg-red-500/8" />
          </div>
        </div>

        {/* Pipeline Gaps + Morning Dispatch */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Leakage */}
          {pipelineGaps && pipelineGaps.totalAtRisk > 0 && (
            <div className="pipeline-gap bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">Revenue Leakage</span>
                </div>
                <span className="text-lg font-bold text-red-500">{fmt(pipelineGaps.totalAtRisk)}</span>
              </div>
              <div className="space-y-2 text-[13px]">
                {pipelineGaps.summary.quotesWithoutWipCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Accepted quotes without WIP</span>
                    <span className="font-semibold text-foreground">{pipelineGaps.summary.quotesWithoutWipCount} ({fmt(pipelineGaps.summary.quotesWithoutWipValue)})</span>
                  </div>
                )}
                {pipelineGaps.summary.wipWithoutInvoiceCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Completed WIP not invoiced</span>
                    <span className="font-semibold text-foreground">{pipelineGaps.summary.wipWithoutInvoiceCount} ({fmt(pipelineGaps.summary.wipWithoutInvoiceValue)})</span>
                  </div>
                )}
                {pipelineGaps.summary.underInvoicedCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Under-invoiced jobs</span>
                    <span className="font-semibold text-foreground">{pipelineGaps.summary.underInvoicedCount} ({fmt(pipelineGaps.summary.underInvoicedGap)})</span>
                  </div>
                )}
              </div>
              <button onClick={() => setLocation("/operations")} className="mt-3 text-xs text-primary font-medium hover:underline">View details in Operations →</button>
            </div>
          )}

          {/* Today's Dispatch */}
          {kpi && Object.keys(kpi.wip.byTech).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Today's Dispatch</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(kpi.wip.byTech).sort(([,a], [,b]) => b - a).map(([tech, count]) => (
                  <div key={tech} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-muted/40 border border-border">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px]">
                      {tech.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">{tech.split(" ")[0]}</p>
                      <p className="text-[10px] text-muted-foreground">{count} active</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><FocusCard points={focus?.points || []} loading={focusLoading} /></div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1"><BarChart3 size={14} className="text-primary" /><span className="text-xs font-bold text-foreground uppercase tracking-wide">Operations</span></div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-muted-foreground font-medium">WIP Pipeline</span><span className="text-foreground font-semibold">{kpi ? fmt(kpi.wip.totalQuoteValue) : "-"}</span></div>
                {kpi && <StatusBar data={kpi.wip.byStatus} colors={{ Open: "#7C3AED", "In Progress": "#F59E0B", Quoted: "#3B82F6", Scheduled: "#10B981", Completed: "#94A3B8", "On Hold": "#EF4444" }} />}
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-muted-foreground font-medium">Quote Conversion</span><span className="text-foreground font-semibold">{kpi?.quotes.conversionRate ?? 0}%</span></div>
                {kpi && <StatusBar data={kpi.quotes.byStatus} colors={{ Draft: "#94A3B8", Sent: "#3B82F6", Accepted: "#10B981", Declined: "#EF4444", Expired: "#F97316", Revised: "#8B5CF6" }} />}
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-muted-foreground font-medium">Defects</span><span className="text-foreground font-semibold">{kpi?.defects.open ?? 0} open</span></div>
                {kpi && <StatusBar data={kpi.defects.bySeverity} colors={{ Critical: "#EF4444", High: "#F97316", Medium: "#3B82F6", Low: "#94A3B8" }} />}
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-muted-foreground font-medium">Invoices</span><span className="text-foreground font-semibold">{kpi?.invoices.overdue ?? 0} overdue</span></div>
                {kpi && <StatusBar data={kpi.invoices.byStatus} colors={{ Draft: "#94A3B8", Sent: "#3B82F6", Overdue: "#EF4444", Paid: "#10B981", Void: "#64748B", Partial: "#F59E0B" }} />}
              </div>
            </div>
          </div>
        </div>


        {kpi && Object.keys(kpi.wip.byTech).length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><Briefcase size={14} className="text-primary" /><span className="text-xs font-bold text-foreground uppercase tracking-wide">Tech Workload</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(kpi.wip.byTech).sort(([,a], [,b]) => b - a).map(([tech, count]) => (
                <div key={tech} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/40 border border-border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                    {tech.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{tech.split(" ")[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{count} jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tasks & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick Tasks */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Tasks</span>
                <span className="text-[10px] text-muted-foreground">{todos.length} active</span>
              </div>
              <button onClick={() => setLocation("/todos")} className="text-[10px] text-primary font-medium hover:underline">View all</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()}
                placeholder="Quick add task..." className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <button onClick={addTodo} disabled={!newTodo.trim()} className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0", newTodo.trim() ? "bg-primary text-white hover:opacity-90" : "bg-muted text-muted-foreground/30")}>
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {todos.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors group">
                  <button onClick={() => toggleTodo(t.id, t.completed)} className="shrink-0">
                    <Circle size={16} className="text-muted-foreground/30 hover:text-primary transition-colors" />
                  </button>
                  <span className="text-[13px] text-foreground flex-1 truncate">{t.text}</span>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded", t.priority === "Critical" ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20" : t.priority === "High" ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20" : "text-muted-foreground bg-muted")}>{t.priority}</span>
                  <button onClick={() => deleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-all"><X size={11} /></button>
                </div>
              ))}
              {todos.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No active tasks</p>}
            </div>
          </div>

          {/* Quick Notes */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Notes</span>
                <span className="text-[10px] text-muted-foreground">{notes.length} open</span>
              </div>
              <button onClick={() => setLocation("/notes")} className="text-[10px] text-primary font-medium hover:underline">View all</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()}
                placeholder="Quick add note..." className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <button onClick={addNote} disabled={!newNote.trim()} className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0", newNote.trim() ? "bg-primary text-white hover:opacity-90" : "bg-muted text-muted-foreground/30")}>
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {notes.map(n => (
                <div key={n.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors group">
                  <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0", n.category === "Urgent" ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20" : "text-muted-foreground bg-muted")}>{n.category}</span>
                  <span className="text-[13px] text-foreground flex-1 truncate">{n.text}</span>
                  <button onClick={() => markNoteDone(n.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-emerald-500 transition-all" title="Mark done">
                    <Check size={11} />
                  </button>
                  <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-all" title="Delete">
                    <X size={11} />
                  </button>
                </div>
              ))}
              {notes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No open notes</p>}
            </div>
          </div>
        </div>
      </div>

      <AnalyticsPanel section="dashboard" title="Dashboard Analyst" />
    </div>
  );
}

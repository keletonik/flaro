import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  RefreshCw, MessageCircle, Zap, TrendingUp, Clock, AlertTriangle,
  CheckCircle2, ArrowRight, CalendarDays, Circle, ChevronDown,
  Plus, X, Check, Briefcase
} from "lucide-react";
import {
  useGetDashboardSummary, useGetDashboardFocus, useListJobs, useListNotes,
  useListTodos, useUpdateTodo, useCreateTodo, useCreateJob, useCreateNote,
  getGetDashboardFocusQueryKey, getListTodosQueryKey, getListJobsQueryKey, getListNotesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCard, SkeletonText } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Todo } from "@workspace/api-client-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function isOverdue(d?: string | null) {
  return !!d && new Date(d) < new Date();
}

const CATEGORY_COLORS: Record<string, string> = {
  "Urgent":   "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  "To Do":    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  "To Ask":   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  "Schedule": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
  "Done":     "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-500 dark:border-slate-700",
};

const TODO_DOT: Record<string, string> = {
  Critical: "bg-red-500", High: "bg-orange-400", Medium: "bg-blue-400", Low: "bg-slate-400"
};

const ONCALL = [
  { day: "Mon", date: "7 Apr",  tech: "Darren" },
  { day: "Tue", date: "8 Apr",  tech: "Gordon" },
  { day: "Wed", date: "9 Apr",  tech: "Haider" },
  { day: "Thu", date: "10 Apr", tech: "John" },
  { day: "Fri", date: "11 Apr", tech: "Nu" },
  { day: "Sat", date: "12 Apr", tech: "Darren" },
  { day: "Sun", date: "13 Apr", tech: "—" },
];

const STORAGE_KEY = "aide-dash-collapsed";

function useCollapsible() {
  const load = (): Record<string, boolean> => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  };
  const [state, setState] = useState<Record<string, boolean>>(load);

  const toggle = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const expand = useCallback((id: string) => {
    setState(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev, [id]: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    isCollapsed: (id: string) => !!state[id],
    toggle,
    expand,
  };
}

// ─── Collapsible section wrapper ─────────────────────────────────────────────

interface CollapsibleSectionProps {
  id: string;
  title: string;
  badge?: React.ReactNode;
  accent: string;
  collapsed: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function CollapsibleSection({ id, title, badge, accent, collapsed, onToggle, actions, children }: CollapsibleSectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header — entire area is clickable, actions use stopPropagation */}
      <div
        role="button"
        aria-expanded={!collapsed}
        data-testid={`collapse-${id}`}
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors select-none"
      >
        <div className={cn("w-1 h-4 rounded-full flex-shrink-0", accent)} />
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/70 flex-1">{title}</h2>
        {badge}
        {/* Stop-propagation actions (+ button, All → link) */}
        {actions && (
          <div
            className="flex items-center gap-1"
            onClick={e => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-200 flex-shrink-0",
            collapsed ? "-rotate-90" : "rotate-0"
          )}
        />
      </div>

      {/* Body — CSS-driven collapse */}
      <div
        className={cn(
          "transition-all duration-200 ease-out overflow-hidden",
          collapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[9999px] opacity-100"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-semibold min-w-[18px] text-center">{count}</span>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date();
  const todayDay = today.toLocaleDateString("en-AU", { weekday: "short" });

  const { isCollapsed, toggle, expand } = useCollapsible();

  const [addOpen, setAddOpen] = useState<Record<string, boolean>>({});
  const openAdd = (id: string) => { setAddOpen(p => ({ ...p, [id]: true })); expand(id); };
  const closeAdd = (id: string) => setAddOpen(p => ({ ...p, [id]: false }));

  const [todoText, setTodoText] = useState("");
  const [todoPriority, setTodoPriority] = useState("Medium");
  const [jobSite, setJobSite] = useState("");
  const [jobClient, setJobClient] = useState("");
  const [jobPriority, setJobPriority] = useState("High");
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("To Do");

  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: focus, isLoading: focusLoading, isFetching: focusFetching } = useGetDashboardFocus();
  const { data: jobs, isLoading: jobsLoading } = useListJobs({});
  const { data: notes, isLoading: notesLoading } = useListNotes({ status: "Open" });
  const { data: todos, isLoading: todosLoading } = useListTodos();

  const updateTodo = useUpdateTodo();
  const createTodo = useCreateTodo();
  const createJob  = useCreateJob();
  const createNote = useCreateNote();

  const openJobs = (jobs || []).filter(j => j.status !== "Done").slice(0, 6);
  const recentNotes = (notes || []).slice(0, 5);
  const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const activeTodos = (todos || [])
    .filter(t => !t.completed)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))
    .slice(0, 7);
  const allActiveTodosCount = (todos || []).filter(t => !t.completed).length;

  const handleTodoToggle = async (todo: Todo) => {
    await updateTodo.mutateAsync({ id: todo.id, data: { completed: !todo.completed } });
    queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
  };

  const handleAddTodo = async () => {
    if (!todoText.trim()) return;
    try {
      await createTodo.mutateAsync({ data: { text: todoText.trim(), priority: todoPriority as Todo["priority"], category: "Work" } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      setTodoText(""); setTodoPriority("Medium"); closeAdd("todos");
      toast({ title: "To-do added" });
    } catch { toast({ title: "Couldn't add to-do", variant: "destructive" }); }
  };

  const handleAddJob = async () => {
    if (!jobSite.trim() || !jobClient.trim()) return;
    try {
      await createJob.mutateAsync({ data: {
        site: jobSite.trim(), client: jobClient.trim(),
        actionRequired: "See notes",
        priority: jobPriority as "Critical" | "High" | "Medium" | "Low",
        status: "Open"
      }});
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      setJobSite(""); setJobClient(""); setJobPriority("High"); closeAdd("jobs");
      toast({ title: "Job created" });
    } catch { toast({ title: "Couldn't create job", variant: "destructive" }); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await createNote.mutateAsync({ data: {
        text: noteText.trim(),
        category: noteCategory as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Done",
        owner: "Casper"
      }});
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      setNoteText(""); setNoteCategory("To Do"); closeAdd("notes");
      toast({ title: "Note saved" });
    } catch { toast({ title: "Couldn't save note", variant: "destructive" }); }
  };

  const metrics = [
    { label: "Critical",      value: summary?.critical  ?? 0, icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/15",      ring: "ring-red-100 dark:ring-red-900/30" },
    { label: "High Priority", value: summary?.high       ?? 0, icon: TrendingUp,    color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/15", ring: "ring-orange-100 dark:ring-orange-900/30" },
    { label: "Active Jobs",    value: (summary as any)?.active ?? summary?.totalJobs ?? 0, icon: Briefcase,     color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/15",     ring: "ring-blue-100 dark:ring-blue-900/30" },
    { label: "Done Today",    value: summary?.doneToday  ?? 0, icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/15", ring: "ring-emerald-100 dark:ring-emerald-900/30" },
  ];

  const priorities = ["Critical", "High", "Medium", "Low"] as const;
  const noteCategories = ["Urgent", "To Do", "To Ask", "Schedule"] as const;

  const inputCls = "bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-full";

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border px-5 sm:px-7 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">{getGreeting()}, Casper</h1>
            <p className="text-muted-foreground text-[11px] mt-0.5 font-medium">
              {today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-open-schedule"
              onClick={() => setLocation("/schedule")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted text-muted-foreground text-xs font-semibold rounded-lg transition-colors border border-border"
            >
              <CalendarDays size={13} />Schedule
            </button>
            <button
              data-testid="button-pa-check"
              onClick={() => setLocation("/chat")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity pulse-ring tracking-wide"
            >
              <Zap size={13} />PA Check
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* Metric widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="bg-card border border-border rounded-xl p-4 card-appear hover:shadow-sm transition-shadow"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center ring-4 mb-3", m.bg, m.ring)}>
                  <Icon size={15} className={m.color} />
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
                  {sumLoading ? <span className="inline-block w-6 h-5 bg-muted rounded skeleton-pulse" /> : m.value}
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{m.label}</p>
              </div>
            );
          })}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-3">

            {/* Today's Focus */}
            <CollapsibleSection
              id="focus"
              title="Today's Focus"
              accent="bg-primary"
              badge={<span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">AI</span>}
              collapsed={isCollapsed("focus")}
              onToggle={() => toggle("focus")}
              actions={
                <button
                  data-testid="button-refresh-focus"
                  onClick={() => queryClient.invalidateQueries({ queryKey: getGetDashboardFocusQueryKey() })}
                  disabled={focusFetching}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw size={12} className={focusFetching ? "animate-spin" : ""} />
                </button>
              }
            >
              <div className="px-4 py-3.5">
                {focusLoading ? (
                  <div className="space-y-2.5">
                    {[1,2,3].map(i => <SkeletonText key={i} className={i === 3 ? "w-2/3" : "w-full"} />)}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {(focus?.points || []).map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                    {(!focusLoading && !focus?.points?.length) && (
                      <li className="text-sm text-muted-foreground">No open items — good work, Casper.</li>
                    )}
                  </ul>
                )}
              </div>
            </CollapsibleSection>

            {/* Open Jobs */}
            <CollapsibleSection
              id="jobs"
              title="Open Jobs"
              accent="bg-orange-400"
              badge={!jobsLoading && openJobs.length > 0 ? <CountBadge count={openJobs.length} /> : undefined}
              collapsed={isCollapsed("jobs")}
              onToggle={() => toggle("jobs")}
              actions={
                <div className="flex items-center gap-1">
                  <button
                    data-testid="button-add-job-dashboard"
                    onClick={() => openAdd("jobs")}
                    className={cn(
                      "p-1 rounded-lg transition-colors",
                      addOpen["jobs"] ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title="Add job"
                  ><Plus size={13} /></button>
                  <button
                    data-testid="link-see-all-jobs"
                    onClick={() => setLocation("/jobs")}
                    className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 font-bold transition-colors"
                  >All <ArrowRight size={11} /></button>
                </div>
              }
            >
              {/* Quick-add job form */}
              {addOpen["jobs"] && (
                <div className="px-4 py-3 border-b border-border bg-muted/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input data-testid="input-job-site" value={jobSite} onChange={e => setJobSite(e.target.value)} placeholder="Site name *" className={inputCls} />
                    <input data-testid="input-job-client" value={jobClient} onChange={e => setJobClient(e.target.value)} placeholder="Client *" className={inputCls} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {priorities.map(p => (
                        <button key={p} onClick={() => setJobPriority(p)} className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold border transition-all",
                          jobPriority === p ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"
                        )}>{p}</button>
                      ))}
                    </div>
                    <button onClick={() => { closeAdd("jobs"); setJobSite(""); setJobClient(""); }} className="p-1 text-muted-foreground hover:text-foreground"><X size={13} /></button>
                    <button data-testid="button-save-job-dashboard" onClick={handleAddJob} disabled={!jobSite.trim() || !jobClient.trim()} className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                      jobSite.trim() && jobClient.trim() ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}><Check size={12} />Create</button>
                  </div>
                </div>
              )}

              {jobsLoading ? (
                <div className="divide-y divide-border">
                  {[1,2,3].map(i => <div key={i} className="px-4 py-3.5"><SkeletonCard lines={2} /></div>)}
                </div>
              ) : openJobs.length === 0 && !addOpen["jobs"] ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">No open jobs — nice one.</div>
              ) : (
                <div className="divide-y divide-border">
                  {openJobs.map((job: any) => (
                    <button
                      key={job.id}
                      data-testid={`dashboard-job-${job.id}`}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      className={cn("w-full flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left border-l-4", `priority-${job.priority.toLowerCase()}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {job.taskNumber && <span className="text-[10px] text-muted-foreground font-mono">{job.taskNumber}</span>}
                          <span className="text-sm font-semibold text-foreground truncate">{job.site}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{job.client}</span>
                          {job.assignedTech && <span className="text-[10px] text-muted-foreground">· {job.assignedTech.split(" ")[0]}</span>}
                          {job.dueDate && (
                            <span className={cn("text-[10px] font-semibold", isOverdue(job.dueDate) ? "text-red-500" : "text-muted-foreground")}>
                              · {isOverdue(job.dueDate) ? "Overdue " : "Due "}
                              {new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        <PriorityBadge priority={job.priority} size="xs" />
                        <StatusBadge status={job.status} size="xs" />
                      </div>
                    </button>
                  ))}
                  {openJobs.length > 0 && (
                    <div className="px-4 py-2 bg-muted/20">
                      <button onClick={() => setLocation("/jobs")} className="text-[11px] text-primary font-bold hover:underline">View all jobs →</button>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Chat CTA */}
            <button
              data-testid="button-open-chat"
              onClick={() => setLocation("/chat")}
              className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl hover:bg-primary/8 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <MessageCircle size={15} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Talk to AIDE</p>
                <p className="text-xs text-muted-foreground">Drop an email, log a job, or ask anything</p>
              </div>
              <ArrowRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>

          {/* ── Side column ── */}
          <div className="space-y-3">

            {/* To-Do */}
            <CollapsibleSection
              id="todos"
              title="To-Do"
              accent="bg-violet-400"
              badge={!todosLoading && allActiveTodosCount > 0 ? <CountBadge count={allActiveTodosCount} /> : undefined}
              collapsed={isCollapsed("todos")}
              onToggle={() => toggle("todos")}
              actions={
                <div className="flex items-center gap-1">
                  <button
                    data-testid="button-add-todo-dashboard"
                    onClick={() => openAdd("todos")}
                    className={cn("p-1 rounded-lg transition-colors", addOpen["todos"] ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                  ><Plus size={13} /></button>
                  <button onClick={() => setLocation("/todos")} className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 font-bold">
                    All <ArrowRight size={11} />
                  </button>
                </div>
              }
            >
              {addOpen["todos"] && (
                <div className="px-3 py-2.5 border-b border-border bg-muted/20 space-y-2">
                  <input
                    data-testid="input-dash-todo"
                    value={todoText}
                    onChange={e => setTodoText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddTodo(); if (e.key === "Escape") closeAdd("todos"); }}
                    placeholder="What needs to be done?"
                    autoFocus
                    className={inputCls}
                  />
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1 flex-1 flex-wrap">
                      {priorities.map(p => (
                        <button key={p} onClick={() => setTodoPriority(p)} className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all",
                          todoPriority === p ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"
                        )}>{p}</button>
                      ))}
                    </div>
                    <button onClick={() => { closeAdd("todos"); setTodoText(""); }} className="p-1 text-muted-foreground hover:text-foreground"><X size={13} /></button>
                    <button data-testid="button-save-todo-dashboard" onClick={handleAddTodo} disabled={!todoText.trim()} className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                      todoText.trim() ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}><Check size={11} />Add</button>
                  </div>
                </div>
              )}

              {todosLoading ? (
                <div className="p-3 space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded skeleton-pulse" />)}
                </div>
              ) : activeTodos.length === 0 && !addOpen["todos"] ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle2 size={18} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">All clear.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeTodos.map((todo: Todo) => {
                    const overdue = todo.dueDate && new Date(todo.dueDate) < new Date();
                    return (
                      <div key={todo.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors group">
                        <button
                          data-testid={`dashboard-todo-toggle-${todo.id}`}
                          onClick={() => handleTodoToggle(todo)}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                        >
                          <Circle size={15} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setLocation("/todos")}>
                          <p className="text-xs text-foreground truncate">{todo.text}</p>
                          {todo.dueDate && (
                            <p className={cn("text-[10px]", overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                              {overdue ? "Overdue · " : "Due "}{new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                            </p>
                          )}
                        </div>
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", TODO_DOT[todo.priority] || "bg-slate-400")} />
                      </div>
                    );
                  })}
                  {allActiveTodosCount > 7 && (
                    <div className="px-4 py-2 bg-muted/20">
                      <button onClick={() => setLocation("/todos")} className="text-[11px] text-primary font-bold hover:underline">+{allActiveTodosCount - 7} more →</button>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Notes */}
            <CollapsibleSection
              id="notes"
              title="Notes"
              accent="bg-blue-400"
              badge={!notesLoading && recentNotes.length > 0 ? <CountBadge count={recentNotes.length} /> : undefined}
              collapsed={isCollapsed("notes")}
              onToggle={() => toggle("notes")}
              actions={
                <div className="flex items-center gap-1">
                  <button
                    data-testid="button-add-note-dashboard"
                    onClick={() => openAdd("notes")}
                    className={cn("p-1 rounded-lg transition-colors", addOpen["notes"] ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
                  ><Plus size={13} /></button>
                  <button onClick={() => setLocation("/notes")} className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 font-bold">
                    All <ArrowRight size={11} />
                  </button>
                </div>
              }
            >
              {addOpen["notes"] && (
                <div className="px-3 py-2.5 border-b border-border bg-muted/20 space-y-2">
                  <textarea
                    data-testid="input-dash-note"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") closeAdd("notes"); }}
                    placeholder="What's the note?"
                    autoFocus
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                  />
                  <div className="flex items-center gap-1.5">
                    <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)} className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none">
                      {noteCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button onClick={() => { closeAdd("notes"); setNoteText(""); }} className="p-1 text-muted-foreground hover:text-foreground"><X size={13} /></button>
                    <button data-testid="button-save-note-dashboard" onClick={handleAddNote} disabled={!noteText.trim()} className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                      noteText.trim() ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}><Check size={11} />Save</button>
                  </div>
                </div>
              )}

              {notesLoading ? (
                <div className="p-3 space-y-2">{[1,2].map(i => <SkeletonCard key={i} lines={2} />)}</div>
              ) : recentNotes.length === 0 && !addOpen["notes"] ? (
                <div className="px-4 py-5 text-center text-xs text-muted-foreground">No open notes.</div>
              ) : (
                <div className="divide-y divide-border">
                  {recentNotes.map((note: any) => (
                    <button
                      key={note.id}
                      data-testid={`note-item-${note.id}`}
                      onClick={() => setLocation("/notes")}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                    >
                      <span className={cn("flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5", CATEGORY_COLORS[note.category] || CATEGORY_COLORS["To Do"])}>
                        {note.category}
                      </span>
                      <p className="text-xs text-foreground line-clamp-2">{note.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* On-Call Roster */}
            <CollapsibleSection
              id="oncall"
              title="On-Call This Week"
              accent="bg-emerald-400"
              collapsed={isCollapsed("oncall")}
              onToggle={() => toggle("oncall")}
            >
              <div className="p-3 space-y-0.5">
                {ONCALL.map(item => {
                  const active = item.day === todayDay;
                  return (
                    <div
                      key={item.day}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors",
                        active ? "bg-primary/10 font-semibold" : "hover:bg-muted/40"
                      )}
                    >
                      <span className={cn("font-bold uppercase tracking-widest text-[9px] w-8", active ? "text-primary" : "text-muted-foreground")}>{item.day}</span>
                      <span className={cn("text-[11px]", active ? "text-primary/70" : "text-muted-foreground/60")}>{item.date}</span>
                      <span className={cn("font-semibold text-[11px]", active ? "text-primary" : "text-foreground")}>{item.tech}</span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}

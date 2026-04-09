import { useState } from "react";
import { useLocation } from "wouter";
import { RefreshCw, MessageCircle, Zap, TrendingUp, Clock, AlertTriangle, CheckCircle2, ArrowRight, CalendarDays } from "lucide-react";
import {
  useGetDashboardSummary, useGetDashboardFocus, useListJobs, useListNotes,
  getGetDashboardFocusQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCard, SkeletonText } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";

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
  "Schedule": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  "Done":     "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-500 dark:border-slate-700",
};

const ONCALL = [
  { day: "Mon", date: "7 Apr", tech: "Darren" },
  { day: "Tue", date: "8 Apr", tech: "Gordon" },
  { day: "Wed", date: "9 Apr", tech: "Haider" },
  { day: "Thu", date: "10 Apr", tech: "John" },
  { day: "Fri", date: "11 Apr", tech: "Nu" },
  { day: "Sat", date: "12 Apr", tech: "Darren" },
  { day: "Sun", date: "13 Apr", tech: "—" },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const today = new Date();
  const todayDay = today.toLocaleDateString("en-AU", { weekday: "short" });

  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: focus, isLoading: focusLoading, isFetching: focusFetching } = useGetDashboardFocus();
  const { data: jobs, isLoading: jobsLoading } = useListJobs({});
  const { data: notes, isLoading: notesLoading } = useListNotes({ status: "Open" });

  const openJobs = (jobs || []).filter(j => j.status !== "Done").slice(0, 5);
  const recentNotes = (notes || []).slice(0, 4);

  const metrics = [
    {
      label: "Critical",
      value: summary?.critical ?? 0,
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/15",
      ring: "ring-red-100 dark:ring-red-900/30",
    },
    {
      label: "High Priority",
      value: summary?.high ?? 0,
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/15",
      ring: "ring-orange-100 dark:ring-orange-900/30",
    },
    {
      label: "Open Jobs",
      value: summary?.open ?? 0,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/15",
      ring: "ring-blue-100 dark:ring-blue-900/30",
    },
    {
      label: "Done Today",
      value: summary?.doneToday ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/15",
      ring: "ring-emerald-100 dark:ring-emerald-900/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">
              {getGreeting()}, Casper
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-open-schedule"
              onClick={() => setLocation("/schedule")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/70 text-muted-foreground text-xs font-medium rounded-lg transition-colors border border-border"
            >
              <CalendarDays size={13} />Schedule
            </button>
            <button
              data-testid="button-pa-check"
              onClick={() => setLocation("/chat")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity pulse-ring"
            >
              <Zap size={13} />PA Check
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Metric widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "bg-card border border-border rounded-xl p-4 card-appear",
                  "hover:shadow-sm transition-shadow cursor-default"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center ring-4", m.bg, m.ring)}>
                    <Icon size={15} className={m.color} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {sumLoading ? <span className="inline-block w-6 h-6 bg-muted rounded skeleton-pulse" /> : m.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{m.label}</p>
              </div>
            );
          })}
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Focus */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <h2 className="text-sm font-semibold text-foreground">Today's Focus</h2>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">AI</span>
                </div>
                <button
                  data-testid="button-refresh-focus"
                  onClick={() => queryClient.invalidateQueries({ queryKey: getGetDashboardFocusQueryKey() })}
                  disabled={focusFetching}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                  title="Regenerate"
                >
                  <RefreshCw size={13} className={focusFetching ? "animate-spin" : ""} />
                </button>
              </div>
              <div className="p-4">
                {focusLoading ? (
                  <div className="space-y-2.5">
                    {[1,2,3].map(i => <SkeletonText key={i} className={i === 3 ? "w-2/3" : "w-full"} />)}
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {(focus?.points || []).map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                    {(!focusLoading && !focus?.points?.length) && (
                      <li className="text-sm text-muted-foreground">No open jobs or notes — great work!</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Open Jobs */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-400 rounded-full" />
                  <h2 className="text-sm font-semibold text-foreground">Open Jobs</h2>
                  {!jobsLoading && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                      {openJobs.length}
                    </span>
                  )}
                </div>
                <button
                  data-testid="link-see-all-jobs"
                  onClick={() => setLocation("/jobs")}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  All jobs <ArrowRight size={12} />
                </button>
              </div>

              {jobsLoading ? (
                <div className="divide-y divide-border">
                  {[1,2,3].map(i => <div key={i} className="p-4"><SkeletonCard lines={2} /></div>)}
                </div>
              ) : openJobs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No open jobs — nice one, Casper.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {openJobs.map((job, i) => (
                    <button
                      key={job.id}
                      data-testid={`dashboard-job-${job.id}`}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left",
                        "border-l-4",
                        `priority-${job.priority.toLowerCase()}`
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {job.taskNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">{job.taskNumber}</span>
                          )}
                          <span className="text-sm font-semibold text-foreground truncate">{job.site}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{job.client}</span>
                          {job.assignedTech && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              · {job.assignedTech.split(" ")[0]}
                            </span>
                          )}
                          {job.dueDate && (
                            <span className={cn(
                              "text-[10px] font-medium",
                              isOverdue(job.dueDate) ? "text-red-500" : "text-muted-foreground"
                            )}>
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
                </div>
              )}

              {openJobs.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border bg-muted/30">
                  <button
                    onClick={() => setLocation("/jobs")}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View all jobs →
                  </button>
                </div>
              )}
            </div>

            {/* Quick Chat */}
            <button
              data-testid="button-open-chat"
              onClick={() => setLocation("/chat")}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Talk to AIDE</p>
                <p className="text-xs text-muted-foreground">Drop an email, log a job, or ask anything</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            {/* Recent Notes */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-400 rounded-full" />
                  <h2 className="text-sm font-semibold text-foreground">Notes</h2>
                </div>
                <button
                  onClick={() => setLocation("/notes")}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  All <ArrowRight size={12} />
                </button>
              </div>
              {notesLoading ? (
                <div className="p-3 space-y-2">
                  {[1,2].map(i => <SkeletonCard key={i} lines={2} />)}
                </div>
              ) : recentNotes.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">No open notes.</div>
              ) : (
                <div className="divide-y divide-border">
                  {recentNotes.map(note => (
                    <button
                      key={note.id}
                      data-testid={`note-item-${note.id}`}
                      onClick={() => setLocation("/notes")}
                      className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className={cn(
                        "flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold border mt-0.5",
                        CATEGORY_COLORS[note.category] || CATEGORY_COLORS["To Do"]
                      )}>
                        {note.category}
                      </span>
                      <p className="text-xs text-foreground line-clamp-2">{note.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* On-Call Roster */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-400 rounded-full" />
                <h2 className="text-sm font-semibold text-foreground">On-Call This Week</h2>
              </div>
              <div className="p-3 space-y-1">
                {ONCALL.map(item => {
                  const active = item.day === todayDay;
                  return (
                    <div
                      key={item.day}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className={cn("font-semibold uppercase tracking-wider text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                        {item.day}
                      </span>
                      <span className={active ? "text-primary/70" : "text-muted-foreground/70"}>{item.date}</span>
                      <span className={cn("font-semibold", active ? "text-primary" : "text-foreground")}>{item.tech}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { RefreshCw, MessageCircle, Zap } from "lucide-react";
import { useGetDashboardSummary, useGetDashboardFocus, useListJobs, useListNotes, getGetDashboardFocusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isOverdue(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const today = new Date();

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: focus, isLoading: focusLoading, isFetching: focusFetching } = useGetDashboardFocus();
  const { data: jobs, isLoading: jobsLoading } = useListJobs({ status: undefined, priority: undefined, search: undefined });
  const { data: notes, isLoading: notesLoading } = useListNotes({ category: undefined, status: "Open" });

  const openJobs = (jobs || []).filter(j => j.status !== "Done").slice(0, 5);
  const recentNotes = (notes || []).slice(-4).reverse();

  function refreshFocus() {
    queryClient.invalidateQueries({ queryKey: getGetDashboardFocusQueryKey() });
  }

  const summaryItems = [
    { label: "Critical", count: summary?.critical ?? 0, color: "text-[#EF4444]", bg: "bg-[#EF4444]/10 border-[#EF4444]/30" },
    { label: "High", count: summary?.high ?? 0, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10 border-[#F59E0B]/30" },
    { label: "Open", count: summary?.open ?? 0, color: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10 border-[#3B82F6]/30" },
    { label: "Done Today", count: summary?.doneToday ?? 0, color: "text-[#10B981]", bg: "bg-[#10B981]/10 border-[#10B981]/30" },
  ];

  const oncallRoster = [
    { day: "Mon", date: "7 Apr", tech: "Darren" },
    { day: "Tue", date: "8 Apr", tech: "Gordon" },
    { day: "Wed", date: "9 Apr", tech: "Haider" },
    { day: "Thu", date: "10 Apr", tech: "John" },
    { day: "Fri", date: "11 Apr", tech: "Nu" },
    { day: "Sat", date: "12 Apr", tech: "Darren" },
    { day: "Sun", date: "13 Apr", tech: "—" },
  ];

  const todayDay = today.toLocaleDateString("en-AU", { weekday: "short" });

  return (
    <div className="min-h-screen bg-[#0F0F13]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F13]/90 backdrop-blur-md border-b border-[#2E2E45] px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-[#F8FAFC] font-bold text-xl">{getGreeting()}, Casper</h1>
            <p className="text-[#475569] text-sm mt-0.5">{formatDate(today)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              data-testid="button-pa-check"
              onClick={() => setLocation("/chat")}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm font-semibold rounded-full pulse-glow hover:opacity-90 transition-opacity"
            >
              <Zap size={14} />
              PA Check
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center text-white font-bold text-sm">
              CT
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Strip */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {summaryItems.map((item, i) => (
            <div
              key={item.label}
              className={cn("flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold", item.bg)}
              style={{ animationDelay: `${i * 50}ms` }}
              data-testid={`summary-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <span className={cn("text-xl font-bold", item.color)}>{summaryLoading ? "—" : item.count}</span>
              <span className="text-[#94A3B8] text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Today's Focus */}
        <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl overflow-hidden border-l-4 border-l-[#7C3AED]">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <span className="text-[#7C3AED] text-xs font-bold uppercase tracking-widest">Today's Focus</span>
            <button
              data-testid="button-refresh-focus"
              onClick={refreshFocus}
              disabled={focusFetching}
              className="text-[#475569] hover:text-[#7C3AED] transition-colors"
            >
              <RefreshCw size={14} className={focusFetching ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="px-4 pb-4">
            {focusLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-4 bg-[#242433] rounded skeleton-pulse" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {(focus?.points || []).map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[#E2E8F0] text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-2 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[#475569] text-[11px] mt-3 uppercase tracking-wider">
              Generated by AIDE · tap <RefreshCw size={10} className="inline" /> to regenerate
            </p>
          </div>
        </div>

        {/* Open Jobs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#F8FAFC] font-semibold text-sm uppercase tracking-widest">Open Jobs</h2>
            <button
              data-testid="link-see-all-jobs"
              onClick={() => setLocation("/jobs")}
              className="text-[#7C3AED] text-sm hover:text-[#A855F7] transition-colors"
            >
              See all →
            </button>
          </div>
          <div className="space-y-3">
            {jobsLoading ? (
              [1,2,3].map(i => <SkeletonCard key={i} />)
            ) : openJobs.length === 0 ? (
              <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-6 text-center text-[#475569] text-sm">
                No open jobs — great work, Casper.
              </div>
            ) : (
              openJobs.map((job, i) => (
                <div
                  key={job.id}
                  data-testid={`card-job-${job.id}`}
                  onClick={() => setLocation(`/jobs/${job.id}`)}
                  className={cn(
                    "bg-[#1A1A24] border border-[#2E2E45] border-l-4 rounded-2xl p-4 cursor-pointer hover:border-[#7C3AED]/50 transition-all duration-200 card-appear",
                    `priority-${job.priority.toLowerCase()}`
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#F8FAFC] font-bold text-sm">
                          {job.taskNumber || "No ref"} — {job.site}
                        </span>
                      </div>
                      <p className="text-[#94A3B8] text-xs mt-0.5">{job.client}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <PriorityBadge priority={job.priority} />
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {job.assignedTech && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#7C3AED]/30 border border-[#7C3AED]/50 flex items-center justify-center text-[9px] text-[#A855F7] font-bold">
                          {job.assignedTech.charAt(0)}
                        </div>
                        <span className="text-[#475569] text-xs">{job.assignedTech}</span>
                      </div>
                    )}
                    {job.dueDate && (
                      <span className={cn("text-xs ml-auto", isOverdue(job.dueDate) ? "text-[#EF4444] font-semibold" : "text-[#475569]")}>
                        {isOverdue(job.dueDate) ? "Overdue: " : "Due: "}
                        {new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#F8FAFC] font-semibold text-sm uppercase tracking-widest">Recent Notes</h2>
            <button
              data-testid="link-see-all-notes"
              onClick={() => setLocation("/notes")}
              className="text-[#7C3AED] text-sm hover:text-[#A855F7] transition-colors"
            >
              See all →
            </button>
          </div>
          <div className="space-y-2">
            {notesLoading ? (
              [1,2].map(i => <SkeletonCard key={i} />)
            ) : recentNotes.length === 0 ? (
              <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-4 text-center text-[#475569] text-sm">
                No open notes.
              </div>
            ) : (
              recentNotes.map((note, i) => (
                <div
                  key={note.id}
                  data-testid={`note-item-${note.id}`}
                  onClick={() => setLocation("/notes")}
                  className="bg-[#1A1A24] border border-[#2E2E45] rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer hover:border-[#7C3AED]/30 transition-all duration-200 card-appear"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <NoteCategoryBadge category={note.category} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[#E2E8F0] text-sm truncate">{note.text}</p>
                    <p className="text-[#475569] text-xs mt-0.5">
                      {note.owner} · {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* On-Call This Week */}
        <div>
          <h2 className="text-[#F8FAFC] font-semibold text-sm uppercase tracking-widest mb-3">On-Call This Week</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {oncallRoster.map((item) => {
              const isToday = item.day === todayDay;
              return (
                <div
                  key={item.day}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border min-w-[70px] transition-all",
                    isToday
                      ? "bg-[rgba(124,58,237,0.15)] border-[#7C3AED] text-[#A855F7]"
                      : "bg-[#1A1A24] border-[#2E2E45] text-[#94A3B8]"
                  )}
                >
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", isToday ? "text-[#A855F7]" : "text-[#475569]")}>
                    {item.day}
                  </span>
                  <span className={cn("text-xs", isToday ? "text-[#A855F7]" : "text-[#475569]")}>{item.date}</span>
                  <span className={cn("text-xs font-semibold", isToday ? "text-white" : "text-[#94A3B8]")}>{item.tech}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pb-6">
          <button
            data-testid="button-open-chat"
            onClick={() => setLocation("/chat")}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white font-semibold rounded-2xl glow-purple hover:opacity-90 transition-opacity"
          >
            <MessageCircle size={18} />
            Open AIDE Chat
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteCategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    "Urgent": "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30",
    "To Do": "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30",
    "To Ask": "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
    "Schedule": "bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/30",
    "Done": "bg-[#475569]/20 text-[#475569] border-[#475569]/30",
  };
  return (
    <span className={cn("flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold border", styles[category] || styles["To Do"])}>
      {category}
    </span>
  );
}

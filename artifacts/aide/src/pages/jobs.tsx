import { useState } from "react";
import { Plus, Search, X, LayoutGrid, List, Filter } from "lucide-react";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import {
  useListJobs, useCreateJob, useUpdateJob, useDeleteJob,
  getListJobsQueryKey, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { Job, UpdateJobBody } from "@workspace/api-client-react";

const STATUSES = ["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa"];

type ViewMode = "list" | "board";

interface JobFormData {
  taskNumber: string; site: string; address: string; client: string;
  contactName: string; contactNumber: string; contactEmail: string;
  actionRequired: string; priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done";
  assignedTech: string; dueDate: string; notes: string;
}

const defaultForm: JobFormData = {
  taskNumber: "", site: "", address: "", client: "",
  contactName: "", contactNumber: "", contactEmail: "",
  actionRequired: "", priority: "Medium", status: "Open",
  assignedTech: "", dueDate: "", notes: "",
};

function isOverdue(d?: string | null) {
  return !!d && new Date(d) < new Date();
}

const BOARD_COLUMNS = [
  { key: "Open",        color: "bg-violet-500" },
  { key: "In Progress", color: "bg-amber-500" },
  { key: "Booked",      color: "bg-emerald-500" },
  { key: "Blocked",     color: "bg-red-500" },
  { key: "Waiting",     color: "bg-blue-500" },
  { key: "Done",        color: "bg-slate-400" },
] as const;

function JobCard({ job, onEdit, onDelete, compact = false }: {
  job: Job; onEdit: () => void; onDelete: () => void; compact?: boolean;
}) {
  const [, setLocation] = useLocation();
  return (
    <div
      data-testid={`job-card-${job.id}`}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-all duration-200 group cursor-pointer",
        "border-l-4",
        `priority-${job.priority.toLowerCase()}`
      )}
    >
      <div
        className={cn("p-3", compact ? "p-2.5" : "p-3.5")}
        onClick={() => setLocation(`/jobs/${job.id}`)}
      >
        <div className="flex items-start gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            {job.taskNumber && (
              <span className="text-[10px] text-muted-foreground font-mono">{job.taskNumber} · </span>
            )}
            <span className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>{job.site}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate mb-2">{job.client}</p>
        <div className="flex flex-wrap gap-1">
          <PriorityBadge priority={job.priority} size="xs" />
          <StatusBadge status={job.status} size="xs" />
        </div>
        {(job.assignedTech || job.dueDate) && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            {job.assignedTech && <span>{job.assignedTech.split(" ")[0]}</span>}
            {job.dueDate && (
              <span className={cn(isOverdue(job.dueDate) ? "text-red-500 font-semibold" : "")}>
                {isOverdue(job.dueDate) ? "Overdue " : "Due "}
                {new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-border flex divide-x divide-border opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          data-testid={`button-edit-job-${job.id}`}
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="flex-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
        >
          Edit
        </button>
        <button
          data-testid={`button-delete-job-${job.id}`}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex-1 py-1.5 text-[11px] text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function KanbanBoard({ jobs, onEdit, onDelete }: {
  jobs: Job[]; onEdit: (j: Job) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
      {BOARD_COLUMNS.map(col => {
        const colJobs = jobs.filter(j => j.status === col.key);
        return (
          <div key={col.key} className="kanban-column flex-shrink-0 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className={cn("w-2 h-2 rounded-full", col.color)} />
              <span className="text-xs font-semibold text-foreground">{col.key}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">
                {colJobs.length}
              </span>
            </div>
            <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
              {colJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  compact
                  onEdit={() => onEdit(job)}
                  onDelete={() => onDelete(job.id)}
                />
              ))}
              {colJobs.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border-2 border-dashed border-border rounded-lg">
                  No jobs
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobModal({ job, onClose, onSave }: {
  job?: Job; onClose: () => void; onSave: (data: JobFormData) => void;
}) {
  const [form, setForm] = useState<JobFormData>(job ? {
    taskNumber: job.taskNumber || "", site: job.site, address: job.address || "",
    client: job.client, contactName: job.contactName || "",
    contactNumber: job.contactNumber || "", contactEmail: job.contactEmail || "",
    actionRequired: job.actionRequired, priority: job.priority,
    status: job.status, assignedTech: job.assignedTech || "",
    dueDate: job.dueDate ? job.dueDate.slice(0, 10) : "", notes: job.notes || "",
  } : defaultForm);

  const set = (k: keyof JobFormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all";
  const label = "text-xs font-medium text-muted-foreground mb-1 block uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full md:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">{job ? "Edit Job" : "New Job"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (form.site && form.client && form.actionRequired) onSave(form); }} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Task # (Uptick)</label>
              <input className={field} value={form.taskNumber} onChange={e => set("taskNumber", e.target.value)} placeholder="T-38908" data-testid="input-task-number" />
            </div>
            <div>
              <label className={label}>Due Date</label>
              <input type="date" className={field} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} data-testid="input-due-date" />
            </div>
          </div>
          <div>
            <label className={label}>Site Name *</label>
            <input className={field} value={form.site} onChange={e => set("site", e.target.value)} placeholder="Becton Dickinson" required data-testid="input-site-name" />
          </div>
          <div>
            <label className={label}>Address</label>
            <input className={field} value={form.address} onChange={e => set("address", e.target.value)} placeholder="66 Waterloo Road, Macquarie Park" data-testid="input-address" />
          </div>
          <div>
            <label className={label}>Client *</label>
            <input className={field} value={form.client} onChange={e => set("client", e.target.value)} placeholder="Becton Dickinson ANZ" required data-testid="input-client" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Contact</label>
              <input className={field} value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Veronica Peharda" data-testid="input-contact-name" />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={field} value={form.contactNumber} onChange={e => set("contactNumber", e.target.value)} placeholder="0438 759 191" data-testid="input-contact-number" />
            </div>
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" className={field} value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="contact@example.com" data-testid="input-contact-email" />
          </div>
          <div>
            <label className={label}>Action Required *</label>
            <textarea className={cn(field, "resize-none")} rows={2} value={form.actionRequired} onChange={e => set("actionRequired", e.target.value)} placeholder="What needs to happen..." required data-testid="input-action-required" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Priority</label>
              <select className={field} value={form.priority} onChange={e => set("priority", e.target.value as JobFormData["priority"])} data-testid="select-priority">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={field} value={form.status} onChange={e => set("status", e.target.value as JobFormData["status"])} data-testid="select-status">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Assigned Tech</label>
            <select className={field} value={form.assignedTech} onChange={e => set("assignedTech", e.target.value)} data-testid="select-assigned-tech">
              <option value="">Unassigned</option>
              {TECHS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={cn(field, "resize-none")} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." data-testid="input-notes" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" data-testid="button-save-job" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              {job ? "Save Changes" : "Add Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [view, setView] = useState<ViewMode>("list");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: jobs, isLoading } = useListJobs({
    status: filterStatus === "All" ? undefined : filterStatus,
    search: search || undefined,
  });

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const handleSave = async (data: JobFormData) => {
    try {
      if (editingJob) {
        await updateJob.mutateAsync({ id: editingJob.id, data });
        toast({ title: "Job updated" });
      } else {
        await createJob.mutateAsync({ data });
        toast({ title: "Job created" });
      }
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      setShowModal(false);
      setEditingJob(undefined);
    } catch {
      toast({ title: "Error", description: "Couldn't save job.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    try {
      await deleteJob.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: "Job deleted" });
    } catch {
      toast({ title: "Error", description: "Couldn't delete job.", variant: "destructive" });
    }
  };

  const allJobs = jobs || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-foreground font-bold text-lg tracking-tight">Jobs</h1>
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-search-jobs"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="w-full bg-muted border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {/* View toggle */}
            <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
              <button
                onClick={() => setView("list")}
                className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="List view"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setView("board")}
                className={cn("p-1.5 rounded-md transition-all", view === "board" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
                title="Board view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
            <button
              data-testid="button-add-job"
              onClick={() => { setEditingJob(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />Add Job
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
          {["All", ...STATUSES].map(s => (
            <button
              key={s}
              data-testid={`filter-${s.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150",
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent"
              )}
            >
              {s}
              {s !== "All" && !isLoading && (
                <span className="ml-1 opacity-60">{allJobs.filter(j => j.status === s).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : allJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
              <Filter size={20} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium text-sm">No jobs found</p>
            <p className="text-muted-foreground text-xs mt-1">Try changing your filters or add a new job.</p>
            <button
              onClick={() => { setEditingJob(undefined); setShowModal(true); }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              + Add Job
            </button>
          </div>
        ) : view === "board" ? (
          <KanbanBoard
            jobs={allJobs}
            onEdit={j => { setEditingJob(j); setShowModal(true); }}
            onDelete={handleDelete}
          />
        ) : (
          <div className="space-y-2">
            {allJobs.map((job, i) => (
              <div key={job.id} className="card-appear" style={{ animationDelay: `${i * 30}ms` }}>
                <JobCard
                  job={job}
                  onEdit={() => { setEditingJob(job); setShowModal(true); }}
                  onDelete={() => handleDelete(job.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <JobModal
          job={editingJob}
          onClose={() => { setShowModal(false); setEditingJob(undefined); }}
          onSave={handleSave}
        />
      )}

      <AnalyticsPanel section="wip" title="Jobs Analyst" />
    </div>
  );
}

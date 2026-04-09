import { useState, useMemo } from "react";
import { Plus, Search, X, LayoutGrid, List, Filter, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown, MoreHorizontal, Pencil, Trash2, ExternalLink, Download } from "lucide-react";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import {
  useListJobs, useCreateJob, useUpdateJob, useDeleteJob,
  getListJobsQueryKey, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { exportToCSV } from "@/lib/api";
import type { Job, UpdateJobBody } from "@workspace/api-client-react";

const STATUSES = ["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa"];

type ViewMode = "table" | "board";
type SortField = "taskNumber" | "site" | "client" | "priority" | "status" | "assignedTech" | "dueDate";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

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

function KanbanBoard({ jobs, onEdit, onDelete, onNavigate }: {
  jobs: Job[]; onEdit: (j: Job) => void; onDelete: (id: string) => void; onNavigate: (id: string) => void;
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
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">{colJobs.length}</span>
            </div>
            <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
              {colJobs.map(job => (
                <div key={job.id} className={cn("bg-card border border-border rounded-lg p-2.5 hover:shadow-sm transition-all cursor-pointer border-l-4", `priority-${job.priority.toLowerCase()}`)} onClick={() => onNavigate(job.id)}>
                  <div className="flex items-start gap-1.5 mb-1">
                    {job.taskNumber && <span className="text-[10px] text-muted-foreground font-mono">{job.taskNumber}</span>}
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{job.site}</p>
                  <p className="text-[10px] text-muted-foreground truncate mb-1.5">{job.client}</p>
                  <div className="flex flex-wrap gap-1">
                    <PriorityBadge priority={job.priority} size="xs" />
                  </div>
                  {(job.assignedTech || job.dueDate) && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      {job.assignedTech && <span>{job.assignedTech.split(" ")[0]}</span>}
                      {job.dueDate && (
                        <span className={cn(isOverdue(job.dueDate) ? "text-red-500 font-semibold" : "")}>
                          {new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {colJobs.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border-2 border-dashed border-border rounded-lg">No jobs</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={12} className="text-muted-foreground/40" />;
  return sortDir === "asc" ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
}

function ActionMenu({ job, onEdit, onDelete, onNavigate }: { job: Job; onEdit: () => void; onDelete: () => void; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
            <button onClick={() => { onNavigate(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors">
              <ExternalLink size={12} /> View Details
            </button>
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors">
              <Pencil size={12} /> Edit
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
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
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors">Cancel</button>
            <button type="submit" data-testid="button-save-job" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">{job ? "Save Changes" : "Add Job"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 50;

export default function Jobs() {
  const [view, setView] = useState<ViewMode>("table");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterTech, setFilterTech] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: jobs, isLoading } = useListJobs({
    search: search || undefined,
  });

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const filtered = useMemo(() => {
    let list = jobs || [];
    if (filterStatus !== "All") list = list.filter(j => j.status === filterStatus);
    if (filterPriority !== "All") list = list.filter(j => j.priority === filterPriority);
    if (filterTech !== "All") list = list.filter(j => (j.assignedTech || "Unassigned") === filterTech);
    return list;
  }, [jobs, filterStatus, filterPriority, filterTech]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "taskNumber": cmp = (a.taskNumber || "").localeCompare(b.taskNumber || ""); break;
        case "site": cmp = a.site.localeCompare(b.site); break;
        case "client": cmp = a.client.localeCompare(b.client); break;
        case "priority": cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "assignedTech": cmp = (a.assignedTech || "zzz").localeCompare(b.assignedTech || "zzz"); break;
        case "dueDate": {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(0);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paged.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paged.map(j => j.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

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
      selectedRows.delete(id);
      setSelectedRows(new Set(selectedRows));
    } catch {
      toast({ title: "Error", description: "Couldn't delete job.", variant: "destructive" });
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all([...selectedRows].map(id => updateJob.mutateAsync({ id, data: { status } as any })));
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: `${selectedRows.size} jobs updated to ${status}` });
      setSelectedRows(new Set());
    } catch {
      toast({ title: "Error updating jobs", variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!sorted.length) return;
    exportToCSV(sorted.map(j => ({
      "Task #": j.taskNumber || "",
      Site: j.site,
      Client: j.client,
      "Action Required": j.actionRequired,
      Priority: j.priority,
      Status: j.status,
      "Assigned Tech": j.assignedTech || "",
      "Due Date": j.dueDate ? new Date(j.dueDate).toLocaleDateString("en-AU") : "",
      Address: j.address || "",
    })), `jobs-${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Exported to CSV" });
  };

  const allJobs = jobs || [];
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allJobs.length };
    STATUSES.forEach(s => { counts[s] = allJobs.filter(j => j.status === s).length; });
    return counts;
  }, [allJobs]);

  const thClass = "px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap";
  const tdClass = "px-3 py-2.5 text-sm whitespace-nowrap";

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">Jobs</h1>
            <p className="text-xs text-muted-foreground">{filtered.length} of {allJobs.length} jobs</p>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-search-jobs"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search jobs..."
                className="w-full bg-muted border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(0); }}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="All">All Priorities</option>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={filterTech} onChange={e => { setFilterTech(e.target.value); setPage(0); }}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="All">All Techs</option>
              {TECHS.map(t => <option key={t}>{t}</option>)}
              <option value="Unassigned">Unassigned</option>
            </select>
            <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
              <button onClick={() => setView("table")} className={cn("p-1.5 rounded-md transition-all", view === "table" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")} title="Table view">
                <List size={14} />
              </button>
              <button onClick={() => setView("board")} className={cn("p-1.5 rounded-md transition-all", view === "board" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")} title="Board view">
                <LayoutGrid size={14} />
              </button>
            </div>
            <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Download size={12} /> Export
            </button>
            <button
              data-testid="button-add-job"
              onClick={() => { setEditingJob(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />Add Job
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide pb-0.5">
          {["All", ...STATUSES].map(s => (
            <button
              key={s}
              data-testid={`filter-${s.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => { setFilterStatus(s); setPage(0); }}
              className={cn(
                "flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150",
                filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {s}
              <span className="ml-1 opacity-60">{statusCounts[s] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div className="sticky top-[105px] z-10 bg-primary/10 border-b border-primary/20 px-4 sm:px-6 py-2 flex items-center gap-3">
          <span className="text-xs font-semibold text-primary">{selectedRows.size} selected</span>
          <div className="flex items-center gap-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => handleBulkStatusChange(s)} className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-card hover:text-foreground border border-border transition-colors">{s}</button>
            ))}
          </div>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="px-4 sm:px-6 py-3">
        {isLoading ? (
          <div className="space-y-1">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-card border border-border rounded-lg skeleton-pulse" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3"><Filter size={20} className="text-muted-foreground" /></div>
            <p className="text-foreground font-medium text-sm">No jobs found</p>
            <p className="text-muted-foreground text-xs mt-1">Try changing your filters or add a new job.</p>
          </div>
        ) : view === "board" ? (
          <KanbanBoard
            jobs={sorted}
            onEdit={j => { setEditingJob(j); setShowModal(true); }}
            onDelete={handleDelete}
            onNavigate={id => setLocation(`/jobs/${id}`)}
          />
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2.5 w-8">
                        <input type="checkbox" checked={selectedRows.size === paged.length && paged.length > 0} onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                      </th>
                      <th className={thClass} onClick={() => toggleSort("taskNumber")}>
                        <span className="flex items-center gap-1">Task # <SortIcon field="taskNumber" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass} onClick={() => toggleSort("site")}>
                        <span className="flex items-center gap-1">Site <SortIcon field="site" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass} onClick={() => toggleSort("client")}>
                        <span className="flex items-center gap-1">Client <SortIcon field="client" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className={cn(thClass, "hidden lg:table-cell")}>Action</th>
                      <th className={thClass} onClick={() => toggleSort("priority")}>
                        <span className="flex items-center gap-1">Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass} onClick={() => toggleSort("status")}>
                        <span className="flex items-center gap-1">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass} onClick={() => toggleSort("assignedTech")}>
                        <span className="flex items-center gap-1">Tech <SortIcon field="assignedTech" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className={thClass} onClick={() => toggleSort("dueDate")}>
                        <span className="flex items-center gap-1">Due <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} /></span>
                      </th>
                      <th className="px-3 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((job, i) => (
                      <tr key={job.id}
                        className={cn(
                          "border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
                          selectedRows.has(job.id) && "bg-primary/5",
                          i % 2 === 0 ? "" : "bg-muted/10"
                        )}
                        onClick={() => setLocation(`/jobs/${job.id}`)}
                      >
                        <td className="px-3 py-2.5 w-8" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedRows.has(job.id)} onChange={() => toggleSelect(job.id)}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                        </td>
                        <td className={cn(tdClass, "font-mono text-xs text-muted-foreground")}>{job.taskNumber || "—"}</td>
                        <td className={cn(tdClass, "font-semibold text-foreground max-w-[200px] truncate")}>{job.site}</td>
                        <td className={cn(tdClass, "text-muted-foreground max-w-[160px] truncate text-xs")}>{job.client}</td>
                        <td className={cn(tdClass, "hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate")}>{job.actionRequired}</td>
                        <td className={tdClass}><PriorityBadge priority={job.priority} size="xs" /></td>
                        <td className={tdClass}><StatusBadge status={job.status} size="xs" /></td>
                        <td className={cn(tdClass, "text-xs")}>{job.assignedTech ? job.assignedTech.split(" ")[0] : <span className="text-muted-foreground/40">—</span>}</td>
                        <td className={cn(tdClass, "text-xs", isOverdue(job.dueDate) ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                          {job.dueDate ? new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                          <ActionMenu
                            job={job}
                            onEdit={() => { setEditingJob(job); setShowModal(true); }}
                            onDelete={() => handleDelete(job.id)}
                            onNavigate={() => setLocation(`/jobs/${job.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-xs text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border border-border transition-colors", page === 0 ? "text-muted-foreground/40 cursor-not-allowed" : "text-foreground hover:bg-muted")}>
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={cn("w-7 h-7 rounded-lg text-xs font-medium transition-colors", page === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        {p + 1}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border border-border transition-colors", page >= totalPages - 1 ? "text-muted-foreground/40 cursor-not-allowed" : "text-foreground hover:bg-muted")}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
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

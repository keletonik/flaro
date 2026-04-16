import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, X, LayoutGrid, List, Filter, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Pencil, Trash2, ExternalLink, Download, SlidersHorizontal, ChevronLeft, ChevronRight, FilterX } from "lucide-react";
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
import type { Job } from "@workspace/api-client-react";

const STATUSES = ["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa"];

type SortField = "taskNumber" | "site" | "client" | "actionRequired" | "priority" | "status" | "assignedTech" | "dueDate";
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

function ColumnFilter({ label, options, selected, onChange, onClear }: {
  label: string; options: string[]; selected: Set<string>;
  onChange: (val: Set<string>) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;
  const hasFilter = selected.size > 0;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className={cn(
          "p-0.5 rounded transition-colors",
          hasFilter ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
      >
        <Filter size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl min-w-[180px] max-h-[300px] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="p-2 border-b border-border">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${label}...`}
              className="w-full bg-muted border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={selected.has(opt)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(opt)) next.delete(opt); else next.add(opt);
                    onChange(next);
                  }}
                  className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="truncate">{opt || "(Blank)"}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground px-2 py-2">No matches</p>}
          </div>
          <div className="border-t border-border p-1.5 flex items-center justify-between">
            <button onClick={() => { onChange(new Set(options)); }} className="text-[10px] text-muted-foreground hover:text-foreground">Select All</button>
            <button onClick={() => { onClear(); setOpen(false); }} className="text-[10px] text-primary hover:text-primary/80 font-medium">Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={10} className="text-muted-foreground/30" />;
  return sortDir === "asc" ? <ChevronUp size={10} className="text-primary" /> : <ChevronDown size={10} className="text-primary" />;
}

function ActionMenu({ job, onEdit, onDelete, onNavigate }: { job: Job; onEdit: () => void; onDelete: () => void; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
            <button onClick={() => { onNavigate(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2"><ExternalLink size={11} /> View</button>
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2"><Pencil size={11} /> Edit</button>
            <div className="border-t border-border my-0.5" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={11} /> Delete</button>
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
          <h2 className="font-bold text-foreground">{job ? "Edit WIP" : "New WIP"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (form.site && form.client && form.actionRequired) onSave(form); }} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Task # (Uptick)</label><input className={field} value={form.taskNumber} onChange={e => set("taskNumber", e.target.value)} placeholder="T-38908" /></div>
            <div><label className={label}>Due Date</label><input type="date" className={field} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
          </div>
          <div><label className={label}>Site Name *</label><input className={field} value={form.site} onChange={e => set("site", e.target.value)} placeholder="Becton Dickinson" required /></div>
          <div><label className={label}>Address</label><input className={field} value={form.address} onChange={e => set("address", e.target.value)} placeholder="66 Waterloo Road, Macquarie Park" /></div>
          <div><label className={label}>Client *</label><input className={field} value={form.client} onChange={e => set("client", e.target.value)} placeholder="Becton Dickinson ANZ" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Contact</label><input className={field} value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Veronica Peharda" /></div>
            <div><label className={label}>Phone</label><input className={field} value={form.contactNumber} onChange={e => set("contactNumber", e.target.value)} placeholder="0438 759 191" /></div>
          </div>
          <div><label className={label}>Email</label><input type="email" className={field} value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="contact@example.com" /></div>
          <div><label className={label}>Action Required *</label><textarea className={cn(field, "resize-none")} rows={2} value={form.actionRequired} onChange={e => set("actionRequired", e.target.value)} placeholder="What needs to happen..." required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Priority</label><select className={field} value={form.priority} onChange={e => set("priority", e.target.value as any)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className={label}>Status</label><select className={field} value={form.status} onChange={e => set("status", e.target.value as any)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label className={label}>Assigned Tech</label><select className={field} value={form.assignedTech} onChange={e => set("assignedTech", e.target.value)}><option value="">Unassigned</option>{TECHS.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label className={label}>Notes</label><textarea className={cn(field, "resize-none")} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">{job ? "Save Changes" : "Add WIP"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZES = [0, 25, 50, 100, 200, 500];

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filterPriority, setFilterPriority] = useState<Set<string>>(new Set());
  // Honour ?status=<x> so drill-throughs from /dashboard KPI cards
  // (e.g. "Active Jobs" -> /jobs?status=Open) pre-apply the filter.
  const [filterStatus, setFilterStatus] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const s = new URLSearchParams(window.location.search).get("status");
    return s ? new Set([s]) : new Set();
  });
  const [filterTech, setFilterTech] = useState<Set<string>>(new Set());
  const [filterClient, setFilterClient] = useState<Set<string>>(new Set());

  const { data: jobs, isLoading } = useListJobs({ search: search || undefined });
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const allJobs: Job[] = jobs || [];

  const uniqueClients = useMemo(() => [...new Set(allJobs.map(j => j.client))].sort(), [allJobs]);
  const uniqueTechs = useMemo(() => [...new Set(allJobs.map(j => j.assignedTech || "Unassigned"))].sort(), [allJobs]);

  const activeFilterCount = [filterPriority, filterStatus, filterTech, filterClient].filter(s => s.size > 0).length;

  const filtered = useMemo(() => {
    let list = allJobs;
    if (filterPriority.size > 0) list = list.filter(j => filterPriority.has(j.priority));
    if (filterStatus.size > 0) list = list.filter(j => filterStatus.has(j.status));
    if (filterTech.size > 0) list = list.filter(j => filterTech.has(j.assignedTech || "Unassigned"));
    if (filterClient.size > 0) list = list.filter(j => filterClient.has(j.client));
    return list;
  }, [allJobs, filterPriority, filterStatus, filterTech, filterClient]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "taskNumber": cmp = (a.taskNumber || "").localeCompare(b.taskNumber || ""); break;
        case "site": cmp = a.site.localeCompare(b.site); break;
        case "client": cmp = a.client.localeCompare(b.client); break;
        case "actionRequired": cmp = a.actionRequired.localeCompare(b.actionRequired); break;
        case "priority": cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "assignedTech": cmp = (a.assignedTech || "zzz").localeCompare(b.assignedTech || "zzz"); break;
        case "dueDate": cmp = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sorted.length / pageSize);
  const paged = pageSize === 0 ? sorted : sorted.slice(page * pageSize, (page + 1) * pageSize);

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

  const clearAllFilters = () => {
    setFilterPriority(new Set());
    setFilterStatus(new Set());
    setFilterTech(new Set());
    setFilterClient(new Set());
    setSearch("");
    setPage(0);
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
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all([...selectedRows].map(id => updateJob.mutateAsync({ id, data: { status } as any })));
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: `${selectedRows.size} jobs → ${status}` });
      setSelectedRows(new Set());
    } catch { toast({ title: "Bulk update failed", variant: "destructive" }); }
  };

  const handleExport = () => {
    if (!sorted.length) return;
    exportToCSV(sorted.map(j => ({
      "Task #": j.taskNumber || "", Site: j.site, Client: j.client, Address: j.address || "",
      "Action Required": j.actionRequired, Priority: j.priority, Status: j.status,
      "Assigned Tech": j.assignedTech || "", "Due Date": j.dueDate ? new Date(j.dueDate).toLocaleDateString("en-AU") : "",
    })), `jobs-${new Date().toISOString().split("T")[0]}`);
    toast({ title: `Exported ${sorted.length} jobs` });
  };

  const stats = useMemo(() => {
    const critical = filtered.filter(j => j.priority === "Critical").length;
    const high = filtered.filter(j => j.priority === "High").length;
    const overdue = filtered.filter(j => isOverdue(j.dueDate)).length;
    const unassigned = filtered.filter(j => !j.assignedTech).length;
    return { critical, high, overdue, unassigned };
  }, [filtered]);

  const thBase = "px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none whitespace-nowrap border border-neutral-600 dark:border-neutral-500";
  const tdBase = "px-2 py-1.5 border border-neutral-600 dark:border-neutral-500 text-xs";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <h1 className="text-foreground font-bold text-base tracking-tight shrink-0">WIPs</h1>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search all fields..."
                className="w-full bg-muted/50 border border-border rounded pl-7 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={10} /></button>}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors">
                <FilterX size={11} /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={handleExport} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Download size={11} /> Export
            </button>
            <button
              onClick={() => { setEditingJob(undefined); setShowModal(true); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90 transition-opacity"
            >
              <Plus size={12} />Add WIP
            </button>
          </div>
        </div>

        {(activeFilterCount > 0 || search) && (
          <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                Search: "{search}" <button onClick={() => setSearch("")}><X size={9} /></button>
              </span>
            )}
            {filterPriority.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                Priority: {[...filterPriority].join(", ")} <button onClick={() => setFilterPriority(new Set())}><X size={9} /></button>
              </span>
            )}
            {filterStatus.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                Status: {[...filterStatus].join(", ")} <button onClick={() => setFilterStatus(new Set())}><X size={9} /></button>
              </span>
            )}
            {filterTech.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                Tech: {[...filterTech].join(", ")} <button onClick={() => setFilterTech(new Set())}><X size={9} /></button>
              </span>
            )}
            {filterClient.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                Client: {filterClient.size} selected <button onClick={() => setFilterClient(new Set())}><X size={9} /></button>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">{filtered.length}</span> of {allJobs.length} WIPs
          {stats.critical > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{stats.critical} critical</span>}
          {stats.high > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />{stats.high} high</span>}
          {stats.overdue > 0 && <span className="text-red-500 font-semibold">{stats.overdue} overdue</span>}
          {stats.unassigned > 0 && <span>{stats.unassigned} unassigned</span>}
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div className="sticky top-[88px] z-10 bg-primary/10 border-b border-primary/20 px-3 py-1.5 flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary">{selectedRows.size} selected</span>
          <span className="text-[10px] text-muted-foreground">Set status:</span>
          {STATUSES.map(s => (
            <button key={s} onClick={() => handleBulkStatusChange(s)} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted hover:bg-card text-muted-foreground hover:text-foreground border border-border transition-colors">{s}</button>
          ))}
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-1">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-8 bg-muted/50 rounded skeleton-pulse" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Filter size={24} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-foreground font-medium">No WIPs match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search query</p>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="mt-3 text-xs text-primary hover:underline">Clear all filters</button>}
          </div>
        ) : (
          <div className="overflow-auto h-[calc(100vh-140px)] px-2">
            <table className="w-full border-collapse border border-neutral-600 dark:border-neutral-500">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted">
                  <th className={cn(thBase, "w-8 text-center")}>
                    <input type="checkbox" checked={selectedRows.size === paged.length && paged.length > 0} onChange={toggleSelectAll}
                      className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[80px]")} onClick={() => toggleSort("taskNumber")}>
                    <div className="flex items-center gap-1">
                      Task # <SortIcon field="taskNumber" sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground min-w-[160px]")} onClick={() => toggleSort("site")}>
                    <div className="flex items-center gap-1">
                      Site <SortIcon field="site" sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground min-w-[130px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("client")}>
                      Client <SortIcon field="client" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Client" options={uniqueClients} selected={filterClient} onChange={v => { setFilterClient(v); setPage(0); }} onClear={() => setFilterClient(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground min-w-[160px] hidden xl:table-cell")} onClick={() => toggleSort("actionRequired")}>
                    <div className="flex items-center gap-1">
                      Action <SortIcon field="actionRequired" sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[85px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("priority")}>
                      Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Priority" options={[...PRIORITIES]} selected={filterPriority} onChange={v => { setFilterPriority(v); setPage(0); }} onClear={() => setFilterPriority(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[95px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("status")}>
                      Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Status" options={[...STATUSES]} selected={filterStatus} onChange={v => { setFilterStatus(v); setPage(0); }} onClear={() => setFilterStatus(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[90px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("assignedTech")}>
                      Tech <SortIcon field="assignedTech" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Tech" options={uniqueTechs} selected={filterTech} onChange={v => { setFilterTech(v); setPage(0); }} onClear={() => setFilterTech(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[75px]")} onClick={() => toggleSort("dueDate")}>
                    <div className="flex items-center gap-1">
                      Due <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
                  <th className={cn(thBase, "w-8 text-center")}>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((job, i) => {
                  const overdue = isOverdue(job.dueDate);
                  return (
                    <tr key={job.id}
                      className={cn(
                        "hover:bg-primary/5 transition-colors cursor-pointer",
                        selectedRows.has(job.id) && "bg-primary/8",
                        overdue && !selectedRows.has(job.id) && "bg-red-950/10",
                        i % 2 === 1 && !selectedRows.has(job.id) && !overdue && "bg-muted/15"
                      )}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                    >
                      <td className={cn(tdBase, "w-8 text-center")} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedRows.has(job.id)} onChange={() => toggleSelect(job.id)} className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                      </td>
                      <td className={cn(tdBase, "font-mono text-[10px] text-muted-foreground")}>{job.taskNumber || "—"}</td>
                      <td className={cn(tdBase, "font-semibold text-foreground")}>
                        <div className="truncate max-w-[220px]" title={job.site}>{job.site}</div>
                      </td>
                      <td className={cn(tdBase, "text-muted-foreground")}>
                        <div className="truncate max-w-[160px]" title={job.client}>{job.client}</div>
                      </td>
                      <td className={cn(tdBase, "text-muted-foreground hidden xl:table-cell")}>
                        <div className="truncate max-w-[220px]" title={job.actionRequired}>{job.actionRequired}</div>
                      </td>
                      <td className={tdBase}><PriorityBadge priority={job.priority} size="xs" /></td>
                      <td className={tdBase}><StatusBadge status={job.status} size="xs" /></td>
                      <td className={tdBase}>{job.assignedTech ? <span title={job.assignedTech}>{job.assignedTech.split(" ")[0]}</span> : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className={cn(tdBase, "tabular-nums", overdue ? "text-red-500 font-bold" : "text-muted-foreground")}>
                        {job.dueDate ? new Date(job.dueDate).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className={cn(tdBase, "w-8 text-center")} onClick={e => e.stopPropagation()}>
                        <ActionMenu job={job}
                          onEdit={() => { setEditingJob(job); setShowModal(true); }}
                          onDelete={() => handleDelete(job.id)}
                          onNavigate={() => setLocation(`/jobs/${job.id}`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground z-10">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'All' : s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>{pageSize === 0 ? `1–${sorted.length}` : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)}`} of {sorted.length}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPage(0)} disabled={page === 0} className={cn("px-1 py-0.5 rounded hover:bg-muted", page === 0 && "opacity-30 cursor-not-allowed")}>
              <ChevronLeft size={12} /><ChevronLeft size={12} className="-ml-2" />
            </button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className={cn("px-1 py-0.5 rounded hover:bg-muted", page === 0 && "opacity-30 cursor-not-allowed")}>
              <ChevronLeft size={12} />
            </button>
            <span className="px-2 text-foreground font-medium">Page {page + 1} of {totalPages || 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className={cn("px-1 py-0.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30 cursor-not-allowed")}>
              <ChevronRight size={12} />
            </button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className={cn("px-1 py-0.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30 cursor-not-allowed")}>
              <ChevronRight size={12} /><ChevronRight size={12} className="-ml-2" />
            </button>
          </div>
        </div>
      </div>

      {showModal && <JobModal job={editingJob} onClose={() => { setShowModal(false); setEditingJob(undefined); }} onSave={handleSave} />}
      <AnalyticsPanel section="wip" title="WIPs Analyst" />
    </div>
  );
}

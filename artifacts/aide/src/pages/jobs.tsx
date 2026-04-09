import { useState } from "react";
import { Plus, Search, X, ChevronRight } from "lucide-react";
import { useListJobs, useCreateJob, useUpdateJob, useDeleteJob, getListJobsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { Job, CreateJobBody, UpdateJobBody } from "@workspace/api-client-react";

const STATUSES = ["All", "Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa", "Unassigned"];

type FilterStatus = typeof STATUSES[number];

interface JobFormData {
  taskNumber: string;
  site: string;
  address: string;
  client: string;
  contactName: string;
  contactNumber: string;
  contactEmail: string;
  actionRequired: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done";
  assignedTech: string;
  dueDate: string;
  notes: string;
}

const defaultForm: JobFormData = {
  taskNumber: "", site: "", address: "", client: "", contactName: "",
  contactNumber: "", contactEmail: "", actionRequired: "", priority: "Medium",
  status: "Open", assignedTech: "", dueDate: "", notes: "",
};

function isOverdue(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function JobModal({
  job,
  onClose,
  onSave,
}: {
  job?: Job;
  onClose: () => void;
  onSave: (data: JobFormData) => void;
}) {
  const [form, setForm] = useState<JobFormData>(job ? {
    taskNumber: job.taskNumber || "",
    site: job.site,
    address: job.address || "",
    client: job.client,
    contactName: job.contactName || "",
    contactNumber: job.contactNumber || "",
    contactEmail: job.contactEmail || "",
    actionRequired: job.actionRequired,
    priority: job.priority,
    status: job.status,
    assignedTech: job.assignedTech || "",
    dueDate: job.dueDate || "",
    notes: job.notes || "",
  } : defaultForm);

  const set = (key: keyof JobFormData, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const inputClass = "w-full bg-[#242433] border border-[#2E2E45] rounded-xl px-3 py-2.5 text-[#F8FAFC] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors";
  const labelClass = "text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-1.5 block";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.site || !form.client || !form.actionRequired) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1A1A24] border border-[#2E2E45] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1A1A24] border-b border-[#2E2E45] px-6 py-4 flex items-center justify-between">
          <h2 className="text-[#F8FAFC] font-bold text-lg">{job ? "Edit Job" : "Add Job"}</h2>
          <button data-testid="button-close-modal" onClick={onClose} className="text-[#475569] hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Task # (Uptick)</label>
              <input className={inputClass} value={form.taskNumber} onChange={e => set("taskNumber", e.target.value)} placeholder="T-38908" data-testid="input-task-number" />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} data-testid="input-due-date" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Site Name *</label>
            <input className={inputClass} value={form.site} onChange={e => set("site", e.target.value)} placeholder="Becton Dickinson" required data-testid="input-site-name" />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input className={inputClass} value={form.address} onChange={e => set("address", e.target.value)} placeholder="66 Waterloo Road, Macquarie Park" data-testid="input-address" />
          </div>
          <div>
            <label className={labelClass}>Client *</label>
            <input className={inputClass} value={form.client} onChange={e => set("client", e.target.value)} placeholder="Becton Dickinson ANZ" required data-testid="input-client" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input className={inputClass} value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Veronica Peharda" data-testid="input-contact-name" />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input className={inputClass} value={form.contactNumber} onChange={e => set("contactNumber", e.target.value)} placeholder="0438 759 191" data-testid="input-contact-number" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Contact Email</label>
            <input type="email" className={inputClass} value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="contact@example.com" data-testid="input-contact-email" />
          </div>
          <div>
            <label className={labelClass}>Action Required *</label>
            <textarea className={cn(inputClass, "resize-none")} rows={2} value={form.actionRequired} onChange={e => set("actionRequired", e.target.value)} placeholder="What needs to happen..." required data-testid="input-action-required" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Priority *</label>
              <select className={inputClass} value={form.priority} onChange={e => set("priority", e.target.value as JobFormData["priority"])} data-testid="select-priority">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status *</label>
              <select className={inputClass} value={form.status} onChange={e => set("status", e.target.value as JobFormData["status"])} data-testid="select-status">
                {["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Assigned Tech</label>
            <select className={inputClass} value={form.assignedTech} onChange={e => set("assignedTech", e.target.value)} data-testid="select-assigned-tech">
              <option value="">Unassigned</option>
              {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={cn(inputClass, "resize-none")} rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." data-testid="input-notes" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-[#242433] text-[#94A3B8] rounded-xl font-semibold hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" data-testid="button-save-job" className="flex-1 py-3 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
              {job ? "Save Changes" : "Add Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
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
    if (!confirm("Delete this job? This cannot be undone.")) return;
    try {
      await deleteJob.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: "Job deleted" });
    } catch {
      toast({ title: "Error", description: "Couldn't delete job.", variant: "destructive" });
    }
  };

  const displayedJobs = jobs || [];

  return (
    <div className="min-h-screen bg-[#0F0F13]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F13]/90 backdrop-blur-md border-b border-[#2E2E45] px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-[#F8FAFC] font-bold text-xl uppercase tracking-widest">Jobs</h1>
          <button
            data-testid="button-add-job"
            onClick={() => { setEditingJob(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity glow-purple"
          >
            <Plus size={16} />Add Job
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUSES.map(s => (
            <button
              key={s}
              data-testid={`filter-${s.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                filterStatus === s
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#1A1A24] border border-[#2E2E45] text-[#94A3B8] hover:border-[#7C3AED]/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input
            data-testid="input-search-jobs"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full bg-[#1A1A24] border border-[#2E2E45] rounded-xl pl-9 pr-4 py-2.5 text-[#F8FAFC] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : displayedJobs.length === 0 ? (
          <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-8 text-center">
            <p className="text-[#475569] text-sm">No jobs found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedJobs.map((job, i) => (
              <div
                key={job.id}
                data-testid={`job-card-${job.id}`}
                className={cn(
                  "bg-[#1A1A24] border border-[#2E2E45] border-l-4 rounded-2xl p-4 card-appear",
                  `priority-${job.priority.toLowerCase()}`
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#F8FAFC] font-bold text-sm">
                        {job.taskNumber || "No ref"} — {job.site}
                      </span>
                    </div>
                    <p className="text-[#94A3B8] text-xs mt-0.5">{job.client}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <PriorityBadge priority={job.priority} />
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#475569]">
                      {job.assignedTech && <span>{job.assignedTech}</span>}
                      {job.contactNumber && <span>{job.contactNumber}</span>}
                      {job.dueDate && (
                        <span className={isOverdue(job.dueDate) ? "text-[#EF4444] font-semibold" : ""}>
                          {isOverdue(job.dueDate) ? "Overdue: " : "Due: "}
                          {new Date(job.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      data-testid={`button-edit-job-${job.id}`}
                      onClick={() => { setEditingJob(job); setShowModal(true); }}
                      className="px-3 py-1.5 bg-[rgba(124,58,237,0.15)] border border-[#7C3AED]/40 text-[#A855F7] text-xs rounded-lg hover:bg-[rgba(124,58,237,0.25)] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      data-testid={`button-delete-job-${job.id}`}
                      onClick={() => handleDelete(job.id)}
                      className="px-3 py-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs rounded-lg hover:bg-[#EF4444]/20 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      className="text-[#475569] hover:text-[#7C3AED] self-center"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
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
    </div>
  );
}

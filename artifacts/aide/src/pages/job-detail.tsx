import { useParams, useLocation } from "wouter";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useGetJob, useUpdateJob, useDeleteJob, getListJobsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { UpdateJobBody } from "@workspace/api-client-react";

const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa", "Unassigned"];

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#2E2E45] last:border-0">
      <Icon size={16} className="text-[#475569] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[#475569] text-xs uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-[#E2E8F0] text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingAssigned, setEditingAssigned] = useState(false);

  const { data: job, isLoading, refetch } = useGetJob(params.id);
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const handleUpdateStatus = async (status: string) => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({ id: job.id, data: { status: status as UpdateJobBody["status"] } });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      await refetch();
      toast({ title: "Status updated" });
      setEditingStatus(false);
    } catch {
      toast({ title: "Error", description: "Couldn't update status.", variant: "destructive" });
    }
  };

  const handleUpdateAssigned = async (tech: string) => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({ id: job.id, data: { assignedTech: tech === "Unassigned" ? undefined : tech } });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      await refetch();
      toast({ title: "Tech assigned" });
      setEditingAssigned(false);
    } catch {
      toast({ title: "Error", description: "Couldn't update tech.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!job || !confirm("Delete this job? This cannot be undone.")) return;
    try {
      await deleteJob.mutateAsync({ id: job.id });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: "Job deleted" });
      setLocation("/jobs");
    } catch {
      toast({ title: "Error", description: "Couldn't delete job.", variant: "destructive" });
    }
  };

  const handleCall = (number: string) => {
    window.open(`tel:${number.replace(/\s/g, "")}`, "_self");
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, "_self");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#475569] text-sm">Job not found.</p>
          <button onClick={() => setLocation("/jobs")} className="mt-3 text-[#7C3AED] text-sm">← Back to Jobs</button>
        </div>
      </div>
    );
  }

  const isOverdue = job.dueDate && new Date(job.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-[#0F0F13]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F13]/90 backdrop-blur-md border-b border-[#2E2E45] px-4 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/jobs")}
            className="w-9 h-9 rounded-full bg-[#1A1A24] border border-[#2E2E45] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[#F8FAFC] font-bold text-lg truncate">{job.site}</h1>
            <p className="text-[#475569] text-xs">{job.client}</p>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="button-delete-job"
              onClick={handleDelete}
              className="w-9 h-9 rounded-full bg-[#1A1A24] border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Priority + Status bar */}
        <div className={cn(
          "bg-[#1A1A24] border border-[#2E2E45] border-l-4 rounded-2xl p-4",
          `priority-${job.priority.toLowerCase()}`
        )}>
          <div className="flex items-center gap-3 flex-wrap">
            {job.taskNumber && (
              <span className="text-[#7C3AED] font-bold text-sm">{job.taskNumber}</span>
            )}
            <PriorityBadge priority={job.priority} />
            <div className="flex-shrink-0">
              {editingStatus ? (
                <div className="flex flex-wrap gap-1.5">
                  {["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"].map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      className="px-2 py-1 rounded text-xs bg-[#242433] border border-[#2E2E45] text-[#94A3B8] hover:border-[#7C3AED] hover:text-white transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  data-testid="button-change-status"
                  onClick={() => setEditingStatus(true)}
                  className="hover:opacity-80 transition-opacity"
                >
                  <StatusBadge status={job.status} />
                </button>
              )}
            </div>
          </div>
          {isOverdue && (
            <div className="flex items-center gap-1.5 mt-3 text-[#EF4444] text-xs font-semibold">
              <AlertCircle size={12} />
              Overdue — {new Date(job.dueDate!).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          )}
          {job.dueDate && !isOverdue && (
            <div className="mt-3 flex items-center gap-1.5 text-[#475569] text-xs">
              <Calendar size={12} />
              Due: {new Date(job.dueDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          )}
        </div>

        {/* Action Required */}
        <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-4">
          <p className="text-[#7C3AED] text-xs font-bold uppercase tracking-widest mb-2">Action Required</p>
          <p className="text-[#E2E8F0] text-sm leading-relaxed">{job.actionRequired}</p>
        </div>

        {/* Assigned Tech */}
        <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#475569] text-xs uppercase tracking-wider">Assigned Tech</p>
            <button
              data-testid="button-change-tech"
              onClick={() => setEditingAssigned(!editingAssigned)}
              className="text-[#7C3AED] text-xs hover:text-[#A855F7] transition-colors"
            >
              Change
            </button>
          </div>
          {editingAssigned ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {TECHS.map(t => (
                <button
                  key={t}
                  onClick={() => handleUpdateAssigned(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    job.assignedTech === t
                      ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                      : "bg-[#242433] border-[#2E2E45] text-[#94A3B8] hover:border-[#7C3AED]/50"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#7C3AED]/30 border border-[#7C3AED]/50 flex items-center justify-center text-[10px] text-[#A855F7] font-bold">
                {(job.assignedTech || "U").charAt(0)}
              </div>
              <span className="text-[#E2E8F0] text-sm">{job.assignedTech || "Unassigned"}</span>
            </div>
          )}
        </div>

        {/* Contact Details */}
        {(job.contactName || job.contactNumber || job.contactEmail || job.address) && (
          <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl px-4 py-2">
            <p className="text-[#7C3AED] text-xs font-bold uppercase tracking-widest py-3">Contact Details</p>
            <DetailRow icon={User} label="Contact" value={job.contactName} />
            <DetailRow icon={MapPin} label="Address" value={job.address} />
            {job.contactNumber && (
              <div className="flex items-start gap-3 py-3 border-b border-[#2E2E45] last:border-0">
                <Phone size={16} className="text-[#475569] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#475569] text-xs uppercase tracking-wider mb-0.5">Phone</p>
                  <button
                    data-testid="button-call-contact"
                    onClick={() => handleCall(job.contactNumber!)}
                    className="text-[#3B82F6] text-sm hover:text-blue-400 transition-colors"
                  >
                    {job.contactNumber}
                  </button>
                </div>
              </div>
            )}
            {job.contactEmail && (
              <div className="flex items-start gap-3 py-3 border-b border-[#2E2E45] last:border-0">
                <Mail size={16} className="text-[#475569] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#475569] text-xs uppercase tracking-wider mb-0.5">Email</p>
                  <button
                    data-testid="button-email-contact"
                    onClick={() => handleEmail(job.contactEmail!)}
                    className="text-[#3B82F6] text-sm hover:text-blue-400 transition-colors break-all"
                  >
                    {job.contactEmail}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-4">
            <p className="text-[#7C3AED] text-xs font-bold uppercase tracking-widest mb-2">Notes</p>
            <p className="text-[#E2E8F0] text-sm leading-relaxed whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

        {/* Meta */}
        <div className="text-center text-[#475569] text-xs pb-4">
          Created {new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          {job.updatedAt && job.updatedAt !== job.createdAt && (
            <> · Updated {new Date(job.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}</>
          )}
        </div>
      </div>
    </div>
  );
}

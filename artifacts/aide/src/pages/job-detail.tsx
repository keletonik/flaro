import { useParams, useLocation } from "wouter";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User, AlertCircle, Trash2, ChevronDown } from "lucide-react";
import { useGetJob, useUpdateJob, useDeleteJob, getListJobsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { UpdateJobBody } from "@workspace/api-client-react";

const TECHS = ["Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "John Minai", "Nu Unasa"];
const STATUSES = ["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, href, testId }: {
  icon: React.ElementType; label: string; value?: string | null;
  href?: string; testId?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
      <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        {href ? (
          <a href={href} data-testid={testId} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{value}</a>
        ) : (
          <p className="text-sm text-foreground break-words">{value}</p>
        )}
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
  const [editingTech, setEditingTech] = useState(false);

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

  const handleUpdateTech = async (tech: string) => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({ id: job.id, data: { assignedTech: tech === "Unassigned" ? undefined : tech } });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      await refetch();
      toast({ title: "Tech updated" });
      setEditingTech(false);
    } catch {
      toast({ title: "Error", description: "Couldn't update tech.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!job || !confirm("Delete this job?")) return;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">Job not found.</p>
        <button onClick={() => setLocation("/jobs")} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg">← Back to Jobs</button>
      </div>
    );
  }

  const isOverdue = job.dueDate && new Date(job.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/jobs")}
            className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {job.taskNumber && <span className="text-[10px] text-muted-foreground font-mono">{job.taskNumber}</span>}
              <h1 className="text-foreground font-bold text-base truncate">{job.site}</h1>
            </div>
            <p className="text-xs text-muted-foreground">{job.client}</p>
          </div>
          <button
            data-testid="button-delete-job"
            onClick={handleDelete}
            className="w-8 h-8 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Status + Priority bar */}
        <div className={cn(
          "bg-card border border-border border-l-4 rounded-xl p-4",
          `priority-${job.priority.toLowerCase()}`
        )}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <PriorityBadge priority={job.priority} />
            <div>
              {editingStatus ? (
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                        job.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                  <button onClick={() => setEditingStatus(false)} className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground">×</button>
                </div>
              ) : (
                <button
                  data-testid="button-change-status"
                  onClick={() => setEditingStatus(true)}
                  className="flex items-center gap-1"
                >
                  <StatusBadge status={job.status} />
                  <ChevronDown size={11} className="text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          {isOverdue && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs font-semibold">
              <AlertCircle size={12} />
              Overdue — {new Date(job.dueDate!).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          )}
          {job.dueDate && !isOverdue && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Calendar size={12} />
              Due: {new Date(job.dueDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Action Required */}
        <Section title="Action Required">
          <p className="text-sm text-foreground leading-relaxed">{job.actionRequired}</p>
        </Section>

        {/* Assigned Tech */}
        <Section title="Assigned Tech">
          {editingTech ? (
            <div className="flex flex-wrap gap-1.5">
              {["Unassigned", ...TECHS].map(t => (
                <button
                  key={t}
                  onClick={() => handleUpdateTech(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-all",
                    (job.assignedTech || "Unassigned") === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {t}
                </button>
              ))}
              <button onClick={() => setEditingTech(false)} className="px-2 py-1 rounded-lg text-sm text-muted-foreground hover:text-foreground">×</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                  {(job.assignedTech || "?").charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground">{job.assignedTech || "Unassigned"}</span>
              </div>
              <button
                data-testid="button-change-tech"
                onClick={() => setEditingTech(true)}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </Section>

        {/* Contact Details */}
        {(job.contactName || job.contactNumber || job.contactEmail || job.address) && (
          <Section title="Contact Details">
            <div className="space-y-0">
              <DetailRow icon={User} label="Contact" value={job.contactName} />
              <DetailRow icon={MapPin} label="Address" value={job.address} />
              <DetailRow icon={Phone} label="Phone" value={job.contactNumber} href={`tel:${job.contactNumber?.replace(/\s/g, "")}`} testId="button-call-contact" />
              <DetailRow icon={Mail} label="Email" value={job.contactEmail} href={`mailto:${job.contactEmail}`} testId="button-email-contact" />
            </div>
          </Section>
        )}

        {/* Notes */}
        {job.notes && (
          <Section title="Notes">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{job.notes}</p>
          </Section>
        )}

        {/* Meta */}
        <p className="text-center text-[10px] text-muted-foreground pb-4">
          Created {new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          {job.updatedAt !== job.createdAt && ` · Updated ${new Date(job.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}`}
        </p>
      </div>
    </div>
  );
}

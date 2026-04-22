import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Calendar, RefreshCw, MapPin, AlertTriangle, Users, ChevronRight, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PriorityBadge } from "@/components/PriorityBadge";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";

/**
 * Scheduling Assistant — beta
 *
 * Reads /scheduling-suggestions and renders one card per technician with a
 * stack of suggested "runs" (suburb-clustered job groups). Clicking a job
 * deep-links into the existing job-detail page so the user can take action.
 *
 * No mutation lives on this page yet — applying a suggested run is manual
 * for the beta. Future iterations will add: drag-to-reassign, "send run to
 * tech", LLM-generated reasoning per run, and live ETA / drive time.
 */

interface SuggestedJob {
  id: string;
  taskNumber: string | null;
  site: string;
  address: string | null;
  priority: string | null;
  status: string | null;
  dueDate: string | null;
  actionRequired: string | null;
}

interface SuggestedRun {
  runId: string;
  suburb: string;
  jobCount: number;
  topPriority: string;
  jobs: SuggestedJob[];
}

interface TechBucket {
  tech: string;
  isUnassigned: boolean;
  totalOpenJobs: number;
  runs: SuggestedRun[];
}

interface SchedulingResponse {
  generatedAt: string;
  version: string;
  totalOpenJobs: number;
  knownCrew: string[];
  buckets: TechBucket[];
}

function formatRelative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleString();
}

function formatDue(due: string | null): string {
  if (!due) return "—";
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Scheduling() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<SchedulingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch<SchedulingResponse>("/scheduling-suggestions");
      setData(resp);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Drop handler shared by every tech-card header drop zone. Optimistic
      update is intentionally skipped — we wait for the server response
      and a full refetch via useLiveUpdates. The cost is ~30s in the worst
      case; the benefit is the UI never disagrees with the DB. */
  const reassign = useCallback(async (jobId: string, newTech: string | null) => {
    setReassigning(true);
    try {
      const payload = { jobId, newTech };
      const r = await apiFetch<{ jobId: string; assignedTech: string | null; taskNumber: string | null }>(
        "/scheduling-suggestions/reassign",
        { method: "POST", body: JSON.stringify(payload) },
      );
      toast({
        title: `Reassigned${r.taskNumber ? ` ${r.taskNumber}` : ""}`,
        description: r.assignedTech ? `→ ${r.assignedTech}` : "→ Unassigned",
      });
      void load();
    } catch (e: any) {
      toast({
        title: "Reassign failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setReassigning(false);
      setDragJobId(null);
      setDropTarget(null);
    }
  }, [load, toast]);

  useEffect(() => { load(); }, [load]);
  // Airtable edits → SSE → refetch. Keeps the runs current without
  // forcing the user to hit Refresh after every status change.
  useLiveUpdates(() => { void load(); });

  const toggleTech = (tech: string) =>
    setCollapsed(prev => ({ ...prev, [tech]: !prev[tech] }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Scheduling Assistant"
        subtitle="Suggested runs for your crew, grouped by suburb and priority."
        actions={
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border border-amber-500/40 text-amber-400 bg-amber-500/10">
              beta
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={cn(loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        }
      />

      {data && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} />
            {data.buckets.filter(b => !b.isUnassigned).length} techs
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} />
            {data.totalOpenJobs} open jobs
          </span>
          <span>Generated {formatRelative(data.generatedAt)}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-sm text-muted-foreground">Loading suggestions…</div>
      )}

      {data && data.buckets.length === 0 && (
        <div className="p-8 rounded-lg border border-border bg-card text-center text-muted-foreground">
          No open jobs found. Nothing to schedule right now.
        </div>
      )}

      <div className="space-y-4">
        {data?.buckets.map(bucket => {
          const isCollapsed = collapsed[bucket.tech];
          return (
            <section
              key={bucket.tech}
              className={cn(
                "rounded-lg border bg-card overflow-hidden transition-colors",
                bucket.isUnassigned ? "border-amber-500/30" : "border-border",
                dropTarget === bucket.tech && dragJobId && "border-primary ring-2 ring-primary/40",
              )}
              onDragOver={(e) => {
                if (!dragJobId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropTarget !== bucket.tech) setDropTarget(bucket.tech);
              }}
              onDragLeave={() => { if (dropTarget === bucket.tech) setDropTarget(null); }}
              onDrop={(e) => {
                if (!dragJobId) return;
                e.preventDefault();
                const target = bucket.isUnassigned ? null : bucket.tech;
                void reassign(dragJobId, target);
              }}
            >
              <header
                className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleTech(bucket.tech)}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight
                    size={14}
                    className={cn("text-muted-foreground transition-transform", !isCollapsed && "rotate-90")}
                  />
                  <h3 className="text-sm font-semibold tracking-wide">
                    {bucket.tech}
                  </h3>
                  {bucket.isUnassigned && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      needs assignment
                    </span>
                  )}
                  {dropTarget === bucket.tech && dragJobId && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded bg-primary/15 text-primary border border-primary/40">
                      drop to reassign
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{bucket.runs.length} run{bucket.runs.length === 1 ? "" : "s"}</span>
                  <span>{bucket.totalOpenJobs} jobs</span>
                </div>
              </header>

              {!isCollapsed && (
                <div className="divide-y divide-border">
                  {bucket.runs.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No suggested runs.
                    </div>
                  ) : (
                    bucket.runs.map((run, idx) => (
                      <div key={run.runId} className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-muted-foreground">
                              run {idx + 1}
                            </span>
                            <MapPin size={12} className="text-muted-foreground" />
                            <span className="text-sm font-medium">{run.suburb}</span>
                            <span className="text-xs text-muted-foreground">
                              · {run.jobCount} job{run.jobCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <PriorityBadge priority={run.topPriority as any} />
                        </div>

                        <div className="overflow-hidden rounded border border-border/60">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/30 text-muted-foreground">
                              <tr>
                                <th className="w-6 px-1.5 py-1.5"></th>
                                <th className="text-left px-2 py-1.5 font-normal w-20">Task</th>
                                <th className="text-left px-2 py-1.5 font-normal">Site</th>
                                <th className="text-left px-2 py-1.5 font-normal w-24">Priority</th>
                                <th className="text-left px-2 py-1.5 font-normal w-20">Due</th>
                                <th className="text-left px-2 py-1.5 font-normal">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {run.jobs.map(job => (
                                <tr
                                  key={job.id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDragJobId(job.id);
                                    e.dataTransfer.effectAllowed = "move";
                                    try { e.dataTransfer.setData("text/plain", job.id); } catch {}
                                  }}
                                  onDragEnd={() => {
                                    setDragJobId(null);
                                    setDropTarget(null);
                                  }}
                                  className={cn(
                                    "border-t border-border/40 hover:bg-muted/20 cursor-grab active:cursor-grabbing transition-colors",
                                    dragJobId === job.id && "opacity-50",
                                    reassigning && dragJobId === job.id && "pointer-events-none",
                                  )}
                                  onClick={() => setLocation(`/jobs/${job.id}`)}
                                >
                                  <td className="px-1.5 py-1.5 text-muted-foreground/50 select-none">
                                    <GripVertical size={12} />
                                  </td>
                                  <td className="px-2 py-1.5 font-mono text-foreground">
                                    {job.taskNumber || "—"}
                                  </td>
                                  <td className="px-2 py-1.5 truncate max-w-[260px]" title={job.site}>
                                    {job.site}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {job.priority ? <PriorityBadge priority={job.priority as any} /> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-2 py-1.5 text-muted-foreground">
                                    {formatDue(job.dueDate)}
                                  </td>
                                  <td className="px-2 py-1.5 truncate max-w-[300px] text-muted-foreground" title={job.actionRequired ?? ""}>
                                    {job.actionRequired || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70 pt-4 border-t border-border/40">
        Beta-2 heuristic: open jobs grouped by suburb, priority-sorted, capped
        at 8 per run. Drag a row to another tech card to reassign it — the
        change writes back to Airtable. Drive-time clustering and LLM
        reasoning land in v3.
      </p>
    </div>
  );
}

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProjectActivity } from "@/hooks/useProjectDetails";

interface Props {
  activity: ProjectActivity[];
  loading?: boolean;
}

const ACTION_GLYPH: Record<string, string> = {
  "project.created": "+",
  "project.updated": "~",
  "task.created": "+",
  "task.updated": "~",
  "task.status_changed": ">>",
  "milestone.created": "*",
  "milestone.completed": "✓",
  "milestone.reopened": "○",
  "milestone.deleted": "x",
  "member.added": "@",
  "member.removed": "-",
};

function formatAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function ProjectActivityPanel({ activity, loading }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? activity : activity.slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">activity</span>
        {activity.length > 6 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
          >
            {expanded ? `show 6 of ${activity.length}` : `show all (${activity.length})`}
          </button>
        )}
      </div>

      {loading && activity.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3">Loading...</p>
      ) : activity.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3">No activity yet. Start adding tasks and milestones.</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((a) => {
            const glyph = ACTION_GLYPH[a.action] || "•";
            const isBreaking = a.action.includes("deleted") || a.action.includes("removed");
            return (
              <li key={a.id} className="flex items-start gap-2 text-[11px]">
                <span
                  className={cn(
                    "inline-flex w-5 h-5 items-center justify-center rounded text-[11px] font-mono shrink-0",
                    isBreaking ? "bg-red-500/10 text-red-500" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {glyph}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground leading-tight">{a.summary}</p>
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{formatAgo(a.createdAt)}{a.actor ? ` • ${a.actor}` : ""}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

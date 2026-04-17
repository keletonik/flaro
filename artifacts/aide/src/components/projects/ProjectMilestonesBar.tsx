import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProjectMilestone } from "@/hooks/useProjectDetails";

interface Props {
  milestones: ProjectMilestone[];
  onAdd: (input: { name: string; dueDate?: string | null }) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AVATAR_PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#7C3AED", "#0EA5E9"];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const days = daysUntil(dateStr);
  if (days === null) return dateStr;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days <= 14) return `in ${days}d`;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function ProjectMilestonesBar({ milestones, onAdd, onToggle, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), dueDate: dueDate || null });
      setName("");
      setDueDate("");
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = milestones.filter((m) => m.completedAt).length;
  const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">milestones</span>
          <span className="text-[11px] text-foreground font-semibold">{completedCount}/{milestones.length}</span>
          <span className="text-[10px] text-muted-foreground">{progress}%</span>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
        >
          {adding ? "cancel" : "+ add"}
        </button>
      </div>

      {adding && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Milestone name..."
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || submitting}
            className="text-[11px] font-mono text-primary disabled:opacity-40"
          >
            save
          </button>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-3">No milestones yet. Break the project into 4-7 checkpoints.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {milestones.map((m, idx) => {
            const completed = !!m.completedAt;
            const days = daysUntil(m.dueDate);
            const overdue = !completed && days !== null && days < 0;
            const dueSoon = !completed && days !== null && days >= 0 && days <= 7;
            const colour = m.colour || AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
            return (
              <div
                key={m.id}
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
                  completed
                    ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground line-through"
                    : overdue
                    ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
                    : dueSoon
                    ? "border-amber-500/30 bg-amber-500/5 text-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggle(m.id, !completed)}
                  title={completed ? "Reopen" : "Mark complete"}
                  className="opacity-70 hover:opacity-100"
                  style={{ color: completed ? "#10B981" : colour }}
                >
                  {completed ? "✓" : "○"}
                </button>
                <span className="font-medium">{m.name}</span>
                {m.dueDate && (
                  <span className={cn("text-[10px] font-mono opacity-70", overdue && "font-bold opacity-100")}>
                    {formatDueLabel(m.dueDate)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(m.id)}
                  title="Delete milestone"
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] hover:text-red-500"
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProjectMember } from "@/hooks/useProjectDetails";

interface Props {
  members: ProjectMember[];
  onAdd: (input: { name: string; role?: string; avatarColor?: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#7C3AED", "#0EA5E9", "#EC4899"];
const ROLES = ["Contributor", "Lead", "Reviewer", "Stakeholder"] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectMembersRow({ members, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("Contributor");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const avatarColor = PALETTE[members.length % PALETTE.length];
      await onAdd({ name: name.trim(), role, avatarColor });
      setName("");
      setRole("Contributor");
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">team</span>
      {members.map((m) => (
        <div
          key={m.id}
          className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-1 text-[11px]"
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold"
            style={{ backgroundColor: m.avatarColor || "#6366F1" }}
          >
            {initials(m.name)}
          </div>
          <span className="text-foreground font-medium">{m.name}</span>
          {m.role && m.role !== "Contributor" && (
            <span className={cn(
              "text-[9px] font-mono uppercase tracking-wider",
              m.role === "Lead" ? "text-primary" : "text-muted-foreground",
            )}>
              {m.role}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(m.id)}
            title="Remove"
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] hover:text-red-500"
          >
            x
          </button>
        </div>
      ))}

      {adding ? (
        <div className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-1.5 py-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Name..."
            className="bg-transparent text-[11px] focus:outline-none placeholder:text-muted-foreground/50 w-24"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-transparent text-[10px] font-mono text-muted-foreground focus:outline-none"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || submitting}
            className="text-[11px] font-mono text-primary disabled:opacity-40"
          >
            save
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setName(""); }}
            className="text-[10px] font-mono opacity-60 hover:opacity-100"
          >
            x
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40"
        >
          + add
        </button>
      )}
    </div>
  );
}

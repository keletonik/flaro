import { useState } from "react";
import { Plus, Download, X, Clipboard } from "lucide-react";
import { useListToolboxNotes, useCreateToolboxNote, useUpdateToolboxNote, useDeleteToolboxNote, getListToolboxNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import PageSkeleton from "@/components/ui/PageSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ToolboxNote } from "@workspace/api-client-react";

const FILTERS = ["All", "Active", "Briefed"] as const;

export default function Toolbox() {
  const [filter, setFilter] = useState<string>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes, isLoading } = useListToolboxNotes({});
  const createNote = useCreateToolboxNote();
  const updateNote = useUpdateToolboxNote();
  const deleteNote = useDeleteToolboxNote();

  const displayedNotes = (notes || []).filter(n => {
    if (filter === "All") return true;
    return n.status === filter;
  });

  const activeCount = (notes || []).filter(n => n.status === "Active").length;

  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      await createNote.mutateAsync({ data: { text: newText.trim() } });
      queryClient.invalidateQueries({ queryKey: getListToolboxNotesQueryKey() });
      toast({ title: "Toolbox note added" });
      setNewText("");
      setShowAdd(false);
    } catch {
      toast({ title: "Error", description: "Couldn't add note.", variant: "destructive" });
    }
  };

  const handleMarkBriefed = async (id: string) => {
    try {
      await updateNote.mutateAsync({ id, data: { status: "Briefed" } });
      queryClient.invalidateQueries({ queryKey: getListToolboxNotesQueryKey() });
      toast({ title: "Marked as briefed" });
    } catch {
      toast({ title: "Error", description: "Couldn't update.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this toolbox note?")) return;
    try {
      await deleteNote.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListToolboxNotesQueryKey() });
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Error", description: "Couldn't delete.", variant: "destructive" });
    }
  };

  const buildExportText = (scope: "active" | "briefed" | "all") => {
    const source = (notes || []).filter(n => {
      if (scope === "all") return true;
      return n.status === (scope === "active" ? "Active" : "Briefed");
    });
    if (!source.length) return null;
    const label = scope === "active" ? "ACTIVE BRIEFING" : scope === "briefed" ? "BRIEFED ARCHIVE" : "FULL TOOLBOX LOG";
    return [
      `TOOLBOX — ${label}`,
      new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      "",
      ...source.map(n => {
        const tag = n.status === "Briefed" ? " [briefed]" : "";
        return `${n.ref}${tag}  ${n.text}`;
      }),
    ].join("\n");
  };

  const handleCopyExport = () => {
    const scope = filter === "Briefed" ? "briefed" : filter === "All" ? "all" : "active";
    const text = buildExportText(scope);
    if (!text) { toast({ title: "Nothing to export for the current filter" }); return; }
    navigator.clipboard?.writeText(text).then(() => {
      toast({ title: "Briefing copied to clipboard" });
    }).catch(() => {
      toast({ title: "Couldn't copy to clipboard" });
    });
  };

  const handleDownloadExport = () => {
    const scope = filter === "Briefed" ? "briefed" : filter === "All" ? "all" : "active";
    const text = buildExportText(scope);
    if (!text) { toast({ title: "Nothing to export for the current filter" }); return; }
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toolbox-${scope}-${today}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `Downloaded ${a.download}` });
  };

  const handleExport = handleCopyExport;

  return (
      <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="&&"
        title="Toolbox"
        subtitle={`${activeCount} active note${activeCount !== 1 ? "s" : ""} for team briefing`}
        actions={
          <>
            <button
              data-testid="button-export-briefing"
              onClick={handleExport}
              title={`Copy ${filter === "Briefed" ? "briefed archive" : filter === "All" ? "full log" : "active briefing"} to clipboard`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-muted-foreground text-sm font-medium rounded-lg hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              <Clipboard size={14} />Copy {filter === "Briefed" ? "Archive" : filter === "All" ? "Log" : "Briefing"}
            </button>
            <button
              data-testid="button-download-briefing"
              onClick={handleDownloadExport}
              title={`Download ${filter === "Briefed" ? "briefed archive" : filter === "All" ? "full log" : "active briefing"} as .txt`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-muted-foreground text-sm font-medium rounded-lg hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              <Clipboard size={14} /> Download
            </button>
            <button
              data-testid="button-add-toolbox-note"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />Add Note
            </button>
          </>
        }
        below={
          <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              data-testid={`filter-toolbox-${f.toLowerCase()}`}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              {f}
              {f !== "All" && (
                <span className="ml-1 opacity-60">
                  {(notes || []).filter(n => n.status === f).length}
                </span>
              )}
            </button>
          ))}
          </div>
        }
      />

      <div className="max-w-6xl px-4 sm:px-6 py-4 space-y-3">
        {/* Inline add */}
        {showAdd && (
          <div className="bg-card border border-primary/40 rounded-xl p-4 space-y-3 slide-up">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">New Toolbox Note</span>
              <button onClick={() => { setShowAdd(false); setNewText(""); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <textarea
              data-testid="input-toolbox-text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="What does the team need to know? e.g. All photos mandatory in Uptick — no photo = no close-out."
              autoFocus
              rows={3}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleAdd(); }}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setNewText(""); }} className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                data-testid="button-save-toolbox-note"
                onClick={handleAdd}
                disabled={!newText.trim()}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Add Note
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {isLoading ? (
          <PageSkeleton shape="list" rows={5} />
        ) : displayedNotes.length === 0 ? (
          <EmptyState
            icon={<Download size={22} />}
            title="No toolbox notes"
            body="Add notes for team briefings and safety reminders. Use references like TB-001 so techs can find them on-site."
            primaryLabel="+ Add Note"
            onPrimary={() => setShowAdd(true)}
            tip="Tip: press Cmd-K, type 'new note', press enter."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {displayedNotes.map((note, i) => (
              <ToolboxNoteCard
                key={note.id}
                note={note}
                index={i}
                onMarkBriefed={() => handleMarkBriefed(note.id)}
                onDelete={() => handleDelete(note.id)}
              />
            ))}
          </div>
        )}
      </div>
      </div>
  );
}

function ToolboxNoteCard({ note, index, onMarkBriefed, onDelete }: {
  note: ToolboxNote; index: number; onMarkBriefed: () => void; onDelete: () => void;
}) {
  const isBriefed = note.status === "Briefed";

  return (
    <div
      data-testid={`toolbox-note-${note.id}`}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden transition-all card-appear",
        isBriefed && "opacity-50"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          <span className={cn(
            "text-xs font-bold font-mono",
            isBriefed ? "text-muted-foreground" : "text-primary"
          )}>
            {note.ref}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm text-foreground leading-relaxed", isBriefed && "line-through text-muted-foreground")}>
            {note.text}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Added {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            {isBriefed && " · Briefed"}
          </p>
        </div>
        {isBriefed && (
          <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded">
            DONE
          </span>
        )}
      </div>
      <div className="border-t border-border flex divide-x divide-border">
        {!isBriefed && (
          <button
            data-testid={`button-mark-briefed-${note.id}`}
            onClick={onMarkBriefed}
            className="flex-1 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            Mark Briefed
          </button>
        )}
        <button
          data-testid={`button-delete-toolbox-${note.id}`}
          onClick={onDelete}
          className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Delete
        </button>
      </div>

    </div>
  );
}

import { useState, useMemo } from "react";
import { Plus, Search, X, Pin, Grid3X3, List, ChevronDown, Check } from "lucide-react";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";
import type { Note } from "@workspace/api-client-react";

const CATEGORIES = ["All", "Urgent", "To Do", "To Ask", "Schedule", "Quote", "Follow Up", "Investigate", "Done"] as const;

const CAT_STYLES: Record<string, { badge: string; card: string; accent: string }> = {
  "Urgent":      { badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800", card: "border-l-red-400", accent: "bg-red-50 dark:bg-red-900/10" },
  "To Do":       { badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", card: "border-l-blue-400", accent: "bg-blue-50 dark:bg-blue-900/10" },
  "To Ask":      { badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800", card: "border-l-amber-400", accent: "bg-amber-50 dark:bg-amber-900/10" },
  "Schedule":    { badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800", card: "border-l-purple-400", accent: "bg-purple-50 dark:bg-purple-900/10" },
  "Quote":       { badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", card: "border-l-emerald-400", accent: "bg-emerald-50 dark:bg-emerald-900/10" },
  "Follow Up":   { badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800", card: "border-l-cyan-400", accent: "bg-cyan-50 dark:bg-cyan-900/10" },
  "Investigate": { badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800", card: "border-l-orange-400", accent: "bg-orange-50 dark:bg-orange-900/10" },
  "Done":        { badge: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-500 dark:border-slate-700", card: "border-l-slate-300", accent: "bg-slate-50 dark:bg-slate-900/10" },
};

type ViewMode = "list" | "grid";

function NoteCard({ note, viewMode, onMarkDone, onDelete }: {
  note: Note; viewMode: ViewMode; onMarkDone: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = note.status === "Done";
  const style = CAT_STYLES[note.category] || CAT_STYLES["To Do"];

  if (viewMode === "grid") {
    return (
      <div
        data-testid={`note-item-${note.id}`}
        className={cn(
          "bg-card border border-l-4 rounded-xl p-4 hover:shadow-sm transition-all duration-200 flex flex-col gap-2 note-card relative group",
          style.card,
          isDone && "opacity-60"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold border flex-shrink-0", style.badge)}>
            {note.category}
          </span>
          <div className="note-actions flex gap-1">
            {!isDone && (
              <button
                data-testid={`button-mark-done-${note.id}`}
                onClick={onMarkDone}
                className="p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-muted-foreground hover:text-emerald-500 transition-colors"
                title="Mark done"
              >
                <Check size={12} />
              </button>
            )}
            <button
              data-testid={`button-delete-note-${note.id}`}
              onClick={onDelete}
              className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <p className={cn("text-sm text-foreground leading-relaxed", isDone && "line-through text-muted-foreground")}>
          {note.text}
        </p>
        <p className="text-[10px] text-muted-foreground mt-auto">
          {note.owner} · {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid={`note-item-${note.id}`}
      className={cn(
        "bg-card border border-l-4 rounded-xl overflow-hidden hover:shadow-xs transition-all duration-200 note-card",
        style.card,
        isDone && "opacity-60"
      )}
    >
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold border flex-shrink-0", style.badge)}>
              {note.category}
            </span>
            <span className="text-[10px] text-muted-foreground">{note.owner} · {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <p className={cn("text-sm text-foreground leading-relaxed", expanded ? "" : "truncate", isDone && "line-through text-muted-foreground")}>
            {note.text}
          </p>
        </div>
        <ChevronDown size={14} className={cn("text-muted-foreground flex-shrink-0 mt-0.5 transition-transform", expanded && "rotate-180")} />
      </div>

      {expanded && (
        <div className={cn("px-4 pb-3 pt-1 border-t border-border flex gap-2", style.accent)}>
          {!isDone && (
            <button
              data-testid={`button-mark-done-${note.id}`}
              onClick={onMarkDone}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:opacity-80 transition-opacity"
            >
              <Check size={12} />Mark Done
            </button>
          )}
          <button
            data-testid={`button-delete-note-${note.id}`}
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:opacity-80 transition-opacity"
          >
            <X size={12} />Delete
          </button>
        </div>
      )}
    </div>
  );
}

function AddNoteSheet({ onClose, onSave }: {
  onClose: () => void;
  onSave: (text: string, category: string, owner: string) => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("To Do");
  const [owner, setOwner] = useState("Casper");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-base">New Note</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>
        <textarea
          data-testid="input-note-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What do you need to note?"
          rows={3}
          autoFocus
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {["Urgent", "To Do", "To Ask", "Schedule", "Quote", "Follow Up", "Investigate"].map(cat => (
              <button
                key={cat}
                data-testid={`category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-muted/70"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Owner</label>
          <input
            data-testid="input-note-owner"
            value={owner}
            onChange={e => setOwner(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            data-testid="button-save-note"
            onClick={() => { if (text.trim()) onSave(text.trim(), category, owner); }}
            disabled={!text.trim()}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notes() {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes, isLoading } = useListNotes({});

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const displayed = useMemo(() => {
    let list = notes || [];
    if (filter !== "All") {
      if (filter === "Done") list = list.filter(n => n.status === "Done");
      else list = list.filter(n => n.category === filter && n.status !== "Done");
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => n.text.toLowerCase().includes(q) || n.owner.toLowerCase().includes(q));
    }
    return list;
  }, [notes, filter, search]);

  const counts = useMemo(() => {
    const all = notes || [];
    return {
      All: all.filter(n => n.status !== "Done").length,
      Urgent: all.filter(n => n.category === "Urgent" && n.status !== "Done").length,
      "To Do": all.filter(n => n.category === "To Do" && n.status !== "Done").length,
      "To Ask": all.filter(n => n.category === "To Ask" && n.status !== "Done").length,
      Schedule: all.filter(n => n.category === "Schedule" && n.status !== "Done").length,
      Quote: all.filter(n => n.category === "Quote" && n.status !== "Done").length,
      "Follow Up": all.filter(n => n.category === "Follow Up" && n.status !== "Done").length,
      Investigate: all.filter(n => n.category === "Investigate" && n.status !== "Done").length,
      Done: all.filter(n => n.status === "Done").length,
    };
  }, [notes]);

  const handleSave = async (text: string, category: string, owner: string) => {
    try {
      await createNote.mutateAsync({ data: {
        text,
        category: category as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Quote" | "Follow Up" | "Investigate" | "Done",
        owner,
      }});
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      toast({ title: "Note saved" });
      setShowAdd(false);
    } catch {
      toast({ title: "Error", description: "Couldn't save note.", variant: "destructive" });
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      await updateNote.mutateAsync({ id, data: { status: "Done" } });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      toast({ title: "Note marked done" });
    } catch {
      toast({ title: "Error", description: "Couldn't update note.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Error", description: "Couldn't delete note.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-foreground font-bold text-lg tracking-tight">Notes</h1>
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-search-notes"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full bg-muted border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={12} /></button>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
              <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")} title="List"><List size={14} /></button>
              <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")} title="Grid"><Grid3X3 size={14} /></button>
            </div>
            <button
              data-testid="button-add-note"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />Add
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              data-testid={`filter-note-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setFilter(cat)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150",
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              {cat}
              <span className={cn("text-[9px]", filter === cat ? "opacity-70" : "opacity-50")}>
                {counts[cat as keyof typeof counts] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4">
        {isLoading ? (
          <div className={cn(viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-3" : "space-y-2")}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
              <Pin size={20} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium text-sm">No notes here</p>
            <p className="text-muted-foreground text-xs mt-1">
              {search ? "Try a different search term." : "Add a note to get started."}
            </p>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                + Add Note
              </button>
            )}
          </div>
        ) : (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "space-y-2"
          )}>
            {displayed.map((note, i) => (
              <div key={note.id} className="card-appear" style={{ animationDelay: `${i * 30}ms` }}>
                <NoteCard
                  note={note}
                  viewMode={viewMode}
                  onMarkDone={() => handleMarkDone(note.id)}
                  onDelete={() => handleDelete(note.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB (mobile) */}
      <button
        data-testid="button-fab-add-note"
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 md:bottom-6 right-5 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity md:hidden"
      >
        <Plus size={20} />
      </button>

      {showAdd && <AddNoteSheet onClose={() => setShowAdd(false)} onSave={handleSave} />}

      <AnalyticsPanel section="tasks" title="Notes Analyst" />
    </div>
  );
}

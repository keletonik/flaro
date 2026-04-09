import { useState } from "react";
import { Plus, Download, X } from "lucide-react";
import { useListToolboxNotes, useCreateToolboxNote, useUpdateToolboxNote, useDeleteToolboxNote, getListToolboxNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";
import type { ToolboxNote } from "@workspace/api-client-react";

const FILTERS = ["All", "Active", "Briefed"] as const;
type Filter = typeof FILTERS[number];

export default function Toolbox() {
  const [filter, setFilter] = useState<Filter>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes, isLoading } = useListToolboxNotes({
    status: filter === "All" ? undefined : filter,
  });

  const createNote = useCreateToolboxNote();
  const updateNote = useUpdateToolboxNote();
  const deleteNote = useDeleteToolboxNote();

  const displayedNotes = (notes || []).filter(n => {
    if (filter === "All") return true;
    return n.status === filter;
  });

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
      toast({ title: "Error", description: "Couldn't update note.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this toolbox note?")) return;
    try {
      await deleteNote.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListToolboxNotesQueryKey() });
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Error", description: "Couldn't delete note.", variant: "destructive" });
    }
  };

  const handleExport = () => {
    const activeNotes = (notes || []).filter(n => n.status === "Active");
    if (!activeNotes.length) {
      toast({ title: "No active notes to export" });
      return;
    }
    const text = `TOOLBOX BRIEFING\n${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n\n${activeNotes.map(n => `${n.ref} — ${n.text}`).join("\n")}`;
    navigator.clipboard?.writeText(text).then(() => {
      toast({ title: "Briefing copied to clipboard" });
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast({ title: "Briefing copied" });
    });
  };

  return (
    <div className="min-h-screen bg-[#0F0F13]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F13]/90 backdrop-blur-md border-b border-[#2E2E45] px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-[#F8FAFC] font-bold text-xl uppercase tracking-widest">Toolbox</h1>
          <div className="flex items-center gap-2">
            <button
              data-testid="button-export-briefing"
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-[#1A1A24] border border-[#2E2E45] text-[#94A3B8] text-sm font-semibold rounded-xl hover:border-[#7C3AED]/50 hover:text-white transition-all"
            >
              <Download size={14} />Export
            </button>
            <button
              data-testid="button-add-toolbox-note"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />Add Note
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Filter */}
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              data-testid={`filter-toolbox-${f.toLowerCase()}`}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                filter === f
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#1A1A24] border border-[#2E2E45] text-[#94A3B8] hover:border-[#7C3AED]/50"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Add Note inline */}
        {showAdd && (
          <div className="bg-[#1A1A24] border border-[#7C3AED]/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#A855F7] text-sm font-semibold">New Toolbox Note</span>
              <button onClick={() => setShowAdd(false)} className="text-[#475569] hover:text-white"><X size={16} /></button>
            </div>
            <textarea
              data-testid="input-toolbox-text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="What does the team need to know?"
              autoFocus
              rows={2}
              className="w-full bg-[#242433] border border-[#2E2E45] rounded-xl px-3 py-2.5 text-[#F8FAFC] text-sm placeholder:text-[#475569] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-[#242433] text-[#94A3B8] rounded-lg text-sm font-medium hover:text-white transition-colors">
                Cancel
              </button>
              <button
                data-testid="button-save-toolbox-note"
                onClick={handleAdd}
                disabled={!newText.trim()}
                className="flex-1 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : displayedNotes.length === 0 ? (
          <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-8 text-center">
            <p className="text-[#475569] text-sm">No toolbox notes here.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 text-[#7C3AED] text-sm hover:text-[#A855F7] transition-colors"
            >
              Add a note +
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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

function ToolboxNoteCard({
  note,
  index,
  onMarkBriefed,
  onDelete,
}: {
  note: ToolboxNote;
  index: number;
  onMarkBriefed: () => void;
  onDelete: () => void;
}) {
  const isBriefed = note.status === "Briefed";

  return (
    <div
      data-testid={`toolbox-note-${note.id}`}
      className={cn(
        "bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-4 card-appear transition-all duration-200",
        isBriefed && "opacity-60"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              "text-xs font-bold",
              isBriefed ? "text-[#475569]" : "text-[#7C3AED]"
            )}>
              {note.ref}
            </span>
            <span className="text-[#475569] text-[11px]">
              {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {isBriefed && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#475569]/20 text-[#475569] border border-[#475569]/30">
                BRIEFED
              </span>
            )}
          </div>
          <p className={cn("text-sm", isBriefed ? "text-[#475569]" : "text-[#E2E8F0]")}>
            {note.text}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {!isBriefed && (
          <button
            data-testid={`button-mark-briefed-${note.id}`}
            onClick={onMarkBriefed}
            className="flex-1 py-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold rounded-lg hover:bg-[#10B981]/20 transition-colors"
          >
            Mark Briefed
          </button>
        )}
        <button
          data-testid={`button-delete-toolbox-${note.id}`}
          onClick={onDelete}
          className="flex-1 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold rounded-lg hover:bg-[#EF4444]/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";
import type { Note } from "@workspace/api-client-react";

const CATEGORIES = ["All", "Urgent", "To Do", "To Ask", "Schedule", "Done"] as const;
type FilterCategory = typeof CATEGORIES[number];

const CATEGORY_STYLES: Record<string, string> = {
  "Urgent": "border-[#EF4444]/40 text-[#EF4444] bg-[#EF4444]/10",
  "To Do": "border-[#3B82F6]/40 text-[#3B82F6] bg-[#3B82F6]/10",
  "To Ask": "border-[#F59E0B]/40 text-[#F59E0B] bg-[#F59E0B]/10",
  "Schedule": "border-[#A855F7]/40 text-[#A855F7] bg-[#A855F7]/10",
  "Done": "border-[#475569]/40 text-[#475569] bg-[#475569]/10",
};

function QuickAddSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (text: string, category: string, owner: string) => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("To Do");
  const [owner, setOwner] = useState("Casper");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1A1A24] border-t border-[#2E2E45] w-full max-w-lg rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#F8FAFC] font-bold text-lg">Add Note</h2>
          <button data-testid="button-close-note-sheet" onClick={onClose} className="text-[#475569] hover:text-white"><X size={20} /></button>
        </div>
        <textarea
          data-testid="input-note-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What do you need to note?"
          rows={3}
          autoFocus
          className="w-full bg-[#242433] border border-[#2E2E45] rounded-xl px-4 py-3 text-[#F8FAFC] text-sm placeholder:text-[#475569] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
        />
        <div>
          <p className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {["Urgent", "To Do", "To Ask", "Schedule"].map(cat => (
              <button
                key={cat}
                data-testid={`category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                  category === cat
                    ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                    : "border-[#2E2E45] text-[#94A3B8] bg-[#242433] hover:border-[#7C3AED]/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-1.5 block">Owner</label>
          <input
            data-testid="input-note-owner"
            value={owner}
            onChange={e => setOwner(e.target.value)}
            className="w-full bg-[#242433] border border-[#2E2E45] rounded-xl px-3 py-2.5 text-[#F8FAFC] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-[#242433] text-[#94A3B8] rounded-xl font-semibold hover:text-white transition-colors">
            Cancel
          </button>
          <button
            data-testid="button-save-note"
            onClick={() => { if (text.trim()) onSave(text.trim(), category, owner); }}
            disabled={!text.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteItem({ note, onMarkDone, onDelete }: {
  note: Note;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = note.status === "Done";

  return (
    <div
      data-testid={`note-item-${note.id}`}
      className={cn(
        "bg-[#1A1A24] border rounded-xl overflow-hidden transition-all duration-200",
        isDone ? "border-[#2E2E45] opacity-60" : "border-[#2E2E45] hover:border-[#7C3AED]/30"
      )}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn(
          "flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold border mt-0.5",
          CATEGORY_STYLES[note.category] || CATEGORY_STYLES["To Do"]
        )}>
          {note.category}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", isDone ? "line-through text-[#475569]" : "text-[#E2E8F0]", expanded ? "" : "truncate")}>
            {note.text}
          </p>
          <p className="text-[#475569] text-xs mt-0.5">
            {note.owner} · {new Date(note.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#475569] flex-shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-[#475569] flex-shrink-0 mt-0.5" />}
      </div>
      {expanded && (
        <div className="px-4 pb-4 flex gap-2 border-t border-[#2E2E45] pt-3">
          {!isDone && (
            <button
              data-testid={`button-mark-done-${note.id}`}
              onClick={onMarkDone}
              className="flex-1 py-2 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold rounded-lg hover:bg-[#10B981]/20 transition-colors"
            >
              Mark Done
            </button>
          )}
          <button
            data-testid={`button-delete-note-${note.id}`}
            onClick={onDelete}
            className="flex-1 py-2 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold rounded-lg hover:bg-[#EF4444]/20 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Notes() {
  const [filter, setFilter] = useState<FilterCategory>("All");
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes, isLoading } = useListNotes({
    category: filter === "All" || filter === "Done" ? undefined : filter,
    status: filter === "Done" ? "Done" : undefined,
  });

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const displayedNotes = (notes || []).filter(n => {
    if (filter === "All") return true;
    if (filter === "Done") return n.status === "Done";
    return n.category === filter && n.status !== "Done";
  });

  const handleSave = async (text: string, category: string, owner: string) => {
    try {
      await createNote.mutateAsync({ data: {
        text,
        category: category as "Urgent" | "To Do" | "To Ask" | "Schedule" | "Done",
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
    <div className="min-h-screen bg-[#0F0F13]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F0F13]/90 backdrop-blur-md border-b border-[#2E2E45] px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-[#F8FAFC] font-bold text-xl uppercase tracking-widest">Notes</h1>
          <button
            data-testid="button-add-note"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />Add Note
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              data-testid={`filter-note-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setFilter(cat)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                filter === cat
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#1A1A24] border border-[#2E2E45] text-[#94A3B8] hover:border-[#7C3AED]/50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : displayedNotes.length === 0 ? (
          <div className="bg-[#1A1A24] border border-[#2E2E45] rounded-2xl p-8 text-center">
            <p className="text-[#475569] text-sm">No notes here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedNotes.map((note, i) => (
              <div key={note.id} className="card-appear" style={{ animationDelay: `${i * 40}ms` }}>
                <NoteItem
                  note={note}
                  onMarkDone={() => handleMarkDone(note.id)}
                  onDelete={() => handleDelete(note.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        data-testid="button-fab-add-note"
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white rounded-full flex items-center justify-center shadow-xl shadow-[rgba(124,58,237,0.4)] hover:opacity-90 transition-opacity glow-purple"
      >
        <Plus size={22} />
      </button>

      {showAdd && (
        <QuickAddSheet
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

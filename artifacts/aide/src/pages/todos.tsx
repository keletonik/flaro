import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp, ChevronsUpDown, Pencil, Download, Upload, MoreHorizontal, Trash2, Search, Filter, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import {
  useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo,
  getListTodosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { apiFetch, exportToCSV } from "@/lib/api";
import LiveToggle from "@/components/LiveToggle";
import CSVImportModal from "@/components/CSVImportModal";
import { EditableCell } from "@/components/EditableCell";

const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const CATEGORIES = ["Work", "Personal", "Follow-up", "Compliance", "Admin"] as const;
const TECHS = ["Casper", "Darren", "Gordon", "Haider", "John", "Nu"];

type SortField = "text" | "priority" | "category" | "assignee" | "dueDate";
type SortDir = "asc" | "desc";
type ViewTab = "active" | "done" | "all";

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/**
 * Single source of truth for priority colour. The dot drives the row's left
 * accent stripe; the text colour is used in the inline pill. Kept neutral
 * (no full background fills) so the table reads as a calm list, not a
 * highlighter rainbow — which was the previous design's biggest readability
 * problem.
 */
const PRIORITY_STYLES: Record<string, { dot: string; text: string }> = {
  Critical: { dot: "bg-red-500",    text: "text-red-600 dark:text-red-400" },
  High:     { dot: "bg-orange-400", text: "text-orange-600 dark:text-orange-400" },
  Medium:   { dot: "bg-blue-400",   text: "text-blue-600 dark:text-blue-400" },
  Low:      { dot: "bg-slate-400",  text: "text-slate-500 dark:text-slate-400" },
};

const CAT_TEXT: Record<string, string> = {
  "Work":       "text-violet-600 dark:text-violet-400",
  "Personal":   "text-emerald-600 dark:text-emerald-400",
  "Follow-up":  "text-amber-600 dark:text-amber-400",
  "Compliance": "text-red-600 dark:text-red-400",
  "Admin":      "text-slate-500 dark:text-slate-400",
};

/**
 * Lightweight column-header dropdown filter (multi-select w/ search).
 * Used for Category and Assignee where there can be many options. Status
 * and Priority are handled by the primary Tabs + chip rail, so they no
 * longer need a column filter — that was the source of duplicate UI.
 */
function ColumnFilter({ label, options, selected, onChange, onClear }: {
  label: string; options: string[]; selected: Set<string>;
  onChange: (val: Set<string>) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;
  const hasFilter = selected.size > 0;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        ref={btnRef}
        onClick={e => {
          e.stopPropagation();
          if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.bottom + 4, left: Math.max(r.left, 8) });
          }
          setOpen(!open);
        }}
        className={cn("p-0.5 rounded transition-colors", hasFilter ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground")}
      >
        <Filter size={10} />
      </button>
      {open && (
        <div className="fixed z-[100] bg-card border border-border rounded-lg shadow-xl min-w-[180px] max-h-[300px] overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
          onClick={e => e.stopPropagation()}>
          <div className="p-2 border-b border-border">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${label}…`}
              className="w-full bg-muted border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer text-xs text-foreground">
                <input type="checkbox" checked={selected.has(opt)}
                  onChange={() => { const next = new Set(selected); if (next.has(opt)) next.delete(opt); else next.add(opt); onChange(next); }}
                  className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20" />
                <span className="truncate">{opt || "(Blank)"}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground px-2 py-2">No matches</p>}
          </div>
          <div className="border-t border-border p-1.5 flex items-center justify-between">
            <button onClick={() => onChange(new Set(options))} className="text-[10px] text-muted-foreground hover:text-foreground">Select all</button>
            <button onClick={() => { onClear(); setOpen(false); }} className="text-[10px] text-primary hover:text-primary/80 font-medium">Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={10} className="text-muted-foreground/30" />;
  return sortDir === "asc" ? <ChevronUp size={10} className="text-primary" /> : <ChevronDown size={10} className="text-primary" />;
}

interface TaskFormData {
  text: string; priority: string; category: string; dueDate: string;
  assignee: string; notes: string; nextSteps: string; urgencyTag: string;
}

function TaskModal({ todo, onClose, onSave }: { todo?: any; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState<TaskFormData>(todo ? {
    text: todo.text || "", priority: todo.priority || "Medium", category: todo.category || "Work",
    dueDate: todo.dueDate ? todo.dueDate.split("T")[0] : "", assignee: todo.assignee || "",
    notes: todo.notes || "", nextSteps: todo.nextSteps || "", urgencyTag: todo.urgencyTag || "",
  } : { text: "", priority: "Medium", category: "Work", dueDate: "", assignee: "", notes: "", nextSteps: "", urgencyTag: "" });
  const set = (k: keyof TaskFormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all";
  const label = "text-xs font-medium text-muted-foreground mb-1 block uppercase tracking-wide";
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full md:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">{todo ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (form.text.trim()) onSave(form); }} className="px-5 py-4 space-y-4">
          <div><label className={label}>Task *</label><textarea className={cn(field, "resize-none")} rows={2} value={form.text} onChange={e => set("text", e.target.value)} placeholder="What needs to be done…" required autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Priority</label><select className={field} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className={label}>Category</label><select className={field} value={form.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Due date</label><input type="date" className={field} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            <div><label className={label}>Assignee</label><select className={field} value={form.assignee} onChange={e => set("assignee", e.target.value)}><option value="">Unassigned</option>{TECHS.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label className={label}>Urgency tag</label><input className={field} value={form.urgencyTag} onChange={e => set("urgencyTag", e.target.value)} placeholder="e.g. ASAP, EOD, Waiting on client" /></div>
          <div><label className={label}>Notes</label><textarea className={cn(field, "resize-none")} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes…" /></div>
          <div><label className={label}>Next steps</label><textarea className={cn(field, "resize-none")} rows={2} value={form.nextSteps} onChange={e => set("nextSteps", e.target.value)} placeholder="What needs to happen next…" /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">{todo ? "Save changes" : "Add task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionMenu({ todo, onEdit, onToggle, onDelete }: { todo: any; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuH = 120;
      const spaceBelow = window.innerHeight - r.bottom;
      setPos({
        top: spaceBelow < menuH ? r.top - menuH : r.bottom + 4,
        left: Math.min(r.right - 130, window.innerWidth - 140),
      });
    }
    setOpen(!open);
  }, [open]);

  return (
    <div className="relative">
      <button ref={btnRef} onClick={openMenu} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div className="fixed z-[100] bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onToggle(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2">
              {todo.completed ? <Circle size={11} /> : <CheckCircle2 size={11} />} {todo.completed ? "Mark active" : "Mark done"}
            </button>
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2"><Pencil size={11} /> Edit</button>
            <div className="border-t border-border my-0.5" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={11} /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

const PAGE_SIZES = [25, 50, 100, 0]; // 0 = All

export default function Todos() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(undefined);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [view, setView] = useState<ViewTab>("active");
  const [filterPriority, setFilterPriority] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<Set<string>>(new Set());
  const [filterAssignee, setFilterAssignee] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: todos, isLoading } = useListTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  useLiveUpdates(() => { void queryClient.invalidateQueries(); });

  const allTodos: any[] = todos || [];
  const activeTodos = allTodos.filter((t: any) => !t.completed);
  const doneTodos = allTodos.filter((t: any) => t.completed);

  const uniqueAssignees = useMemo(() => [...new Set(allTodos.map(t => t.assignee || "Unassigned"))].sort(), [allTodos]);
  const uniqueCategories = useMemo(() => [...new Set(allTodos.map(t => t.category || "Uncategorised").filter(Boolean))].sort(), [allTodos]);

  const isOverdue = (d?: string | null) => !!d && new Date(d) < new Date();

  /**
   * View tab gates first (status), then column-style filters refine. Search
   * runs last so the result reflects what's literally on screen — a key
   * readability principle: "what I see is what I'm searching".
   */
  const filtered = useMemo(() => {
    let list = allTodos;
    if (view === "active") list = list.filter(t => !t.completed);
    else if (view === "done") list = list.filter(t => t.completed);

    if (filterPriority.size > 0) list = list.filter(t => filterPriority.has(t.priority));
    if (filterCategory.size > 0) list = list.filter(t => filterCategory.has(t.category || "Uncategorised"));
    if (filterAssignee.size > 0) list = list.filter(t => filterAssignee.has(t.assignee || "Unassigned"));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.text?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q) ||
        t.urgencyTag?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTodos, view, filterPriority, filterCategory, filterAssignee, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "text":     cmp = (a.text || "").localeCompare(b.text || ""); break;
        case "priority": cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case "category": cmp = (a.category || "").localeCompare(b.category || ""); break;
        case "assignee": cmp = (a.assignee || "zzz").localeCompare(b.assignee || "zzz"); break;
        case "dueDate":  cmp = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sorted.length / pageSize);
  const paged = pageSize === 0 ? sorted : sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(0);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paged.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paged.map(t => t.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const activeFilterCount = filterPriority.size + filterCategory.size + filterAssignee.size + (search ? 1 : 0);
  const clearAllFilters = () => {
    setFilterPriority(new Set()); setFilterCategory(new Set());
    setFilterAssignee(new Set()); setSearch(""); setPage(0);
  };

  const handleAdd = async (data: any) => {
    try {
      await createTodo.mutateAsync({ data: { text: data.text, priority: data.priority, category: data.category, dueDate: data.dueDate || undefined, assignee: data.assignee || undefined, notes: data.notes || undefined, nextSteps: data.nextSteps || undefined, urgencyTag: data.urgencyTag || undefined } as any });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task added" });
      setShowModal(false);
    } catch { toast({ title: "Could not add task", variant: "destructive" }); }
  };

  const handleUpdate = async (data: any) => {
    if (!editingTodo) return;
    try {
      await updateTodo.mutateAsync({ id: editingTodo.id, data: { text: data.text, priority: data.priority, category: data.category, dueDate: data.dueDate || undefined, assignee: data.assignee || undefined, notes: data.notes || undefined, nextSteps: data.nextSteps || undefined, urgencyTag: data.urgencyTag || undefined } as any });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task updated" });
      setShowModal(false); setEditingTodo(undefined);
    } catch { toast({ title: "Could not save", variant: "destructive" }); }
  };

  const handleToggle = async (todo: any) => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, data: { completed: !todo.completed } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
    } catch { toast({ title: "Could not update", variant: "destructive" }); }
  };

  /**
   * patchField — commit a single-field inline edit from EditableCell.
   * Empty strings on optional fields normalise to undefined so the API
   * clears the value instead of storing "".
   */
  const patchField = async (
    id: string,
    field: "text" | "priority" | "category" | "assignee" | "dueDate" | "notes",
    next: string,
  ): Promise<boolean> => {
    try {
      const payload: Record<string, any> = {};
      if (field === "text") {
        if (!next.trim()) return false;
        payload.text = next.trim();
      } else if (field === "dueDate") {
        payload.dueDate = next || undefined;
      } else {
        payload[field] = next || undefined;
      }
      await updateTodo.mutateAsync({ id, data: payload as any });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      return true;
    } catch {
      toast({ title: "Could not save", variant: "destructive" });
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTodo.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task deleted" });
      selectedRows.delete(id); setSelectedRows(new Set(selectedRows));
    } catch { toast({ title: "Could not delete", variant: "destructive" }); }
  };

  const handleBulkDone = async () => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all([...selectedRows].map(id => updateTodo.mutateAsync({ id, data: { completed: true } })));
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: `${selectedRows.size} task${selectedRows.size === 1 ? "" : "s"} → Done` });
      setSelectedRows(new Set());
    } catch { toast({ title: "Error updating", variant: "destructive" }); }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0 || !confirm(`Delete ${selectedRows.size} tasks?`)) return;
    try {
      await Promise.all([...selectedRows].map(id => deleteTodo.mutateAsync({ id })));
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: `${selectedRows.size} task${selectedRows.size === 1 ? "" : "s"} deleted` });
      setSelectedRows(new Set());
    } catch { toast({ title: "Error deleting", variant: "destructive" }); }
  };

  const handleExport = () => {
    if (!allTodos.length) return;
    exportToCSV(allTodos.map(t => ({
      Task: t.text, Priority: t.priority, Category: t.category || "", Assignee: t.assignee || "",
      "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-AU") : "",
      Status: t.completed ? "Done" : "Active", Notes: t.notes || "", "Next Steps": t.nextSteps || "",
    })), `tasks-${new Date().toISOString().split("T")[0]}`);
    toast({ title: `Exported ${allTodos.length} tasks` });
  };

  const overdueCount = useMemo(() => activeTodos.filter(t => isOverdue(t.dueDate)).length, [activeTodos]);
  const criticalCount = useMemo(() => activeTodos.filter(t => t.priority === "Critical").length, [activeTodos]);

  const tabBtn = (id: ViewTab, label: string, count: number) => (
    <button
      key={id}
      onClick={() => { setView(id); setPage(0); }}
      className={cn(
        "relative px-3 py-1.5 text-xs font-medium transition-colors",
        view === id
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span>{label}</span>
      <span className={cn(
        "ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded text-[10px] tabular-nums",
        view === id ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground"
      )}>{count}</span>
      {view === id && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full" />}
    </button>
  );

  const priorityChip = (p: string) => {
    const ps = PRIORITY_STYLES[p];
    const count = activeTodos.filter(t => t.priority === p).length;
    const active = filterPriority.has(p);
    return (
      <button
        key={p}
        onClick={() => {
          setFilterPriority(prev => {
            const next = new Set(prev);
            if (next.has(p)) next.delete(p); else next.add(p);
            return next;
          });
          setPage(0);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-all",
          active
            ? "bg-primary/10 border-primary/40 text-foreground"
            : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
        )}
        title={`${count} active ${p} task${count === 1 ? "" : "s"}`}
      >
        <span className={cn("w-2 h-2 rounded-full", ps.dot)} />
        <span>{p}</span>
        <span className="tabular-nums text-[10px] text-muted-foreground">{count}</span>
      </button>
    );
  };

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background flex flex-col">
      <PageHeader
        prefix="++"
        title="Tasks"
        subtitle={`${allTodos.length} total · ${activeTodos.length} active${overdueCount ? ` · ${overdueCount} overdue` : ""}${criticalCount ? ` · ${criticalCount} critical` : ""}`}
        actions={
          <>
            <LiveToggle onTick={() => queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() })} interval={10_000} />
            <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Download size={12} /> Export
            </button>
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Upload size={12} /> Import
            </button>
            <button onClick={() => { setEditingTodo(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:opacity-90 transition-opacity">
              <Plus size={12} />New task
            </button>
          </>
        }
      />

      {/* Single, calm filter bar — view tabs (left), search (centre), priority chips (right). */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 pt-2">
          <div className="flex items-center gap-1 border-b border-transparent">
            {tabBtn("active", "Active", activeTodos.length)}
            {tabBtn("done", "Done", doneTodos.length)}
            {tabBtn("all", "All", allTodos.length)}
          </div>
          <div className="flex-1" />
          <div className="relative w-56">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search tasks…"
              className="w-full bg-muted/40 border border-border rounded-md pl-7 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={11} /></button>}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mr-1">Priority</span>
          {PRIORITIES.map(priorityChip)}
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors">
              <X size={11} /> Clear {activeFilterCount}
            </button>
          )}
          <div className="flex-1" />
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Showing <span className="text-foreground font-medium">{sorted.length}</span> of {allTodos.length}
          </span>
        </div>
      </div>

      {/* Bulk-action strip — only visible when selecting. Slim, no bright bg. */}
      {selectedRows.size > 0 && (
        <div className="sticky top-[88px] z-10 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
          <span className="text-xs font-semibold text-foreground">{selectedRows.size} selected</span>
          <button onClick={handleBulkDone} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors">
            <CheckCircle2 size={12} /> Mark done
          </button>
          <button onClick={handleBulkDelete} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-md">
                <div className="h-3 w-3 bg-muted/60 rounded skeleton-pulse" />
                <div className="h-3.5 w-3.5 bg-muted/60 rounded-full skeleton-pulse" />
                <div className="h-3 flex-1 max-w-[300px] bg-muted/50 rounded skeleton-pulse" />
                <div className="h-3 w-16 bg-muted/40 rounded skeleton-pulse" />
                <div className="h-3 w-20 bg-muted/40 rounded skeleton-pulse" />
                <div className="h-3 w-[90px] bg-muted/40 rounded skeleton-pulse" />
                <div className="h-3 w-16 bg-muted/40 rounded skeleton-pulse ml-auto" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckCircle2 size={28} className="text-emerald-500/30 mb-3" />
            <p className="text-sm text-foreground font-medium">{activeFilterCount > 0 || search ? "No tasks match your filters" : view === "done" ? "Nothing done yet" : "No tasks yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeFilterCount > 0 ? "Try adjusting your filters" : "Add your first task to get started"}</p>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="mt-3 text-xs text-primary hover:underline">Clear all filters</button>}
            <button onClick={() => { setEditingTodo(undefined); setShowModal(true); }}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90">+ Add task</button>
          </div>
        ) : (
          /*
           * Borderless table: just a 1px row divider between rows. No
           * cell-by-cell borders (those were creating a "spreadsheet grid"
           * effect that fought the eye). Priority is shown as a 2px left
           * accent stripe on the row plus a small inline pill — same
           * information, half the visual weight.
           */
          <div className="overflow-auto h-[calc(100vh-180px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border">
                  <th className="w-10 px-3 py-2 text-left">
                    <input type="checkbox" checked={selectedRows.size === paged.length && paged.length > 0} onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                  </th>
                  <th className="w-8"></th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none cursor-pointer hover:text-foreground" onClick={() => toggleSort("text")}>
                    <span className="inline-flex items-center gap-1">Task <SortIcon field="text" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className="w-[100px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none cursor-pointer hover:text-foreground" onClick={() => toggleSort("priority")}>
                    <span className="inline-flex items-center gap-1">Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className="w-[110px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                    <div className="inline-flex items-center gap-1">
                      <span className="cursor-pointer hover:text-foreground" onClick={() => toggleSort("category")}>Category</span>
                      <SortIcon field="category" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="category" options={uniqueCategories} selected={filterCategory} onChange={v => { setFilterCategory(v); setPage(0); }} onClear={() => setFilterCategory(new Set())} />
                    </div>
                  </th>
                  <th className="w-[110px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                    <div className="inline-flex items-center gap-1">
                      <span className="cursor-pointer hover:text-foreground" onClick={() => toggleSort("assignee")}>Assignee</span>
                      <SortIcon field="assignee" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="assignee" options={uniqueAssignees} selected={filterAssignee} onChange={v => { setFilterAssignee(v); setPage(0); }} onClear={() => setFilterAssignee(new Set())} />
                    </div>
                  </th>
                  <th className="w-[90px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none cursor-pointer hover:text-foreground" onClick={() => toggleSort("dueDate")}>
                    <span className="inline-flex items-center gap-1">Due <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((todo) => {
                  const ps = PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium;
                  const overdue = isOverdue(todo.dueDate) && !todo.completed;
                  const selected = selectedRows.has(todo.id);
                  return (
                    <tr key={todo.id}
                      className={cn(
                        "border-b border-border/40 transition-colors group",
                        "hover:bg-muted/30",
                        selected && "bg-primary/5 hover:bg-primary/10",
                        todo.completed && "text-muted-foreground"
                      )}
                    >
                      {/* Left accent stripe carries the priority colour without screaming. */}
                      <td className="w-10 px-3 py-2.5 relative">
                        <span className={cn("absolute left-0 top-0 bottom-0 w-[2px]", ps.dot)} aria-hidden />
                        <input type="checkbox" checked={selected} onChange={() => toggleSelect(todo.id)} className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                      </td>
                      <td className="w-8 px-1 py-2.5 text-center">
                        <button onClick={() => handleToggle(todo)} className="hover:scale-110 transition-transform" title={todo.completed ? "Mark active" : "Mark done"}>
                          {todo.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-muted-foreground/40 hover:text-primary transition-colors" />}
                        </button>
                      </td>
                      <td className="px-2 py-2.5 min-w-[260px]">
                        <EditableCell
                          type="text"
                          value={todo.text || ""}
                          onCommit={(next) => patchField(todo.id, "text", next)}
                          display={
                            <div className={cn("text-sm leading-snug truncate max-w-[440px]", todo.completed ? "line-through" : "text-foreground")} title={todo.text}>
                              {todo.text}
                            </div>
                          }
                        />
                        {todo.urgencyTag && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                            <AlertCircle size={9} /> {todo.urgencyTag}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <EditableCell
                          type="select"
                          value={todo.priority || "Medium"}
                          options={PRIORITIES.map((p) => ({ value: p }))}
                          onCommit={(next) => patchField(todo.id, "priority", next)}
                          display={
                            <span className={cn("inline-flex items-center gap-1.5 text-xs", ps.text)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />
                              <span className="font-medium">{todo.priority}</span>
                            </span>
                          }
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <EditableCell
                          type="select"
                          value={todo.category || ""}
                          options={CATEGORIES.map((c) => ({ value: c }))}
                          onCommit={(next) => patchField(todo.id, "category", next)}
                          display={
                            todo.category ? (
                              <span className={cn("text-xs font-medium", CAT_TEXT[todo.category] || "text-muted-foreground")}>{todo.category}</span>
                            ) : <span className="text-xs text-muted-foreground/50">—</span>
                          }
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <EditableCell
                          type="select"
                          value={todo.assignee || ""}
                          options={[...TECHS.map((t) => ({ value: t }))]}
                          placeholder="Unassigned"
                          onCommit={(next) => patchField(todo.id, "assignee", next)}
                          display={
                            todo.assignee ? (
                              <span className="text-xs text-foreground">{todo.assignee}</span>
                            ) : <span className="text-xs text-muted-foreground/50">Unassigned</span>
                          }
                        />
                      </td>
                      <td className={cn("px-2 py-2.5 tabular-nums text-xs", overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                        <EditableCell
                          type="date"
                          value={todo.dueDate ? String(todo.dueDate).split("T")[0] : ""}
                          onCommit={(next) => patchField(todo.id, "dueDate", next)}
                          display={
                            todo.dueDate
                              ? <span>{new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}</span>
                              : <span className="text-muted-foreground/40">—</span>
                          }
                        />
                      </td>
                      <td className="w-10 px-2 py-2.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionMenu todo={todo}
                          onEdit={() => { setEditingTodo(todo); setShowModal(true); }}
                          onToggle={() => handleToggle(todo)}
                          onDelete={() => handleDelete(todo.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground z-10">
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="bg-muted/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? "All" : s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{pageSize === 0 ? `${sorted.length} rows` : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`}</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={cn("px-1.5 py-0.5 rounded hover:bg-muted", page === 0 && "opacity-30 cursor-not-allowed")}>
                <ChevronLeft size={13} />
              </button>
              <span className="px-2 text-foreground font-medium tabular-nums">{page + 1} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className={cn("px-1.5 py-0.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30 cursor-not-allowed")}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && <TaskModal todo={editingTodo} onClose={() => { setShowModal(false); setEditingTodo(undefined); }} onSave={editingTodo ? handleUpdate : handleAdd} />}

      <CSVImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (rows, columnMap) => {
          await apiFetch("/todos/import", { method: "POST", body: JSON.stringify({ rows, columnMap }) });
          queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
          toast({ title: `${rows.length} tasks imported` });
          window.dispatchEvent(new CustomEvent("aide-analyse", { detail: { message: `I just imported ${rows.length} tasks via CSV. Analyse the import: check for duplicates, missing fields, priority distribution, and flag anything overdue or needing attention.` } }));
        }}
        availableFields={[
          { key: "text", label: "Task / Description", required: true },
          { key: "priority", label: "Priority" }, { key: "category", label: "Category" },
          { key: "dueDate", label: "Due Date" }, { key: "assignee", label: "Assignee" },
          { key: "notes", label: "Notes" }, { key: "nextSteps", label: "Next Steps" },
          { key: "urgencyTag", label: "Urgency Tag" },
        ]}
        title="Import Tasks"
      />
    </div>
  );
}

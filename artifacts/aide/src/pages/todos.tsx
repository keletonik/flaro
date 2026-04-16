import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp, ChevronsUpDown, Pencil, Download, MoreHorizontal, Trash2, Search, Filter, FilterX, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo,
  getListTodosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/api";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { EditableCell } from "@/components/EditableCell";

const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const CATEGORIES = ["Work", "Personal", "Follow-up", "Compliance", "Admin"] as const;
const TECHS = ["Casper", "Darren", "Gordon", "Haider", "John", "Nu"];

type SortField = "text" | "priority" | "category" | "assignee" | "dueDate" | "status";
type SortDir = "asc" | "desc";
const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const PRIORITY_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  Critical: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", bg: "bg-red-50/80 dark:bg-red-900/20" },
  High: { dot: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50/80 dark:bg-orange-900/20" },
  Medium: { dot: "bg-blue-400", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/80 dark:bg-blue-900/20" },
  Low: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50/80 dark:bg-slate-900/20" },
};

const CAT_STYLES: Record<string, string> = {
  "Work": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
  "Personal": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Follow-up": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  "Compliance": "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  "Admin": "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
};

function ColumnFilter({ label, options, selected, onChange, onClear }: {
  label: string; options: string[]; selected: Set<string>;
  onChange: (val: Set<string>) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

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
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className={cn("p-0.5 rounded transition-colors", hasFilter ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground")}
      >
        <Filter size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl min-w-[170px] max-h-[300px] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="p-2 border-b border-border">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${label}...`}
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
            <button onClick={() => onChange(new Set(options))} className="text-[10px] text-muted-foreground hover:text-foreground">Select All</button>
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
          <h2 className="font-bold text-foreground">{todo ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (form.text.trim()) onSave(form); }} className="px-5 py-4 space-y-4">
          <div><label className={label}>Task *</label><textarea className={cn(field, "resize-none")} rows={2} value={form.text} onChange={e => set("text", e.target.value)} placeholder="What needs to be done..." required autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Priority</label><select className={field} value={form.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className={label}>Category</label><select className={field} value={form.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Due Date</label><input type="date" className={field} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            <div><label className={label}>Assignee</label><select className={field} value={form.assignee} onChange={e => set("assignee", e.target.value)}><option value="">Unassigned</option>{TECHS.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label className={label}>Urgency Tag</label><input className={field} value={form.urgencyTag} onChange={e => set("urgencyTag", e.target.value)} placeholder="e.g. ASAP, EOD, Waiting on client" /></div>
          <div><label className={label}>Notes</label><textarea className={cn(field, "resize-none")} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></div>
          <div><label className={label}>Next Steps</label><textarea className={cn(field, "resize-none")} rows={2} value={form.nextSteps} onChange={e => set("nextSteps", e.target.value)} placeholder="What needs to happen next..." /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">{todo ? "Save Changes" : "Add Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionMenu({ todo, onEdit, onToggle, onDelete }: { todo: any; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
            <button onClick={() => { onToggle(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2">
              {todo.completed ? <Circle size={11} /> : <CheckCircle2 size={11} />} {todo.completed ? "Mark Active" : "Mark Done"}
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

const PAGE_SIZES = [0, 25, 50, 100];

export default function Todos() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(undefined);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(0);

  const [filterPriority, setFilterPriority] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<Set<string>>(new Set());
  const [filterAssignee, setFilterAssignee] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: todos, isLoading } = useListTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const allTodos: any[] = todos || [];
  const activeTodos = allTodos.filter((t: any) => !t.completed);
  const doneTodos = allTodos.filter((t: any) => t.completed);

  const uniqueAssignees = useMemo(() => [...new Set(allTodos.map(t => t.assignee || "Unassigned"))].sort(), [allTodos]);
  const uniqueCategories = useMemo(() => [...new Set(allTodos.map(t => t.category || "Uncategorised").filter(Boolean))].sort(), [allTodos]);

  const activeFilterCount = [filterPriority, filterCategory, filterAssignee, filterStatus].filter(s => s.size > 0).length;

  const filtered = useMemo(() => {
    let list = allTodos;
    if (filterPriority.size > 0) list = list.filter(t => filterPriority.has(t.priority));
    if (filterCategory.size > 0) list = list.filter(t => filterCategory.has(t.category || "Uncategorised"));
    if (filterAssignee.size > 0) list = list.filter(t => filterAssignee.has(t.assignee || "Unassigned"));
    if (filterStatus.size > 0) {
      list = list.filter(t => {
        const s = t.completed ? "Done" : "Active";
        return filterStatus.has(s);
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.text?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q) ||
        t.urgencyTag?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTodos, filterPriority, filterCategory, filterAssignee, filterStatus, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "text": cmp = (a.text || "").localeCompare(b.text || ""); break;
        case "priority": cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case "category": cmp = (a.category || "").localeCompare(b.category || ""); break;
        case "assignee": cmp = (a.assignee || "zzz").localeCompare(b.assignee || "zzz"); break;
        case "dueDate": cmp = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity); break;
        case "status": cmp = (a.completed ? 1 : 0) - (b.completed ? 1 : 0); break;
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

  const clearAllFilters = () => {
    setFilterPriority(new Set()); setFilterCategory(new Set());
    setFilterAssignee(new Set()); setFilterStatus(new Set());
    setSearch(""); setPage(0);
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
   *
   * Returns a promise<boolean> matching EditableCell's onCommit contract
   * so the cell can render saving + failure states correctly. Empty
   * strings on optional fields are normalised to undefined so the API
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
      toast({ title: `${selectedRows.size} tasks → Done` });
      setSelectedRows(new Set());
    } catch { toast({ title: "Error updating", variant: "destructive" }); }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0 || !confirm(`Delete ${selectedRows.size} tasks?`)) return;
    try {
      await Promise.all([...selectedRows].map(id => deleteTodo.mutateAsync({ id })));
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: `${selectedRows.size} tasks deleted` });
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

  const isOverdue = (d?: string | null) => !!d && new Date(d) < new Date();
  const completionPct = allTodos.length ? Math.round((doneTodos.length / allTodos.length) * 100) : 0;

  const stats = useMemo(() => {
    const critical = filtered.filter(t => t.priority === "Critical" && !t.completed).length;
    const overdue = filtered.filter(t => isOverdue(t.dueDate) && !t.completed).length;
    return { critical, overdue };
  }, [filtered]);

  const thBase = "px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none whitespace-nowrap border border-neutral-600 dark:border-neutral-500";
  const tdBase = "px-2 py-1.5 border border-neutral-600 dark:border-neutral-500 text-xs";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <h1 className="text-foreground font-bold text-base tracking-tight shrink-0">Tasks</h1>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search all fields..."
                className="w-full bg-muted/50 border border-border rounded pl-7 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={10} /></button>}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {allTodos.length > 0 && (
              <div className="flex items-center gap-2 mr-2 hidden sm:flex">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{completionPct}%</span>
              </div>
            )}
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10">
                <FilterX size={11} /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={handleExport} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted border border-border">
              <Download size={11} /> Export
            </button>
            <button onClick={() => { setEditingTodo(undefined); setShowModal(true); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90">
              <Plus size={12} />Add Task
            </button>
          </div>
        </div>

        {(activeFilterCount > 0 || search) && (
          <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                Search: "{search}" <button onClick={() => setSearch("")}><X size={9} /></button>
              </span>
            )}
            {filterPriority.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                Priority: {[...filterPriority].join(", ")} <button onClick={() => setFilterPriority(new Set())}><X size={9} /></button>
              </span>
            )}
            {filterCategory.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                Category: {[...filterCategory].join(", ")} <button onClick={() => setFilterCategory(new Set())}><X size={9} /></button>
              </span>
            )}
            {filterAssignee.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                Assignee: {[...filterAssignee].join(", ")} <button onClick={() => setFilterAssignee(new Set())}><X size={9} /></button>
              </span>
            )}
            {filterStatus.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                Status: {[...filterStatus].join(", ")} <button onClick={() => setFilterStatus(new Set())}><X size={9} /></button>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">{filtered.length}</span> of {allTodos.length} tasks
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{doneTodos.length} done</span>
          <span className="flex items-center gap-1">{activeTodos.length} active</span>
          {stats.critical > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{stats.critical} critical</span>}
          {stats.overdue > 0 && <span className="text-red-500 font-semibold">{stats.overdue} overdue</span>}
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div className="sticky top-[88px] z-10 bg-primary/10 border-b border-primary/20 px-3 py-1.5 flex items-center gap-2">
          <span className="text-[10px] font-bold text-primary">{selectedRows.size} selected</span>
          <button onClick={handleBulkDone} className="px-2 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 hover:opacity-80">
            <CheckCircle2 size={10} className="inline mr-0.5" />Done
          </button>
          <button onClick={handleBulkDelete} className="px-2 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 hover:opacity-80">
            <Trash2 size={10} className="inline mr-0.5" />Delete
          </button>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-1">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 bg-muted/50 rounded skeleton-pulse" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <CheckCircle2 size={24} className="text-emerald-500/30 mb-3" />
            <p className="text-sm text-foreground font-medium">{activeFilterCount > 0 || search ? "No tasks match your filters" : "No tasks yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeFilterCount > 0 ? "Try adjusting your filters" : "Add your first task to get started"}</p>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="mt-3 text-xs text-primary hover:underline">Clear all filters</button>}
            <button onClick={() => { setEditingTodo(undefined); setShowModal(true); }}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90">+ Add Task</button>
          </div>
        ) : (
          <div className="overflow-auto h-[calc(100vh-140px)] px-2">
            <table className="w-full border-collapse border border-neutral-600 dark:border-neutral-500">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted">
                  <th className={cn(thBase, "w-8 text-center")}>
                    <input type="checkbox" checked={selectedRows.size === paged.length && paged.length > 0} onChange={toggleSelectAll}
                      className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                  </th>
                  <th className={cn(thBase, "w-8 text-center")}></th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground min-w-[200px]")} onClick={() => toggleSort("text")}>
                    <div className="flex items-center gap-1">Task <SortIcon field="text" sortField={sortField} sortDir={sortDir} /></div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[85px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("priority")}>
                      Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Priority" options={[...PRIORITIES]} selected={filterPriority} onChange={v => { setFilterPriority(v); setPage(0); }} onClear={() => setFilterPriority(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[90px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("category")}>
                      Category <SortIcon field="category" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Category" options={uniqueCategories} selected={filterCategory} onChange={v => { setFilterCategory(v); setPage(0); }} onClear={() => setFilterCategory(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[85px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("assignee")}>
                      Assignee <SortIcon field="assignee" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Assignee" options={uniqueAssignees} selected={filterAssignee} onChange={v => { setFilterAssignee(v); setPage(0); }} onClear={() => setFilterAssignee(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[75px]")} onClick={() => toggleSort("dueDate")}>
                    <div className="flex items-center gap-1">Due <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} /></div>
                  </th>
                  <th className={cn(thBase, "cursor-pointer hover:text-foreground w-[70px]")}>
                    <div className="flex items-center gap-1" onClick={() => toggleSort("status")}>
                      Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                      <ColumnFilter label="Status" options={["Active", "Done"]} selected={filterStatus} onChange={v => { setFilterStatus(v); setPage(0); }} onClear={() => setFilterStatus(new Set())} />
                    </div>
                  </th>
                  <th className={cn(thBase, "hidden lg:table-cell min-w-[120px]")}>Notes</th>
                  <th className={cn(thBase, "w-8 text-center")}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((todo, i) => {
                  const ps = PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium;
                  const overdue = isOverdue(todo.dueDate) && !todo.completed;
                  return (
                    <tr key={todo.id}
                      className={cn(
                        "hover:bg-primary/5 transition-colors",
                        selectedRows.has(todo.id) && "bg-primary/8",
                        todo.completed && "opacity-50",
                        overdue && !selectedRows.has(todo.id) && "bg-red-950/10",
                        i % 2 === 1 && !selectedRows.has(todo.id) && !overdue && "bg-muted/15"
                      )}
                    >
                      <td className={cn(tdBase, "w-8 text-center")}>
                        <input type="checkbox" checked={selectedRows.has(todo.id)} onChange={() => toggleSelect(todo.id)} className="w-3 h-3 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                      </td>
                      <td className={cn(tdBase, "w-8 text-center")}>
                        <button onClick={() => handleToggle(todo)} className="hover:scale-110 transition-transform">
                          {todo.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-muted-foreground/30 hover:text-primary transition-colors" />}
                        </button>
                      </td>
                      <td className={cn(tdBase, todo.completed && "line-through text-muted-foreground")}>
                        <EditableCell
                          type="text"
                          value={todo.text || ""}
                          onCommit={(next) => patchField(todo.id, "text", next)}
                          display={
                            <div className="truncate max-w-[280px] font-medium text-foreground" title={todo.text}>
                              {todo.text}
                            </div>
                          }
                        />
                        {todo.urgencyTag && (
                          <span className="inline-block mt-0.5 px-1 py-0 rounded text-[8px] font-bold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">{todo.urgencyTag}</span>
                        )}
                      </td>
                      <td className={tdBase}>
                        <EditableCell
                          type="select"
                          value={todo.priority || "Medium"}
                          options={PRIORITIES.map((p) => ({ value: p }))}
                          onCommit={(next) => patchField(todo.id, "priority", next)}
                          display={
                            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", ps.text, ps.bg)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />{todo.priority}
                            </span>
                          }
                        />
                      </td>
                      <td className={tdBase}>
                        <EditableCell
                          type="select"
                          value={todo.category || ""}
                          options={CATEGORIES.map((c) => ({ value: c }))}
                          onCommit={(next) => patchField(todo.id, "category", next)}
                          display={
                            todo.category ? (
                              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border", CAT_STYLES[todo.category] || CAT_STYLES.Work)}>
                                {todo.category}
                              </span>
                            ) : undefined
                          }
                        />
                      </td>
                      <td className={tdBase}>
                        <EditableCell
                          type="select"
                          value={todo.assignee || ""}
                          options={[...TECHS.map((t) => ({ value: t }))]}
                          placeholder="Unassigned"
                          onCommit={(next) => patchField(todo.id, "assignee", next)}
                        />
                      </td>
                      <td className={cn(tdBase, "tabular-nums", overdue ? "text-red-500 font-bold" : "text-muted-foreground")}>
                        <EditableCell
                          type="date"
                          value={todo.dueDate ? String(todo.dueDate).split("T")[0] : ""}
                          onCommit={(next) => patchField(todo.id, "dueDate", next)}
                          display={todo.dueDate ? new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "2-digit", month: "short" }) : undefined}
                        />
                      </td>
                      <td className={tdBase}>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold",
                          todo.completed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        )}>{todo.completed ? "Done" : "Active"}</span>
                      </td>
                      <td className={cn(tdBase, "hidden lg:table-cell text-muted-foreground")}>
                        <EditableCell
                          type="text"
                          multiline
                          value={todo.notes || ""}
                          onCommit={(next) => patchField(todo.id, "notes", next)}
                          display={
                            <div className="truncate max-w-[150px]" title={todo.notes || ""}>
                              {todo.notes || "—"}
                            </div>
                          }
                        />
                      </td>
                      <td className={cn(tdBase, "w-8 text-center")}>
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
        <div className="sticky bottom-0 bg-background border-t border-border px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground z-10">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s === 0 ? 'All' : s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span>{pageSize === 0 ? `1–${sorted.length}` : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)}`} of {sorted.length}</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPage(0)} disabled={page === 0} className={cn("px-1 py-0.5 rounded hover:bg-muted", page === 0 && "opacity-30 cursor-not-allowed")}>
                <ChevronLeft size={12} /><ChevronLeft size={12} className="-ml-2" />
              </button>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className={cn("px-1 py-0.5 rounded hover:bg-muted", page === 0 && "opacity-30 cursor-not-allowed")}>
                <ChevronLeft size={12} />
              </button>
              <span className="px-2 text-foreground font-medium">Page {page + 1} of {totalPages || 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className={cn("px-1 py-0.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30 cursor-not-allowed")}>
                <ChevronRight size={12} />
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className={cn("px-1 py-0.5 rounded hover:bg-muted", page >= totalPages - 1 && "opacity-30 cursor-not-allowed")}>
                <ChevronRight size={12} /><ChevronRight size={12} className="-ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && <TaskModal todo={editingTodo} onClose={() => { setShowModal(false); setEditingTodo(undefined); }} onSave={editingTodo ? handleUpdate : handleAdd} />}
      <AnalyticsPanel section="tasks" title="Task Analyst" />
    </div>
  );
}

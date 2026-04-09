import { useState, useMemo } from "react";
import { Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp, ChevronsUpDown, Calendar, Pencil, Check, Download, MoreHorizontal, Trash2, Search } from "lucide-react";
import {
  useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo,
  getListTodosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/api";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import type { Todo } from "@workspace/api-client-react";

const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const CATEGORIES = ["Work", "Personal", "Follow-up", "Compliance", "Admin"] as const;
const FILTERS = ["All", "Active", "Done"] as const;
const TECHS = ["Casper", "Darren", "Gordon", "Haider", "John", "Nu", "Unassigned"];

type SortField = "text" | "priority" | "category" | "assignee" | "dueDate" | "status";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const PRIORITY_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  Critical: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  High: { dot: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  Medium: { dot: "bg-blue-400", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  Low: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/20" },
};

const CAT_STYLES: Record<string, string> = {
  "Work": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
  "Personal": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Follow-up": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  "Compliance": "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  "Admin": "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
};

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown size={12} className="text-muted-foreground/40" />;
  return sortDir === "asc" ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
}

interface TaskFormData {
  text: string; priority: string; category: string; dueDate: string;
  assignee: string; notes: string; nextSteps: string; urgencyTag: string;
}

const defaultTaskForm: TaskFormData = {
  text: "", priority: "Medium", category: "Work", dueDate: "",
  assignee: "", notes: "", nextSteps: "", urgencyTag: "",
};

function TaskModal({ todo, onClose, onSave }: {
  todo?: any; onClose: () => void; onSave: (data: any) => void;
}) {
  const [form, setForm] = useState<TaskFormData>(todo ? {
    text: todo.text || "", priority: todo.priority || "Medium", category: todo.category || "Work",
    dueDate: todo.dueDate ? todo.dueDate.split("T")[0] : "",
    assignee: todo.assignee || "", notes: todo.notes || "",
    nextSteps: todo.nextSteps || "", urgencyTag: todo.urgencyTag || "",
  } : defaultTaskForm);

  const set = (k: keyof TaskFormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all";
  const label = "text-xs font-medium text-muted-foreground mb-1 block uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full md:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">{todo ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (form.text.trim()) onSave(form); }} className="px-5 py-4 space-y-4">
          <div>
            <label className={label}>Task *</label>
            <textarea className={cn(field, "resize-none")} rows={2} value={form.text} onChange={e => set("text", e.target.value)} placeholder="What needs to be done..." required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Priority</label>
              <select className={field} value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <select className={field} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Due Date</label>
              <input type="date" className={field} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
            <div>
              <label className={label}>Assignee</label>
              <select className={field} value={form.assignee} onChange={e => set("assignee", e.target.value)}>
                <option value="">Unassigned</option>
                {TECHS.filter(t => t !== "Unassigned").map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Urgency Tag</label>
            <input className={field} value={form.urgencyTag} onChange={e => set("urgencyTag", e.target.value)} placeholder="e.g. ASAP, EOD, Waiting on client" />
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={cn(field, "resize-none")} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." />
          </div>
          <div>
            <label className={label}>Next Steps</label>
            <textarea className={cn(field, "resize-none")} rows={2} value={form.nextSteps} onChange={e => set("nextSteps", e.target.value)} placeholder="What needs to happen next..." />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">{todo ? "Save Changes" : "Add Task"}</button>
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
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
            <button onClick={() => { onToggle(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors">
              {todo.completed ? <Circle size={12} /> : <CheckCircle2 size={12} />} {todo.completed ? "Mark Active" : "Mark Done"}
            </button>
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors">
              <Pencil size={12} /> Edit
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Todos() {
  const [filter, setFilter] = useState<string>("Active");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any>(undefined);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: todos, isLoading } = useListTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const allTodos: any[] = todos || [];
  const activeTodos = allTodos.filter((t: any) => !t.completed);
  const doneTodos = allTodos.filter((t: any) => t.completed);

  const filtered = useMemo(() => {
    let list = allTodos;
    if (filter === "Done") list = doneTodos;
    else if (filter === "Active") list = activeTodos;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.text?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [todos, filter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "text": cmp = (a.text || "").localeCompare(b.text || ""); break;
        case "priority": cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case "category": cmp = (a.category || "").localeCompare(b.category || ""); break;
        case "assignee": cmp = (a.assignee || "zzz").localeCompare(b.assignee || "zzz"); break;
        case "dueDate": {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case "status": cmp = (a.completed ? 1 : 0) - (b.completed ? 1 : 0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === sorted.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(sorted.map(t => t.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const handleAdd = async (data: any) => {
    try {
      await createTodo.mutateAsync({ data: { text: data.text, priority: data.priority, category: data.category, dueDate: data.dueDate || undefined, assignee: data.assignee || undefined, notes: data.notes || undefined, nextSteps: data.nextSteps || undefined, urgencyTag: data.urgencyTag || undefined } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task added" });
      setShowModal(false);
    } catch { toast({ title: "Could not add task", variant: "destructive" }); }
  };

  const handleUpdate = async (data: any) => {
    if (!editingTodo) return;
    try {
      await updateTodo.mutateAsync({ id: editingTodo.id, data: { text: data.text, priority: data.priority, category: data.category, dueDate: data.dueDate || undefined, assignee: data.assignee || undefined, notes: data.notes || undefined, nextSteps: data.nextSteps || undefined, urgencyTag: data.urgencyTag || undefined } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task updated" });
      setShowModal(false);
      setEditingTodo(undefined);
    } catch { toast({ title: "Could not save", variant: "destructive" }); }
  };

  const handleToggle = async (todo: any) => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, data: { completed: !todo.completed } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
    } catch { toast({ title: "Could not update", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTodo.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task deleted" });
      selectedRows.delete(id);
      setSelectedRows(new Set(selectedRows));
    } catch { toast({ title: "Could not delete", variant: "destructive" }); }
  };

  const handleBulkDone = async () => {
    if (selectedRows.size === 0) return;
    try {
      await Promise.all([...selectedRows].map(id => updateTodo.mutateAsync({ id, data: { completed: true } })));
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: `${selectedRows.size} tasks marked done` });
      setSelectedRows(new Set());
    } catch { toast({ title: "Error updating tasks", variant: "destructive" }); }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0 || !confirm(`Delete ${selectedRows.size} tasks?`)) return;
    try {
      await Promise.all([...selectedRows].map(id => deleteTodo.mutateAsync({ id })));
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: `${selectedRows.size} tasks deleted` });
      setSelectedRows(new Set());
    } catch { toast({ title: "Error deleting tasks", variant: "destructive" }); }
  };

  const handleExport = () => {
    if (!allTodos.length) return;
    exportToCSV(allTodos.map(t => ({
      Task: t.text, Priority: t.priority, Category: t.category || "",
      Assignee: t.assignee || "", "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-AU") : "",
      Status: t.completed ? "Done" : "Active", Notes: t.notes || "", "Next Steps": t.nextSteps || "",
    })), `tasks-${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Exported to CSV" });
  };

  const completionPct = allTodos.length ? Math.round((doneTodos.length / allTodos.length) * 100) : 0;
  const isOverdue = (d?: string | null) => !!d && new Date(d) < new Date();

  const thClass = "px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap";
  const tdClass = "px-3 py-2.5 text-sm whitespace-nowrap";

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">Tasks</h1>
            <p className="text-xs text-muted-foreground">{activeTodos.length} remaining · {doneTodos.length} done</p>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-muted border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {allTodos.length > 0 && (
              <div className="flex items-center gap-2 hidden sm:flex mr-2">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{completionPct}%</span>
              </div>
            )}
            <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Download size={12} /> Export
            </button>
            <button
              onClick={() => { setEditingTodo(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />Add Task
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide pb-0.5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f}<span className={cn("ml-1 text-[10px]", filter === f ? "opacity-70" : "opacity-50")}>{f === "All" ? allTodos.length : f === "Active" ? activeTodos.length : doneTodos.length}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div className="sticky top-[105px] z-10 bg-primary/10 border-b border-primary/20 px-4 sm:px-6 py-2 flex items-center gap-3">
          <span className="text-xs font-semibold text-primary">{selectedRows.size} selected</span>
          <button onClick={handleBulkDone} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 hover:opacity-80 transition-opacity">
            <CheckCircle2 size={11} className="inline mr-1" />Mark Done
          </button>
          <button onClick={handleBulkDelete} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 hover:opacity-80 transition-opacity">
            <Trash2 size={11} className="inline mr-1" />Delete
          </button>
          <button onClick={() => setSelectedRows(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      <div className="px-4 sm:px-6 py-3">
        {isLoading ? (
          <div className="space-y-1">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-card border border-border rounded-lg skeleton-pulse" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-3"><CheckCircle2 size={22} className="text-emerald-500" /></div>
            <p className="text-foreground font-semibold text-sm">{filter === "Active" ? "All clear" : "No tasks found"}</p>
            <p className="text-muted-foreground text-xs mt-1">{filter === "Active" ? "No active tasks. Add one to get started." : "Try changing your filters."}</p>
            <button onClick={() => { setEditingTodo(undefined); setShowModal(true); }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">+ Add Task</button>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2.5 w-8">
                      <input type="checkbox" checked={selectedRows.size === sorted.length && sorted.length > 0} onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                    </th>
                    <th className="px-3 py-2.5 w-10"></th>
                    <th className={thClass} onClick={() => toggleSort("text")}>
                      <span className="flex items-center gap-1">Task <SortIcon field="text" sortField={sortField} sortDir={sortDir} /></span>
                    </th>
                    <th className={thClass} onClick={() => toggleSort("priority")}>
                      <span className="flex items-center gap-1">Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} /></span>
                    </th>
                    <th className={thClass} onClick={() => toggleSort("category")}>
                      <span className="flex items-center gap-1">Category <SortIcon field="category" sortField={sortField} sortDir={sortDir} /></span>
                    </th>
                    <th className={thClass} onClick={() => toggleSort("assignee")}>
                      <span className="flex items-center gap-1">Assignee <SortIcon field="assignee" sortField={sortField} sortDir={sortDir} /></span>
                    </th>
                    <th className={thClass} onClick={() => toggleSort("dueDate")}>
                      <span className="flex items-center gap-1">Due <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} /></span>
                    </th>
                    <th className={cn(thClass, "hidden lg:table-cell")}>Notes</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((todo, i) => {
                    const ps = PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium;
                    const overdue = isOverdue(todo.dueDate) && !todo.completed;
                    return (
                      <tr key={todo.id}
                        className={cn(
                          "border-b border-border/50 hover:bg-muted/30 transition-colors",
                          selectedRows.has(todo.id) && "bg-primary/5",
                          todo.completed && "opacity-50",
                          i % 2 === 0 ? "" : "bg-muted/10"
                        )}
                      >
                        <td className="px-3 py-2.5 w-8">
                          <input type="checkbox" checked={selectedRows.has(todo.id)} onChange={() => toggleSelect(todo.id)}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2.5 w-10">
                          <button onClick={() => handleToggle(todo)} className="transition-all hover:scale-110">
                            {todo.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-muted-foreground/30 hover:text-primary transition-colors" />}
                          </button>
                        </td>
                        <td className={cn(tdClass, "font-medium text-foreground max-w-[300px]", todo.completed && "line-through text-muted-foreground")}>
                          <div className="truncate">{todo.text}</div>
                          {todo.urgencyTag && (
                            <span className="inline-block mt-0.5 px-1.5 py-0 rounded text-[9px] font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">{todo.urgencyTag}</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", ps.text, ps.bg)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />{todo.priority}
                          </span>
                        </td>
                        <td className={tdClass}>
                          {todo.category && <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border", CAT_STYLES[todo.category] || CAT_STYLES.Work)}>{todo.category}</span>}
                        </td>
                        <td className={cn(tdClass, "text-xs")}>{todo.assignee || <span className="text-muted-foreground/40">—</span>}</td>
                        <td className={cn(tdClass, "text-xs", overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                          {todo.dueDate ? (
                            <span>{overdue ? "Overdue · " : ""}{new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                          ) : "—"}
                        </td>
                        <td className={cn(tdClass, "hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate")}>{todo.notes || "—"}</td>
                        <td className="px-2 py-2.5">
                          <ActionMenu
                            todo={todo}
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
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          todo={editingTodo}
          onClose={() => { setShowModal(false); setEditingTodo(undefined); }}
          onSave={editingTodo ? handleUpdate : handleAdd}
        />
      )}

      <AnalyticsPanel section="tasks" title="Task Analyst" />
    </div>
  );
}

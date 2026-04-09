import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp, Calendar, GripVertical, Pencil, Check, Tag, FileText, Link2, Download, Users } from "lucide-react";
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
const COLOR_PRESETS = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"];

const PRIORITY_STYLES: Record<string, { dot: string; badge: string }> = {
  Critical: { dot: "bg-red-500", badge: "text-red-600 dark:text-red-400" },
  High: { dot: "bg-orange-400", badge: "text-orange-600 dark:text-orange-400" },
  Medium: { dot: "bg-blue-400", badge: "text-blue-600 dark:text-blue-400" },
  Low: { dot: "bg-slate-400", badge: "text-slate-500 dark:text-slate-400" },
};

const CAT_STYLES: Record<string, string> = {
  "Work": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
  "Personal": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Follow-up": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  "Compliance": "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  "Admin": "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
};

function QuickAdd({ onAdd }: { onAdd: (data: any) => void }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [category, setCategory] = useState<string>("Work");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), priority, category, dueDate: dueDate || undefined, assignee: assignee || undefined });
    setText(""); setDueDate(""); setExpanded(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-5 h-5 rounded-full border-2 border-primary/40 shrink-0" />
        <input value={text} onChange={e => { setText(e.target.value); if (!expanded && e.target.value) setExpanded(true); }}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setText(""); setExpanded(false); } }}
          placeholder="Add a new task..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        {text && <button onClick={handleSubmit} className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"><Plus size={14} /></button>}
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Priority</span>
            <div className="flex gap-1 flex-wrap">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setPriority(p)} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                  priority === p ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_STYLES[p].dot)} />{p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Category</span>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Due</span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Assign</span>
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Unassigned</option>
                {TECHS.filter(t => t !== "Unassigned").map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete, onUpdate }: {
  todo: any; onToggle: () => void; onDelete: () => void;
  onUpdate: (data: any) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editCategory, setEditCategory] = useState(todo.category);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ? todo.dueDate.split("T")[0] : "");
  const [editAssignee, setEditAssignee] = useState(todo.assignee || "");
  const [editNotes, setEditNotes] = useState(todo.notes || "");
  const [editNextSteps, setEditNextSteps] = useState(todo.nextSteps || "");
  const [editUrgencyTag, setEditUrgencyTag] = useState(todo.urgencyTag || "");
  const [editColorCode, setEditColorCode] = useState(todo.colorCode || "");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);

  const ps = PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium;
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

  const handleExpand = () => {
    setExpanded(v => !v);
    if (!expanded) {
      setEditText(todo.text); setEditPriority(todo.priority); setEditCategory(todo.category);
      setEditDueDate(todo.dueDate ? todo.dueDate.split("T")[0] : ""); setEditAssignee(todo.assignee || "");
      setEditNotes(todo.notes || ""); setEditNextSteps(todo.nextSteps || "");
      setEditUrgencyTag(todo.urgencyTag || ""); setEditColorCode(todo.colorCode || "");
    }
  };

  const handleSave = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    await onUpdate({
      text: editText.trim(), priority: editPriority, category: editCategory,
      dueDate: editDueDate || undefined, assignee: editAssignee || undefined,
      notes: editNotes || undefined, nextSteps: editNextSteps || undefined,
      urgencyTag: editUrgencyTag || undefined, colorCode: editColorCode || undefined,
    });
    setSaving(false); setExpanded(false);
  };

  useEffect(() => { if (expanded && textRef.current) { textRef.current.focus(); textRef.current.select(); } }, [expanded]);

  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xs",
      todo.completed && "opacity-50",
      expanded ? "ring-2 ring-primary/20 border-primary/30" : "border-border",
      todo.colorCode ? `border-l-[3px]` : ""
    )} style={todo.colorCode ? { borderLeftColor: todo.colorCode } : undefined}>
      <div className="flex items-center gap-2.5 px-3 py-3">
        <GripVertical size={14} className="text-muted-foreground/20 shrink-0 cursor-grab" />
        <button onClick={e => { e.stopPropagation(); onToggle(); }} className="shrink-0 transition-all hover:scale-110">
          {todo.completed ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-muted-foreground/30 hover:text-primary transition-colors" />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleExpand}>
          <p className={cn("text-sm text-foreground leading-snug", todo.completed && "line-through text-muted-foreground")}>{todo.text}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", ps.badge)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />{todo.priority}
            </span>
            {todo.category && <span className={cn("px-1.5 py-0 rounded text-[9px] font-semibold border", CAT_STYLES[todo.category] || CAT_STYLES.Work)}>{todo.category}</span>}
            {todo.urgencyTag && <span className="px-1.5 py-0 rounded text-[9px] font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 flex items-center gap-0.5"><Tag size={8} />{todo.urgencyTag}</span>}
            {todo.assignee && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Users size={9} />{todo.assignee}</span>}
            {todo.dueDate && <span className={cn("text-[10px] flex items-center gap-0.5", isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}><Calendar size={9} />{isOverdue ? "Overdue · " : ""}{new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>}
            {todo.notes && <FileText size={9} className="text-muted-foreground/40" />}
            {todo.nextSteps && <Link2 size={9} className="text-muted-foreground/40" />}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={handleExpand} className={cn("p-1.5 rounded-lg transition-colors", expanded ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Edit"><Pencil size={12} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors" title="Delete"><X size={12} /></button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
          <input ref={textRef} value={editText} onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSave(); if (e.key === "Escape") setExpanded(false); }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Task text..." />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Priority</span>
            <div className="flex gap-1 flex-wrap">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setEditPriority(p)} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                  editPriority === p ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_STYLES[p].dot)} />{p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Category</label>
              <select value={editCategory || "Work"} onChange={e => setEditCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Due date</label>
              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Assignee</label>
              <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Unassigned</option>
                {TECHS.filter(t => t !== "Unassigned").map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Urgency Tag</label>
              <input value={editUrgencyTag} onChange={e => setEditUrgencyTag(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. ASAP, EOD" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Colour Code</label>
            <div className="flex gap-1.5 items-center">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => setEditColorCode(editColorCode === c ? "" : c)}
                  className={cn("w-6 h-6 rounded-lg border-2 transition-all", editColorCode === c ? "border-foreground scale-110" : "border-transparent hover:scale-105")}
                  style={{ backgroundColor: c }} />
              ))}
              {editColorCode && <button onClick={() => setEditColorCode("")} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">Clear</button>}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Notes</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} placeholder="Additional notes..." />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1 block">Next Steps</label>
            <textarea value={editNextSteps} onChange={e => setEditNextSteps(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} placeholder="What needs to happen next..." />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !editText.trim()}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                editText.trim() && !saving ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed")}>
              <Check size={12} />{saving ? "Saving..." : "Save changes"}
            </button>
            <button onClick={() => setExpanded(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Todos() {
  const [filter, setFilter] = useState<string>("Active");
  const [showDone, setShowDone] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: todos, isLoading } = useListTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const allTodos: any[] = todos || [];
  const activeTodos = allTodos.filter((t: any) => !t.completed);
  const doneTodos = allTodos.filter((t: any) => t.completed);

  const displayed = useMemo(() => {
    if (filter === "Done") return doneTodos;
    if (filter === "Active") return activeTodos;
    return allTodos;
  }, [todos, filter]);

  const handleAdd = async (data: any) => {
    try {
      await createTodo.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Task added" });
    } catch { toast({ title: "Could not add task", variant: "destructive" }); }
  };

  const handleToggle = async (todo: any) => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, data: { completed: !todo.completed } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
    } catch { toast({ title: "Could not update", variant: "destructive" }); }
  };

  const handleUpdate = async (todo: any, data: any) => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, data });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Saved" });
    } catch { toast({ title: "Could not save", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Deleted" });
    } catch { toast({ title: "Could not delete", variant: "destructive" }); }
  };

  const handleExport = () => {
    if (!allTodos.length) return;
    exportToCSV(allTodos.map(t => ({ Text: t.text, Priority: t.priority, Category: t.category, "Due Date": t.dueDate, Status: t.completed ? "Done" : "Active" })), `tasks-${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Exported" });
  };

  const completionPct = allTodos.length ? Math.round((doneTodos.length / allTodos.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">Tasks</h1>
            <p className="text-xs text-muted-foreground">{activeTodos.length} remaining · {doneTodos.length} done</p>
          </div>
          <div className="flex items-center gap-2">
            {allTodos.length > 0 && (
              <>
                <div className="flex items-center gap-2 hidden sm:flex">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{completionPct}%</span>
                </div>
                <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
                  <Download size={12} /> Export
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 mt-3">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f}<span className={cn("ml-1 text-[10px]", filter === f ? "opacity-70" : "opacity-50")}>{f === "All" ? allTodos.length : f === "Active" ? activeTodos.length : doneTodos.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        <QuickAdd onAdd={handleAdd} />

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-card border border-border rounded-xl skeleton-pulse" />)}</div>
        ) : displayed.filter(t => !t.completed).length === 0 && filter !== "Done" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-3"><CheckCircle2 size={22} className="text-emerald-500" /></div>
            <p className="text-foreground font-semibold text-sm">All clear</p>
            <p className="text-muted-foreground text-xs mt-1">{filter === "Active" ? "No active tasks. Add one above." : "Nothing here."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filter !== "Done" && (() => {
              const active = displayed.filter((t: any) => !t.completed);
              const byPriority: Record<string, any[]> = {};
              const order = ["Critical", "High", "Medium", "Low"];
              active.forEach((t: any) => { if (!byPriority[t.priority]) byPriority[t.priority] = []; byPriority[t.priority].push(t); });
              return order.filter(p => byPriority[p]?.length).map(p => (
                <div key={p} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <div className={cn("w-2 h-2 rounded-full", PRIORITY_STYLES[p].dot)} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", PRIORITY_STYLES[p].badge)}>{p} · {byPriority[p].length}</span>
                  </div>
                  {byPriority[p].map((todo: any) => (
                    <TodoItem key={todo.id} todo={todo} onToggle={() => handleToggle(todo)} onDelete={() => handleDelete(todo.id)} onUpdate={data => handleUpdate(todo, data)} />
                  ))}
                </div>
              ));
            })()}
            {filter === "Done" && doneTodos.map(todo => (
              <TodoItem key={todo.id} todo={todo} onToggle={() => handleToggle(todo)} onDelete={() => handleDelete(todo.id)} onUpdate={data => handleUpdate(todo, data)} />
            ))}
          </div>
        )}

        {filter !== "Done" && doneTodos.length > 0 && (
          <div className="border-t border-border pt-3">
            <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium py-1">
              {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{doneTodos.length} completed
            </button>
            {showDone && (
              <div className="space-y-1.5 mt-2">
                {doneTodos.map(todo => (
                  <TodoItem key={todo.id} todo={todo} onToggle={() => handleToggle(todo)} onDelete={() => handleDelete(todo.id)} onUpdate={data => handleUpdate(todo, data)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnalyticsPanel section="tasks" title="Task Analyst" />
    </div>
  );
}

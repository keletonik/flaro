import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp, Calendar, GripVertical, Pencil, Check } from "lucide-react";
import {
  useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo,
  getListTodosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Todo } from "@workspace/api-client-react";

const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const CATEGORIES = ["Work", "Personal", "Follow-up", "Compliance", "Admin"] as const;
const FILTERS = ["All", "Active", "Done"] as const;

const PRIORITY_STYLES: Record<string, { dot: string; badge: string; border: string }> = {
  Critical: { dot: "bg-red-500",    badge: "text-red-600 dark:text-red-400",    border: "border-red-400" },
  High:     { dot: "bg-orange-400", badge: "text-orange-600 dark:text-orange-400", border: "border-orange-400" },
  Medium:   { dot: "bg-blue-400",   badge: "text-blue-600 dark:text-blue-400",   border: "border-blue-400" },
  Low:      { dot: "bg-slate-400",  badge: "text-slate-500 dark:text-slate-400", border: "border-slate-400" },
};

const CAT_STYLES: Record<string, string> = {
  "Work":       "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
  "Personal":   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Follow-up":  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  "Compliance": "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  "Admin":      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
};

function QuickAdd({ onAdd }: { onAdd: (text: string, priority: string, category: string, dueDate: string) => void }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [category, setCategory] = useState<string>("Work");
  const [dueDate, setDueDate] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), priority, category, dueDate);
    setText("");
    setDueDate("");
    setExpanded(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-5 h-5 rounded-full border-2 border-primary/40 flex-shrink-0" />
        <input
          data-testid="input-quick-add-todo"
          value={text}
          onChange={e => { setText(e.target.value); if (!expanded && e.target.value) setExpanded(true); }}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setText(""); setExpanded(false); } }}
          placeholder="Add a new to-do..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {text && (
          <button
            data-testid="button-submit-quick-add"
            onClick={handleSubmit}
            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-3">
          {/* Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Priority</span>
            <div className="flex gap-1 flex-wrap">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setPriority(p)} className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                  priority === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_STYLES[p].dot)} />{p}
                </button>
              ))}
            </div>
          </div>
          {/* Category + Due Date */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Category</span>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Due date</span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete, onUpdate }: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (data: Partial<{ text: string; priority: Todo["priority"]; category: Todo["category"]; dueDate: string }>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editPriority, setEditPriority] = useState<Todo["priority"]>(todo.priority);
  const [editCategory, setEditCategory] = useState<Todo["category"]>(todo.category);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ? todo.dueDate.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);

  const ps = PRIORITY_STYLES[todo.priority];
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

  const hasChanges = editText !== todo.text ||
    editPriority !== todo.priority ||
    editCategory !== todo.category ||
    (editDueDate || "") !== (todo.dueDate ? todo.dueDate.split("T")[0] : "");

  const handleExpand = () => {
    setExpanded(v => !v);
    setEditText(todo.text);
    setEditPriority(todo.priority);
    setEditCategory(todo.category);
    setEditDueDate(todo.dueDate ? todo.dueDate.split("T")[0] : "");
  };

  const handleSave = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    await onUpdate({
      text: editText.trim(),
      priority: editPriority,
      category: editCategory,
      dueDate: editDueDate || undefined,
    });
    setSaving(false);
    setExpanded(false);
  };

  const handleCancel = () => {
    setExpanded(false);
    setEditText(todo.text);
    setEditPriority(todo.priority);
    setEditCategory(todo.category);
    setEditDueDate(todo.dueDate ? todo.dueDate.split("T")[0] : "");
  };

  useEffect(() => {
    if (expanded && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [expanded]);

  return (
    <div
      data-testid={`todo-item-${todo.id}`}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden transition-all duration-200",
        "hover:shadow-xs",
        todo.completed && "opacity-55",
        expanded && "ring-2 ring-primary/20 border-primary/30"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        {/* Drag handle (visual only) */}
        <GripVertical size={14} className="text-muted-foreground/25 flex-shrink-0 cursor-grab" />

        {/* Checkbox */}
        <button
          data-testid={`button-toggle-todo-${todo.id}`}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="flex-shrink-0 transition-all hover:scale-110"
        >
          {todo.completed ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <Circle size={20} className="text-muted-foreground/30 hover:text-primary transition-colors" />
          )}
        </button>

        {/* Text + meta */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleExpand}>
          <p className={cn("text-sm text-foreground leading-snug", todo.completed && "line-through text-muted-foreground")}>
            {todo.text}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", ps.badge)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />{todo.priority}
            </span>
            {todo.category && (
              <span className={cn("px-1.5 py-0 rounded text-[9px] font-semibold border", CAT_STYLES[todo.category] || CAT_STYLES["Work"])}>
                {todo.category}
              </span>
            )}
            {todo.dueDate && (
              <span className={cn("text-[10px] flex items-center gap-0.5", isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                <Calendar size={9} />{isOverdue ? "Overdue · " : ""}
                {new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            data-testid={`button-edit-todo-${todo.id}`}
            onClick={handleExpand}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              expanded ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            data-testid={`button-delete-todo-${todo.id}`}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            title="Delete"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
          {/* Editable text */}
          <input
            ref={textRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSave(); if (e.key === "Escape") handleCancel(); }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="To-do text..."
          />

          {/* Priority buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Priority</span>
            <div className="flex gap-1 flex-wrap">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setEditPriority(p)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                    editPriority === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_STYLES[p].dot)} />{p}
                </button>
              ))}
            </div>
          </div>

          {/* Category + Due date */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Category</span>
              <select
                value={editCategory || "Work"}
                onChange={e => setEditCategory(e.target.value as Todo["category"])}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide w-14">Due date</span>
              <input
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {editDueDate && (
                <button onClick={() => setEditDueDate("")} className="text-muted-foreground hover:text-red-500 transition-colors" title="Clear date">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2 pt-1">
            <button
              data-testid={`button-save-todo-${todo.id}`}
              onClick={handleSave}
              disabled={saving || !hasChanges || !editText.trim()}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                hasChanges && editText.trim() && !saving
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Check size={12} />
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
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

  const allTodos = todos || [];
  const activeTodos = allTodos.filter(t => !t.completed);
  const doneTodos = allTodos.filter(t => t.completed);

  const displayed = useMemo(() => {
    if (filter === "Done") return doneTodos;
    if (filter === "Active") return activeTodos;
    return allTodos;
  }, [todos, filter]);

  const handleAdd = async (text: string, priority: string, category: string, dueDate: string) => {
    try {
      await createTodo.mutateAsync({ data: {
        text,
        priority: priority as Todo["priority"],
        category: category as Todo["category"],
        dueDate: dueDate || undefined,
      }});
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "To-do added" });
    } catch {
      toast({ title: "Couldn't add to-do", variant: "destructive" });
    }
  };

  const handleToggle = async (todo: Todo) => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, data: { completed: !todo.completed } });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      if (!todo.completed) toast({ title: "Done ✓" });
    } catch {
      toast({ title: "Couldn't update to-do", variant: "destructive" });
    }
  };

  const handleUpdate = async (todo: Todo, data: Partial<{ text: string; priority: Todo["priority"]; category: Todo["category"]; dueDate: string }>) => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, data });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Saved" });
    } catch {
      toast({ title: "Couldn't save changes", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Couldn't delete to-do", variant: "destructive" });
    }
  };

  const completionPct = allTodos.length ? Math.round((doneTodos.length / allTodos.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight">To-Do</h1>
            <p className="text-xs text-muted-foreground">{activeTodos.length} remaining · {doneTodos.length} done</p>
          </div>
          {allTodos.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{completionPct}%</span>
            </div>
          )}
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1.5 mt-3">
          {FILTERS.map(f => (
            <button key={f} data-testid={`filter-todos-${f.toLowerCase()}`} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {f}
              <span className={cn("ml-1 text-[10px]", filter === f ? "opacity-70" : "opacity-50")}>
                {f === "All" ? allTodos.length : f === "Active" ? activeTodos.length : doneTodos.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Quick add */}
        <QuickAdd onAdd={handleAdd} />

        {/* Hint */}
        <p className="text-[11px] text-muted-foreground px-1">
          Tap the <Pencil size={10} className="inline mx-0.5" /> icon or any row to edit text, priority, category and due date.
        </p>

        {/* Todo list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-card border border-border rounded-xl skeleton-pulse" />)}
          </div>
        ) : displayed.filter(t => !t.completed).length === 0 && filter !== "Done" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <p className="text-foreground font-semibold text-sm">All clear, Casper</p>
            <p className="text-muted-foreground text-xs mt-1">
              {filter === "Active" ? "No active to-dos. Add one above or ask AIDE." : "Nothing here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Priority groups for active todos */}
            {filter !== "Done" && (() => {
              const active = displayed.filter(t => !t.completed);
              const byPriority: Record<string, Todo[]> = {};
              const order = ["Critical", "High", "Medium", "Low"];
              active.forEach(t => {
                if (!byPriority[t.priority]) byPriority[t.priority] = [];
                byPriority[t.priority].push(t);
              });
              return order.filter(p => byPriority[p]?.length).map(p => (
                <div key={p} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <div className={cn("w-2 h-2 rounded-full", PRIORITY_STYLES[p].dot)} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", PRIORITY_STYLES[p].badge)}>
                      {p} · {byPriority[p].length}
                    </span>
                  </div>
                  {byPriority[p].map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => handleToggle(todo)}
                      onDelete={() => handleDelete(todo.id)}
                      onUpdate={data => handleUpdate(todo, data)}
                    />
                  ))}
                </div>
              ));
            })()}

            {/* Done items */}
            {filter === "Done" && doneTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={() => handleToggle(todo)}
                onDelete={() => handleDelete(todo.id)}
                onUpdate={data => handleUpdate(todo, data)}
              />
            ))}
          </div>
        )}

        {/* Completed toggle section */}
        {filter !== "Done" && doneTodos.length > 0 && (
          <div className="border-t border-border pt-3">
            <button
              data-testid="button-toggle-done"
              onClick={() => setShowDone(!showDone)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium py-1"
            >
              {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {doneTodos.length} completed
            </button>
            {showDone && (
              <div className="space-y-1.5 mt-2">
                {doneTodos.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => handleToggle(todo)}
                    onDelete={() => handleDelete(todo.id)}
                    onUpdate={data => handleUpdate(todo, data)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

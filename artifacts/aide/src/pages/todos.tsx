import { useState, useMemo } from "react";
import { Plus, X, Check, Circle, CheckCircle2, ChevronDown, ChevronUp, Filter } from "lucide-react";
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

const PRIORITY_STYLES: Record<string, { dot: string; badge: string }> = {
  Critical: { dot: "bg-red-500",    badge: "text-red-600 dark:text-red-400" },
  High:     { dot: "bg-orange-400", badge: "text-orange-600 dark:text-orange-400" },
  Medium:   { dot: "bg-blue-400",   badge: "text-blue-600 dark:text-blue-400" },
  Low:      { dot: "bg-slate-400",  badge: "text-slate-500 dark:text-slate-400" },
};

const CAT_STYLES: Record<string, string> = {
  "Work":       "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
  "Personal":   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Follow-up":  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  "Compliance": "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  "Admin":      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700",
};

function QuickAdd({ onAdd }: { onAdd: (text: string, priority: string, category: string) => void }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [category, setCategory] = useState<string>("Work");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), priority, category);
    setText("");
    setExpanded(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
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
        <div className="border-t border-border px-4 py-3 flex flex-wrap gap-3 items-center bg-muted/30">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Priority</span>
            <div className="flex gap-1">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                    priority === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_STYLES[p].dot)} />
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Category</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const ps = PRIORITY_STYLES[todo.priority];
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

  return (
    <div
      data-testid={`todo-item-${todo.id}`}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:shadow-xs transition-all duration-200",
        todo.completed && "opacity-50"
      )}
    >
      <button
        data-testid={`button-toggle-todo-${todo.id}`}
        onClick={onToggle}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
        style={{ borderColor: todo.completed ? "#16a34a" : undefined }}
      >
        {todo.completed ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : (
          <Circle size={18} className="text-muted-foreground/40 hover:text-primary transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm text-foreground leading-snug",
          todo.completed && "line-through text-muted-foreground"
        )}>
          {todo.text}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {todo.category && (
            <span className={cn("px-1.5 py-0 rounded text-[9px] font-semibold border", CAT_STYLES[todo.category] || CAT_STYLES["Work"])}>
              {todo.category}
            </span>
          )}
          <span className={cn("text-[10px] font-semibold flex items-center gap-1", ps.badge)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />
            {todo.priority}
          </span>
          {todo.dueDate && (
            <span className={cn("text-[10px]", isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
              {isOverdue ? "Overdue · " : "Due "}
              {new Date(todo.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
      <button
        data-testid={`button-delete-todo-${todo.id}`}
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1 rounded"
      >
        <X size={14} />
      </button>
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

  const handleAdd = async (text: string, priority: string, category: string) => {
    try {
      await createTodo.mutateAsync({ data: { text, priority: priority as Todo["priority"], category: category as Todo["category"] } });
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
      if (!todo.completed) toast({ title: "Done! ✓" });
    } catch {
      toast({ title: "Couldn't update to-do", variant: "destructive" });
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
            <p className="text-xs text-muted-foreground">
              {activeTodos.length} remaining · {doneTodos.length} done
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allTodos.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{completionPct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mt-3">
          {FILTERS.map(f => (
            <button
              key={f}
              data-testid={`filter-todos-${f.toLowerCase()}`}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
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

        {/* Todo list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 bg-card border border-border rounded-xl skeleton-pulse" />
            ))}
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
          <div className="space-y-2">
            {/* Category grouping for active todos */}
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
                  {byPriority[p].map((todo, i) => (
                    <div key={todo.id} className="card-appear" style={{ animationDelay: `${i * 30}ms` }}>
                      <TodoItem
                        todo={todo}
                        onToggle={() => handleToggle(todo)}
                        onDelete={() => handleDelete(todo.id)}
                      />
                    </div>
                  ))}
                </div>
              ));
            })()}

            {/* Done items */}
            {filter === "Done" && doneTodos.map((todo, i) => (
              <div key={todo.id} className="card-appear" style={{ animationDelay: `${i * 30}ms` }}>
                <TodoItem
                  todo={todo}
                  onToggle={() => handleToggle(todo)}
                  onDelete={() => handleDelete(todo.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Completed section (in All/Active view) */}
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

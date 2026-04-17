import { useState, useMemo } from "react";
import {
  Plus, X, LayoutGrid, List, ChevronDown, ChevronRight,
  Calendar, MoreHorizontal, Pencil, Trash2, GripVertical,
  FolderKanban, Search, Flag, Users, Clock
} from "lucide-react";
import {
  useListProjects, useCreateProject, useUpdateProject, useDeleteProject,
  useListProjectTasks, useCreateProjectTask, useUpdateProjectTask, useDeleteProjectTask,
  getListProjectsQueryKey, getListProjectTasksQueryKey,
} from "@workspace/api-client-react";
import type { Project, ProjectTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { ProjectMilestonesBar } from "@/components/projects/ProjectMilestonesBar";
import { ProjectMembersRow } from "@/components/projects/ProjectMembersRow";
import { ProjectActivityPanel } from "@/components/projects/ProjectActivityPanel";
import { QuoteQueuePanel } from "@/components/QuoteQueuePanel";

const PROJECT_STATUSES = ["Active", "On Hold", "Completed", "Archived"] as const;
const TASK_STATUSES = ["To Do", "In Progress", "Review", "Done"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

const PRIORITY_STYLES: Record<string, { dot: string; text: string }> = {
  Critical: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  High: { dot: "bg-orange-400", text: "text-orange-600 dark:text-orange-400" },
  Medium: { dot: "bg-blue-400", text: "text-blue-600 dark:text-blue-400" },
  Low: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" },
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  "On Hold": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  Completed: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  Archived: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700",
};

const TASK_STATUS_STYLES: Record<string, { bg: string; text: string; column: string }> = {
  "To Do": {
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
    column: "border-t-slate-400",
  },
  "In Progress": {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    column: "border-t-blue-500",
  },
  Review: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    column: "border-t-amber-500",
  },
  Done: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    column: "border-t-emerald-500",
  },
};

const COLOUR_PRESETS = [
  "#7C3AED", "#2563EB", "#0891B2", "#059669",
  "#D97706", "#DC2626", "#DB2777", "#6366F1",
];

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide", style.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      {priority}
    </span>
  );
}

function StatusBadge({ status, statuses, onChange }: { status: string; statuses: readonly string[]; onChange?: (s: string) => void }) {
  const style = STATUS_STYLES[status] || TASK_STATUS_STYLES[status];
  const bgClass = typeof style === "string" ? style : `${style?.bg} ${style?.text}`;
  if (!onChange) {
    return <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", bgClass)}>{status}</span>;
  }
  return (
    <select
      value={status}
      onChange={e => onChange(e.target.value)}
      className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer appearance-none bg-transparent", bgClass)}
    >
      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function ProjectFormModal({
  project,
  onClose,
  onSave,
}: {
  project?: Project | null;
  onClose: () => void;
  onSave: (data: { name: string; description: string; status: string; priority: string; colour: string; dueDate: string }) => void;
}) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [status, setStatus] = useState(project?.status || "Active");
  const [priority, setPriority] = useState(project?.priority || "Medium");
  const [colour, setColour] = useState(project?.colour || "#7C3AED");
  const [dueDate, setDueDate] = useState(project?.dueDate || "");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{project ? "Edit Project" : "New Project"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Project Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Q2 Fire Safety Audits"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Colour</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {COLOUR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColour(c)}
                    className={cn("w-6 h-6 rounded-full transition-all", colour === c ? "ring-2 ring-offset-2 ring-primary ring-offset-background scale-110" : "hover:scale-110")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button
            onClick={() => { if (name.trim()) onSave({ name: name.trim(), description: description.trim(), status, priority, colour, dueDate }); }}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {project ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  task: ProjectTask;
  onUpdate: (data: Partial<ProjectTask>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          title="Move up"
          className="text-[10px] leading-none text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          ^
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          title="Move down"
          className="text-[10px] leading-none text-muted-foreground hover:text-foreground disabled:opacity-20"
        >
          v
        </button>
      </div>
      <GripVertical size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== task.title) onUpdate({ title: title.trim() }); setEditing(false); }}
            onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") { setTitle(task.title); setEditing(false); } }}
            className="w-full bg-transparent text-sm text-foreground focus:outline-none"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="text-sm text-foreground hover:text-primary transition-colors text-left truncate w-full">
            {task.title}
          </button>
        )}
      </div>

      <PriorityBadge priority={task.priority} />

      <select
        value={task.status}
        onChange={e => onUpdate({ status: e.target.value as ProjectTask["status"] })}
        className={cn(
          "px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer appearance-none",
          TASK_STATUS_STYLES[task.status]?.bg, TASK_STATUS_STYLES[task.status]?.text, "border-transparent"
        )}
      >
        {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {task.assignee && (
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium hidden sm:inline">{task.assignee}</span>
      )}

      {task.dueDate && (
        <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-0.5">
          <Calendar size={10} />
          {task.dueDate}
        </span>
      )}

      <div className="relative">
        <button onClick={() => setShowMenu(!showMenu)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded transition-all">
          <MoreHorizontal size={14} />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
              <button onClick={() => { setEditing(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors">
                <Pencil size={12} /> Edit
              </button>
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ task, onUpdate, onDelete }: { task: ProjectTask; onUpdate: (d: Partial<ProjectTask>) => void; onDelete: () => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group cursor-default">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-foreground leading-snug flex-1 pr-2">{task.title}</p>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-0.5">
          <X size={12} />
        </button>
      </div>
      {task.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.assignee && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
            <Users size={9} />{task.assignee}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock size={9} />{task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskAddRow({ projectId, onAdd }: { projectId: string; onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  if (!adding) {
    return (
      <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors w-full">
        <Plus size={12} /> Add task
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && title.trim()) { onAdd(title.trim()); setTitle(""); }
          if (e.key === "Escape") { setAdding(false); setTitle(""); }
        }}
        placeholder="Task title..."
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <button
        onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(""); } }}
        disabled={!title.trim()}
        className="px-2 py-1 rounded text-[10px] font-bold bg-primary text-primary-foreground disabled:opacity-40"
      >
        Add
      </button>
      <button onClick={() => { setAdding(false); setTitle(""); }} className="text-muted-foreground hover:text-foreground">
        <X size={14} />
      </button>
    </div>
  );
}

function ProjectCard({
  project,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  viewMode,
}: {
  project: Project;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewMode: "list" | "board";
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: tasks = [] } = useListProjectTasks(project.id);
  const createTask = useCreateProjectTask();
  const updateTask = useUpdateProjectTask();
  const deleteTask = useDeleteProjectTask();
  const details = useProjectDetails(expanded ? project.id : null);

  const invalidateTasks = () => qc.invalidateQueries({ queryKey: getListProjectTasksQueryKey(project.id) });

  const handleAddTask = (title: string) => {
    createTask.mutate(
      { projectId: project.id, data: { title } },
      {
        onSuccess: () => invalidateTasks(),
        onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
      }
    );
  };

  const handleUpdateTask = (taskId: string, data: Partial<ProjectTask>) => {
    updateTask.mutate(
      { projectId: project.id, taskId, data: data as any },
      {
        onSuccess: () => invalidateTasks(),
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
      }
    );
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask.mutate(
      { projectId: project.id, taskId },
      {
        onSuccess: () => invalidateTasks(),
        onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
      }
    );
  };

  const handleSwapTaskPositions = async (idxA: number, idxB: number) => {
    const a = tasks[idxA];
    const b = tasks[idxB];
    if (!a || !b) return;
    const aPos = a.position ?? idxA;
    const bPos = b.position ?? idxB;
    await Promise.all([
      new Promise<void>((resolve) => updateTask.mutate(
        { projectId: project.id, taskId: a.id, data: { position: bPos } as any },
        { onSuccess: () => resolve(), onError: () => resolve() },
      )),
      new Promise<void>((resolve) => updateTask.mutate(
        { projectId: project.id, taskId: b.id, data: { position: aPos } as any },
        { onSuccess: () => resolve(), onError: () => resolve() },
      )),
    ]);
    invalidateTasks();
  };

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, ProjectTask[]> = {};
    TASK_STATUSES.forEach(s => { grouped[s] = []; });
    tasks.forEach(t => {
      if (!grouped[t.status]) grouped[t.status] = [];
      grouped[t.status].push(t);
    });
    return grouped;
  }, [tasks]);

  const doneCount = tasksByStatus.Done?.length || 0;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour || "#7C3AED" }} />
        <button className="text-muted-foreground flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{project.name}</h3>
            <StatusBadge status={project.status} statuses={PROJECT_STATUSES} />
          </div>
          {project.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>}
        </div>

        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <PriorityBadge priority={project.priority} />
          {project.dueDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar size={10} />{project.dueDate}</span>
          )}
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{doneCount}/{totalCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          <div className="px-4 py-3 space-y-3 bg-muted/20">
            <ProjectMilestonesBar
              milestones={details.milestones}
              onAdd={details.addMilestone}
              onToggle={details.toggleMilestone}
              onDelete={details.deleteMilestone}
            />
            <ProjectMembersRow
              members={details.members}
              onAdd={details.addMember}
              onRemove={details.removeMember}
            />
            <ProjectActivityPanel activity={details.activity} loading={details.loading} />
          </div>
          {viewMode === "board" ? (
            <div className="grid grid-cols-4 gap-0 min-h-[200px]">
              {TASK_STATUSES.map(status => {
                const style = TASK_STATUS_STYLES[status];
                return (
                  <div key={status} className={cn("border-t-2 p-2", style.column, status !== "To Do" && "border-l border-border")}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", style.text)}>{status}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{tasksByStatus[status]?.length || 0}</span>
                    </div>
                    <div className="space-y-2">
                      {tasksByStatus[status]?.map(task => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          onUpdate={d => handleUpdateTask(task.id, d)}
                          onDelete={() => handleDeleteTask(task.id)}
                        />
                      ))}
                    </div>
                    {status === "To Do" && <TaskAddRow projectId={project.id} onAdd={handleAddTask} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground px-4 py-3">No tasks yet</p>
              ) : (
                tasks.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onUpdate={d => handleUpdateTask(task.id, d)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onMoveUp={() => handleSwapTaskPositions(idx, idx - 1)}
                    onMoveDown={() => handleSwapTaskPositions(idx, idx + 1)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < tasks.length - 1}
                  />
                ))
              )}
              <TaskAddRow projectId={project.id} onAdd={handleAddTask} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useListProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const invalidateProjects = () => qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, search]);

  const handleSave = (data: { name: string; description: string; status: string; priority: string; colour: string; dueDate: string }) => {
    if (editingProject) {
      updateProject.mutate(
        { id: editingProject.id, data: data as any },
        {
          onSuccess: () => { invalidateProjects(); setShowModal(false); setEditingProject(null); toast({ title: "Project updated" }); },
          onError: () => toast({ title: "Failed to update project", variant: "destructive" }),
        }
      );
    } else {
      createProject.mutate(
        { data: data as any },
        {
          onSuccess: (newProject) => { invalidateProjects(); setShowModal(false); setExpandedIds(prev => new Set(prev).add(newProject.id)); toast({ title: "Project created" }); },
          onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate(
      { id },
      {
        onSuccess: () => { invalidateProjects(); toast({ title: "Project deleted" }); },
        onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
      }
    );
  };

  return (
      <div className="flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] text-primary/60">//</span>
          <div>
            <h1 className="text-sm font-medium text-foreground tracking-tight">Projects</h1>
            <p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingProject(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
          {["All", ...PROJECT_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all",
                statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
          <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <List size={14} />
          </button>
          <button onClick={() => setViewMode("board")} className={cn("p-1.5 rounded-md transition-all", viewMode === "board" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      <QuoteQueuePanel maxItems={6} className="mb-4" />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            {projects.length === 0 ? "No projects yet" : "No projects match your filters"}
          </p>
          {projects.length === 0 && (
            <button
              onClick={() => { setEditingProject(null); setShowModal(true); }}
              className="mt-3 text-xs text-primary font-bold hover:underline"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              expanded={expandedIds.has(project.id)}
              onToggle={() => toggleExpand(project.id)}
              onEdit={() => { setEditingProject(project); setShowModal(true); }}
              onDelete={() => handleDelete(project.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {(showModal || editingProject) && (
        <ProjectFormModal
          project={editingProject}
          onClose={() => { setShowModal(false); setEditingProject(null); }}
          onSave={handleSave}
        />
      )}

      </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, X, ChevronDown, ChevronRight, MoreHorizontal, Trash2, GripVertical, Settings2,
  Table2, Columns3, BarChart3, Calendar, Clock, Search, ArrowUpDown, Eye, EyeOff,
  CheckCircle2, Circle, Star, AlertTriangle, User, Tag, Link2, FileText, Pencil
} from "lucide-react";
import { apiFetch, exportToCSV } from "@/lib/api";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ViewType = "table" | "kanban" | "gantt" | "timeline";
type ColumnType = "text" | "number" | "status" | "date" | "person" | "dropdown" | "tags" | "priority" | "timeline" | "dependency" | "progress" | "link" | "checkbox" | "rating";

interface Board { id: string; name: string; description: string | null; template: string; color: string; groups: Group[]; columns: Column[]; items: Item[]; views: any[]; }
interface Group { id: string; boardId: string; name: string; color: string; collapsed: boolean; sortOrder: number; }
interface Column { id: string; boardId: string; name: string; type: ColumnType; width: number; options: any; hidden: boolean; sortOrder: number; }
interface Item { id: string; boardId: string; groupId: string | null; parentId: string | null; name: string; values: Record<string, any>; sortOrder: number; }

const PRIORITY_COLORS: Record<string, string> = { Critical: "#EF4444", High: "#F97316", Medium: "#3B82F6", Low: "#94A3B8" };
const PERSON_LIST = ["Casper", "Darren", "Gordon", "Haider", "John", "Nu"];
const VIEW_ICONS: Record<ViewType, any> = { table: Table2, kanban: Columns3, gantt: BarChart3, timeline: Calendar };

function StatusCell({ value, options, onChange }: { value: string; options: any[]; onChange: (v: string) => void }) {
  const opt = (options || []).find((o: any) => o.label === value);
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      className="text-xs font-semibold px-2 py-1 rounded-md border-0 focus:outline-none cursor-pointer"
      style={{ backgroundColor: opt?.color ? `${opt.color}20` : undefined, color: opt?.color || undefined }}>
      <option value="">-</option>
      {(options || []).map((o: any) => <option key={o.label} value={o.label}>{o.label}</option>)}
    </select>
  );
}

function PriorityCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} className="text-xs font-semibold px-2 py-1 rounded-md border-0 focus:outline-none cursor-pointer"
      style={{ color: PRIORITY_COLORS[value] || "#94A3B8" }}>
      <option value="">-</option>
      {Object.keys(PRIORITY_COLORS).map(p => <option key={p}>{p}</option>)}
    </select>
  );
}

function PersonCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} className="text-xs px-2 py-1 rounded-md border-0 focus:outline-none cursor-pointer bg-transparent">
      <option value="">-</option>
      {PERSON_LIST.map(p => <option key={p}>{p}</option>)}
    </select>
  );
}

function ProgressCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${value || 0}%` }} />
      </div>
      <input type="number" min={0} max={100} value={value || 0} onChange={e => onChange(Number(e.target.value))}
        className="w-10 text-[10px] text-center bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none" />
    </div>
  );
}

function CellRenderer({ column, value, onChange }: { column: Column; value: any; onChange: (v: any) => void }) {
  switch (column.type) {
    case "status": return <StatusCell value={value} options={column.options || []} onChange={onChange} />;
    case "priority": return <PriorityCell value={value} onChange={onChange} />;
    case "person": return <PersonCell value={value} onChange={onChange} />;
    case "progress": return <ProgressCell value={value} onChange={onChange} />;
    case "date": return <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} className="text-xs bg-transparent border-0 focus:outline-none cursor-pointer" />;
    case "number": return <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} className="text-xs bg-transparent border-0 focus:outline-none w-20 text-right font-mono" />;
    case "checkbox": return <button onClick={() => onChange(!value)} className="flex items-center justify-center">{value ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-muted-foreground/30" />}</button>;
    case "rating": return (
      <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <button key={n} onClick={() => onChange(n)} className={n <= (value || 0) ? "text-amber-400" : "text-muted-foreground/20"}><Star size={12} fill={n <= (value || 0) ? "currentColor" : "none"} /></button>)}</div>
    );
    case "dropdown": return (
      <select value={value || ""} onChange={e => onChange(e.target.value)} className="text-xs bg-transparent border-0 focus:outline-none cursor-pointer">
        <option value="">-</option>
        {(column.options || []).map((o: any) => <option key={o.label}>{o.label}</option>)}
      </select>
    );
    default: return <input value={value || ""} onChange={e => onChange(e.target.value)} className="text-xs bg-transparent border-0 focus:outline-none w-full" placeholder="-" />;
  }
}

// ─── Table View ──────────────────────────────────────────────────────────────
function TableView({ board, onUpdateItem, onAddItem, onDeleteItem }: {
  board: Board; onUpdateItem: (id: string, values: Record<string, any>) => void;
  onAddItem: (groupId: string | null, name: string) => void; onDeleteItem: (id: string) => void;
}) {
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const visibleColumns = board.columns.filter(c => !c.hidden);

  return (
    <div className="overflow-x-auto">
      {board.groups.map(group => {
        const groupItems = board.items.filter(i => i.groupId === group.id && !i.parentId);
        return (
          <div key={group.id} className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl" style={{ backgroundColor: `${group.color}15`, borderLeft: `3px solid ${group.color}` }}>
              <span className="text-xs font-bold text-foreground">{group.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{groupItems.length}</span>
            </div>
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th className="min-w-[200px]">Item</th>
                  {visibleColumns.map(col => <th key={col.id} style={{ width: col.width }}>{col.name}</th>)}
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {groupItems.map(item => (
                  <tr key={item.id} className="group">
                    <td><GripVertical size={12} className="text-muted-foreground/20 cursor-grab" /></td>
                    <td>
                      <input value={item.name} onChange={e => onUpdateItem(item.id, { __name: e.target.value })}
                        className="text-[13px] font-medium bg-transparent border-0 focus:outline-none w-full text-foreground" />
                    </td>
                    {visibleColumns.map(col => (
                      <td key={col.id}>
                        <CellRenderer column={col} value={item.values[col.id]} onChange={v => onUpdateItem(item.id, { [col.id]: v })} />
                      </td>
                    ))}
                    <td>
                      <button onClick={() => onDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all"><X size={12} /></button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td></td>
                  <td colSpan={visibleColumns.length + 2}>
                    <div className="flex items-center gap-2">
                      <input value={newItemTexts[group.id] || ""} onChange={e => setNewItemTexts(prev => ({ ...prev, [group.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && newItemTexts[group.id]?.trim()) { onAddItem(group.id, newItemTexts[group.id].trim()); setNewItemTexts(prev => ({ ...prev, [group.id]: "" })); } }}
                        placeholder="+ Add item..." className="text-xs bg-transparent border-0 focus:outline-none text-muted-foreground w-full py-1" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban View ─────────────────────────────────────────────────────────────
function KanbanView({ board, onUpdateItem, onAddItem, onDeleteItem }: {
  board: Board; onUpdateItem: (id: string, values: Record<string, any>) => void;
  onAddItem: (groupId: string | null, name: string) => void; onDeleteItem: (id: string) => void;
}) {
  const statusCol = board.columns.find(c => c.type === "status");
  const statuses = statusCol?.options || [{ label: "To Do", color: "#94A3B8" }, { label: "In Progress", color: "#F59E0B" }, { label: "Done", color: "#10B981" }];

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
      {statuses.map((status: any) => {
        const statusItems = board.items.filter(i => (i.values as any)[statusCol?.id || ""] === status.label);
        return (
          <div key={status.label} className="min-w-[260px] max-w-[280px] flex-shrink-0 bg-card border border-border rounded-2xl flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-xs font-semibold text-foreground">{status.label}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto">{statusItems.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {statusItems.map(item => (
                <div key={item.id} className="bg-background border border-border rounded-xl p-3 group hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-medium text-foreground flex-1">{item.name}</p>
                    <button onClick={() => onDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500"><X size={10} /></button>
                  </div>
                  {board.columns.filter(c => c.type === "person" && (item.values as any)[c.id]).map(c => (
                    <div key={c.id} className="flex items-center gap-1 mt-1.5">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-bold text-primary">{String((item.values as any)[c.id] || "").charAt(0)}</div>
                      <span className="text-[10px] text-muted-foreground">{(item.values as any)[c.id]}</span>
                    </div>
                  ))}
                  {board.columns.filter(c => c.type === "priority" && (item.values as any)[c.id]).map(c => (
                    <span key={c.id} className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ color: PRIORITY_COLORS[(item.values as any)[c.id]] || "#94A3B8", backgroundColor: `${PRIORITY_COLORS[(item.values as any)[c.id]] || "#94A3B8"}15` }}>
                      {(item.values as any)[c.id]}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Gantt View ──────────────────────────────────────────────────────────────
function GanttView({ board }: { board: Board }) {
  const dateCol = board.columns.find(c => c.type === "date");
  if (!dateCol) return <p className="text-sm text-muted-foreground p-4">Add a Date column to use Gantt view</p>;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }

  const itemsWithDates = board.items.filter(i => (i.values as any)[dateCol.id]).map(i => ({
    ...i, date: (i.values as any)[dateCol.id] as string,
  }));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="flex border-b border-border">
          <div className="w-[200px] shrink-0 px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase">Item</div>
          <div className="flex-1 flex">
            {days.map(d => {
              const date = new Date(d);
              const isToday = d === today.toISOString().split("T")[0];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={d} className={cn("flex-1 min-w-[28px] text-center py-1 text-[8px] border-l border-border", isToday && "bg-primary/8 font-bold text-primary", isWeekend && "bg-muted/30")}>
                  {date.getDate()}/{date.getMonth() + 1}
                </div>
              );
            })}
          </div>
        </div>
        {/* Rows */}
        {itemsWithDates.map(item => {
          const dayIdx = days.indexOf(item.date);
          const personCol = board.columns.find(c => c.type === "person");
          const person = personCol ? (item.values as any)[personCol.id] : null;
          return (
            <div key={item.id} className="flex border-b border-border hover:bg-muted/20">
              <div className="w-[200px] shrink-0 px-3 py-2 text-xs text-foreground truncate">{item.name}</div>
              <div className="flex-1 flex relative items-center">
                {dayIdx >= 0 && (
                  <div className="absolute h-5 rounded-md text-[9px] font-semibold flex items-center px-2 text-white truncate"
                    style={{ left: `${(dayIdx / days.length) * 100}%`, width: `${(3 / days.length) * 100}%`, minWidth: 60, backgroundColor: board.color || "#3B82F6" }}>
                    {person ? person.split(" ")[0] : item.name.slice(0, 15)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main PM Board Page ──────────────────────────────────────────────────────
export default function PmBoardPage({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [view, setView] = useState<ViewType>("table");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchBoard = async () => {
    try {
      const data = await apiFetch(`/pm/boards/${boardId}`);
      setBoard(data);
      if (data.defaultView) setView(data.defaultView);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  const handleUpdateItem = async (itemId: string, values: Record<string, any>) => {
    if (!board) return;
    const nameUpdate = values.__name;
    const fieldUpdates = { ...values };
    delete fieldUpdates.__name;
    try {
      const body: any = {};
      if (nameUpdate !== undefined) body.name = nameUpdate;
      if (Object.keys(fieldUpdates).length > 0) body.values = fieldUpdates;
      await apiFetch(`/pm/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) });
      // Optimistic update
      setBoard(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, name: nameUpdate ?? i.name, values: { ...i.values, ...fieldUpdates } } : i) } : prev);
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
  };

  const handleAddItem = async (groupId: string | null, name: string) => {
    if (!board) return;
    try {
      const item = await apiFetch(`/pm/boards/${boardId}/items`, { method: "POST", body: JSON.stringify({ name, groupId }) });
      setBoard(prev => prev ? { ...prev, items: [...prev.items, item] } : prev);
    } catch { toast({ title: "Failed to add item", variant: "destructive" }); }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiFetch(`/pm/items/${id}`, { method: "DELETE" });
      setBoard(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== id) } : prev);
    } catch {}
  };

  const handleAddColumn = async (name: string, type: ColumnType) => {
    if (!board) return;
    try {
      const col = await apiFetch(`/pm/boards/${boardId}/columns`, { method: "POST", body: JSON.stringify({ name, type }) });
      setBoard(prev => prev ? { ...prev, columns: [...prev.columns, col] } : prev);
    } catch {}
  };

  const handleAddGroup = async () => {
    if (!board) return;
    try {
      const group = await apiFetch(`/pm/boards/${boardId}/groups`, { method: "POST", body: JSON.stringify({ name: "New Group" }) });
      setBoard(prev => prev ? { ...prev, groups: [...prev.groups, group] } : prev);
    } catch {}
  };

  const filteredBoard = useMemo(() => {
    if (!board || !searchTerm) return board;
    return { ...board, items: board.items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) };
  }, [board, searchTerm]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!board || !filteredBoard) return <p className="text-muted-foreground p-8">Board not found</p>;

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground tracking-tight">{board.name}</h2>
          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {(["table", "kanban", "gantt"] as ViewType[]).map(v => {
              const Icon = VIEW_ICONS[v];
              return (
                <button key={v} onClick={() => setView(v)} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  <Icon size={12} />{v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..."
              className="pl-8 pr-3 py-1.5 bg-muted/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-40" />
          </div>
          <button onClick={handleAddGroup} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
            <Plus size={11} /> Group
          </button>
          <button onClick={() => handleAddColumn("New Column", "text")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
            <Plus size={11} /> Column
          </button>
          <button onClick={() => exportToCSV(board.items.map(i => ({ Name: i.name, ...Object.fromEntries(board.columns.map(c => [c.name, (i.values as any)[c.id] || ""])) })), `${board.name}-export`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {view === "table" && <TableView board={filteredBoard} onUpdateItem={handleUpdateItem} onAddItem={handleAddItem} onDeleteItem={handleDeleteItem} />}
        {view === "kanban" && <KanbanView board={filteredBoard} onUpdateItem={handleUpdateItem} onAddItem={handleAddItem} onDeleteItem={handleDeleteItem} />}
        {view === "gantt" && <GanttView board={filteredBoard} />}
      </div>
    </div>
  );
}

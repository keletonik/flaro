import { useState, useEffect } from "react";
import { Plus, FolderKanban, Trash2, Archive, ChevronRight, LayoutGrid, Table2, BarChart3, Calendar, Columns3, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PmBoardPage from "@/pages/pm-board";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Board { id: string; name: string; description: string | null; template: string; color: string; icon: string; defaultView: string; createdAt: string; }
interface Template { key: string; name: string; groups: number; columns: number; columnTypes: string[]; }

const TEMPLATE_ICONS: Record<string, string> = {
  "project-tracker": "rocket", "sprint-planning": "zap", "task-management": "check-square",
  "compliance-tracker": "shield", "maintenance-schedule": "wrench", "resource-planning": "users",
  "client-onboarding": "user-plus", "blank": "file",
};

const TEMPLATE_COLORS: Record<string, string> = {
  "project-tracker": "#3B82F6", "sprint-planning": "#8B5CF6", "task-management": "#10B981",
  "compliance-tracker": "#EF4444", "maintenance-schedule": "#F59E0B", "resource-planning": "#06B6D4",
  "client-onboarding": "#EC4899", "blank": "#6B7280",
};

export default function PM() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardTemplate, setNewBoardTemplate] = useState("blank");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBoards = async () => {
    try {
      const [b, t] = await Promise.all([apiFetch("/pm/boards"), apiFetch("/pm/templates")]);
      setBoards(b);
      setTemplates(t);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchBoards(); }, []);

  const createBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      const board = await apiFetch("/pm/boards", { method: "POST", body: JSON.stringify({ name: newBoardName.trim(), template: newBoardTemplate, color: TEMPLATE_COLORS[newBoardTemplate] || "#3B82F6" }) });
      toast({ title: `Board "${board.name}" created` });
      setNewBoardName(""); setShowNewBoard(false);
      fetchBoards();
      setSelectedBoardId(board.id);
    } catch { toast({ title: "Failed to create board", variant: "destructive" }); }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm("Delete this board and all its items?")) return;
    try {
      await apiFetch(`/pm/boards/${id}`, { method: "DELETE" });
      if (selectedBoardId === id) setSelectedBoardId(null);
      fetchBoards();
    } catch (e: any) { console.error(e); }
  };

  // If a board is selected, show it full-screen
  if (selectedBoardId) {
    return (
      <div className="h-full flex">
        <div className="flex-1 min-w-0 min-h-screen bg-background flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
            <button onClick={() => setSelectedBoardId(null)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <FolderKanban size={13} /> All Boards
            </button>
            <ChevronRight size={12} className="text-muted-foreground/30" />
            <span className="text-xs font-semibold text-foreground">{boards.find(b => b.id === selectedBoardId)?.name}</span>
          </div>
          <div className="flex-1">
            <PmBoardPage boardId={selectedBoardId} />
          </div>
        </div>
        <AnalyticsPanel section="tasks" title="Project Analyst" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 min-h-screen bg-background">
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
              <FolderKanban size={18} className="text-primary" /> Project Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Boards, tasks, timelines, and Kanban views</p>
          </div>
          <button onClick={() => setShowNewBoard(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-all">
            <Plus size={13} /> New Board
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-[1200px] space-y-6">
        {/* New Board Modal */}
        {showNewBoard && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Create New Board</h3>
              <button onClick={() => setShowNewBoard(false)} className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <input value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => e.key === "Enter" && createBoard()}
              placeholder="Board name..." autoFocus className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Choose a template</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {templates.map(t => (
                  <button key={t.key} onClick={() => setNewBoardTemplate(t.key)}
                    className={cn("text-left px-3 py-2.5 rounded-xl border transition-all",
                      newBoardTemplate === t.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}>
                    <div className="w-6 h-6 rounded-lg mb-1.5 flex items-center justify-center" style={{ backgroundColor: `${TEMPLATE_COLORS[t.key]}15` }}>
                      <FolderKanban size={13} style={{ color: TEMPLATE_COLORS[t.key] }} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.groups} groups · {t.columns} fields</p>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={createBoard} disabled={!newBoardName.trim()} className={cn("px-4 py-2 rounded-xl text-xs font-semibold transition-all",
              newBoardName.trim() ? "bg-primary text-white hover:opacity-90" : "bg-muted text-muted-foreground")}>
              Create Board
            </button>
          </div>
        )}

        {/* Board List */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-2xl skeleton-pulse" />)}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban size={32} className="text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No boards yet</p>
            <p className="text-xs text-muted-foreground">Create your first board to start managing projects</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boards.map(board => (
              <div key={board.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-all group cursor-pointer"
                onClick={() => setSelectedBoardId(board.id)}>
                <div className="h-1.5" style={{ backgroundColor: board.color }} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{board.name}</p>
                      {board.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{board.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">{board.template}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(board.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteBoard(board.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>
      <AnalyticsPanel section="tasks" title="Project Analyst" />
    </div>
  );
}

/**
 * Global AIDE panel — the single AI surface for the entire app.
 *
 * Mounted once in <Layout> (App.tsx). Supports three dock modes:
 *   - right: fixed right-side panel, content gets margin-right
 *   - left:  fixed left-side panel, content gets extra margin-left
 *   - bottom: fixed bottom panel, content gets padding-bottom
 *
 * When collapsed: renders a thin tab at the bottom edge (not a bubble).
 * When expanded: pushes page content via AIDEContext (consumed by Layout).
 *
 * Persists dock mode and open/collapsed state to localStorage.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  MessageCircle, X, Maximize2, Minimize2,
  PanelRight, PanelLeft, PanelBottom,
  ChevronUp, GripVertical,
} from "lucide-react";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";
import { cn } from "@/lib/utils";
import { useAIDE, useSidebar } from "@/App";

export type DockMode = "right" | "left" | "bottom";

const DOCK_KEY = "aide-dock-mode";
const OPEN_KEY = "aide-assistant-open";
const WIDE_KEY = "aide-assistant-wide";

function persistDock(mode: DockMode) {
  try { localStorage.setItem(DOCK_KEY, mode); } catch { /* noop */ }
}
function loadDock(): DockMode {
  try { return (localStorage.getItem(DOCK_KEY) as DockMode) || "right"; } catch { return "right"; }
}

function sectionFromPath(path: string): { section: string; title: string; suggestions: string[] } {
  if (path === "/" || path.startsWith("/dashboard"))
    return { section: "dashboard", title: "Dashboard", suggestions: ["Give me a full KPI snapshot", "What are the three most urgent things today?", "Revenue this month vs target", "Show overdue jobs"] };
  if (path.startsWith("/operations"))
    return { section: "wip", title: "Operations", suggestions: ["Show open WIPs over $5000", "Which tech has the most jobs?", "Defects needing quotes", "Revenue gap analysis"] };
  if (path.startsWith("/suppliers"))
    return { section: "estimation", title: "Suppliers", suggestions: ["Find the cheapest smoke detector", "Compare panel prices", "Create a new estimate", "Total spend by supplier"] };
  if (path.startsWith("/jobs"))
    return { section: "wip", title: "Jobs / WIP", suggestions: ["Show overdue jobs", "Assign open critical jobs", "Create a new job", "WIP value by tech"] };
  if (path.startsWith("/todos"))
    return { section: "tasks", title: "Tasks", suggestions: ["What's overdue?", "Prioritise for today", "Add a follow-up todo", "Completion rate this week"] };
  if (path.startsWith("/fip"))
    return { section: "fip", title: "FIP Library", suggestions: ["Show Pertronic F220 manuals", "Find AS 1670.1 revisions", "Ampac current models", "Add fault signature"] };
  if (path.startsWith("/schedule"))
    return { section: "wip", title: "Schedule", suggestions: ["What's booked tomorrow?", "Suggest optimal schedule", "Any scheduling conflicts?", "Show Gordon's next jobs"] };
  if (path.startsWith("/analytics") || path.startsWith("/metrics"))
    return { section: "dashboard", title: "Analytics", suggestions: ["Revenue vs target MTD", "Quote conversion rate", "Margin by client top 10", "WIP pipeline gaps"] };
  if (path.startsWith("/purchase-orders"))
    return { section: "purchase-orders", title: "Purchase Orders", suggestions: ["Which POs are approved but not actioned?", "Total unapproved PO value?", "Match POs to defects", "POs with incomplete checklists"] };
  if (path.startsWith("/notes"))
    return { section: "tasks", title: "Notes", suggestions: ["Summarise open notes", "What needs follow-up?", "Key insights this week", "Create a note"] };
  if (path.startsWith("/projects"))
    return { section: "tasks", title: "Projects", suggestions: ["Project status summary", "What's blocked?", "Overdue milestones", "Resource allocation"] };
  return { section: "dashboard", title: "AIDE", suggestions: ["What needs attention today?", "Full KPI snapshot", "Create a todo", "Show me the dashboard"] };
}

// ── Panel widths / heights ──────────────────────────────────────────
const SIDE_W = 400;
const SIDE_W_WIDE = 560;
const BOTTOM_H = 360;
const BOTTOM_H_WIDE = 480;

export default function AIDEAssistant() {
  const [location] = useLocation();
  const { setAideState } = useAIDE();
  const { collapsed } = useSidebar();
  const sidebarW = collapsed ? 60 : 210;

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [dock, setDock] = useState<DockMode>(loadDock);
  const [wide, setWide] = useState<boolean>(() => {
    try { return localStorage.getItem(WIDE_KEY) === "1"; } catch { return false; }
  });

  // Persist
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {} }, [open]);
  useEffect(() => { try { localStorage.setItem(WIDE_KEY, wide ? "1" : "0"); } catch {} }, [wide]);

  // Publish state to context so Layout can adjust content margins
  useEffect(() => {
    if (!open) { setAideState({ open: false, dock, width: 0, height: 0 }); return; }
    if (dock === "bottom") {
      setAideState({ open: true, dock, width: 0, height: wide ? BOTTOM_H_WIDE : BOTTOM_H });
    } else {
      setAideState({ open: true, dock, width: wide ? SIDE_W_WIDE : SIDE_W, height: 0 });
    }
  }, [open, dock, wide, setAideState]);

  // Listen for aide-open-with-prompt (from CommandPalette)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("aide-open-with-prompt", handler);
    return () => window.removeEventListener("aide-open-with-prompt", handler);
  }, []);

  // Listen for aide-analyse (from CSV import)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("aide-analyse", handler);
    return () => window.removeEventListener("aide-analyse", handler);
  }, []);

  const changeDock = useCallback((mode: DockMode) => {
    setDock(mode);
    persistDock(mode);
  }, []);

  const { section, title, suggestions } = useMemo(() => sectionFromPath(location), [location]);

  // ── Collapsed: thin bottom tab ──────────────────────────────────
  if (!open) {
    return (
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 flex items-center">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-t-xl bg-card border border-b-0 border-border shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 text-foreground"
          title="Open AIDE"
        >
          <MessageCircle size={14} className="text-primary" />
          <span className="text-xs font-semibold">AIDE</span>
          <span className="text-[10px] text-muted-foreground">— {title}</span>
          <ChevronUp size={12} className="text-muted-foreground ml-1" />
        </button>
      </div>
    );
  }

  // ── Dock picker (shared across all modes) ───────────────────────
  const dockPicker = (
    <div className="flex items-center gap-0.5">
      <button onClick={() => changeDock("left")} title="Dock left"
        className={cn("p-1.5 rounded transition-colors", dock === "left" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
        <PanelLeft size={13} />
      </button>
      <button onClick={() => changeDock("bottom")} title="Dock bottom"
        className={cn("p-1.5 rounded transition-colors", dock === "bottom" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
        <PanelBottom size={13} />
      </button>
      <button onClick={() => changeDock("right")} title="Dock right"
        className={cn("p-1.5 rounded transition-colors", dock === "right" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
        <PanelRight size={13} />
      </button>
    </div>
  );

  // ── Header bar ──────────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 bg-card">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <MessageCircle size={12} className="text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">AIDE — {title}</p>
          <p className="text-[9px] text-muted-foreground">Tool-use agent · {section}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {dockPicker}
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => setWide(v => !v)} title={wide ? "Compact" : "Expand"}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button onClick={() => setOpen(false)} title="Collapse AIDE"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );

  // ── SIDE DOCK (left or right) ───────────────────────────────────
  if (dock === "left" || dock === "right") {
    const w = wide ? SIDE_W_WIDE : SIDE_W;
    // Left dock sits to the right of the sidebar
    const leftOffset = dock === "left" ? sidebarW : undefined;
    return (
      <div
        className={cn(
          "fixed top-0 bottom-0 z-40 flex flex-col bg-card shadow-xl transition-all duration-300 max-md:inset-x-0 max-md:!w-auto",
          dock === "right" ? "right-0 border-l border-border" : "border-r border-border",
        )}
        style={{
          width: `${w}px`,
          maxWidth: "90vw",
          ...(leftOffset != null ? { left: `${leftOffset}px` } : {}),
        }}
      >
        {header}
        <div className="flex-1 overflow-hidden">
          <EmbeddedAgentChat section={section} title={`AIDE — ${title}`} suggestions={suggestions} />
        </div>
      </div>
    );
  }

  // ── BOTTOM DOCK ─────────────────────────────────────────────────
  const h = wide ? BOTTOM_H_WIDE : BOTTOM_H;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card border-t border-border shadow-xl transition-all duration-300"
      style={{ height: `${h}px`, maxHeight: "70vh" }}
    >
      {header}
      <div className="flex-1 overflow-hidden">
        <EmbeddedAgentChat section={section} title={`AIDE — ${title}`} suggestions={suggestions} />
      </div>
    </div>
  );
}

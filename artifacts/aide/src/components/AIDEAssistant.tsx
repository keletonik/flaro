/**
 * Global AIDE assistant — single AI surface for the entire app.
 *
 * Mounted once in <Layout> (App.tsx). Renders as an edge-docked panel
 * that snaps to the bottom, right, or left of the viewport. Each dock
 * fills its edge (full height for left/right, full width for bottom)
 * so it never floats mid-screen. Collapses to a small dock-edge pill.
 *
 * Persists open / dock-side / size / collapsed state to localStorage.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";
import { cn } from "@/lib/utils";
import { useAIDE } from "@/App";

const OPEN_KEY = "aide-assistant-open";
const WIDE_KEY = "aide-assistant-wide";
const DOCK_KEY = "aide-assistant-dock";
const COLLAPSED_KEY = "aide-assistant-collapsed";

type Dock = "right" | "left" | "bottom";

// Sidebar offset on md+ so left/bottom docks don't sit underneath it.
const SIDEBAR_OFFSET = "md:left-[220px]";

function loadDock(): Dock {
  try {
    const v = localStorage.getItem(DOCK_KEY);
    if (v === "right" || v === "left" || v === "bottom") return v;
  } catch {}
  return "right";
}
function saveDock(d: Dock) { try { localStorage.setItem(DOCK_KEY, d); } catch {} }

function sectionFromPath(path: string): { section: string; title: string; suggestions: string[] } {
  if (path === "/" || path.startsWith("/dashboard"))
    return { section: "dashboard", title: "Dashboard", suggestions: ["Give me a full KPI snapshot", "What are the three most urgent things today?", "Revenue this month vs target", "Show overdue jobs"] };
  if (path.startsWith("/operations"))
    return { section: "wip", title: "Operations", suggestions: ["Show open WIPs over $5,000", "Which tech has the most jobs?", "Defects needing quotes", "Revenue gap analysis"] };
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
    return { section: "projects", title: "Projects", suggestions: ["Status across all projects", "What's blocked today?", "Milestones due this week", "Plan the project kickoff"] };
  if (path.startsWith("/boards"))
    return { section: "tasks", title: "Boards", suggestions: ["Show active boards", "Template for a new sprint", "Gantt across boards", "Archive stale boards"] };
  if (path.startsWith("/pa") || path.startsWith("/chat"))
    return { section: "dashboard", title: "Personal Assistant", suggestions: ["What's on today?", "Log a job for a site", "Draft a note", "Show my reminders"] };
  if (path.startsWith("/toolbox"))
    return { section: "tasks", title: "Toolbox", suggestions: ["Show active briefing notes", "Create a new toolbox note", "What needs attention?", "Summarise briefed items"] };
  if (path.startsWith("/settings"))
    return { section: "dashboard", title: "Settings", suggestions: ["What settings are available?", "Help me configure notifications", "Show system status", "Data export options"] };
  return { section: "dashboard", title: "AIDE", suggestions: ["What needs attention today?", "Full KPI snapshot", "Create a todo", "Show me the dashboard"] };
}

// Panel sizes per dock side
const SIDE_W = 420;       // right/left compact
const SIDE_W_WIDE = 580;  // right/left wide
const BOTTOM_H = 380;     // bottom compact
const BOTTOM_H_WIDE = 560;// bottom wide

export default function AIDEAssistant() {
  const [location] = useLocation();
  const { setAideState } = useAIDE();

  const { section, title, suggestions } = useMemo(() => sectionFromPath(location), [location]);

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [wide, setWide] = useState<boolean>(() => {
    try { return localStorage.getItem(WIDE_KEY) === "1"; } catch { return false; }
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const [dock, setDock] = useState<Dock>(loadDock);

  const setDockSide = useCallback((d: Dock) => {
    setDock(d);
    saveDock(d);
  }, []);

  const handlePopOut = useCallback(() => {
    const url = `/aide-popout?section=${encodeURIComponent(section)}&title=${encodeURIComponent(title)}`;
    const screenW = window.screen.availWidth || 1280;
    const screenH = window.screen.availHeight || 800;
    const width = Math.min(520, Math.max(380, Math.round(screenW * 0.32)));
    const height = Math.max(600, screenH - 40);
    const left = Math.max(0, screenW - width - 8);
    const top = 8;
    const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;
    window.open(url, "aide-popout", features);
    setCollapsed(true);
  }, [section, title]);

  // Persist
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {} }, [open]);
  useEffect(() => { try { localStorage.setItem(WIDE_KEY, wide ? "1" : "0"); } catch {} }, [wide]);
  useEffect(() => { try { localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {} }, [collapsed]);

  // Overlay panel — does not reflow page content.
  useEffect(() => {
    setAideState({ open: false, dock: "right", width: 0, height: 0 });
  }, [setAideState]);

  // Listen for aide-open-with-prompt (from CommandPalette or sidebar button)
  useEffect(() => {
    const handler = () => { setOpen(true); setCollapsed(false); };
    window.addEventListener("aide-open-with-prompt", handler);
    return () => window.removeEventListener("aide-open-with-prompt", handler);
  }, []);

  // Listen for aide-toggle (from sidebar button)
  useEffect(() => {
    const handler = () => {
      setOpen((prev) => {
        if (prev) { setCollapsed(false); return false; }
        return true;
      });
    };
    window.addEventListener("aide-toggle", handler);
    return () => window.removeEventListener("aide-toggle", handler);
  }, []);

  // Listen for aide-analyse (from CSV import)
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message;
      setOpen(true);
      setCollapsed(false);
      if (msg) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("aide-open-with-prompt", { detail: { prompt: msg } }));
        }, 300);
      }
    };
    window.addEventListener("aide-analyse", handler);
    return () => window.removeEventListener("aide-analyse", handler);
  }, []);

  if (!open) return null;

  // ─── Collapsed pill — anchored to the dock edge ────────────────────
  if (collapsed) {
    const pillPos =
      dock === "right" ? "bottom-4 right-4" :
      dock === "left"  ? `bottom-4 left-4 ${SIDEBAR_OFFSET}` :
                         `bottom-0 left-0 right-0 ${SIDEBAR_OFFSET} flex justify-center pb-2`;
    return (
      <div className={cn("fixed z-[60]", pillPos)}>
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-2xl hover:shadow-xl transition-all hover:-translate-y-0.5 text-foreground group"
        >
          <span className="font-mono text-[11px] font-bold text-primary">⚡</span>
          <span className="font-mono text-xs font-semibold">AIDE</span>
          <span className="font-mono text-[10px] text-muted-foreground">{title}</span>
          <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
            {dock === "bottom" ? "↑" : dock === "right" ? "←" : "→"}
          </span>
        </button>
      </div>
    );
  }

  // ─── Edge-docked panel ─────────────────────────────────────────────
  const sideW = wide ? SIDE_W_WIDE : SIDE_W;
  const bottomH = wide ? BOTTOM_H_WIDE : BOTTOM_H;

  const dockClasses =
    dock === "right"
      ? "top-0 bottom-0 right-0 border-l rounded-l-2xl"
      : dock === "left"
      ? `top-0 bottom-0 left-0 ${SIDEBAR_OFFSET} border-r rounded-r-2xl`
      : `bottom-0 left-0 right-0 ${SIDEBAR_OFFSET} border-t rounded-t-2xl`;

  const dockStyle: React.CSSProperties =
    dock === "bottom"
      ? { height: `${bottomH}px`, maxHeight: "calc(100vh - 32px)" }
      : { width: `${sideW}px`, maxWidth: "calc(100vw - 32px)" };

  const DockBtn = ({ d, label, glyph }: { d: Dock; label: string; glyph: string }) => (
    <button
      onClick={() => setDockSide(d)}
      title={`Dock ${label}`}
      className={cn(
        "p-1.5 rounded-md font-mono text-[11px] transition-colors",
        dock === d
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {glyph}
    </button>
  );

  return (
    <div
      className={cn(
        "fixed z-[60] flex flex-col bg-card border-border shadow-2xl overflow-hidden transition-all duration-200",
        dockClasses,
      )}
      style={dockStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-bold text-primary">⚡</span>
          <div>
            <p className="font-mono text-[12px] font-semibold text-foreground tracking-tight">AIDE</p>
            <p className="font-mono text-[9px] text-muted-foreground">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="flex items-center gap-0.5 mr-1 pr-1 border-r border-border">
            <DockBtn d="left" label="left" glyph="⇤" />
            <DockBtn d="bottom" label="bottom" glyph="⇩" />
            <DockBtn d="right" label="right" glyph="⇥" />
          </div>
          <button onClick={handlePopOut} title="Pop out to new window"
            className="p-1.5 rounded-md font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            ↗
          </button>
          <button onClick={() => setWide((v) => !v)} title={wide ? "Compact" : "Expand"}
            className="p-1.5 rounded-md font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {wide ? "⊟" : "⊞"}
          </button>
          <button onClick={() => setCollapsed(true)} title="Collapse"
            className="p-1.5 rounded-md font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            ─
          </button>
          <button onClick={() => setOpen(false)} title="Close AIDE"
            className="p-1.5 rounded-md font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            ×
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div className="flex-1 overflow-hidden">
        <EmbeddedAgentChat section={section} title={title} suggestions={suggestions} hideHeader />
      </div>
    </div>
  );
}

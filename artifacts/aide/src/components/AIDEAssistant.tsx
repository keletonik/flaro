/**
 * AIDE bottom-tray — the single AI surface for the entire app.
 *
 * Slides up from the bottom of the viewport, honours the sidebar width, can
 * be dragged to resize, collapses to a 44px strip, and accepts file drops
 * anywhere inside. Mounted once in <Layout> (App.tsx).
 *
 * Keyboard: Cmd/Ctrl+. toggles, Esc collapses.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";
import { cn } from "@/lib/utils";
import { useAIDE, useSidebar } from "@/App";

const OPEN_KEY = "aide-tray-open";
const HEIGHT_KEY = "aide-tray-height";
const DEFAULT_HEIGHT = 420;
const MIN_HEIGHT = 260;
const MAX_HEIGHT_RATIO = 0.85;
const COLLAPSED_HEIGHT = 44;

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

function loadHeight(): number {
  try {
    const v = parseInt(localStorage.getItem(HEIGHT_KEY) || "", 10);
    if (Number.isFinite(v) && v >= MIN_HEIGHT) return v;
  } catch {}
  return DEFAULT_HEIGHT;
}

export default function AIDEAssistant() {
  const [location] = useLocation();
  const { setAideState } = useAIDE();
  const { collapsed: sidebarCollapsed } = useSidebar();

  const { section, title, suggestions } = useMemo(() => sectionFromPath(location), [location]);

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [height, setHeight] = useState<number>(loadHeight);
  const [dragging, setDragging] = useState(false);
  const [fileHover, setFileHover] = useState(false);
  const dragStartRef = useRef<{ y: number; h: number } | null>(null);

  // Persist open state.
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {} }, [open]);

  // Persist height (debounced — save on drag end).
  useEffect(() => {
    if (dragging) return;
    try { localStorage.setItem(HEIGHT_KEY, String(height)); } catch {}
  }, [height, dragging]);

  // Broadcast size to the Layout so the main content reserves vertical space.
  // Mobile (<768px): tray overlays, no reserved space, matching desktop-less UX.
  useEffect(() => {
    const reported = open ? height : COLLAPSED_HEIGHT;
    setAideState({ open, dock: "bottom", width: 0, height: reported });
  }, [open, height, setAideState]);

  // Cmd/Ctrl+. toggles tray; Esc collapses from expanded to bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key === ".";
      if (isToggle) {
        e.preventDefault();
        setOpen(v => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        // Allow Esc to close only if focus isn't inside a form input — let
        // native behaviour take over for Escape-to-blur in inputs.
        const el = e.target as HTMLElement | null;
        if (el && /^(INPUT|TEXTAREA|SELECT)$/i.test(el.tagName)) return;
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // External triggers kept for backwards compat with CommandPalette / sidebar.
  useEffect(() => {
    const openAndFocus = () => setOpen(true);
    const toggle = () => setOpen(v => !v);
    window.addEventListener("aide-open-with-prompt", openAndFocus);
    window.addEventListener("aide-toggle", toggle);
    return () => {
      window.removeEventListener("aide-open-with-prompt", openAndFocus);
      window.removeEventListener("aide-toggle", toggle);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message;
      setOpen(true);
      if (msg) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("aide-open-with-prompt", { detail: { prompt: msg } }));
        }, 300);
      }
    };
    window.addEventListener("aide-analyse", handler);
    return () => window.removeEventListener("aide-analyse", handler);
  }, []);

  // Drag-to-resize — handle on the top border of the tray.
  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    setDragging(true);
    dragStartRef.current = { y: e.clientY, h: height };
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [open, height]);

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const delta = dragStartRef.current.y - e.clientY;
    const maxH = Math.floor(window.innerHeight * MAX_HEIGHT_RATIO);
    const next = Math.max(MIN_HEIGHT, Math.min(maxH, dragStartRef.current.h + delta));
    setHeight(next);
  }, [dragging]);

  const onDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    dragStartRef.current = null;
    try { (e.target as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  // File drop — publishes a CustomEvent the chat composer listens for.
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      setFileHover(true);
    }
  }, []);
  const onDragLeave = useCallback(() => setFileHover(false), []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFileHover(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    setOpen(true);
    // Hand off to the chat composer. EmbeddedAgentChat listens for this event.
    window.dispatchEvent(new CustomEvent("aide-files-dropped", { detail: { files } }));
  }, []);

  const sidebarW = sidebarCollapsed ? 60 : 210;
  const effectiveHeight = open ? height : COLLAPSED_HEIGHT;

  const openPopout = useCallback(() => {
    const w = 720;
    const h = 800;
    const sx = window.screenX + (window.outerWidth - w) / 2;
    const sy = window.screenY + (window.outerHeight - h) / 2;
    window.open(
      `/aide-popout?section=${encodeURIComponent(section)}&title=${encodeURIComponent(title)}`,
      "aide-command-centre",
      `width=${w},height=${h},left=${sx},top=${sy},menubar=no,toolbar=no,location=no,status=no`,
    );
    // Collapse the tray so the popout has the focus, not two competing surfaces.
    setOpen(false);
  }, [section, title]);

  return (
    <>
      {/* Bottom tray — fixed position; respects sidebar width on md+.
          Solid opaque surface (no glass) so the chrome reads clearly
          against any background, with a theme-primary accent stripe on
          the top edge to identify the command centre. */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-[60] flex flex-col bg-card shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.45)]",
          "transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          dragging && "transition-none select-none",
          fileHover && "ring-2 ring-primary/60 ring-offset-0",
        )}
        style={{
          left: `min(${sidebarW}px, 100vw)`,
          height: `${effectiveHeight}px`,
          borderTop: "2px solid hsl(var(--primary))",
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Drag handle — spans the top; only active when expanded */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className={cn(
            "relative h-2 w-full shrink-0 flex items-center justify-center group",
            open ? "cursor-ns-resize" : "cursor-pointer",
          )}
          onDoubleClick={() => open && setHeight(DEFAULT_HEIGHT)}
          title={open ? "Drag to resize — double-click to reset" : "Click to expand"}
        >
          <span className={cn(
            "block h-[3px] w-12 rounded-full transition-colors",
            dragging ? "bg-primary" : "bg-muted-foreground/40 group-hover:bg-muted-foreground/70",
          )} />
        </div>

        {/* Header bar — always visible; clicking the title area toggles */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0 bg-card">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 flex-1 hover:opacity-80 transition-opacity text-left"
          >
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-primary">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
            </span>
            <span className="font-mono text-[11px] font-bold text-foreground tracking-tight">PA · Command Centre</span>
            <span className="font-mono text-[10px] text-muted-foreground">· {title}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline font-mono text-[9px] text-muted-foreground/60 tracking-wider uppercase mr-2">
              ⌘ · tray · ⌥↗ pop-out
            </span>
            <button
              onClick={openPopout}
              title="Pop out to a separate window"
              className="px-2 py-1 rounded-md font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              ↗
            </button>
            <button
              onClick={() => setOpen(v => !v)}
              title={open ? "Collapse tray" : "Expand tray"}
              className="px-2 py-1 rounded-md font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {open ? "▾" : "▴"}
            </button>
          </div>
        </div>

        {/* Chat body — only rendered when open (saves layout work when collapsed) */}
        {open && (
          <div className="flex-1 min-h-0 relative bg-card">
            <EmbeddedAgentChat section={section} title={title} suggestions={suggestions} hideHeader />
            {fileHover && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 pointer-events-none">
                <div className="flex flex-col items-center gap-2 px-8 py-6 rounded-2xl border-2 border-dashed border-primary/70 bg-card">
                  <span className="text-2xl">⬇</span>
                  <span className="font-mono text-xs font-semibold text-foreground">Drop to upload</span>
                  <span className="font-mono text-[10px] text-muted-foreground">CSV · XLSX · PDF · image</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Global AIDE popout — the single AI surface for the entire app.
 *
 * Mounted once in <Layout> (App.tsx). Renders as a floating popout
 * window that can be repositioned, resized, and persists across
 * page navigation. One unified conversation across the whole site.
 *
 * Also triggered from the sidebar AI button.
 *
 * Persists open/collapsed state and size to localStorage.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  MessageCircle, X, Maximize2, Minimize2,
  ChevronUp, Sparkles, Minus,
} from "lucide-react";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";
import { cn } from "@/lib/utils";
import { useAIDE } from "@/App";

const OPEN_KEY = "aide-assistant-open";
const WIDE_KEY = "aide-assistant-wide";

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
    return { section: "tasks", title: "Projects", suggestions: ["Project status summary", "What's blocked?", "Overdue milestones", "Resource allocation"] };
  if (path.startsWith("/pa") || path.startsWith("/chat"))
    return { section: "dashboard", title: "Personal Assistant", suggestions: ["What's on today?", "Log a job for a site", "Draft a note", "Show my reminders"] };
  if (path.startsWith("/toolbox"))
    return { section: "tasks", title: "Toolbox", suggestions: ["Show active briefing notes", "Create a new toolbox note", "What needs attention?", "Summarise briefed items"] };
  if (path.startsWith("/settings"))
    return { section: "dashboard", title: "Settings", suggestions: ["What settings are available?", "Help me configure notifications", "Show system status", "Data export options"] };
  return { section: "dashboard", title: "AIDE", suggestions: ["What needs attention today?", "Full KPI snapshot", "Create a todo", "Show me the dashboard"] };
}

// Popout dimensions
const POP_W = 420;
const POP_W_WIDE = 580;
const POP_H = 520;
const POP_H_WIDE = 680;

export default function AIDEAssistant() {
  const [location] = useLocation();
  const { setAideState } = useAIDE();

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const [wide, setWide] = useState<boolean>(() => {
    try { return localStorage.getItem(WIDE_KEY) === "1"; } catch { return false; }
  });
  const [minimised, setMinimised] = useState(false);

  // Persist
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch {} }, [open]);
  useEffect(() => { try { localStorage.setItem(WIDE_KEY, wide ? "1" : "0"); } catch {} }, [wide]);

  // Popout doesn't push content, so always report zero to layout
  useEffect(() => {
    setAideState({ open: false, dock: "right", width: 0, height: 0 });
  }, [setAideState]);

  // Listen for aide-open-with-prompt (from CommandPalette or sidebar button)
  useEffect(() => {
    const handler = () => { setOpen(true); setMinimised(false); };
    window.addEventListener("aide-open-with-prompt", handler);
    return () => window.removeEventListener("aide-open-with-prompt", handler);
  }, []);

  // Listen for aide-toggle (from sidebar button)
  useEffect(() => {
    const handler = () => {
      setOpen(prev => {
        if (prev) { setMinimised(false); return false; }
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
      setMinimised(false);
      if (msg) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("aide-open-with-prompt", { detail: { prompt: msg } }));
        }, 300);
      }
    };
    window.addEventListener("aide-analyse", handler);
    return () => window.removeEventListener("aide-analyse", handler);
  }, []);

  const { section, title, suggestions } = useMemo(() => sectionFromPath(location), [location]);

  // Not open at all: show nothing (sidebar button handles the trigger)
  if (!open) return null;

  const w = wide ? POP_W_WIDE : POP_W;
  const h = wide ? POP_H_WIDE : POP_H;

  // Minimised: small pill at bottom right
  if (minimised) {
    return (
      <button
        onClick={() => setMinimised(false)}
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-2xl hover:shadow-xl transition-all hover:-translate-y-0.5 text-foreground group"
      >
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles size={12} className="text-primary" />
        </div>
        <span className="text-xs font-semibold">AIDE</span>
        <span className="text-[10px] text-muted-foreground">{title}</span>
        <ChevronUp size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 max-md:inset-4 max-md:!w-auto max-md:!h-auto"
      style={{ width: `${w}px`, height: `${h}px`, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 32px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles size={13} className="text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground tracking-tight">AIDE</p>
            <p className="text-[9px] text-muted-foreground font-medium">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setWide(v => !v)} title={wide ? "Compact" : "Expand"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button onClick={() => setMinimised(true)} title="Minimise"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Minus size={13} />
          </button>
          <button onClick={() => setOpen(false)} title="Close AIDE"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} />
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

/**
 * The one true in-app AI surface.
 *
 * Mounted once at the top of <Layout> in App.tsx. Floating launcher
 * bottom-right on every page; click to open a right-hand drawer that
 * renders the tool-use EmbeddedAgentChat. Remembers open/closed state
 * per-session via sessionStorage so tab-to-tab switching keeps the
 * user's context.
 *
 * This component intentionally replaces the affordance that was
 * previously split three ways (AidePA floating widget, AnalyticsPanel
 * drawer, EmbeddedAgentChat inline). Under the hood every surface now
 * speaks /api/chat/agent — one code path, tool use always on.
 *
 * AidePA.tsx and AnalyticsPanel.tsx still exist on disk (hands-off
 * files per the audit ground rules); they're just no longer mounted
 * in Layout. Any page can still import them directly if a specific
 * use case needs the old behaviour.
 *
 * The section prop is derived from wouter's useLocation() so the
 * agent knows which page the user is looking at and primes its
 * tools accordingly (wip_records on /operations, estimates on
 * /suppliers?mode=estimation, etc.).
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, X, Maximize2, Minimize2 } from "lucide-react";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aide-assistant-open";
const WIDE_KEY = "aide-assistant-wide";

/**
 * Map the current route to the section slug the agent expects. Drives
 * the system-prompt hint and the starter suggestions in
 * EmbeddedAgentChat.
 */
function sectionFromPath(path: string): { section: string; title: string; suggestions: string[] } {
  if (path === "/" || path.startsWith("/dashboard"))
    return {
      section: "dashboard",
      title: "AIDE — Dashboard",
      suggestions: [
        "Give me a full KPI snapshot",
        "What are the three most urgent things today?",
        "Take me to overdue defects",
        "Revenue this month vs $180k target",
      ],
    };
  if (path.startsWith("/operations"))
    return {
      section: "wip",
      title: "AIDE — Operations",
      suggestions: [
        "Show open WIPs over $5000",
        "Mark T-39833 as Scheduled and assign to Gordon",
        "Which tech has the most jobs right now?",
        "Defects needing quotes",
      ],
    };
  if (path.startsWith("/suppliers"))
    return {
      section: "estimation",
      title: "AIDE — Suppliers & Estimation",
      suggestions: [
        "Find the cheapest smoke detector",
        "Create a new estimate for Goodman Silverwater, 42% markup",
        "Compare F220 panel pricing by supplier",
        "Add 2 Ampac detectors at 35% markup",
      ],
    };
  if (path.startsWith("/jobs"))
    return {
      section: "wip",
      title: "AIDE — Jobs",
      suggestions: [
        "Assign every open critical job to Gordon",
        "Show me overdue jobs",
        "Create a new job for Goodman Silverwater",
        "Mark T-39042 as Done",
      ],
    };
  if (path.startsWith("/todos"))
    return {
      section: "tasks",
      title: "AIDE — Tasks",
      suggestions: [
        "Add a todo to chase Pertronic on Monday, High priority",
        "What's overdue right now?",
        "Prioritise for today",
        "Mark the FIP retrieval todo as done",
      ],
    };
  if (path.startsWith("/fip"))
    return {
      section: "fip",
      title: "AIDE — FIP Library",
      suggestions: [
        "Show every Pertronic F220 manual",
        "Which Ampac models are current?",
        "Find all AS 1670.1 revisions",
        "Add a fault signature for Pertronic F220 E-03",
      ],
    };
  if (path.startsWith("/schedule"))
    return {
      section: "wip",
      title: "AIDE — Schedule",
      suggestions: [
        "What's booked for tomorrow?",
        "Suggest an optimal schedule for this week",
        "Show me Gordon's next 3 jobs",
        "Any scheduling conflicts?",
      ],
    };
  if (path.startsWith("/analytics"))
    return {
      section: "dashboard",
      title: "AIDE — Analytics",
      suggestions: [
        "Revenue vs $180k target month-to-date",
        "Quote conversion rate last 30 days",
        "Margin by client top 10",
        "Repeat-site frequency this quarter",
      ],
    };
  return {
    section: "dashboard",
    title: "AIDE",
    suggestions: [
      "What needs my attention today?",
      "Give me a full KPI snapshot",
      "Create a todo",
      "Take me to the dashboard",
    ],
  };
}

export default function AIDEAssistant() {
  const [location] = useLocation();
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [wide, setWide] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(WIDE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch { /* ignore */ }
  }, [open]);

  useEffect(() => {
    try {
      sessionStorage.setItem(WIDE_KEY, wide ? "1" : "0");
    } catch { /* ignore */ }
  }, [wide]);

  const { section, title, suggestions } = useMemo(() => sectionFromPath(location), [location]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-20 md:bottom-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          title="Open AIDE (tool-use agent)"
          aria-label="Open AIDE assistant"
        >
          <MessageCircle size={20} />
        </button>
      )}

      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 flex flex-col transition-all duration-300 border-l border-border bg-card shadow-xl",
          open
            ? wide
              ? "w-[560px] max-w-[95vw]"
              : "w-[400px] max-w-[90vw]"
            : "w-0 overflow-hidden",
        )}
        aria-hidden={!open}
      >
        {/* Thin control bar so the user can widen / close without reaching
            inside the EmbeddedAgentChat's own header. */}
        <div className="flex items-center justify-end px-2 py-1 border-b border-border/60 shrink-0 gap-1">
          <button
            onClick={() => setWide(v => !v)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={wide ? "Compact" : "Wide"}
          >
            {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <EmbeddedAgentChat section={section} title={title} suggestions={suggestions} />
        </div>
      </div>
    </>
  );
}

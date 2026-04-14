/**
 * Global command palette — Cmd-K / Ctrl-K.
 *
 * Mounted once inside <Layout> so every page has it. Uses the existing
 * shadcn cmdk wrapper in components/ui/command.tsx (installed but
 * previously un-mounted — see Pass 2 §4.3).
 *
 * Commands fall into four groups:
 *   Navigate — every top-level route
 *   Create   — quick-create stubs for the primary entities
 *   Ask AIDE — forwards the query string to AIDEAssistant via a
 *              window custom event so the chat drawer opens with
 *              the prompt pre-filled
 *   Tools    — density / theme / misc utilities
 *
 * Extend by editing the `commands` array below — new entries need only
 * an id, label, optional keywords for fuzzy match and an `action`
 * thunk. The shortcut map at the bottom lets any command also be
 * triggered by a second keystroke (e.g. `g d` for goto dashboard —
 * Linear-style two-key chords).
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageCircle,
  Briefcase,
  CheckSquare,
  FolderKanban,
  Package,
  CalendarDays,
  FileText,
  Wrench,
  BarChart3,
  Settings2,
  Shield,
  Plus,
  Sparkles,
  PieChart,
} from "lucide-react";

export const OPEN_AIDE_PROMPT_EVENT = "aide-open-with-prompt";

interface Command {
  id: string;
  label: string;
  group: "navigate" | "create" | "ask" | "tools";
  icon?: React.ReactNode;
  keywords?: string;
  shortcut?: string; // display only, e.g. "g d"
  action: (ctx: { setLocation: (p: string) => void; close: () => void; query: string }) => void;
}

const navigateCommands: Command[] = [
  { id: "nav-dashboard", label: "Go to Dashboard", group: "navigate", icon: <LayoutDashboard size={14} />, keywords: "home kpi", shortcut: "g d", action: (c) => { c.setLocation("/"); c.close(); } },
  { id: "nav-pa", label: "Go to PA", group: "navigate", icon: <MessageCircle size={14} />, keywords: "pa assistant chat voice reminders", shortcut: "g c", action: (c) => { c.setLocation("/pa"); c.close(); } },
  { id: "nav-operations", label: "Go to Operations (WIP / Quotes / Defects / Invoices)", group: "navigate", icon: <BarChart3 size={14} />, keywords: "ops", shortcut: "g o", action: (c) => { c.setLocation("/operations"); c.close(); } },
  { id: "nav-analytics", label: "Go to Analytics", group: "navigate", icon: <PieChart size={14} />, keywords: "charts metrics", shortcut: "g a", action: (c) => { c.setLocation("/analytics"); c.close(); } },
  { id: "nav-jobs", label: "Go to Jobs / WIPs", group: "navigate", icon: <Briefcase size={14} />, keywords: "action list", shortcut: "g j", action: (c) => { c.setLocation("/jobs"); c.close(); } },
  { id: "nav-todos", label: "Go to Tasks", group: "navigate", icon: <CheckSquare size={14} />, keywords: "todos", shortcut: "g t", action: (c) => { c.setLocation("/todos"); c.close(); } },
  { id: "nav-projects", label: "Go to Projects", group: "navigate", icon: <FolderKanban size={14} />, keywords: "pm", shortcut: "g p", action: (c) => { c.setLocation("/projects"); c.close(); } },
  { id: "nav-suppliers", label: "Go to Suppliers & Estimation", group: "navigate", icon: <Package size={14} />, keywords: "parts catalogue", shortcut: "g s", action: (c) => { c.setLocation("/suppliers"); c.close(); } },
  { id: "nav-schedule", label: "Go to Schedule", group: "navigate", icon: <CalendarDays size={14} />, keywords: "calendar", action: (c) => { c.setLocation("/schedule"); c.close(); } },
  { id: "nav-notes", label: "Go to Notes", group: "navigate", icon: <FileText size={14} />, action: (c) => { c.setLocation("/notes"); c.close(); } },
  { id: "nav-toolbox", label: "Go to Toolbox", group: "navigate", icon: <Wrench size={14} />, action: (c) => { c.setLocation("/toolbox"); c.close(); } },
  { id: "nav-fip", label: "Go to FIP Knowledge Base", group: "navigate", icon: <Shield size={14} />, keywords: "panel manufacturer standard", action: (c) => { c.setLocation("/fip"); c.close(); } },
  { id: "nav-settings", label: "Go to Settings", group: "navigate", icon: <Settings2 size={14} />, action: (c) => { c.setLocation("/settings"); c.close(); } },
];

const createCommands: Command[] = [
  { id: "new-job", label: "New job", group: "create", icon: <Plus size={14} />, keywords: "wip task", action: (c) => { c.setLocation("/jobs?new=1"); c.close(); } },
  { id: "new-todo", label: "New todo", group: "create", icon: <Plus size={14} />, keywords: "task reminder", action: (c) => { c.setLocation("/todos?new=1"); c.close(); } },
  { id: "new-estimate", label: "New estimate", group: "create", icon: <Plus size={14} />, keywords: "quote pricing workbench", action: (c) => { c.setLocation("/suppliers?mode=estimation&new=1"); c.close(); } },
  { id: "new-note", label: "New note", group: "create", icon: <Plus size={14} />, action: (c) => { c.setLocation("/notes?new=1"); c.close(); } },
];

/** Ask-AIDE synthesises a single command whose label is the current
 *  query string. When the user hits enter on it, we dispatch a window
 *  event that AIDEAssistant listens for, which opens the drawer with
 *  the prompt pre-filled and auto-submits it. */
function askAideCommand(query: string): Command | null {
  if (!query.trim()) return null;
  return {
    id: "ask-aide",
    label: `Ask AIDE: "${query}"`,
    group: "ask",
    icon: <Sparkles size={14} />,
    action: (c) => {
      window.dispatchEvent(new CustomEvent(OPEN_AIDE_PROMPT_EVENT, { detail: { prompt: query } }));
      c.close();
    },
  };
}

export default function CommandPalette() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Cmd-K / Ctrl-K toggles. Escape closes. Runs once.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const ask = askAideCommand(query);

  const run = (cmd: Command) => cmd.action({ setLocation, close, query });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Jump to a page, create something, or ask AIDE…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {ask ? "Press ↵ to send to AIDE" : "No results. Try 'job', 'estimate', 'fip' or just ask a question."}
        </CommandEmpty>

        {ask && (
          <>
            <CommandGroup heading="Ask AIDE">
              <CommandItem onSelect={() => run(ask)} value={ask.label}>
                {ask.icon}
                <span className="ml-2 truncate">{ask.label}</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigate">
          {navigateCommands.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords ?? ""}`}
              onSelect={() => run(cmd)}
            >
              {cmd.icon}
              <span className="ml-2 flex-1">{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {cmd.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create">
          {createCommands.map(cmd => (
            <CommandItem
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords ?? ""}`}
              onSelect={() => run(cmd)}
            >
              {cmd.icon}
              <span className="ml-2">{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

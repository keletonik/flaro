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

export const OPEN_AIDE_PROMPT_EVENT = "aide-open-with-prompt";

// Text prefixes for command palette items — matches sidebar nav system
const P = {
  dashboard: "~",
  pa: ">_",
  operations: "::",
  analytics: ">>",
  metrics: "##",
  jobs: "--",
  purchaseOrders: "[]",
  todos: "++",
  projects: "//",
  suppliers: "<>",
  schedule: "..",
  notes: "**",
  toolbox: "&&",
  fip: "{}",
  settings: "./",
  create: "+",
  aide: "⚡",
} as const;

function Prefix({ children }: { children: string }) {
  return <span className="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground/50">{children}</span>;
}

interface Command {
  id: string;
  label: string;
  group: "navigate" | "create" | "ask" | "tools";
  prefix?: string;
  keywords?: string;
  shortcut?: string; // display only, e.g. "g d"
  action: (ctx: { setLocation: (p: string) => void; close: () => void; query: string }) => void;
}

const navigateCommands: Command[] = [
  { id: "nav-dashboard", label: "Go to Dashboard", group: "navigate", prefix: P.dashboard, keywords: "home kpi", shortcut: "g d", action: (c) => { c.setLocation("/"); c.close(); } },
  { id: "nav-pa", label: "Go to PA", group: "navigate", prefix: P.pa, keywords: "pa assistant chat voice reminders", shortcut: "g c", action: (c) => { c.setLocation("/pa"); c.close(); } },
  { id: "nav-operations", label: "Go to Operations (WIP / Quotes / Defects / Invoices)", group: "navigate", prefix: P.operations, keywords: "ops", shortcut: "g o", action: (c) => { c.setLocation("/operations"); c.close(); } },
  { id: "nav-analytics", label: "Go to Analytics", group: "navigate", prefix: P.analytics, keywords: "charts metrics", shortcut: "g a", action: (c) => { c.setLocation("/analytics"); c.close(); } },
  { id: "nav-jobs", label: "Go to Jobs / WIPs", group: "navigate", prefix: P.jobs, keywords: "action list", shortcut: "g j", action: (c) => { c.setLocation("/jobs"); c.close(); } },
  { id: "nav-todos", label: "Go to Tasks", group: "navigate", prefix: P.todos, keywords: "todos", shortcut: "g t", action: (c) => { c.setLocation("/todos"); c.close(); } },
  { id: "nav-projects", label: "Go to Projects", group: "navigate", prefix: P.projects, keywords: "pm", shortcut: "g p", action: (c) => { c.setLocation("/projects"); c.close(); } },
  { id: "nav-suppliers", label: "Go to Suppliers & Estimation", group: "navigate", prefix: P.suppliers, keywords: "parts catalogue", shortcut: "g s", action: (c) => { c.setLocation("/suppliers"); c.close(); } },
  { id: "nav-schedule", label: "Go to Schedule", group: "navigate", prefix: P.schedule, keywords: "calendar", action: (c) => { c.setLocation("/schedule"); c.close(); } },
  { id: "nav-notes", label: "Go to Notes", group: "navigate", prefix: P.notes, action: (c) => { c.setLocation("/notes"); c.close(); } },
  { id: "nav-toolbox", label: "Go to Toolbox", group: "navigate", prefix: P.toolbox, action: (c) => { c.setLocation("/toolbox"); c.close(); } },
  { id: "nav-fip", label: "Go to FIP Knowledge Base", group: "navigate", prefix: P.fip, keywords: "panel manufacturer standard", action: (c) => { c.setLocation("/fip"); c.close(); } },
  { id: "nav-settings", label: "Go to Settings", group: "navigate", prefix: P.settings, action: (c) => { c.setLocation("/settings"); c.close(); } },
];

const createCommands: Command[] = [
  { id: "new-job", label: "New job", group: "create", prefix: P.create, keywords: "wip task", action: (c) => { c.setLocation("/jobs?new=1"); c.close(); } },
  { id: "new-todo", label: "New todo", group: "create", prefix: P.create, keywords: "task reminder", action: (c) => { c.setLocation("/todos?new=1"); c.close(); } },
  { id: "new-estimate", label: "New estimate", group: "create", prefix: P.create, keywords: "quote pricing workbench", action: (c) => { c.setLocation("/suppliers?mode=estimation&new=1"); c.close(); } },
  { id: "new-note", label: "New note", group: "create", prefix: P.create, action: (c) => { c.setLocation("/notes?new=1"); c.close(); } },
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
    prefix: P.aide,
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
                <Prefix>{ask.prefix ?? ""}</Prefix>
                <span className="ml-1 truncate">{ask.label}</span>
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
              <Prefix>{cmd.prefix ?? ""}</Prefix>
              <span className="ml-1 flex-1">{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="ml-auto font-mono text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">
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
              <Prefix>{cmd.prefix ?? ""}</Prefix>
              <span className="ml-1">{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

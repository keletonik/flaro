/**
 * Keyboard cheat sheet (Pass 7 fix 9).
 *
 * Listens for the `list-nav-help` window event emitted by the
 * useListNav hook when the user presses `?`, and also for a
 * global `?` keypress outside any input. Shows a modal with
 * every shortcut the app supports, grouped by scope.
 *
 * Single source of truth — SHORTCUTS is the only list. When we
 * add a new shortcut, it lands here.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Shortcut {
  keys: string;
  label: string;
}

interface Group {
  scope: string;
  shortcuts: Shortcut[];
}

const SHORTCUTS: Group[] = [
  {
    scope: "Global",
    shortcuts: [
      { keys: "⌘ K", label: "Open command palette" },
      { keys: "?", label: "Show this cheat sheet" },
      { keys: "g d", label: "Go to Dashboard" },
      { keys: "g o", label: "Go to Operations" },
      { keys: "g a", label: "Go to Analytics" },
      { keys: "g m", label: "Go to Metrics" },
    ],
  },
  {
    scope: "Lists (operations, WIPs, defects)",
    shortcuts: [
      { keys: "j / ↓", label: "Focus next row" },
      { keys: "k / ↑", label: "Focus previous row" },
      { keys: "Home", label: "Jump to top" },
      { keys: "End", label: "Jump to bottom" },
      { keys: "Enter", label: "Open focused row" },
      { keys: "e", label: "Edit focused row" },
      { keys: "x", label: "Toggle selection on focused row" },
      { keys: "⇧ X", label: "Range-select to focused row" },
      { keys: "Esc", label: "Clear selection / blur" },
    ],
  },
  {
    scope: "Chat (embedded AI)",
    shortcuts: [
      { keys: "Enter", label: "Send message" },
      { keys: "⇧ Enter", label: "New line" },
      { keys: "Esc", label: "Close drawer (when open)" },
    ],
  },
];

export function KeyboardCheatSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onListHelp = () => setOpen(true);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const isField =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isField) {
          e.preventDefault();
          setOpen(true);
        }
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("list-nav-help", onListHelp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("list-nav-help", onListHelp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl bg-background border border-border rounded-xl shadow-xl max-h-[80vh] overflow-auto">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-background">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHORTCUTS.map((group) => (
            <section key={group.scope}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.scope}
              </h3>
              <ul className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <li key={s.keys} className="flex items-center justify-between text-xs gap-4">
                    <span className="text-foreground">{s.label}</span>
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">
                      {s.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

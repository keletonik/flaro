/**
 * PageNotesPanel — a collapsible notes textarea pinned to a page.
 *
 * The operator can type standing instructions for the AIDE assistant
 * ("always show site name", "hide jobs older than 90 days", "group
 * by client"). The notes are stored in localStorage under a key
 * namespaced by the page's `section` slug and then read on every
 * chat turn by EmbeddedAgentChat, which forwards them to the
 * `/api/chat/agent` route as `pageNotes`. The backend injects them
 * into the master prompt as a `<page_notes>` block so the assistant
 * sees them on every turn — a continuous, background AI update.
 *
 * No network calls on type. Saves are debounced and happen entirely
 * in localStorage; the next chat message is what actually pushes the
 * new notes to the model.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { StickyNote, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadPageNotes, savePageNotes } from "@/components/EmbeddedAgentChat";

interface Props {
  section: string;
  /** Human-friendly label for the page these notes belong to. */
  pageLabel?: string;
  className?: string;
}

export function PageNotesPanel({ section, pageLabel = "this page", className }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<string>(() => loadPageNotes(section));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Refresh from storage when the page/section changes.
  useEffect(() => {
    setNotes(loadPageNotes(section));
    setSavedAt(null);
  }, [section]);

  const scheduleSave = useCallback(
    (value: string) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        savePageNotes(section, value);
        setSavedAt(Date.now());
      }, 450);
    },
    [section],
  );

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  const onChange = (value: string) => {
    setNotes(value);
    scheduleSave(value);
  };

  const clear = () => {
    setNotes("");
    savePageNotes(section, "");
    setSavedAt(Date.now());
  };

  const hasContent = notes.trim().length > 0;

  return (
    <div className={cn("border border-border rounded-lg bg-card", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
            <StickyNote className="w-3 h-3 text-amber-500" />
          </div>
          <span className="text-[11px] font-semibold text-foreground tracking-tight">Notes for AIDE</span>
          <span className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.1em]">
            {pageLabel}
          </span>
          {hasContent && !open && (
            <span className="text-[9px] text-muted-foreground truncate max-w-[260px]">
              · {notes.slice(0, 80).replace(/\s+/g, " ")}{notes.length > 80 ? "…" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {savedAt && open && (
            <span className="flex items-center gap-1 text-[9px] text-emerald-500">
              <Check className="w-2.5 h-2.5" /> saved
            </span>
          )}
          {open ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border/60">
          <textarea
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder={`Pin standing instructions for AIDE on ${pageLabel}. Examples:\n- Always group jobs by client.\n- Hide anything completed more than 30 days ago.\n- Flag unassigned critical items first.`}
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 resize-y min-h-[90px] font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[9px] text-muted-foreground/70">
              AIDE reads these on every chat turn. Stored locally on this browser.
            </p>
            {hasContent && (
              <button
                type="button"
                onClick={clear}
                className="text-[9px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

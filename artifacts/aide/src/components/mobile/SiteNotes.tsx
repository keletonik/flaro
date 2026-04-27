/**
 * SiteNotes - per-scope free-text notes for a panel/site/global. Stored
 * in IndexedDB only. No backend round-trip. Auto-saves on idle so the
 * tech doesn't lose work if the screen rotates or the phone locks.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, Save, Check } from "lucide-react";
import { getNote, putNote, type SiteNote } from "@/lib/idb";
import { cn } from "@/lib/utils";

const AUTOSAVE_DELAY_MS = 800;

interface SiteNotesProps {
  scope: SiteNote["scope"];
  scopeId: string;
  className?: string;
  /** Heading shown above the textarea. */
  label?: string;
  placeholder?: string;
}

export function SiteNotes({
  scope, scopeId, className, label = "Site notes", placeholder,
}: SiteNotesProps) {
  const [body, setBody] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Load on mount or when scope changes.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setBody("");
    (async () => {
      try {
        const note = await getNote(scope, scopeId);
        if (!cancelled) {
          setBody(note?.body ?? "");
          setSaved(note?.updatedAt ?? null);
        }
      } catch {
        /* IDB unavailable - leave empty */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [scope, scopeId]);

  // Auto-save on idle.
  useEffect(() => {
    if (!loaded) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const next = await putNote({ scope, scopeId, body });
        setSaved(next.updatedAt);
      } catch {
        /* swallow - shown via missing "Saved" indicator */
      }
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [body, scope, scopeId, loaded]);

  const onCopy = useCallback(async () => {
    if (!body.trim()) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked - silently noop */
    }
  }, [body]);

  const savedLabel = useMemo(() => {
    if (!saved) return null;
    const dt = new Date(saved);
    return dt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  }, [saved]);

  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-3", className)}>
      <header className="flex items-center justify-between gap-2 mb-2 px-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {savedLabel && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/70">
              <Save size={10} />
              <span>Saved {savedLabel}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onCopy}
            disabled={!body.trim()}
            aria-label="Copy notes"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <ClipboardCopy size={13} />}
          </button>
        </div>
      </header>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? "Notes for this panel - on-device only, never uploaded."}
        rows={4}
        className="w-full rounded-md border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground/60 p-3 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 leading-relaxed resize-y min-h-[96px]"
      />
    </section>
  );
}

export default SiteNotes;

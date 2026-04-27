/**
 * Bookmarks - list of bookmarked panels, scenarios and modules with a tap
 * to navigate. Reads from lib/idb.ts. Auto-refreshes when the window
 * gains focus so adding a bookmark elsewhere shows up here.
 */

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Star, Cpu, Wrench, GraduationCap, X } from "lucide-react";
import { listBookmarks, removeBookmark, type Bookmark, type BookmarkKind } from "@/lib/idb";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<BookmarkKind, typeof Cpu> = {
  panel: Cpu,
  scenario: Wrench,
  module: GraduationCap,
  brand: Cpu,
};

const KIND_HREF_PREFIX: Record<BookmarkKind, string> = {
  panel: "/panels",
  scenario: "/fault-finding",
  module: "/training",
  brand: "/panels",
};

export function Bookmarks({ className }: { className?: string }) {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listBookmarks());
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (loaded && items.length === 0) return null;

  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-3", className)}>
      <header className="flex items-center gap-2 mb-2 px-1">
        <Star size={12} className="text-primary" fill="currentColor" />
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Bookmarked
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
          · {items.length}
        </span>
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((b) => {
          const Icon = KIND_ICON[b.kind];
          return (
            <li key={b.id} className="flex items-center gap-2">
              <button
                onClick={() => setLocation(KIND_HREF_PREFIX[b.kind])}
                className="flex-1 flex items-center gap-2 min-h-[44px] px-2.5 py-2 rounded-md hover:bg-muted/30 transition-colors text-left"
              >
                <Icon size={13} className="text-muted-foreground shrink-0" />
                <span className="text-[12px] font-medium text-foreground truncate">{b.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70 ml-auto shrink-0">
                  {b.kind}
                </span>
              </button>
              <button
                onClick={async () => {
                  await removeBookmark(b.kind, b.refId);
                  setItems((prev) => prev.filter((x) => x.id !== b.id));
                }}
                aria-label={`Remove ${b.label}`}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
              >
                <X size={12} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default Bookmarks;

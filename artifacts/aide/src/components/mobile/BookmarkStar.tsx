/**
 * BookmarkStar - small toggle for bookmarking a panel/scenario/module.
 *
 * Persists via lib/idb.ts. Optimistic UI: clicks update local state
 * before the IDB write resolves so the tech doesn't wait for storage.
 */

import { useEffect, useState, useCallback } from "react";
import { Star } from "lucide-react";
import { addBookmark, removeBookmark, isBookmarked, type BookmarkKind } from "@/lib/idb";
import { cn } from "@/lib/utils";

interface BookmarkStarProps {
  kind: BookmarkKind;
  refId: string;
  /** Human-readable label saved alongside the bookmark for the list view. */
  label: string;
  className?: string;
}

export function BookmarkStar({ kind, refId, label, className }: BookmarkStarProps) {
  const [on, setOn] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await isBookmarked(kind, refId);
        if (!cancelled) setOn(v);
      } catch {
        /* IDB may be unavailable in private mode; default to off. */
      }
    })();
    return () => { cancelled = true; };
  }, [kind, refId]);

  const toggle = useCallback(async () => {
    const next = !on;
    setOn(next);
    try {
      if (next) await addBookmark(kind, refId, label);
      else await removeBookmark(kind, refId);
    } catch {
      // Revert on failure so the UI never lies.
      setOn(!next);
    }
  }, [on, kind, refId, label]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? "Remove bookmark" : "Add bookmark"}
      title={on ? "Bookmarked" : "Bookmark this"}
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors",
        on
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
        className,
      )}
    >
      <Star size={16} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

export default BookmarkStar;

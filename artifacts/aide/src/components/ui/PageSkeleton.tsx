/**
 * PageSkeleton — one primitive used by every list/grid/detail/table
 * page while its data is loading. Matches the final layout shape so
 * the user sees a coherent page outline instead of a spinner or a
 * blank screen.
 *
 * Replaces:
 *   - 6 roll-your-own Loader2 spinners
 *   - 3 ad-hoc Skeleton uses
 *   - 6 pages that showed nothing at all while loading
 *
 * Persona B has been asking for exactly this since Pass 2 §4.1.
 */

import { cn } from "@/lib/utils";

type Shape = "list" | "grid" | "detail" | "table" | "split";

interface Props {
  shape?: Shape;
  rows?: number;
  className?: string;
}

function Bar({ className }: { className?: string }) {
  return <div className={cn("h-3 bg-muted/60 rounded animate-pulse", className)} />;
}

function Card({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl space-y-2">
      <Bar className="w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} className={i === rows - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export default function PageSkeleton({ shape = "list", rows = 8, className }: Props) {
  if (shape === "list") {
    return (
      <div className={cn("p-4 md:p-6 space-y-2", className)} aria-busy="true" aria-label="Loading">
        <Bar className="w-48 h-5 mb-4" />
        <div className="space-y-1.5">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div className="w-5 h-5 rounded bg-muted/60 animate-pulse shrink-0" />
              <Bar className="flex-1" />
              <div className="w-12 h-3 rounded bg-muted/60 animate-pulse shrink-0" />
              <div className="w-16 h-3 rounded bg-muted/60 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (shape === "grid") {
    return (
      <div className={cn("p-4 md:p-6", className)} aria-busy="true" aria-label="Loading">
        <Bar className="w-48 h-5 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Card key={i} rows={3} />
          ))}
        </div>
      </div>
    );
  }

  if (shape === "table") {
    return (
      <div className={cn("p-4 md:p-6", className)} aria-busy="true" aria-label="Loading">
        <Bar className="w-48 h-5 mb-4" />
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border grid grid-cols-5 gap-3">
            <Bar className="h-2.5" />
            <Bar className="h-2.5" />
            <Bar className="h-2.5" />
            <Bar className="h-2.5" />
            <Bar className="h-2.5" />
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-border/40 grid grid-cols-5 gap-3 items-center">
              <Bar />
              <Bar />
              <Bar className="w-2/3" />
              <Bar className="w-1/2" />
              <Bar className="w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (shape === "detail") {
    return (
      <div className={cn("p-4 md:p-6 max-w-3xl mx-auto space-y-4", className)} aria-busy="true" aria-label="Loading">
        <Bar className="w-64 h-6" />
        <Bar className="w-40 h-3" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: rows }).map((_, i) => (
            <Bar key={i} className={i === rows - 1 ? "w-3/4" : "w-full"} />
          ))}
        </div>
      </div>
    );
  }

  // split: left rail + main pane
  return (
    <div className={cn("flex", className)} aria-busy="true" aria-label="Loading">
      <div className="w-56 border-r border-border p-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bar key={i} className="h-4" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-3">
        <Bar className="w-48 h-5" />
        {Array.from({ length: rows }).map((_, i) => (
          <Bar key={i} className={i === rows - 1 ? "w-3/4" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

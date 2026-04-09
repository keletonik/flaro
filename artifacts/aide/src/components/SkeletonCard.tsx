import { cn } from "@/lib/utils";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
      <div className="flex justify-between items-center">
        <div className="h-3.5 bg-muted rounded-md w-32 skeleton-pulse" />
        <div className="h-5 bg-muted rounded-md w-16 skeleton-pulse" />
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className={cn("h-3 bg-muted rounded-md skeleton-pulse", i === lines - 2 ? "w-1/2" : "w-3/4")}
        />
      ))}
    </div>
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return <div className={cn("h-3 bg-muted rounded skeleton-pulse", className)} />;
}

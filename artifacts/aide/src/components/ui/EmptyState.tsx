/**
 * EmptyState — one primitive for every "no data yet" screen.
 *
 * Replaces 12 inconsistent empty-state implementations and fills the
 * 6 pages that showed nothing at all on empty data. See Pass 2 §4.2.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Briefcase size={24} />}
 *     title="No jobs yet"
 *     body="Create your first job or import a CSV to get started."
 *     primaryLabel="New job"
 *     onPrimary={() => setShowNew(true)}
 *     secondaryLabel="Import CSV"
 *     onSecondary={() => setImportOpen(true)}
 *     tip="Tip: press Cmd-K, type 'new job', press enter."
 *   />
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: ReactNode;
  title: string;
  body?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tip?: string;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tip,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12",
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center text-primary mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-foreground mb-1.5">{title}</h3>
      {body && (
        <p className="text-[12px] text-muted-foreground max-w-md leading-relaxed mb-5">
          {body}
        </p>
      )}
      {(primaryLabel || secondaryLabel) && (
        <div className="flex items-center gap-2">
          {primaryLabel && onPrimary && (
            <button
              onClick={onPrimary}
              className="px-4 py-2 rounded-lg text-[12px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]"
            >
              {primaryLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-all"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
      {tip && (
        <p className="text-[10.5px] text-muted-foreground/70 mt-5">{tip}</p>
      )}
    </div>
  );
}

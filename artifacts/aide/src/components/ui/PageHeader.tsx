import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  prefix?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Optional sub-row rendered inside the same sticky container (tabs, filter pills, etc.) */
  below?: ReactNode;
  sticky?: boolean;
  /** When true, allow the title row to wrap so wide actions don't crowd the title. */
  wrap?: boolean;
  className?: string;
}

export function PageHeader({
  prefix,
  title,
  subtitle,
  meta,
  actions,
  below,
  sticky = true,
  wrap = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        sticky && "sticky top-0 z-20",
        // Subtle shadow below the sticky bar so scrolled content reads as
        // clearly underneath, not overlapping.
        "glass-1 px-4 sm:px-6 py-3 page-reveal shadow-[0_1px_0_0_hsl(var(--border))]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 min-h-[40px]",
          wrap && "flex-wrap",
        )}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-foreground font-bold text-[17px] tracking-tight flex items-center gap-2 leading-tight">
            {prefix && (
              <span className="font-mono text-[13px] text-primary/70 shrink-0">
                {prefix}
              </span>
            )}
            <span className="truncate">{title}</span>
            {meta && <span className="ml-1 flex items-center gap-1.5">{meta}</span>}
          </h1>
          {subtitle && (
            <div className="font-mono text-[10px] text-muted-foreground/90 mt-1 truncate tracking-wide">
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">{actions}</div>
        )}
      </div>
      {below && <div className="mt-3">{below}</div>}
    </div>
  );
}

export default PageHeader;

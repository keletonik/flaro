import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  prefix?: string;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function PageHeader({
  prefix,
  title,
  subtitle,
  meta,
  actions,
  sticky = true,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        sticky && "sticky top-0 z-20",
        "glass border-b border-border/50 px-4 sm:px-6 py-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 min-h-[36px]">
        <div className="min-w-0 flex-1">
          <h1 className="text-foreground font-semibold text-[15px] tracking-tight flex items-center gap-2 leading-none">
            {prefix && (
              <span className="font-mono text-[13px] text-primary/60 shrink-0">
                {prefix}
              </span>
            )}
            <span className="truncate">{title}</span>
            {meta && <span className="ml-1 flex items-center gap-1.5">{meta}</span>}
          </h1>
          {subtitle && (
            <div className="font-mono text-[10px] text-muted-foreground mt-1 truncate">
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;

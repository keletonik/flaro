import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDashboardConfig,
  WIDGET_LABELS,
  type WidgetId,
} from "@/hooks/useDashboardConfig";

export function DashboardConfigPanel() {
  const [open, setOpen] = useState(false);
  const { config, moveUp, moveDown, toggle, isHidden, reset } = useDashboardConfig();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. Do NOT close on mouse-leave —
  // the user needs to cross a small gap to reach the ^/v arrows, and
  // auto-dismiss on leave makes the reorder impossible.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors",
          open && "text-foreground border-primary/40 bg-primary/5",
        )}
        title="Configure dashboard widgets"
      >
        <SlidersHorizontal size={11} className="opacity-75" />
        <span>Layout</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-30 w-64 rounded-lg border border-border bg-card shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              widgets
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
            >
              reset
            </button>
          </div>
          <div className="py-1">
            {config.order.map((id: WidgetId, idx: number) => {
              const hidden = isHidden(id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between px-2 py-1 hover:bg-muted/40"
                >
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className={cn(
                      "flex-1 text-left text-[12px] font-mono",
                      hidden ? "text-muted-foreground/50 line-through" : "text-foreground",
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground/60 mr-2">
                      {hidden ? "[ ]" : "[x]"}
                    </span>
                    {WIDGET_LABELS[id]}
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveUp(id)}
                      disabled={idx === 0}
                      className="w-5 h-5 flex items-center justify-center text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-20"
                      title="Move up"
                    >
                      ^
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(id)}
                      disabled={idx === config.order.length - 1}
                      className="w-5 h-5 flex items-center justify-center text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-20"
                      title="Move down"
                    >
                      v
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveToggleProps {
  /** Called on each tick when live mode is active */
  onTick: () => void;
  /** Interval in ms (default 10 000 = 10s) */
  interval?: number;
  /** Start active (default false) */
  defaultActive?: boolean;
}

export default function LiveToggle({ onTick, interval = 10_000, defaultActive = false }: LiveToggleProps) {
  const [active, setActive] = useState(defaultActive);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      onTick(); // immediate tick on activation
      timerRef.current = setInterval(onTick, interval);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, interval]);

  return (
    <button
      onClick={() => setActive(v => !v)}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border",
        active
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
      )}
      title={active ? "Live updates ON — click to pause" : "Click to enable live updates"}
    >
      <span className="relative flex items-center justify-center w-2 h-2">
        {active && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
        <span className={cn("relative inline-flex rounded-full w-2 h-2", active ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      </span>
      <Activity size={10} />
      {active ? "Live" : "Paused"}
    </button>
  );
}

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  /** Duration in ms for the animation. */
  duration?: number;
  /** Formatter — receives the in-flight interpolated number. */
  format?: (n: number) => string;
  /** Fallback when value is null/undefined. */
  placeholder?: string;
  className?: string;
  /** Decimals used when no formatter is supplied. */
  decimals?: number;
  /** Prefix (e.g. "$"). */
  prefix?: string;
  /** Suffix (e.g. "%"). */
  suffix?: string;
}

/**
 * Animated number. Uses requestAnimationFrame with an ease-out-quart curve
 * so the value flies in and settles. Respects prefers-reduced-motion.
 */
export function CountUp({
  value,
  duration = 640,
  format,
  placeholder = "-",
  className,
  decimals = 0,
  prefix = "",
  suffix = "",
}: CountUpProps) {
  const [display, setDisplay] = useState<number>(value);
  const [flash, setFlash] = useState(false);
  const fromRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    if (reduce) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-quart
      const k = 1 - Math.pow(1 - t, 4);
      setDisplay(from + (to - from) * k);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setFlash(true);
        window.setTimeout(() => setFlash(false), 420);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  if (!Number.isFinite(value)) return <span className={className}>{placeholder}</span>;

  const rendered = format
    ? format(display)
    : `${prefix}${display.toLocaleString("en-AU", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

  return (
    <span className={cn("count-up", className)} data-changed={flash}>
      {rendered}
    </span>
  );
}

export default CountUp;

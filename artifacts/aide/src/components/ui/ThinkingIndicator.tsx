/**
 * ThinkingIndicator — Claude-style "agent is working" widget.
 *
 * Shows a softly pulsing orb + a single rotating phrase. Phrases
 * cycle every ~1.8s so the user gets a sense the agent is doing
 * different things, without ever leaking actual tool names or
 * SQL details. The same component is used by every chat surface
 * (PA, FIP, embedded). Pass `phrases` to override the wording for
 * a specific surface.
 *
 * The pulse is pure CSS (no JS animation frame) so it stays cheap
 * even when shown in many simultaneous chats.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_PHRASES = [
  "Thinking",
  "Working it out",
  "Considering the options",
  "Cross-referencing",
  "Almost there",
  "Putting it together",
];

export interface ThinkingIndicatorProps {
  /** Override the cycling phrases for a specific chat surface. */
  phrases?: string[];
  /** ms between phrase changes. Default 1800. */
  intervalMs?: number;
  /** Compact layout (smaller orb, smaller text). */
  size?: "sm" | "md";
  /** Tailwind colour for the orb. Default: primary. */
  tone?: "primary" | "blue" | "amber" | "emerald";
  className?: string;
}

const TONE_BG: Record<NonNullable<ThinkingIndicatorProps["tone"]>, string> = {
  primary: "bg-primary",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
};

export function ThinkingIndicator({
  phrases,
  intervalMs = 1800,
  size = "md",
  tone = "primary",
  className,
}: ThinkingIndicatorProps) {
  const list = phrases && phrases.length > 0 ? phrases : DEFAULT_PHRASES;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), intervalMs);
    return () => clearInterval(t);
  }, [list.length, intervalMs]);

  const orb = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const text = size === "sm" ? "text-[11px]" : "text-[12px]";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping",
            TONE_BG[tone],
          )}
        />
        <span className={cn("relative inline-flex rounded-full", orb, TONE_BG[tone])} />
      </span>
      <span
        key={idx}
        className={cn(
          "text-muted-foreground font-medium tabular-nums tracking-tight thinking-fade",
          text,
        )}
      >
        {list[idx]}
        <span className="thinking-dots ml-0.5" aria-hidden>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </div>
  );
}

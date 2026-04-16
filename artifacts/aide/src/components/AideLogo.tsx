import { cn } from "@/lib/utils";

interface WordmarkProps {
  color?: string;
  height?: number;
  className?: string;
}

// Text-based wordmark — monospace, engineering aesthetic.
export function AideWordmark({ color = "#22d3ee", height = 48, className }: WordmarkProps) {
  const scale = height / 48;
  return (
    <span
      className={cn("inline-flex items-baseline font-mono font-bold tracking-tighter select-none", className)}
      style={{ color, fontSize: `${24 * scale}px`, lineHeight: 1 }}
      aria-label="Aide"
    >
      AIDE
    </span>
  );
}

interface FaviconProps {
  color?: string;
  size?: number;
  bg?: string;
  radius?: number;
  className?: string;
}

// Text-based favicon — the open-angle "A" glyph rendered as monospace text.
export function AideFavicon({
  color = "#22d3ee",
  size = 48,
  className,
}: FaviconProps) {
  const scale = size / 48;
  return (
    <span
      className={cn("inline-flex items-center justify-center font-mono font-bold select-none", className)}
      style={{ color, fontSize: `${28 * scale}px`, lineHeight: 1, width: size, height: size }}
      aria-label="Aide"
    >
      A
    </span>
  );
}

// Animated version of the wordmark used in the login splash. Uses CSS
// keyframes to fade in with a subtle shimmer.
export function AideWordmarkAnimated({ color = "#22d3ee", height = 64, className }: WordmarkProps) {
  const scale = height / 64;
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-mono font-bold tracking-tighter select-none aide-splash-wordmark",
        className,
      )}
      style={{ color, fontSize: `${36 * scale}px`, lineHeight: 1 }}
      aria-label="Aide"
    >
      {"AIDE".split("").map((char, i) => (
        <span
          key={i}
          className="inline-block animate-pulse"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "2s" }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

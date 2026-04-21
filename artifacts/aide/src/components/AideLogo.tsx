import { cn } from "@/lib/utils";

// Brand constants — single source of truth for the AIDE wordmark. Used by
// the splash, the login page, and anywhere we render the logo outside the
// sidebar (which has its own terminal-register conditional logic).
const MARK_COLOR = "#F5F5F5";
const SIGNAL_COLOR = "#00FF66";
const BASE_COLOR = "#0A0A0A";

interface MonogramProps {
  size?: number;
  color?: string;
  signal?: string;
  className?: string;
}

/**
 * Chevron monogram — `>` shape with a signal-green cursor block to its right.
 * Reads as a shell prompt. Scales linearly with `size`.
 */
export function AideMonogram({
  size = 48,
  color = MARK_COLOR,
  signal = SIGNAL_COLOR,
  className,
}: MonogramProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="AIDE"
    >
      <path
        d="M 28 22 L 60 50 L 28 78"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="68" y="42" width="14" height="16" fill={signal} />
    </svg>
  );
}

interface WordmarkProps {
  color?: string;
  signal?: string;
  height?: number;
  className?: string;
  /** Render the block cursor after the wordmark. Default true. */
  cursor?: boolean;
}

/**
 * `aide` lowercase wordmark in JetBrains Mono with the signal-green cursor
 * block trailing the last glyph. Matches the brand mockup's hero lockup.
 */
export function AideWordmark({
  color = MARK_COLOR,
  signal = SIGNAL_COLOR,
  height = 48,
  className,
  cursor = true,
}: WordmarkProps) {
  const fontPx = height;
  const cursorW = Math.round(fontPx * 0.36);
  const cursorH = Math.round(fontPx * 0.78);
  return (
    <span
      className={cn("inline-flex items-center gap-[0.18em] select-none", className)}
      style={{ color, lineHeight: 1 }}
      aria-label="aide"
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontWeight: 700,
          fontSize: `${fontPx}px`,
          letterSpacing: "-0.04em",
        }}
      >
        aide
      </span>
      {cursor && (
        <span
          style={{
            display: "inline-block",
            width: `${cursorW}px`,
            height: `${cursorH}px`,
            background: signal,
            boxShadow: `0 0 ${Math.max(6, cursorH / 4)}px ${signal}55`,
          }}
        />
      )}
    </span>
  );
}

interface FaviconProps {
  color?: string;
  signal?: string;
  bg?: string;
  size?: number;
  radius?: number;
  className?: string;
}

/**
 * SVG favicon/app-icon version of the monogram — chevron + signal block on a
 * rounded dark tile. Used by the splash and the login page.
 */
export function AideFavicon({
  color = MARK_COLOR,
  signal = SIGNAL_COLOR,
  bg = BASE_COLOR,
  size = 48,
  radius = 12,
  className,
}: FaviconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="AIDE"
    >
      <rect width="100" height="100" rx={radius} fill={bg} />
      <path
        d="M 28 22 L 60 50 L 28 78"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="68" y="42" width="14" height="16" fill={signal} />
    </svg>
  );
}

/**
 * Splash-screen variant of the wordmark — fades the glyphs in one by one,
 * then pulses the cursor. Uses the same CSS the rest of the splash uses.
 */
export function AideWordmarkAnimated({
  color = MARK_COLOR,
  signal = SIGNAL_COLOR,
  height = 64,
  className,
}: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.18em] select-none aide-splash-wordmark",
        className,
      )}
      style={{ color, lineHeight: 1 }}
      aria-label="aide"
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontWeight: 700,
          fontSize: `${height}px`,
          letterSpacing: "-0.04em",
        }}
      >
        {"aide".split("").map((ch, i) => (
          <span
            key={i}
            className="inline-block animate-pulse"
            style={{ animationDelay: `${i * 0.12}s`, animationDuration: "2s" }}
          >
            {ch}
          </span>
        ))}
      </span>
      <span
        style={{
          display: "inline-block",
          width: `${Math.round(height * 0.36)}px`,
          height: `${Math.round(height * 0.78)}px`,
          background: signal,
          boxShadow: `0 0 ${Math.round(height / 4)}px ${signal}66`,
          animation: "terminal-block-blink 1.1s steps(2) infinite",
        }}
      />
    </span>
  );
}

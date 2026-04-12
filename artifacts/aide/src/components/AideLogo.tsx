import { cn } from "@/lib/utils";

interface WordmarkProps {
  color?: string;
  height?: number;
  className?: string;
}

// Geometric wordmark — open-apex A, straight I, D, three-bar E.
// Kept side-effect free so it can be inlined anywhere.
export function AideWordmark({ color = "#22d3ee", height = 48, className }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 240 60"
      style={{ height, width: "auto" }}
      className={className}
      aria-label="Aide"
    >
      {/* A — open apex, no crossbar */}
      <path
        d="M8 52 L30 8 L52 52"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* I */}
      <line x1="82" y1="8" x2="82" y2="52" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {/* D */}
      <path
        d="M112 8 L112 52 L135 52 Q160 52 160 30 Q160 8 135 8 Z"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* E — three parallel lines */}
      <g stroke={color} strokeWidth="5" strokeLinecap="round">
        <line x1="190" y1="8" x2="220" y2="8" />
        <line x1="190" y1="30" x2="214" y2="30" />
        <line x1="190" y1="52" x2="220" y2="52" />
      </g>
    </svg>
  );
}

interface FaviconProps {
  color?: string;
  size?: number;
  bg?: string;
  radius?: number;
  className?: string;
}

// The open-A glyph on its own. Good for nav rails, avatars, badges.
export function AideFavicon({
  color = "#22d3ee",
  size = 48,
  bg = "transparent",
  radius = 8,
  className,
}: FaviconProps) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-label="Aide">
      {bg !== "transparent" && <rect width="48" height="48" rx={radius} fill={bg} />}
      <path
        d="M12 40 L24 8 L36 40"
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Animated version of the wordmark used in the login splash. Each glyph
// strokes itself in with a staggered delay, then a subtle pulse loop kicks
// in so the splash feels alive while the app is still initialising.
export function AideWordmarkAnimated({ color = "#22d3ee", height = 64, className }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 240 60"
      style={{ height, width: "auto" }}
      className={cn("aide-splash-wordmark", className)}
      aria-label="Aide"
    >
      <defs>
        <linearGradient id="aide-splash-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-1 0"
            to="1 0"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      <path
        d="M8 52 L30 8 L52 52"
        fill="none"
        stroke="url(#aide-splash-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="aide-stroke aide-stroke-a"
      />
      <line
        x1="82" y1="8" x2="82" y2="52"
        stroke="url(#aide-splash-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        className="aide-stroke aide-stroke-i"
      />
      <path
        d="M112 8 L112 52 L135 52 Q160 52 160 30 Q160 8 135 8 Z"
        fill="none"
        stroke="url(#aide-splash-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="aide-stroke aide-stroke-d"
      />
      <g stroke="url(#aide-splash-gradient)" strokeWidth="5" strokeLinecap="round">
        <line x1="190" y1="8" x2="220" y2="8" className="aide-stroke aide-stroke-e1" />
        <line x1="190" y1="30" x2="214" y2="30" className="aide-stroke aide-stroke-e2" />
        <line x1="190" y1="52" x2="220" y2="52" className="aide-stroke aide-stroke-e3" />
      </g>
    </svg>
  );
}

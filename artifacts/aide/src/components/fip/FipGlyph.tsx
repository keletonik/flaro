/**
 * FipGlyph — minimalist geometric marks used in the FIP workbench.
 *
 * These are custom inline SVG glyphs, not lucide icons. They use
 * thin 1.25px strokes on currentColor so the colour is dictated by
 * the parent (text-sky-400, text-muted-foreground, etc.) and they
 * read the same at any size.
 *
 * Design language:
 *   - no fills, stroke-only, stroke-linecap="round"
 *   - geometric: circles, hexes, diagonals, dot matrices
 *   - each glyph fits in a 24×24 box and pairs with a h-4 w-4 classname
 *
 * One glyph per workbench module:
 *   PanelMark      — nested hex (panel specs)
 *   ProductsMark   — stacked bars with a dot (materials list)
 *   DefectMark     — scanner brackets around a dot (defect analysis)
 *   BatteryMark    — thin rounded cell with a level line (battery calc)
 *   NetworkMark    — three nodes on a triangle (network capable)
 *   CellMark       — horizontal battery cell (inline battery tiles)
 */

import type { SVGProps } from "react";

type GlyphProps = SVGProps<SVGSVGElement>;

const base: GlyphProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** Nested hex — suggests a panel with a chip inside. */
export function PanelMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5 L20.5 7 L20.5 17 L12 21.5 L3.5 17 L3.5 7 Z" />
      <path d="M12 7 L16.5 9.5 L16.5 14.5 L12 17 L7.5 14.5 L7.5 9.5 Z" />
      <circle cx="12" cy="12" r="1.1" />
    </svg>
  );
}

/** Stacked bars with a trailing dot — suggests a BoM line item list. */
export function ProductsMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6 H16" />
      <path d="M4 12 H20" />
      <path d="M4 18 H14" />
      <circle cx="19.25" cy="18" r="1.1" />
      <circle cx="18.25" cy="6" r="1.1" />
    </svg>
  );
}

/** Scanner brackets around a dot — suggests reticle / defect scan. */
export function DefectMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8 V5 H7" />
      <path d="M17 5 H20 V8" />
      <path d="M20 16 V19 H17" />
      <path d="M7 19 H4 V16" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="0.8" />
    </svg>
  );
}

/** Thin cell with a level mark — suggests battery sizing. */
export function BatteryMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7.5" width="16" height="9" rx="1.5" />
      <path d="M19 10 V14" />
      <path d="M7 10.5 V13.5" />
      <path d="M10 10.5 V13.5" />
      <path d="M13 10.5 V13.5" />
    </svg>
  );
}

/** Three-node triangle — suggests networked panels. */
export function NetworkMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="5" cy="18" r="1.4" />
      <circle cx="19" cy="18" r="1.4" />
      <circle cx="12" cy="6" r="1.4" />
      <path d="M6.2 17 L10.8 7.2" />
      <path d="M13.2 7.2 L17.8 17" />
      <path d="M6.5 18 L17.5 18" />
    </svg>
  );
}

/** Horizontal single cell — compact inline battery glyph. */
export function CellMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="9" width="14" height="6" rx="1" />
      <path d="M17.5 11 V13" />
      <path d="M20 11 V13" />
    </svg>
  );
}

/** Minimal specs tile grid — for section headers. */
export function SpecGridMark(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="0.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="0.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="0.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="0.8" />
    </svg>
  );
}

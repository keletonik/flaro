"use client";

import { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   CONCEPT 1: "The Monogram Shield"
   Inspired by: Chanel, Louis Vuitton, Pentagram
   A geometric "F" enclosed in a sleek shield/badge — corporate authority meets
   modern minimalism. The "F" is constructed from precise geometric lines.
   ───────────────────────────────────────────────────────────────────────────── */
function LogoConcept1({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="c1-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="c1-accent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Shield outline */}
      <path
        d="M100 10L175 45V110C175 150 145 180 100 195C55 180 25 150 25 110V45L100 10Z"
        stroke="url(#c1-grad)"
        strokeWidth="4"
        fill="none"
      />
      {/* Inner shield fill */}
      <path
        d="M100 22L165 52V110C165 145 139 172 100 185C61 172 35 145 35 110V52L100 22Z"
        fill="rgba(6, 182, 212, 0.06)"
      />
      {/* Geometric F */}
      <rect x="72" y="55" width="56" height="5" rx="2" fill="url(#c1-grad)" />
      <rect x="72" y="55" width="5" height="90" rx="2" fill="url(#c1-grad)" />
      <rect x="72" y="95" width="42" height="5" rx="2" fill="url(#c1-accent)" />
      {/* Accent dot */}
      <circle cx="135" cy="57.5" r="4" fill="url(#c1-accent)" />
    </svg>
  );
}

function LogoText1() {
  return (
    <div className="flex items-center gap-4">
      <LogoConcept1 size={56} />
      <div className="flex flex-col">
        <span className="text-3xl font-bold tracking-[0.25em] text-white" style={{ fontFamily: "var(--font-heading)" }}>
          FLARO
        </span>
        <span className="text-[10px] tracking-[0.45em] text-cyan-400 uppercase font-medium mt-0.5">
          Fire Supplies
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONCEPT 2: "The Precision Grid"
   Inspired by: IBM, Massimo Vignelli, Swiss Design
   The word FLARO constructed on a strict grid with mathematical precision.
   A subtle gradient bar underneath acts as the brand accent.
   Clean, authoritative, brutalist-corporate.
   ───────────────────────────────────────────────────────────────────────────── */
function LogoConcept2({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="c2-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="40%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Outer square frame */}
      <rect x="15" y="15" width="170" height="170" rx="8" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* Grid lines (subtle) */}
      <line x1="15" y1="100" x2="185" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <line x1="100" y1="15" x2="100" y2="185" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      {/* "F" letter mark — bold geometric */}
      <rect x="60" y="60" width="80" height="8" rx="1" fill="white" />
      <rect x="60" y="60" width="8" height="80" rx="1" fill="white" />
      <rect x="60" y="92" width="55" height="7" rx="1" fill="#06b6d4" />
      {/* Gradient accent bar at bottom */}
      <rect x="15" y="172" width="170" height="4" rx="2" fill="url(#c2-bar)" />
    </svg>
  );
}

function LogoText2() {
  return (
    <div className="flex items-center gap-5">
      <LogoConcept2 size={52} />
      <div className="flex flex-col">
        <span className="text-4xl font-light tracking-[0.35em] text-white" style={{ fontFamily: "var(--font-body)" }}>
          FLARO
        </span>
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-ember-500 mt-2 rounded-full" />
        <span className="text-[9px] tracking-[0.6em] text-slate-400 uppercase mt-2 font-medium">
          Fire Supplies
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONCEPT 3: "The Hexagonal Mark"
   Inspired by: Uber, Stripe, Abstract geometric logos
   A hexagon (representing structure/engineering) with an abstract "F"
   negative space cutout. Bold, tech-forward, premium corporate.
   ───────────────────────────────────────────────────────────────────────────── */
function LogoConcept3({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="c3-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="c3-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <clipPath id="c3-clip">
          <path d="M100 18L172 56V132L100 170L28 132V56L100 18Z" />
        </clipPath>
      </defs>
      {/* Hexagon */}
      <path
        d="M100 18L172 56V132L100 170L28 132V56L100 18Z"
        fill="url(#c3-hex)"
      />
      {/* Inner hexagon border glow */}
      <path
        d="M100 30L160 62V126L100 158L40 126V62L100 30Z"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        fill="none"
      />
      {/* F cutout — white negative space */}
      <rect x="75" y="60" width="52" height="6" rx="1" fill="white" />
      <rect x="75" y="60" width="6" height="78" rx="1" fill="white" />
      <rect x="75" y="92" width="38" height="5.5" rx="1" fill="white" />
      {/* Accent corner mark */}
      <circle cx="134" cy="63" r="5" fill="url(#c3-accent)" />
    </svg>
  );
}

function LogoText3() {
  return (
    <div className="flex items-center gap-4">
      <LogoConcept3 size={56} />
      <div>
        <span className="text-3xl font-semibold tracking-[0.15em] text-white" style={{ fontFamily: "var(--font-heading)" }}>
          FLARO
        </span>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-[2px] bg-ember-500 rounded-full" />
          <span className="text-[10px] tracking-[0.4em] text-slate-400 uppercase font-medium">
            Fire Supplies
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONCEPT 4: "The Stacked Typographic"
   Inspired by: Yves Saint Laurent, Balenciaga, Paula Scher
   Pure typography. FLARO stacked with overlapping letters creating a bold
   monolithic wordmark. The "A" features a subtle ember-coloured crossbar.
   No icon — the type IS the logo. Editorial and commanding.
   ───────────────────────────────────────────────────────────────────────────── */
function LogoConcept4({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" width={size * 3.5} height={size}>
      <defs>
        <linearGradient id="c4-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      {/* F */}
      <text x="0" y="62" fill="white" fontSize="72" fontWeight="700" fontFamily="Georgia, serif" letterSpacing="-2">F</text>
      {/* L */}
      <text x="42" y="62" fill="white" fontSize="72" fontWeight="700" fontFamily="Georgia, serif" letterSpacing="-2">L</text>
      {/* A */}
      <text x="86" y="62" fill="white" fontSize="72" fontWeight="700" fontFamily="Georgia, serif" letterSpacing="-2">A</text>
      {/* Ember crossbar on A */}
      <rect x="92" y="38" width="32" height="3.5" rx="1.5" fill="url(#c4-accent)" />
      {/* R */}
      <text x="135" y="62" fill="white" fontSize="72" fontWeight="700" fontFamily="Georgia, serif" letterSpacing="-2">R</text>
      {/* O */}
      <text x="182" y="62" fill="white" fontSize="72" fontWeight="700" fontFamily="Georgia, serif" letterSpacing="-2">O</text>
      {/* Subtle line under */}
      <line x1="0" y1="70" x2="230" y2="70" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Tagline */}
      <text x="0" y="79" fill="#94a3b8" fontSize="8.5" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" letterSpacing="5">FIRE SUPPLIES</text>
    </svg>
  );
}

function LogoText4() {
  return (
    <div className="flex flex-col items-start">
      <LogoConcept4 size={20} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONCEPT 5: "The Circular Seal"
   Inspired by: Versace, Ralph Lauren, Patagonia, heritage crests
   A refined circular seal with the brand name curving around the perimeter,
   a bold "F" monogram in the centre, and subtle gradient accents.
   Communicates trust, establishment, and premium quality.
   ───────────────────────────────────────────────────────────────────────────── */
function LogoConcept5({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="c5-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="c5-accent" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Outer ring */}
      <circle cx="100" cy="100" r="90" stroke="url(#c5-ring)" strokeWidth="2.5" />
      {/* Inner ring */}
      <circle cx="100" cy="100" r="78" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* Decorative dots on ring */}
      <circle cx="100" cy="12" r="3" fill="#06b6d4" />
      <circle cx="100" cy="188" r="3" fill="#06b6d4" />
      <circle cx="12" cy="100" r="2" fill="rgba(6,182,212,0.5)" />
      <circle cx="188" cy="100" r="2" fill="rgba(6,182,212,0.5)" />
      {/* Curved text - FLARO */}
      <path id="c5-top-arc" d="M 40 100 A 60 60 0 0 1 160 100" fill="none" />
      <text fill="white" fontSize="15" fontWeight="600" letterSpacing="8" fontFamily="Georgia, serif">
        <textPath href="#c5-top-arc" startOffset="50%" textAnchor="middle">FLARO</textPath>
      </text>
      {/* Curved text - FIRE SUPPLIES */}
      <path id="c5-bot-arc" d="M 35 110 A 65 65 0 0 0 165 110" fill="none" />
      <text fill="#94a3b8" fontSize="8" fontWeight="500" letterSpacing="4" fontFamily="Inter, system-ui, sans-serif">
        <textPath href="#c5-bot-arc" startOffset="50%" textAnchor="middle">FIRE SUPPLIES</textPath>
      </text>
      {/* Centre F monogram */}
      <text x="100" y="112" textAnchor="middle" fill="white" fontSize="52" fontWeight="700" fontFamily="Georgia, serif">F</text>
      {/* Accent bar through F */}
      <rect x="80" y="97" width="30" height="3" rx="1.5" fill="url(#c5-accent)" />
      {/* Inner decorative circle */}
      <circle cx="100" cy="100" r="42" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
    </svg>
  );
}

function LogoText5() {
  return (
    <div className="flex items-center gap-4">
      <LogoConcept5 size={64} />
      <div className="flex flex-col">
        <span className="text-3xl font-bold tracking-[0.2em] text-white" style={{ fontFamily: "var(--font-heading)" }}>
          FLARO
        </span>
        <span className="text-[10px] tracking-[0.5em] text-cyan-400 uppercase font-medium mt-1">
          Fire Supplies
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONCEPTS PAGE
   ───────────────────────────────────────────────────────────────────────────── */
const concepts = [
  {
    id: 1,
    name: "The Monogram Shield",
    description: "A geometric 'F' enclosed in a protective shield — corporate authority meets modern minimalism. Communicates security, trust, and protection. Inspired by luxury house monograms and premium corporate identities.",
    inspiration: "Chanel, Louis Vuitton, Pentagram",
    icon: LogoConcept1,
    lockup: LogoText1,
    bgAccent: "from-cyan-500/5 to-transparent",
  },
  {
    id: 2,
    name: "The Precision Grid",
    description: "Swiss-design-inspired identity built on a strict mathematical grid. The gradient accent bar transitions from cyan to ember, representing the dual nature of prevention and fire. Clean, authoritative, brutalist-corporate.",
    inspiration: "IBM, Massimo Vignelli, Swiss International Style",
    icon: LogoConcept2,
    lockup: LogoText2,
    bgAccent: "from-cyan-600/5 to-transparent",
  },
  {
    id: 3,
    name: "The Hexagonal Mark",
    description: "A hexagon — the shape of engineering and structural integrity — houses an abstract 'F' in negative space. Bold, tech-forward, and unmistakably premium. The ember accent dot signals alertness and action.",
    inspiration: "Uber, Stripe, Abstract geometric identity systems",
    icon: LogoConcept3,
    lockup: LogoText3,
    bgAccent: "from-teal-500/5 to-transparent",
  },
  {
    id: 4,
    name: "The Stacked Typographic",
    description: "Pure typography — no icon needed. FLARO rendered in commanding serif letterforms with a signature ember crossbar on the 'A'. The type IS the logo. Editorial, bold, and impossible to forget.",
    inspiration: "Yves Saint Laurent, Balenciaga, Paula Scher / Pentagram",
    icon: LogoConcept4,
    lockup: LogoText4,
    bgAccent: "from-orange-500/5 to-transparent",
  },
  {
    id: 5,
    name: "The Circular Seal",
    description: "A refined heritage seal with curved typography and a centred 'F' monogram. Communicates establishment, trust, and premium quality. The cyan ring and ember crossbar maintain the brand's colour language.",
    inspiration: "Versace, Ralph Lauren, Patagonia heritage marks",
    icon: LogoConcept5,
    lockup: LogoText5,
    bgAccent: "from-cyan-400/5 to-transparent",
  },
];

export default function LogoConceptsPage() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-navy-950 pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-sm tracking-[0.3em] uppercase font-medium mb-3">
            Brand Identity Concepts
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Flaro Fire Supplies
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Five cutting-edge logo concepts crafted with world-class design principles.
            Each concept offers a distinct brand personality — from heritage seal to
            brutalist typography.
          </p>
        </div>

        {/* Concepts Grid */}
        <div className="space-y-10">
          {concepts.map((concept) => {
            const IconComponent = concept.icon;
            const LockupComponent = concept.lockup;
            const isSelected = selected === concept.id;

            return (
              <div
                key={concept.id}
                onClick={() => setSelected(isSelected ? null : concept.id)}
                className={`
                  relative rounded-2xl border cursor-pointer transition-all duration-300
                  ${isSelected
                    ? "border-cyan-500/40 bg-navy-900/80 shadow-lg shadow-cyan-500/5"
                    : "border-white/[0.06] bg-navy-900/40 hover:border-white/[0.12] hover:bg-navy-900/60"
                  }
                `}
              >
                {/* Concept number badge */}
                <div className="absolute -top-3 left-6 bg-navy-950 px-3 py-0.5 rounded-full border border-white/[0.08]">
                  <span className="text-xs text-cyan-400 font-semibold tracking-wider">
                    CONCEPT {concept.id}
                  </span>
                </div>

                <div className="p-8 md:p-10">
                  {/* Top row: name + inspiration */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                      {concept.name}
                    </h2>
                    <span className="text-xs text-slate-500 mt-2 md:mt-0">
                      Inspired by: {concept.inspiration}
                    </span>
                  </div>

                  {/* Logo display area */}
                  <div className={`rounded-xl bg-gradient-to-br ${concept.bgAccent} bg-navy-950/60 p-10 mb-8`}>
                    <div className="flex flex-col items-center gap-10">
                      {/* Icon mark at large size */}
                      <div className="flex items-center justify-center">
                        <IconComponent size={concept.id === 4 ? 28 : 100} />
                      </div>

                      {/* Full lockup (icon + text) */}
                      <div className="border-t border-white/[0.06] pt-8 w-full flex justify-center">
                        <LockupComponent />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 leading-relaxed">
                    {concept.description}
                  </p>

                  {/* Dark/Light preview row */}
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-navy-950 border border-white/[0.06] p-6 flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <IconComponent size={concept.id === 4 ? 14 : 36} />
                        <span className="text-white font-semibold tracking-wide text-sm" style={{ fontFamily: "var(--font-heading)" }}>
                          Dark Background
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-6 flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <IconComponent size={concept.id === 4 ? 14 : 36} />
                        <span className="text-navy-950 font-semibold tracking-wide text-sm" style={{ fontFamily: "var(--font-heading)" }}>
                          Light Background
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-6 pt-6 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.7 4.3a.75.75 0 00-1.06-1.06L7 7.88 5.36 6.24a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.09-4.25z" />
                        </svg>
                        Selected — ready for implementation
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="mt-16 text-center">
          <div className="inline-block glass rounded-xl px-8 py-5">
            <p className="text-slate-400 text-sm">
              Click any concept to select it. Each logo is built as a React/SVG component —
              resolution-independent, lightweight, and ready for production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

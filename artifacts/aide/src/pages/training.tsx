/**
 * Training - dry fire technician learning tracks.
 *
 * Two-pane layout:
 *  - Left: track list (FIP, VESDA, EWIS).
 *  - Right: module list plus reader.
 *
 * Modules with ready=true render their ContentBlock body. Everything else
 * shows a coming-soon empty state with the summary, so the catalogue
 * shape is visible even before the content is authored.
 */

import { useState } from "react";
import {
  GraduationCap, Clock, Info, AlertTriangle, Lightbulb,
  ChevronDown, ChevronRight, Flame, Waves, Siren,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookmarkStar } from "@/components/mobile/BookmarkStar";
import { cn } from "@/lib/utils";
import {
  TRACKS,
  modulesForTrack,
  type ContentBlock,
  type Level,
  type TrainingModule,
  type TrackKey,
  type TrainingTrack,
} from "@/data/training-modules";

// ── Track icon map ──────────────────────────────────────────────────────

const TRACK_ICON: Record<TrackKey, LucideIcon> = {
  fip: Flame,
  vesda: Waves,
  ewis: Siren,
  ows: Siren,
};

// ── Level badge ─────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<Level, { label: string; className: string }> = {
  beginner: {
    label: "Beginner",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  intermediate: {
    label: "Intermediate",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  expert: {
    label: "Expert",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  },
};

function LevelBadge({ level }: { level: Level }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

// ── Inline FIP block diagram ────────────────────────────────────────────

function FipBlockDiagram() {
  // Colour tokens reference the Tailwind theme via CSS vars so the diagram
  // tracks light/dark and accent palette changes.
  const stroke = "hsl(var(--border))";
  const labelFill = "hsl(var(--foreground))";
  const boxFill = "hsl(var(--card))";
  const accent = "hsl(var(--primary))";

  return (
    <div className="my-4 rounded-lg border border-border bg-card/40 p-4">
      <svg
        viewBox="0 0 640 360"
        className="w-full h-auto"
        role="img"
        aria-label="FIP block diagram"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>

        {/* CPU (centre) */}
        <rect x="260" y="150" width="120" height="60" rx="6"
          fill={boxFill} stroke={accent} strokeWidth="2" />
        <text x="320" y="180" textAnchor="middle" fontSize="13" fontWeight="600" fill={labelFill}>CPU</text>
        <text x="320" y="196" textAnchor="middle" fontSize="10" fill={labelFill} opacity="0.7">Logic board</text>

        {/* PSU (top-left) */}
        <rect x="40" y="40" width="140" height="60" rx="6"
          fill={boxFill} stroke={stroke} strokeWidth="1.5" />
        <text x="110" y="70" textAnchor="middle" fontSize="12" fontWeight="600" fill={labelFill}>Power Supply</text>
        <text x="110" y="86" textAnchor="middle" fontSize="9" fill={labelFill} opacity="0.7">Mains + battery</text>

        {/* Detection loops (left) */}
        <rect x="40" y="150" width="140" height="60" rx="6"
          fill={boxFill} stroke={stroke} strokeWidth="1.5" />
        <text x="110" y="180" textAnchor="middle" fontSize="12" fontWeight="600" fill={labelFill}>Detection Loops</text>
        <text x="110" y="196" textAnchor="middle" fontSize="9" fill={labelFill} opacity="0.7">Conv. zones / addr.</text>

        {/* Supervision (bottom-left) */}
        <rect x="40" y="260" width="140" height="60" rx="6"
          fill={boxFill} stroke={stroke} strokeWidth="1.5" />
        <text x="110" y="290" textAnchor="middle" fontSize="12" fontWeight="600" fill={labelFill}>Supervision</text>
        <text x="110" y="306" textAnchor="middle" fontSize="9" fill={labelFill} opacity="0.7">EOL / earth / battery</text>

        {/* HMI (top-right) */}
        <rect x="460" y="40" width="140" height="60" rx="6"
          fill={boxFill} stroke={stroke} strokeWidth="1.5" />
        <text x="530" y="70" textAnchor="middle" fontSize="12" fontWeight="600" fill={labelFill}>HMI</text>
        <text x="530" y="86" textAnchor="middle" fontSize="9" fill={labelFill} opacity="0.7">LEDs / LCD / keypad</text>

        {/* Outputs (right) */}
        <rect x="460" y="150" width="140" height="60" rx="6"
          fill={boxFill} stroke={stroke} strokeWidth="1.5" />
        <text x="530" y="180" textAnchor="middle" fontSize="12" fontWeight="600" fill={labelFill}>Outputs</text>
        <text x="530" y="196" textAnchor="middle" fontSize="9" fill={labelFill} opacity="0.7">OWS / brigade / aux</text>

        {/* Monitoring circuits (bottom-right) */}
        <rect x="460" y="260" width="140" height="60" rx="6"
          fill={boxFill} stroke={stroke} strokeWidth="1.5" />
        <text x="530" y="290" textAnchor="middle" fontSize="12" fontWeight="600" fill={labelFill}>Sounder Ckts</text>
        <text x="530" y="306" textAnchor="middle" fontSize="9" fill={labelFill} opacity="0.7">Monitored outputs</text>

        {/* Connectors - PSU feeds CPU */}
        <line x1="180" y1="70" x2="260" y2="165" stroke={stroke} strokeWidth="1.5"
          markerEnd="url(#arrow)" />

        {/* Loops <-> CPU */}
        <line x1="180" y1="180" x2="260" y2="180" stroke={stroke} strokeWidth="1.5"
          markerStart="url(#arrow)" markerEnd="url(#arrow)" />

        {/* Supervision -> CPU */}
        <line x1="180" y1="290" x2="260" y2="200" stroke={stroke} strokeWidth="1.5"
          markerEnd="url(#arrow)" />

        {/* CPU -> HMI */}
        <line x1="380" y1="165" x2="460" y2="70" stroke={stroke} strokeWidth="1.5"
          markerEnd="url(#arrow)" />

        {/* CPU -> Outputs */}
        <line x1="380" y1="180" x2="460" y2="180" stroke={stroke} strokeWidth="1.5"
          markerEnd="url(#arrow)" />

        {/* CPU -> Sounder */}
        <line x1="380" y1="200" x2="460" y2="290" stroke={stroke} strokeWidth="1.5"
          markerEnd="url(#arrow)" />
      </svg>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground/70 text-center">
        Six blocks present in every FIP regardless of manufacturer.
      </p>
    </div>
  );
}

// ── ContentBlock renderer ───────────────────────────────────────────────

interface CalloutPalette {
  bg: string;
  border: string;
  text: string;
  Icon: LucideIcon;
}

const CALLOUT_PALETTE: Record<"info" | "warn" | "tip", CalloutPalette> = {
  info: { bg: "bg-sky-500/8",     border: "border-sky-500/30",     text: "text-sky-700 dark:text-sky-300",     Icon: Info },
  warn: { bg: "bg-amber-500/8",   border: "border-amber-500/30",   text: "text-amber-700 dark:text-amber-300", Icon: AlertTriangle },
  tip:  { bg: "bg-emerald-500/8", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300", Icon: Lightbulb },
};

function Callout({
  tone, title, body,
}: { tone: "info" | "warn" | "tip"; title: string; body: string }) {
  const { bg, border, text, Icon } = CALLOUT_PALETTE[tone];
  return (
    <div className={cn("my-4 rounded-lg border p-4", bg, border)}>
      <div className={cn("flex items-center gap-1.5 mb-1 font-mono text-[10px] uppercase tracking-wider", text)}>
        <Icon size={11} />
        <span>{title}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}

function CheckYourself({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-4 rounded-lg border border-border bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary/70 mb-1">
            Check yourself
          </div>
          <p className="text-[13px] leading-relaxed text-foreground">{question}</p>
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Answer
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/90">{answer}</p>
        </div>
      )}
    </div>
  );
}

function RenderBlock({ block }: { block: ContentBlock }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2 className="mt-6 mb-3 text-[16px] font-bold tracking-tight text-foreground">
          {block.text}
        </h2>
      );
    case "p":
      return (
        <p className="my-3 text-[13px] leading-relaxed text-foreground/90">
          {block.text}
        </p>
      );
    case "bullets":
      return (
        <ul className="my-3 space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/90">
              <span className="text-primary/60 shrink-0 mt-0.5">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "numbered":
      return (
        <ol className="my-3 space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-foreground/90">
              <span className="font-mono text-[11px] text-primary/80 tabular-nums shrink-0 pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return <Callout tone={block.tone} title={block.title} body={block.body} />;
    case "table":
      return (
        <div className="my-4 rounded-lg border border-border bg-card/30 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground/90 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <pre className="my-4 rounded-lg border border-border bg-muted/40 p-3 overflow-x-auto">
          <code className="font-mono text-[12px] text-foreground/90">{block.text}</code>
        </pre>
      );
    case "diagram":
      if (block.diagram === "fip-block") return <FipBlockDiagram />;
      return null;
    case "check-yourself":
      return <CheckYourself question={block.question} answer={block.answer} />;
    default: {
      // Exhaustiveness check.
      const _exhaustive: never = block;
      return null;
    }
  }
}

// ── Module reader ───────────────────────────────────────────────────────

function ModuleReader({ module }: { module: TrainingModule }) {
  if (!module.ready) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-card/30 p-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Coming soon
        </div>
        <h2 className="text-[16px] font-bold tracking-tight text-foreground mb-2">
          {module.title}
        </h2>
        <p className="text-[13px] leading-relaxed text-foreground/80">{module.summary}</p>
        <p className="mt-4 font-mono text-[10px] text-muted-foreground/70">
          This module is scaffolded but not yet authored. Content is authored
          per-module in /src/data/training-modules.ts.
        </p>
      </div>
    );
  }

  return (
    <article key={module.id} className="message-rise">
      <header className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <LevelBadge level={module.level} />
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <Clock size={10} /> ~{module.durationMin} min
          </span>
          <BookmarkStar kind="module" refId={module.id} label={module.title} className="ml-auto -my-2" />
        </div>
        <h1 className="text-[20px] font-bold tracking-tight text-foreground mb-1">
          {module.title}
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{module.summary}</p>
      </header>
      <div className="border-t border-border pt-2">
        {module.blocks.map((block, i) => (
          <RenderBlock key={i} block={block} />
        ))}
      </div>
    </article>
  );
}

// ── Track / module navigation ───────────────────────────────────────────

function TrackRail({
  tracks, activeKey, onSelect,
}: {
  tracks: TrainingTrack[];
  activeKey: TrackKey;
  onSelect: (k: TrackKey) => void;
}) {
  return (
    <nav className="space-y-1.5">
      {tracks.map((t) => {
        const Icon = TRACK_ICON[t.key];
        const active = t.key === activeKey;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className={cn(
              "w-full text-left rounded-lg border p-3 transition-all",
              active
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card hover:border-border/80 hover:bg-muted/20",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className={active ? "text-primary" : "text-muted-foreground"} />
              <span className={cn(
                "text-[13px] font-semibold tracking-tight",
                active ? "text-foreground" : "text-foreground/80",
              )}>
                {t.title}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t.tagline}
            </p>
          </button>
        );
      })}
    </nav>
  );
}

function ModuleList({
  modules, activeId, onSelect,
}: {
  modules: TrainingModule[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {modules.map((m) => {
        const active = m.id === activeId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "w-full text-left rounded-md px-2.5 py-2 transition-colors",
              active
                ? "bg-primary/5 text-foreground"
                : "hover:bg-muted/30 text-foreground/80 hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <LevelBadge level={m.level} />
              {!m.ready && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                  soon
                </span>
              )}
            </div>
            <div className="text-[12px] font-medium leading-snug">{m.title}</div>
          </button>
        );
      })}
    </nav>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function Training() {
  const [activeTrack, setActiveTrack] = useState<TrackKey>("fip");
  const modules = modulesForTrack(activeTrack);
  const [activeModuleId, setActiveModuleId] = useState<string>(
    modules.find((m) => m.ready)?.id ?? modules[0]?.id ?? "",
  );

  function handleTrackChange(key: TrackKey) {
    setActiveTrack(key);
    const next = modulesForTrack(key);
    const firstReady = next.find((m) => m.ready)?.id ?? next[0]?.id ?? "";
    setActiveModuleId(firstReady);
  }

  const activeModule = modules.find((m) => m.id === activeModuleId);

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="~"
        title="Training"
        subtitle="Field-voice learning tracks for dry fire technicians"
      />

      <div className="px-4 sm:px-6 py-5 max-w-[1280px]">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_260px_1fr] gap-5">
          {/* Track rail */}
          <aside>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 px-1">
              Tracks
            </div>
            <TrackRail
              tracks={TRACKS}
              activeKey={activeTrack}
              onSelect={handleTrackChange}
            />
          </aside>

          {/* Module list */}
          <aside>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 px-1">
              Modules
            </div>
            <ModuleList
              modules={modules}
              activeId={activeModuleId}
              onSelect={setActiveModuleId}
            />
          </aside>

          {/* Reader */}
          <section className="min-w-0">
            {activeModule ? (
              <ModuleReader module={activeModule} />
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-card/30 p-8 text-center">
                <GraduationCap size={20} className="mx-auto text-muted-foreground/60 mb-2" />
                <p className="font-mono text-[11px] text-muted-foreground">
                  Select a module to begin.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

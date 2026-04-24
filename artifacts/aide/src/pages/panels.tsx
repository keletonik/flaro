/**
 * Panels - reference pages for dry fire FIP manufacturers and models.
 *
 * Two-pane layout:
 *  - Left: brand rail with confidence badges.
 *  - Right: selected brand overview + model list + per-model detail.
 *
 * Pure client-side data from @/data/panel-brands. No backend calls.
 * Content is authored architectural reference, not a manual replacement -
 * the panel's current installation manual is always authoritative.
 */

import { useMemo, useState } from "react";
import {
  Cpu, Info, AlertTriangle, Wrench, BookOpen, ExternalLink,
  ChevronRight, ChevronDown, ShieldCheck, Factory, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import {
  BRANDS,
  MODELS,
  modelsForBrand,
  type Brand,
  type Confidence,
  type LifecycleStatus,
  type PanelCategory,
  type PanelModel,
} from "@/data/panel-brands";

// ── Badges ──────────────────────────────────────────────────────────────

const CONFIDENCE_STYLE: Record<Confidence, { label: string; className: string; hint: string }> = {
  verified: {
    label: "Verified",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    hint: "Content sourced directly from an authoritative manual or confirmed on site.",
  },
  general: {
    label: "General",
    className: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    hint: "General architectural reference. Always verify against the panel's current manual before site work.",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    hint: "Brand entry present; authoritative model and fault content pending a confirmed source.",
  },
};

const STATUS_STYLE: Record<LifecycleStatus, string> = {
  current: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  legacy: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  discontinued: "bg-muted text-muted-foreground border-border",
};

const CATEGORY_LABEL: Record<PanelCategory, string> = {
  conventional: "Conventional",
  addressable: "Addressable",
  hybrid: "Hybrid",
  aspirating: "Aspirating",
  ewis: "EWIS",
};

function ConfidenceBadge({ level }: { level: Confidence }) {
  const s = CONFIDENCE_STYLE[level];
  return (
    <span
      title={s.hint}
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: LifecycleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        STATUS_STYLE[status],
      )}
    >
      {status}
    </span>
  );
}

// ── Section primitive ───────────────────────────────────────────────────

function Section({
  icon: Icon, label, children,
}: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-primary/70" />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </h3>
      </div>
      <div className="rounded-lg border border-border bg-card/50 p-4">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex gap-2 text-[13px] leading-relaxed text-foreground/90"
        >
          <span className="text-primary/60 shrink-0 mt-0.5">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Model detail ────────────────────────────────────────────────────────

function ModelDetail({ model }: { model: PanelModel }) {
  return (
    <article className="mt-3">
      <header className="mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h2 className="text-[16px] font-bold tracking-tight text-foreground">
            {model.name}
          </h2>
          <StatusBadge status={model.status} />
          <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABEL[model.category]}
          </span>
          <ConfidenceBadge level={model.confidence} />
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground mb-2">
          {model.summary}
        </p>
        <p className="font-mono text-[11px] text-foreground/80 leading-relaxed">
          {model.capacity}
        </p>
      </header>

      <Section icon={Wrench} label="Commissioning notes">
        <BulletList items={model.commissioningNotes} />
      </Section>

      <Section icon={Cpu} label="Wiring quirks">
        <BulletList items={model.wiringQuirks} />
      </Section>

      <Section icon={ShieldCheck} label="Programming notes">
        <BulletList items={model.programmingNotes} />
      </Section>

      <Section icon={AlertTriangle} label="Common fault hints">
        <ul className="space-y-3">
          {model.commonFaults.map((f, i) => (
            <li key={i}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-primary/80">
                  {f.code}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/90">
                {f.meaning}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                First check: {f.firstCheck}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={BookOpen} label="Manual pointer">
        <p className="text-[13px] leading-relaxed text-foreground/90">
          {model.manualHint}
        </p>
      </Section>
    </article>
  );
}

// ── Brand overview + model list ─────────────────────────────────────────

function BrandOverview({ brand }: { brand: Brand }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h2 className="text-[18px] font-bold tracking-tight text-foreground">
          {brand.name}
        </h2>
        <ConfidenceBadge level={brand.confidence} />
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Factory size={10} /> {brand.country}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground mb-3">
        {brand.marketNote}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Section icon={Cpu} label="Product lines">
          <ul className="flex flex-wrap gap-1.5">
            {brand.productLines.map((p, i) => (
              <li
                key={i}
                className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-foreground/80"
              >
                {p}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={ShieldCheck} label="Strengths">
          <BulletList items={brand.strengths} />
        </Section>
      </div>

      <Section icon={AlertTriangle} label="Gotchas">
        <BulletList items={brand.gotchas} />
      </Section>

      <Section icon={Info} label="Support and documentation">
        <p className="text-[13px] leading-relaxed text-foreground/90 mb-2">
          {brand.supportNote}
        </p>
        {brand.officialSite ? (
          <a
            href={brand.officialSite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
          >
            <ExternalLink size={11} />
            <span>{brand.officialSite.replace(/^https?:\/\//, "")}</span>
          </a>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground/70">
            Official site link pending confirmation.
          </span>
        )}
      </Section>
    </div>
  );
}

function ModelList({
  models, activeId, onSelect,
}: { models: PanelModel[]; activeId: string | null; onSelect: (id: string) => void }) {
  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-card/30 p-6 text-center">
        <p className="font-mono text-[11px] text-muted-foreground">
          Model entries pending. Brand overview is available above.
        </p>
      </div>
    );
  }

  return (
    <nav className="space-y-1">
      {models.map((m) => {
        const active = m.id === activeId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "w-full text-left rounded-md px-2.5 py-2 transition-colors flex items-start gap-2",
              active
                ? "bg-primary/5 text-foreground"
                : "hover:bg-muted/30 text-foreground/80 hover:text-foreground",
            )}
          >
            <span className="shrink-0 mt-0.5 text-muted-foreground">
              {active ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-[12px] font-semibold">{m.name}</span>
                <StatusBadge status={m.status} />
              </div>
              <div className="font-mono text-[10px] text-muted-foreground/80">
                {CATEGORY_LABEL[m.category]}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

// ── Brand rail ──────────────────────────────────────────────────────────

function BrandRail({
  brands, activeId, onSelect,
}: { brands: Brand[]; activeId: string; onSelect: (id: string) => void }) {
  const modelCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of MODELS) map.set(m.brandId, (map.get(m.brandId) ?? 0) + 1);
    return map;
  }, []);

  return (
    <nav className="space-y-1.5">
      {brands.map((b) => {
        const active = b.id === activeId;
        const n = modelCount.get(b.id) ?? 0;
        return (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={cn(
              "w-full text-left rounded-lg border p-3 transition-all",
              active
                ? "border-primary/60 bg-primary/5"
                : "border-border bg-card hover:border-border/80 hover:bg-muted/20",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={cn(
                "text-[13px] font-semibold tracking-tight",
                active ? "text-foreground" : "text-foreground/80",
              )}>
                {b.name}
              </span>
              <ConfidenceBadge level={b.confidence} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {b.country}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {n} {n === 1 ? "model" : "models"}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function Panels() {
  const [activeBrandId, setActiveBrandId] = useState<string>(BRANDS[0]?.id ?? "");
  const activeBrand = BRANDS.find((b) => b.id === activeBrandId);
  const models = modelsForBrand(activeBrandId);
  const [activeModelId, setActiveModelId] = useState<string | null>(
    models[0]?.id ?? null,
  );

  function handleBrandChange(id: string) {
    setActiveBrandId(id);
    const next = modelsForBrand(id);
    setActiveModelId(next[0]?.id ?? null);
  }

  const activeModel = models.find((m) => m.id === activeModelId);

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="~"
        title="Panels"
        subtitle={`Manufacturer and model reference for dry fire FIPs · ${BRANDS.length} brands · ${MODELS.length} models`}
      />

      <div className="px-4 sm:px-6 py-5 max-w-[1400px]">
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 mb-5">
          <p className="text-[12px] leading-relaxed text-foreground/90">
            Architectural reference authored in tech voice. The panel's
            current installation and programming manual is always the
            authoritative source - verify specifics before any site work.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_240px_1fr] gap-5">
          <aside>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 px-1">
              Brands
            </div>
            <BrandRail
              brands={BRANDS}
              activeId={activeBrandId}
              onSelect={handleBrandChange}
            />
          </aside>

          <aside>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 px-1">
              Models
            </div>
            <ModelList
              models={models}
              activeId={activeModelId}
              onSelect={setActiveModelId}
            />
          </aside>

          <section className="min-w-0">
            {activeBrand && <BrandOverview brand={activeBrand} />}
            {activeModel && <ModelDetail model={activeModel} />}
          </section>
        </div>
      </div>
    </div>
  );
}

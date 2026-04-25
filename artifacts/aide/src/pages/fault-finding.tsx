/**
 * Fault Finding - realistic field troubleshooting for dry fire systems.
 *
 * Two states in one page:
 *  - List: category chips, search, grid of scenario cards.
 *  - Detail: a single scenario rendered in the order a tech would work it
 *    (symptoms -> causes -> field procedure -> gotchas -> safety).
 *
 * Pure client-side data from @/data/fault-scenarios. No backend calls.
 */

import { useMemo, useState } from "react";
import {
  Wrench, ChevronLeft, Clock, Gauge, Search, AlertTriangle,
  ListOrdered, ShieldAlert, Lightbulb, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  SCENARIOS,
  scenarioById,
  type Category,
  type Difficulty,
  type FaultScenario,
} from "@/data/fault-scenarios";

// ── Utility ─────────────────────────────────────────────────────────────

const DIFFICULTY_STYLE: Record<Difficulty, { label: string; className: string }> = {
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

function DifficultyBadge({ level }: { level: Difficulty }) {
  const s = DIFFICULTY_STYLE[level];
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

function CategoryChip({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "font-mono text-[9px] tabular-nums",
          active ? "text-primary-foreground/80" : "text-muted-foreground/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ── Scenario card ───────────────────────────────────────────────────────

function ScenarioCard({
  scenario, onOpen,
}: { scenario: FaultScenario; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          {scenario.category}
        </span>
        <DifficultyBadge level={scenario.difficulty} />
      </div>
      <h3 className="text-[14px] font-bold tracking-tight mb-1 text-foreground">
        {scenario.title}
      </h3>
      <p className="text-[12px] leading-relaxed text-muted-foreground mb-3">
        {scenario.summary}
      </p>
      <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/70">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} /> ~{scenario.estimatedTimeMin} min
        </span>
        <span className="inline-flex items-center gap-1">
          <Gauge size={10} /> {scenario.likelyCauses.length} causes
        </span>
        <span className="inline-flex items-center gap-1">
          <ListOrdered size={10} /> {scenario.fieldProcedure.length} steps
        </span>
      </div>
    </button>
  );
}

// ── Section primitives for detail view ──────────────────────────────────

function Section({
  icon: Icon, label, children, delay = 0,
}: { icon: LucideIcon; label: string; children: React.ReactNode; delay?: number }) {
  return (
    <section
      className="mb-6 message-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-primary/70" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </h2>
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
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/90">
          <span className="text-primary/60 shrink-0 mt-0.5">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Detail view ─────────────────────────────────────────────────────────

function ScenarioDetail({
  scenario, onBack,
}: { scenario: FaultScenario; onBack: () => void }) {
  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="~/fault-finding"
        title={scenario.title}
        subtitle={`${scenario.category} · ${scenario.estimatedTimeMin} min · ${DIFFICULTY_STYLE[scenario.difficulty].label}`}
        actions={
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft size={12} />
            <span>Back</span>
          </button>
        }
      />

      <div className="px-4 sm:px-6 py-5 max-w-[920px]">
        <p className="text-[14px] leading-relaxed text-foreground/90 mb-6">
          {scenario.summary}
        </p>

        <Section icon={AlertTriangle} label="Symptoms on arrival" delay={0}>
          <BulletList items={scenario.symptoms} />
        </Section>

        <Section icon={Lightbulb} label="Likely causes (ranked)" delay={60}>
          <ol className="space-y-4">
            {scenario.likelyCauses.map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-[11px] text-primary/80 tabular-nums shrink-0 pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground mb-0.5">
                    {c.cause}
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {c.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={ListOrdered} label="Field procedure" delay={120}>
          <ol className="space-y-3">
            {scenario.fieldProcedure.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-[11px] text-primary/80 tabular-nums shrink-0 pt-0.5 w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-relaxed text-foreground/90">
                    {step.action}
                  </p>
                  {step.tool && (
                    <div className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80 bg-muted/40 rounded px-2 py-0.5">
                      <Wrench size={9} />
                      <span>{step.tool}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={AlertTriangle} label="Gotchas" delay={180}>
          <BulletList items={scenario.gotchas} />
        </Section>

        <Section icon={ShieldAlert} label="Safety" delay={240}>
          <BulletList items={scenario.safety} />
        </Section>

        <div className="mt-8 pb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft size={12} />
            <span>Back to all scenarios</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── List view ───────────────────────────────────────────────────────────

export default function FaultFinding() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");

  const byCategory = useMemo(() => {
    const map = new Map<Category, number>();
    for (const c of CATEGORIES) map.set(c, 0);
    for (const s of SCENARIOS) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCENARIOS.filter((s) => {
      if (activeCategory !== "All" && s.category !== activeCategory) return false;
      if (!q) return true;
      const hay = [s.title, s.summary, ...s.symptoms].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [activeCategory, query]);

  if (selectedId) {
    const scenario = scenarioById(selectedId);
    if (scenario) {
      return <ScenarioDetail scenario={scenario} onBack={() => setSelectedId(null)} />;
    }
  }

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="~"
        title="Fault Finding"
        subtitle={`Field troubleshooting for dry fire systems · ${SCENARIOS.length} scenarios`}
      />

      <div className="px-4 sm:px-6 py-5 max-w-[1280px]">
        <div className="mb-5 space-y-3">
          <div className="relative max-w-lg">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles or symptoms..."
              className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <CategoryChip
              label="All"
              active={activeCategory === "All"}
              onClick={() => setActiveCategory("All")}
              count={SCENARIOS.length}
            />
            {CATEGORIES.map((cat) => {
              const n = byCategory.get(cat) ?? 0;
              if (n === 0) return null;
              return (
                <CategoryChip
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  count={n}
                />
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/30 p-12 text-center">
            <p className="font-mono text-[11px] text-muted-foreground">
              No scenarios match the current filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                onOpen={() => setSelectedId(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

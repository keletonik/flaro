/**
 * Detector type card and detail panel.
 *
 * Lives inside the FIP page's main content area. Renders the master
 * library entries from /api/fip/detector-types — first as a grid of
 * cards (browse), then as a deep-dive panel when one is selected.
 *
 * Every section maps to a database column on fip_detector_types so
 * the card content is whatever the seed file defines.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Search, ChevronLeft, AlertTriangle, CheckCircle, Wrench,
  BookOpen, Loader2, Flame, Thermometer, Cloud, Wind, Radio,
  Bell, Cable, ScanSearch, Package
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DetectorType {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  operatingPrinciple: string;
  sensingTechnology: string;
  typicalApplications: string[];
  unsuitableApplications: string[];
  installationRequirements: string;
  failureModes: Array<{ mode: string; symptom: string; cause: string; action: string }>;
  testProcedure: string;
  maintenance: string;
  standardsRefs: Array<{ code: string; clause?: string; note: string }>;
  exampleModels: Array<{ manufacturer: string; model: string; partNumber?: string; notes?: string }>;
  lifeSpanYears?: number;
  costBand?: string;
  addressable?: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Cloud> = {
  smoke: Cloud,
  heat: Thermometer,
  flame: Flame,
  gas: Wind,
  aspirating: ScanSearch,
  beam: Radio,
  duct: Wind,
  multi: Package,
  manual_call_point: Bell,
  linear: Cable,
};

const CATEGORY_COLORS: Record<string, string> = {
  smoke: "bg-blue-500/10 text-blue-500",
  heat: "bg-orange-500/10 text-orange-500",
  flame: "bg-red-500/10 text-red-500",
  gas: "bg-yellow-500/10 text-yellow-500",
  aspirating: "bg-purple-500/10 text-purple-500",
  beam: "bg-cyan-500/10 text-cyan-500",
  duct: "bg-teal-500/10 text-teal-500",
  multi: "bg-emerald-500/10 text-emerald-500",
  manual_call_point: "bg-rose-500/10 text-rose-500",
  linear: "bg-indigo-500/10 text-indigo-500",
};

interface BrowseProps {
  onSelect: (detector: DetectorType) => void;
}

export function FipDetectorTypeBrowser({ onSelect }: BrowseProps) {
  const [items, setItems] = useState<DetectorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    apiFetch<DetectorType[]>(`/fip/detector-types${params.toString() ? "?" + params.toString() : ""}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, category]);

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search detector types, technology, AS standards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All categories</option>
          {Object.keys(CATEGORY_ICONS).map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No detector types match. Try a broader search or check the FIP feature flag.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((d) => {
            const Icon = CATEGORY_ICONS[d.category] ?? Package;
            const color = CATEGORY_COLORS[d.category] ?? "bg-muted text-muted-foreground";
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">{d.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{d.category.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{d.summary}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {d.lifeSpanYears && <span>{d.lifeSpanYears}y life</span>}
                  {d.costBand && <span>· {d.costBand}</span>}
                  {d.addressable !== undefined && <span>· {d.addressable ? "addressable" : "conventional"}</span>}
                  <span className="ml-auto text-primary font-medium">View →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DetailProps {
  detector: DetectorType;
  onBack: () => void;
}

export function FipDetectorTypeDetail({ detector, onBack }: DetailProps) {
  const Icon = CATEGORY_ICONS[detector.category] ?? Package;
  const color = CATEGORY_COLORS[detector.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to library
      </button>

      <header className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {detector.category.replace(/_/g, " ")}
            </p>
            <h1 className="text-2xl font-bold text-foreground mt-1">{detector.name}</h1>
            <p className="text-sm text-muted-foreground mt-2">{detector.summary}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {detector.lifeSpanYears && <span><b className="text-foreground">{detector.lifeSpanYears}y</b> life span</span>}
              {detector.costBand && <span><b className="text-foreground">{detector.costBand}</b> cost band</span>}
              {detector.addressable !== undefined && (
                <span className={cn(detector.addressable ? "text-emerald-500" : "text-muted-foreground")}>
                  {detector.addressable ? "Addressable" : "Conventional"}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <Section icon={ScanSearch} title="Operating principle">
        <p className="text-sm leading-relaxed">{detector.operatingPrinciple}</p>
      </Section>

      <Section icon={Wrench} title="Sensing technology">
        <p className="text-sm leading-relaxed">{detector.sensingTechnology}</p>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section icon={CheckCircle} title="Typical applications" tone="emerald">
          <ul className="space-y-1.5 text-sm">
            {detector.typicalApplications.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={AlertTriangle} title="Unsuitable applications" tone="red">
          <ul className="space-y-1.5 text-sm">
            {detector.unsuitableApplications.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 shrink-0">✗</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section icon={Wrench} title="Installation requirements">
        <p className="text-sm leading-relaxed">{detector.installationRequirements}</p>
      </Section>

      <Section icon={AlertTriangle} title="Failure modes">
        <div className="space-y-3">
          {detector.failureModes.map((f, i) => (
            <div key={i} className="border border-border rounded-lg p-3 bg-muted/20">
              <p className="text-sm font-semibold text-foreground">{f.mode}</p>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Symptom:</span> {f.symptom}</div>
                <div><span className="text-muted-foreground">Cause:</span> {f.cause}</div>
                <div><span className="text-muted-foreground">Action:</span> {f.action}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section icon={CheckCircle} title="Test procedure">
          <p className="text-sm leading-relaxed">{detector.testProcedure}</p>
        </Section>
        <Section icon={Wrench} title="Maintenance">
          <p className="text-sm leading-relaxed">{detector.maintenance}</p>
        </Section>
      </div>

      <Section icon={BookOpen} title="Australian Standards references">
        <ul className="space-y-2 text-sm">
          {detector.standardsRefs.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-mono text-[11px] shrink-0">
                {s.code}{s.clause ? ` §${s.clause}` : ""}
              </span>
              <span>{s.note}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Package} title="Example models">
        <div className="grid sm:grid-cols-2 gap-2">
          {detector.exampleModels.map((m, i) => (
            <div key={i} className="border border-border rounded-lg p-2.5 bg-muted/20">
              <p className="text-xs font-semibold text-foreground">{m.manufacturer} {m.model}</p>
              {m.partNumber && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{m.partNumber}</p>}
              {m.notes && <p className="text-[11px] text-muted-foreground mt-1">{m.notes}</p>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Cloud;
  title: string;
  tone?: "emerald" | "red";
  children: React.ReactNode;
}) {
  const toneColor =
    tone === "emerald" ? "text-emerald-500" : tone === "red" ? "text-red-500" : "text-primary";
  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-4 h-4", toneColor)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}
/**
 * FIP Knowledge Base — task-oriented redesign.
 *
 * Previous version was 8 tabs + a permanent 400px chat sidebar. A tech
 * in the field doesn't navigate tabs; they look up a panel, calculate a
 * battery, check a standard, analyse a defect photo. This layout puts
 * those four tools on the page directly and tucks the reference
 * datasets (manufacturers / models / standards / documents / detectors
 * / networking / config analysis) into a single search bar at the top
 * plus an accordion at the bottom.
 *
 * The AIDE PA tray (⌘+.) now handles chat. The old FipAssistantChat
 * sidebar is gone from this page — same chat model, accessed from the
 * same tray that every other page uses.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Shield, FileText, BookOpen, Building2, Cpu, Loader2, AlertTriangle,
  Search, ExternalLink, Network, FileCog, ChevronDown, X, Mic, Camera,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useVoiceInput } from "@/lib/speech";
import { PanelIdCapture } from "@/components/mobile/PanelIdCapture";
import { isCameraAvailable } from "@/lib/camera";
import { Bookmarks } from "@/components/mobile/Bookmarks";
import { MyManuals } from "@/components/mobile/MyManuals";
import {
  FipDetectorTypeBrowser,
  FipDetectorTypeDetail,
  type DetectorType,
} from "@/components/FipDetectorTypeCard";
import {
  PanelTechnicalCard,
  type PanelSpec,
} from "@/components/fip/PanelTechnicalCard";
import { CommonProductsCard } from "@/components/fip/CommonProductsCard";
import { BatteryCalculatorCard } from "@/components/fip/BatteryCalculatorCard";
import { DefectImageAnalysisCard } from "@/components/fip/DefectImageAnalysisCard";
import { FipNetworkingGuide } from "@/components/fip/FipNetworkingGuide";
import { FipConfigAnalysisCard } from "@/components/fip/FipConfigAnalysisCard";

// ── Data shapes ──────────────────────────────────────────────────────────

interface Manufacturer {
  id: string; name: string; slug: string; country?: string;
  website?: string; notes?: string;
}

interface FipModel {
  id: string; name: string; slug: string; manufacturerId: string;
  familyId?: string; modelNumber?: string; status?: string;
  description?: string;
}

interface ProductFamily {
  id: string; name: string; slug: string; manufacturerId: string;
  category?: string; description?: string;
}

interface FipStandard {
  id: string; code: string; title: string; jurisdiction?: string;
  category?: string; currentVersion?: string; url?: string; notes?: string;
}

interface FipDocument {
  id: string; title: string; manufacturerId?: string; category?: string;
  url?: string;
}

interface FipStatus {
  enabled: boolean;
  counts?: {
    manufacturers: number; models: number; components: number;
    faultSignatures: number; sessions: number; escalations: number;
  };
}

// ── Section header primitive ────────────────────────────────────────────

function SectionHeader({ label, count, icon: Icon, right }: {
  label: string; count?: number; icon?: LucideIcon; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2 px-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} className="text-primary/70" />}
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
        {count !== undefined && (
          <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">· {count}</span>
        )}
      </div>
      {right}
    </div>
  );
}

// ── Reference accordion item ────────────────────────────────────────────

function ReferenceSection({
  icon: Icon, label, count, children, defaultOpen = false,
}: {
  icon: LucideIcon; label: string; count?: number;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon size={14} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {count !== undefined && (
              <p className="font-mono text-[10px] text-muted-foreground tabular-nums">{count} entries</p>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}

// ── Global search input with voice input ──────────────────────────────

function FipGlobalSearch({
  search, setSearch,
}: { search: string; setSearch: (v: string) => void }) {
  const voice = useVoiceInput();

  // When the recogniser finishes a phrase, swap into the search field
  // and reset the hook so the next press starts fresh.
  useEffect(() => {
    if (voice.state === "confirm" && voice.transcript) {
      setSearch(voice.transcript);
      voice.accept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.state]);

  // Show interim transcript live in the field while the user is speaking.
  const showInterim = voice.state === "listening" && voice.transcript;
  const display = showInterim ? voice.transcript : search;

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="text"
        value={display}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search panels, manufacturers, standards, documents..."
        className="w-full pl-10 pr-20 py-2.5 rounded-lg bg-card border border-border text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px]"
        aria-busy={voice.state === "listening"}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={12} />
          </button>
        )}
        {voice.available && (
          <button
            type="button"
            onClick={() => (voice.state === "listening" ? voice.stop() : voice.start())}
            aria-label={voice.state === "listening" ? "Stop voice search" : "Voice search"}
            title={voice.state === "listening" ? "Stop voice search" : "Voice search"}
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors",
              voice.state === "listening"
                ? "bg-primary text-primary-foreground warm-glow"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <Mic size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Unified search results (when the search input has text) ─────────────

interface SearchHit {
  kind: "manufacturer" | "model" | "standard" | "document";
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
}

function SearchResults({
  hits, onClear,
}: { hits: SearchHit[]; onClear: () => void }) {
  const groups = useMemo(() => {
    const g: Record<SearchHit["kind"], SearchHit[]> = {
      manufacturer: [], model: [], standard: [], document: [],
    };
    for (const h of hits) g[h.kind].push(h);
    return g;
  }, [hits]);

  const groupMeta: Record<SearchHit["kind"], { label: string; icon: LucideIcon }> = {
    manufacturer: { label: "Manufacturers", icon: Building2 },
    model:        { label: "Panel Models",  icon: Cpu },
    standard:     { label: "AS Standards",  icon: BookOpen },
    document:     { label: "Documents",     icon: FileText },
  };

  if (hits.length === 0) {
    return (
      <section className="border border-border rounded-lg bg-card p-6 text-center">
        <p className="font-mono text-[11px] text-muted-foreground">
          No matches. Try a broader term, or open the AIDE tray (⌘+.) to ask the question in natural language.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-border rounded-lg bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {hits.length} result{hits.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={onClear}
          className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
        >
          <X size={10} /> clear
        </button>
      </header>
      <div className="divide-y divide-border">
        {(Object.entries(groups) as [SearchHit["kind"], SearchHit[]][]).map(([kind, items]) => {
          if (items.length === 0) return null;
          const meta = groupMeta[kind];
          const Icon = meta.icon;
          return (
            <div key={kind} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={11} className="text-primary/70" />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {meta.label} · {items.length}
                </span>
              </div>
              <ul className="space-y-1">
                {items.slice(0, 8).map(hit => (
                  <li key={hit.id}>
                    {hit.href ? (
                      <a href={hit.href} target="_blank" rel="noopener noreferrer"
                         className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-muted/40 group">
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-foreground font-medium truncate">{hit.title}</p>
                          {hit.subtitle && <p className="text-[10px] text-muted-foreground truncate">{hit.subtitle}</p>}
                        </div>
                        <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary shrink-0" />
                      </a>
                    ) : (
                      <div className="px-2 py-1.5">
                        <p className="text-[12.5px] text-foreground font-medium truncate">{hit.title}</p>
                        {hit.subtitle && <p className="text-[10px] text-muted-foreground truncate">{hit.subtitle}</p>}
                      </div>
                    )}
                  </li>
                ))}
                {items.length > 8 && (
                  <li className="px-2 font-mono text-[10px] text-muted-foreground">
                    …{items.length - 8} more — refine your search.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Reference inner lists (compact; same data as before, flatter UI) ────

function ManufacturerGrid({ manufacturers, models, families }: {
  manufacturers: Manufacturer[]; models: FipModel[]; families: ProductFamily[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {manufacturers.map(m => {
        const modelCount = models.filter(x => x.manufacturerId === m.id).length;
        const famCount = families.filter(x => x.manufacturerId === m.id).length;
        return (
          <div key={m.id} className="border border-border rounded-md p-3 bg-background/30 hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{m.name}</p>
                {m.country && <p className="text-[10px] text-muted-foreground">{m.country}</p>}
              </div>
              {m.website && (
                <a href={m.website} target="_blank" rel="noopener noreferrer"
                   className="text-muted-foreground hover:text-primary shrink-0">
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/70 mt-2 tabular-nums">
              {modelCount} model{modelCount === 1 ? "" : "s"} · {famCount} famil{famCount === 1 ? "y" : "ies"}
            </p>
          </div>
        );
      })}
      {manufacturers.length === 0 && (
        <p className="col-span-full text-[11px] text-muted-foreground text-center py-4">No manufacturers loaded.</p>
      )}
    </div>
  );
}

function ModelsTable({ models, mfrMap, famMap }: {
  models: FipModel[]; mfrMap: Record<string, string>; famMap: Record<string, string>;
}) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-normal">Model</th>
            <th className="text-left px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-normal">Manufacturer</th>
            <th className="text-left px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-normal">Family</th>
            <th className="text-left px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {models.map(m => (
            <tr key={m.id} className="border-t border-border/60 hover:bg-muted/20">
              <td className="px-3 py-1.5 font-medium text-foreground">{m.name}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{mfrMap[m.manufacturerId] ?? "—"}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{m.familyId ? famMap[m.familyId] ?? "—" : "—"}</td>
              <td className="px-3 py-1.5">
                {m.status && (
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]">{m.status}</span>
                )}
              </td>
            </tr>
          ))}
          {models.length === 0 && (
            <tr><td colSpan={4} className="text-center py-4 text-[11px] text-muted-foreground">No panel models loaded.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StandardsList({ standards }: { standards: FipStandard[] }) {
  return (
    <div className="space-y-1.5">
      {standards.map(s => (
        <div key={s.id} className="flex items-start gap-3 px-3 py-2 border border-border rounded-md bg-background/30 hover:bg-muted/20 transition-colors">
          <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={11} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground">{s.code}</span>
              {s.jurisdiction && <span className="font-mono text-[9px] text-muted-foreground px-1.5 py-0.5 rounded border border-border">{s.jurisdiction}</span>}
              {s.category && <span className="font-mono text-[9px] text-primary px-1.5 py-0.5 rounded bg-primary/10">{s.category}</span>}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{s.title}</p>
          </div>
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      ))}
      {standards.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-4">No standards loaded.</p>
      )}
    </div>
  );
}

function DocumentsGrid({ documents, mfrMap }: { documents: FipDocument[]; mfrMap: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {documents.map(d => (
        <a
          key={d.id}
          href={d.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 px-3 py-2 border border-border rounded-md bg-background/30 hover:bg-muted/20 group transition-colors"
        >
          <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
            <FileText size={11} className="text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-foreground line-clamp-2">{d.title}</p>
            {d.manufacturerId && mfrMap[d.manufacturerId] && (
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{mfrMap[d.manufacturerId]}</p>
            )}
          </div>
          {d.url && (
            <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
          )}
        </a>
      ))}
      {documents.length === 0 && (
        <p className="col-span-full text-[11px] text-muted-foreground text-center py-4">No documents loaded.</p>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────

export default function FIPKnowledgeBase() {
  const [search, setSearch] = useState("");
  const [commandPanelSlug, setCommandPanelSlug] = useState<string>("");
  const [selectedDetector, setSelectedDetector] = useState<DetectorType | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Status gate — block render until we know whether FIP is on.
  const [status, setStatus] = useState<FipStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Reference data, loaded in parallel; individual failures are isolated
  // so one broken dataset can't hide the rest of the page.
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [models, setModels] = useState<FipModel[]>([]);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [standards, setStandards] = useState<FipStandard[]>([]);
  const [documents, setDocuments] = useState<FipDocument[]>([]);
  const [panels, setPanels] = useState<PanelSpec[]>([]);
  const [panelsLoading, setPanelsLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const st = await apiFetch<FipStatus>("/fip/status");
      setStatus(st);
    } catch (e: any) {
      setStatusError(e?.message ?? "Failed to reach /fip/status");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void Promise.all([
      apiFetch<Manufacturer[]>("/fip/manufacturers").then(setManufacturers).catch(() => {}),
      apiFetch<FipModel[]>("/fip/models").then(setModels).catch(() => {}),
      apiFetch<ProductFamily[]>("/fip/product-families").then(setFamilies).catch(() => {}),
      apiFetch<FipStandard[]>("/fip/standards").then(setStandards).catch(() => {}),
      apiFetch<FipDocument[]>("/fip/documents").then(setDocuments).catch(() => {}),
    ]);
    apiFetch<PanelSpec[]>("/fip/panels")
      .then(rows => setPanels(rows))
      .catch(() => setPanels([]))
      .finally(() => setPanelsLoading(false));
  }, [loadStatus]);

  // Lookup maps used by models/documents tables.
  const mfrMap = useMemo(() => Object.fromEntries(manufacturers.map(m => [m.id, m.name])), [manufacturers]);
  const famMap = useMemo(() => Object.fromEntries(families.map(f => [f.id, f.name])), [families]);

  // Cross-dataset search. Case-insensitive substring match. Results cap
  // at 40 so a too-broad term (e.g. "a") doesn't blow out the list.
  const searchHits = useMemo<SearchHit[]>(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: SearchHit[] = [];
    for (const m of manufacturers) {
      if (m.name.toLowerCase().includes(q) || (m.country ?? "").toLowerCase().includes(q)) {
        hits.push({ kind: "manufacturer", id: m.id, title: m.name, subtitle: m.country, href: m.website });
      }
    }
    for (const m of models) {
      if (
        m.name.toLowerCase().includes(q) ||
        (m.modelNumber ?? "").toLowerCase().includes(q) ||
        (mfrMap[m.manufacturerId] ?? "").toLowerCase().includes(q)
      ) {
        hits.push({
          kind: "model", id: m.id, title: m.name,
          subtitle: mfrMap[m.manufacturerId] ?? undefined,
        });
      }
    }
    for (const s of standards) {
      if (s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) {
        hits.push({ kind: "standard", id: s.id, title: s.code, subtitle: s.title, href: s.url });
      }
    }
    for (const d of documents) {
      if ((d.title ?? "").toLowerCase().includes(q)) {
        hits.push({ kind: "document", id: d.id, title: d.title, subtitle: d.manufacturerId ? mfrMap[d.manufacturerId] : undefined, href: d.url });
      }
    }
    return hits.slice(0, 40);
  }, [search, manufacturers, models, standards, documents, mfrMap]);

  // ── Render gates ──────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (statusError || !status?.enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-yellow-500" />
        </div>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {statusError ? "FIP status check failed" : "FIP Knowledge Base disabled"}
        </h2>
        <p className="text-muted-foreground text-[13px] max-w-md">
          {statusError
            ? `Couldn't reach /api/fip/status — ${statusError}.`
            : "Set FIP_ENABLED=1 in Replit Secrets to activate."}
        </p>
        <button
          onClick={() => void loadStatus()}
          className="mt-4 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Main page ────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="{}"
        title="FIP Knowledge Base"
        subtitle={`${manufacturers.length} manufacturers · ${models.length} models · ${standards.length} standards · ${documents.length} documents`}
      />

      <div className="px-4 sm:px-6 py-5 space-y-5 max-w-[1280px]">

        {/* On-site quick actions: identify a panel by photo. Hidden when
            getUserMedia is not available (typically desktop without a
            camera). The capture component handles permission UX. */}
        {isCameraAvailable() && (
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition-colors min-h-[56px]"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary shrink-0">
              <Camera size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-foreground">Identify a panel</span>
              <span className="block text-[11px] text-muted-foreground">Snap a photo and AIDE matches the manufacturer and model.</span>
            </span>
          </button>
        )}

        <Bookmarks />

        <MyManuals />

        {/* Global search — one field, searches every dataset. */}
        <FipGlobalSearch search={search} setSearch={setSearch} />

        <PanelIdCapture open={cameraOpen} onClose={() => setCameraOpen(false)} />

        {/* Search results — only when there's a query. */}
        {search.trim().length >= 2 && (
          <SearchResults hits={searchHits} onClear={() => setSearch("")} />
        )}

        {/* Core tools. These are always visible — they're the 4 things a
            tech actually uses every day. */}
        <section>
          <SectionHeader label="tools" icon={Cpu} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <PanelTechnicalCard
              panels={panels}
              loading={panelsLoading}
              value={commandPanelSlug}
              onChange={setCommandPanelSlug}
            />
            <CommonProductsCard
              selectedPanelSlug={commandPanelSlug || undefined}
              onPanelSlugChange={setCommandPanelSlug}
            />
            <BatteryCalculatorCard
              panels={panels}
              panelSlug={commandPanelSlug || undefined}
            />
            <DefectImageAnalysisCard />
          </div>
        </section>

        {/* Detectors — when a detector is selected, render the detail
            view inline. Otherwise show the browser. */}
        <section>
          <SectionHeader label="detectors" icon={Shield} />
          {selectedDetector ? (
            <FipDetectorTypeDetail
              detector={selectedDetector}
              onBack={() => setSelectedDetector(null)}
            />
          ) : (
            <FipDetectorTypeBrowser onSelect={setSelectedDetector} />
          )}
        </section>

        {/* Reference — collapsible accordions, closed by default. Scroll
            here only when you need to browse. */}
        <section className="space-y-2">
          <SectionHeader label="reference" icon={BookOpen} />

          <ReferenceSection icon={Building2} label="Manufacturers" count={manufacturers.length}>
            <ManufacturerGrid manufacturers={manufacturers} models={models} families={families} />
          </ReferenceSection>

          <ReferenceSection icon={Cpu} label="Panel Models" count={models.length}>
            <ModelsTable models={models} mfrMap={mfrMap} famMap={famMap} />
          </ReferenceSection>

          <ReferenceSection icon={BookOpen} label="AS Standards" count={standards.length}>
            <StandardsList standards={standards} />
          </ReferenceSection>

          <ReferenceSection icon={FileText} label="Documents" count={documents.length}>
            <DocumentsGrid documents={documents} mfrMap={mfrMap} />
          </ReferenceSection>

          <ReferenceSection icon={Network} label="Networking Guide">
            <FipNetworkingGuide />
          </ReferenceSection>

          <ReferenceSection icon={FileCog} label="Config Analysis">
            <FipConfigAnalysisCard />
          </ReferenceSection>
        </section>

        <p className="font-mono text-[10px] text-muted-foreground/70 pt-4 border-t border-border/40">
          Open the AIDE tray (⌘+.) to ask a free-form question — context from this page is attached automatically.
        </p>
      </div>
    </div>
  );
}

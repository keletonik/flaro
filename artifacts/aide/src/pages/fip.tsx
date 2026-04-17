/**
 * FIP Command Centre.
 *
 * Top-menu layout: Command Centre (4-card grid) + legacy library tabs
 * (detectors / manufacturers / panel models / standards / documents).
 * Sidebar on the left hosts the FIP assistant chat.
 *
 * Mobile <768px: chat collapses into a drawer, cards stack full-width.
 *
 * Loading policy: the shell renders immediately. Each tab's data is
 * fetched on first entry, and a failure in one dataset never blocks
 * another. /fip/panels is lifted to this parent so the panel dropdown
 * in PanelTechnicalCard and the battery calculator share a single
 * fetch instead of duplicating the call.
 */

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Shield, FileText, BookOpen, Building2, Cpu, Loader2, AlertTriangle,
  Search, ExternalLink, LayoutDashboard,
} from "lucide-react";
import { FipAssistantChat } from "@/components/FipAssistantChat";
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

interface FipStatus {
  enabled: boolean;
  counts?: {
    manufacturers: number; models: number; components: number;
    faultSignatures: number; sessions: number; escalations: number;
  };
}

type View = "command" | "detectors" | "manufacturers" | "models" | "standards" | "documents";

export default function FIPKnowledgeBase() {
  const [view, setView] = useState<View>("command");
  // Shared panel selection across PanelTechnicalCard and CommonProductsCard —
  // picking a panel in one filters the other to compatible products.
  const [commandPanelSlug, setCommandPanelSlug] = useState<string>("");
  const [selectedDetector, setSelectedDetector] = useState<DetectorType | null>(null);
  const [status, setStatus] = useState<FipStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturersError, setManufacturersError] = useState<string | null>(null);
  const [models, setModels] = useState<FipModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [standards, setStandards] = useState<FipStandard[]>([]);
  const [standardsError, setStandardsError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
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

  // Load status first, then library data in parallel. Failures in the
  // library calls are isolated per-endpoint — one slow or broken query
  // doesn't hold the whole page hostage.
  useEffect(() => {
    void loadStatus();
    void Promise.all([
      apiFetch<Manufacturer[]>("/fip/manufacturers").then(setManufacturers).catch((e: any) => setManufacturersError(e?.message ?? "Failed to load manufacturers")),
      apiFetch<FipModel[]>("/fip/models").then(setModels).catch((e: any) => setModelsError(e?.message ?? "Failed to load models")),
      apiFetch<ProductFamily[]>("/fip/product-families").then(setFamilies).catch(() => {}),
      apiFetch<FipStandard[]>("/fip/standards").then(setStandards).catch((e: any) => setStandardsError(e?.message ?? "Failed to load standards")),
      apiFetch<any[]>("/fip/documents").then(setDocuments).catch((e: any) => setDocumentsError(e?.message ?? "Failed to load documents")),
    ]);
    apiFetch<PanelSpec[]>("/fip/panels")
      .then((rows) => setPanels(rows))
      .catch(() => setPanels([]))
      .finally(() => setPanelsLoading(false));
  }, [loadStatus]);

  // Status is the only blocking call — until we know whether FIP is
  // enabled or disabled we can't decide whether to render the shell
  // or the disabled screen.
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
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {statusError ? "FIP status check failed" : "FIP Knowledge Base Disabled"}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md">
          {statusError
            ? `Couldn't reach /api/fip/status — ${statusError}.`
            : "Set FIP_ENABLED=1 in Replit Secrets to activate."}
        </p>
        <button
          onClick={() => void loadStatus()}
          className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  const mfrMap = Object.fromEntries(manufacturers.map((m) => [m.id, m.name]));
  const famMap = Object.fromEntries(families.map((f) => [f.id, f.name]));

  const menu: { key: View; label: string; icon: typeof Shield; count?: number }[] = [
    { key: "command", label: "Command Centre", icon: LayoutDashboard },
    { key: "detectors", label: "Detector Library", icon: Shield },
    { key: "manufacturers", label: "Manufacturers", icon: Building2, count: manufacturers.length },
    { key: "models", label: "Panel Models", icon: Cpu, count: models.length },
    { key: "standards", label: "AS Standards", icon: BookOpen, count: standards.length },
    { key: "documents", label: "Documents", icon: FileText, count: documents.length },
  ];

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col bg-background">
      {/* Top menu */}
      <nav className="shrink-0 border-b border-border bg-card">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-2 flex items-center gap-1 overflow-x-auto">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setSelectedDetector(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
                {item.count !== undefined && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Body — chat left, content right */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 md:p-6 max-w-[1800px] mx-auto w-full">
        <aside className="lg:w-[360px] xl:w-[400px] shrink-0 h-[60vh] lg:h-auto">
          <FipAssistantChat contextDetectorSlug={selectedDetector?.slug} />
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto pr-1">
          {view === "command" && (
            <div className="space-y-4">
              <header>
                <h1 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="font-mono text-[13px] text-primary/60">{"{}"}</span>
                  FIP Command Centre
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Panel specs · common products · defect analysis · battery sizing — all in one view.
                </p>
              </header>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                <DefectImageAnalysisCard />
                <BatteryCalculatorCard
                  panels={panels}
                  panelSlug={commandPanelSlug || undefined}
                />
              </div>
            </div>
          )}

          {view === "detectors" && (
            selectedDetector ? (
              <FipDetectorTypeDetail detector={selectedDetector} onBack={() => setSelectedDetector(null)} />
            ) : (
              <FipDetectorTypeBrowser onSelect={setSelectedDetector} />
            )
          )}

          {view === "manufacturers" && (
            manufacturersError
              ? <DataError label="manufacturers" message={manufacturersError} />
              : <ManufacturersTab manufacturers={manufacturers} models={models} families={families} />
          )}

          {view === "models" && (
            modelsError
              ? <DataError label="models" message={modelsError} />
              : <ModelsTab models={models} mfrMap={mfrMap} famMap={famMap} />
          )}

          {view === "standards" && (
            standardsError
              ? <DataError label="standards" message={standardsError} />
              : <StandardsTab standards={standards} />
          )}
          {view === "documents" && (
            documentsError
              ? <DataError label="documents" message={documentsError} />
              : <DocumentsTab documents={documents} mfrMap={mfrMap} />
          )}
        </main>
      </div>
    </div>
  );
}

function DataError({ label, message }: { label: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-6 h-6 text-destructive mb-2" />
      <p className="text-sm font-medium text-foreground">Failed to load {label}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">{message}</p>
    </div>
  );
}

function ManufacturersTab({ manufacturers, models, families }: {
  manufacturers: Manufacturer[]; models: FipModel[]; families: ProductFamily[];
}) {
  const [search, setSearch] = useState("");
  const filtered = manufacturers.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search manufacturers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm"
        />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((m) => {
          const mfrModels = models.filter((mod) => mod.manufacturerId === m.id);
          const mfrFamilies = families.filter((f) => f.manufacturerId === m.id);
          return (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                {m.website && (
                  <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground">{m.name}</h3>
              {m.country && <p className="text-[10px] text-muted-foreground mt-0.5">{m.country}</p>}
              <p className="text-[11px] text-muted-foreground mt-2">
                {mfrFamilies.length} families · {mfrModels.length} models
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelsTab({ models, mfrMap, famMap }: {
  models: FipModel[]; mfrMap: Record<string, string>; famMap: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const filtered = models.filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (mfrMap[m.manufacturerId] ?? "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search models…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm"
        />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Model</th>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Manufacturer</th>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Family</th>
              <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-2 font-medium text-foreground">{m.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{mfrMap[m.manufacturerId] ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.familyId ? famMap[m.familyId] ?? "—" : "—"}</td>
                <td className="px-4 py-2">
                  {m.status && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{m.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandardsTab({ standards }: { standards: FipStandard[] }) {
  const [search, setSearch] = useState("");
  const filtered = standards.filter((s) =>
    !search ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.title.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search standards by code or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground">{s.code}</h4>
                {s.jurisdiction && (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{s.jurisdiction}</span>
                )}
                {s.category && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{s.category}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.title}</p>
              {s.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.notes}</p>}
            </div>
            {s.url && (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No standards match your search.</p>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ documents, mfrMap }: { documents: any[]; mfrMap: Record<string, string> }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">No documents in the library yet.</p>;
  }
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map((d) => (
        <div key={d.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-foreground line-clamp-2">{d.title}</h4>
              {d.manufacturerId && (
                <p className="text-[10px] text-muted-foreground mt-1">{mfrMap[d.manufacturerId] ?? ""}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


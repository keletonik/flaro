/**
 * FIP Knowledge Base — master-level rebuild.
 *
 * Layout (Pass FIP-R1):
 *   ┌──────────────┬─────────────────────────────────────────┐
 *   │              │                                         │
 *   │              │  Tabs: Detectors / Manufacturers /      │
 *   │  Embedded    │        Models / Standards / Documents   │
 *   │  FIP         │                                         │
 *   │  Assistant   │  Active tab content area:               │
 *   │  Chat        │   - Detector library (browse + detail)  │
 *   │              │   - Manufacturers grid                  │
 *   │  drag/drop   │   - Models table                        │
 *   │  image       │   - Standards register                  │
 *   │  upload      │   - Documents library                   │
 *   │              │                                         │
 *   └──────────────┴─────────────────────────────────────────┘
 *
 * The left rail is the FipAssistantChat — always-visible, master-level
 * Australian fire-protection assistant with tool-use access to detector
 * types, standards, fault signatures, and Claude vision image analysis.
 *
 * The right side is the browseable knowledge base. Selecting a detector
 * card opens a deep-dive panel with operating principle, sensing
 * technology, AS standard references, failure modes, test procedures,
 * and example models from each major Australian-supported manufacturer.
 *
 * Drag-and-drop an image anywhere in the chat panel to upload + analyse.
 */

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Shield, FileText, BookOpen, Building2, Cpu, Loader2, AlertTriangle,
  Search, ExternalLink,
} from "lucide-react";
import { FipAssistantChat } from "@/components/FipAssistantChat";
import {
  FipDetectorTypeBrowser,
  FipDetectorTypeDetail,
  type DetectorType,
} from "@/components/FipDetectorTypeCard";

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

type Tab = "detectors" | "manufacturers" | "models" | "standards" | "documents";

export default function FIPKnowledgeBase() {
  const [activeTab, setActiveTab] = useState<Tab>("detectors");
  const [selectedDetector, setSelectedDetector] = useState<DetectorType | null>(null);
  const [status, setStatus] = useState<FipStatus | null>(null);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [models, setModels] = useState<FipModel[]>([]);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [standards, setStandards] = useState<FipStandard[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [st, mfrs, mods, fams, stds, docs] = await Promise.all([
        apiFetch<FipStatus>("/fip/status").catch(() => ({ enabled: false } as FipStatus)),
        apiFetch<Manufacturer[]>("/fip/manufacturers").catch(() => []),
        apiFetch<FipModel[]>("/fip/models").catch(() => []),
        apiFetch<ProductFamily[]>("/fip/product-families").catch(() => []),
        apiFetch<FipStandard[]>("/fip/standards").catch(() => []),
        apiFetch<any[]>("/fip/documents").catch(() => []),
      ]);
      setStatus(st);
      setManufacturers(mfrs);
      setModels(mods);
      setFamilies(fams);
      setStandards(stds);
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">FIP Knowledge Base Disabled</h2>
        <p className="text-muted-foreground text-sm">Set FIP_ENABLED=1 in environment to activate.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield; count?: number }[] = [
    { key: "detectors", label: "Detector Library", icon: Shield },
    { key: "manufacturers", label: "Manufacturers", icon: Building2, count: manufacturers.length },
    { key: "models", label: "Panel Models", icon: Cpu, count: models.length },
    { key: "standards", label: "AS Standards", icon: BookOpen, count: standards.length },
    { key: "documents", label: "Documents", icon: FileText, count: documents.length },
  ];

  const mfrMap = Object.fromEntries(manufacturers.map((m) => [m.id, m.name]));
  const famMap = Object.fromEntries(families.map((f) => [f.id, f.name]));

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col lg:flex-row gap-4 p-4 md:p-6 max-w-[1800px] mx-auto">
      {/* LEFT — embedded master assistant chat */}
      <aside className="lg:w-[380px] xl:w-[420px] shrink-0 h-[60vh] lg:h-auto">
        <FipAssistantChat contextDetectorSlug={selectedDetector?.slug} />
      </aside>

      {/* RIGHT — knowledge base content */}
      <main className="flex-1 min-w-0 overflow-y-auto pr-1">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            FIP Knowledge Base
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Master-level Australian fire-protection reference. Detectors · Standards · Manufacturers · Documents.
          </p>
        </header>

        <nav className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedDetector(null); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeTab === tab.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {activeTab === "detectors" && (
          selectedDetector ? (
            <FipDetectorTypeDetail detector={selectedDetector} onBack={() => setSelectedDetector(null)} />
          ) : (
            <FipDetectorTypeBrowser onSelect={setSelectedDetector} />
          )
        )}

        {activeTab === "manufacturers" && (
          <ManufacturersTab manufacturers={manufacturers} models={models} families={families} />
        )}

        {activeTab === "models" && (
          <ModelsTab models={models} mfrMap={mfrMap} famMap={famMap} />
        )}

        {activeTab === "standards" && <StandardsTab standards={standards} />}
        {activeTab === "documents" && <DocumentsTab documents={documents} mfrMap={mfrMap} />}
      </main>
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
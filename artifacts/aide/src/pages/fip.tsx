import { useEffect, useMemo, useState } from "react";
import { Flame, Cpu, FileText, ScrollText, ChevronRight, Search, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { cn } from "@/lib/utils";

interface FipStatus {
  enabled: boolean;
  counts?: {
    manufacturers: number;
    models: number;
    components: number;
    faultSignatures: number;
    sessions: number;
    escalations: number;
  };
}
interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  country?: string | null;
  website?: string | null;
  notes?: string | null;
}
interface Family {
  id: string;
  manufacturerId: string;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
}
interface Model {
  id: string;
  familyId: string;
  manufacturerId: string;
  name: string;
  modelNumber?: string | null;
  slug: string;
  description?: string | null;
  yearsActive?: string | null;
  status?: string | null;
}
interface Document {
  id: string;
  title: string;
  kind: string;
  manufacturerId?: string | null;
  familyId?: string | null;
  modelId?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}
interface Standard {
  id: string;
  code: string;
  title: string;
  jurisdiction?: string | null;
  year?: number | null;
  currentVersion?: string | null;
  notes?: string | null;
}

type Tab = "manufacturers" | "documents" | "standards" | "faults";

export default function FipPage() {
  const [status, setStatus] = useState<FipStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("manufacturers");
  const [search, setSearch] = useState("");

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);

  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const s = await apiFetch<FipStatus>("/fip/status");
      setStatus(s);
    } catch {
      setStatus({ enabled: false });
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchAll = async () => {
    try {
      const [m, f, md, d, s] = await Promise.all([
        apiFetch<Manufacturer[]>("/fip/manufacturers"),
        apiFetch<Family[]>("/fip/product-families"),
        apiFetch<Model[]>("/fip/models"),
        apiFetch<Document[]>("/fip/documents"),
        apiFetch<Standard[]>("/fip/standards"),
      ]);
      setManufacturers(Array.isArray(m) ? m : []);
      setFamilies(Array.isArray(f) ? f : []);
      setModels(Array.isArray(md) ? md : []);
      setDocuments(Array.isArray(d) ? d : []);
      setStandards(Array.isArray(s) ? s : []);
    } catch {
      // Endpoints return 503 when FIP_ENABLED is off. Leave lists empty;
      // the status banner covers the UX.
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (status?.enabled) fetchAll();
  }, [status?.enabled]);

  // The agent emits aide-data-changed after any write. Refresh FIP lists so
  // anything Claude creates or updates in the knowledge base shows up live.
  useEffect(() => {
    const handler = () => {
      if (status?.enabled) fetchAll();
    };
    window.addEventListener("aide-data-changed", handler);
    return () => window.removeEventListener("aide-data-changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.enabled]);

  const filteredManufacturers = useMemo(() => {
    if (!search) return manufacturers;
    const q = search.toLowerCase();
    return manufacturers.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.country?.toLowerCase().includes(q) ||
      m.notes?.toLowerCase().includes(q),
    );
  }, [manufacturers, search]);

  const visibleFamilies = useMemo(() => {
    if (!selectedManufacturer) return [];
    return families.filter(f => f.manufacturerId === selectedManufacturer);
  }, [families, selectedManufacturer]);

  const visibleModels = useMemo(() => {
    if (!selectedFamily) return [];
    return models.filter(m => m.familyId === selectedFamily);
  }, [models, selectedFamily]);

  const visibleDocuments = useMemo(() => {
    const q = search.toLowerCase();
    let list = documents;
    if (selectedModel) list = list.filter(d => d.modelId === selectedModel);
    else if (selectedFamily) list = list.filter(d => d.familyId === selectedFamily);
    else if (selectedManufacturer) list = list.filter(d => d.manufacturerId === selectedManufacturer);
    if (q) list = list.filter(d => d.title.toLowerCase().includes(q) || d.notes?.toLowerCase().includes(q));
    return list;
  }, [documents, search, selectedManufacturer, selectedFamily, selectedModel]);

  const filteredStandards = useMemo(() => {
    if (!search) return standards;
    const q = search.toLowerCase();
    return standards.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q),
    );
  }, [standards, search]);

  // ─────────────────────────────────────────────────────────────────────────
  // Disabled state — FIP_ENABLED=1 is a Replit Secret
  // ─────────────────────────────────────────────────────────────────────────
  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Flame size={26} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">FIP Technical Reference</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            This module is disabled by default. It exposes the seeded fire panel knowledge base
            (5 manufacturers, 27 families, 36 models, 40 documents, 20 Australian standards)
            plus troubleshooting session and fault code tools, all behind the agent sidepanel.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">To enable</p>
            <ol className="text-[12px] text-foreground space-y-1.5 list-decimal list-inside">
              <li>Open the Replit Secrets panel on the api-server artifact</li>
              <li>Add <code className="font-mono bg-muted px-1 rounded">FIP_ENABLED</code> = <code className="font-mono bg-muted px-1 rounded">1</code></li>
              <li>Redeploy and reload this page</li>
            </ol>
          </div>
          <button
            onClick={fetchStatus}
            className="mt-4 inline-flex items-center gap-2 text-[12px] text-primary hover:underline"
          >
            <RefreshCw size={12} /> Re-check status
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Enabled — split-pane: browse left, embedded agent right
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
              <Flame size={18} className="text-primary" /> FIP Technical Reference
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fire panel knowledge base · manufacturers, models, documents, standards · agent embedded right
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><strong className="text-foreground">{status.counts?.manufacturers ?? 0}</strong> makers</span>
            <span><strong className="text-foreground">{status.counts?.models ?? 0}</strong> models</span>
            <span><strong className="text-foreground">{status.counts?.faultSignatures ?? 0}</strong> fault codes</span>
            <span><strong className="text-foreground">{status.counts?.sessions ?? 0}</strong> sessions</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: "manufacturers", label: "Manufacturers", icon: Cpu },
            { key: "documents", label: "Documents", icon: FileText },
            { key: "standards", label: "Standards", icon: ScrollText },
            { key: "faults", label: "Fault Codes", icon: AlertCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                activeTab === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border-border",
              )}
            >
              <Icon size={12} /> {label}
            </button>
          ))}

          <div className="ml-auto relative w-64">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search everything in this tab..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Main split — content left, embedded agent right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — browsable lists */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === "manufacturers" && (
            <div className="flex h-full">
              {/* Manufacturer list */}
              <div className="w-56 border-r border-border shrink-0 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">
                  Manufacturer ({filteredManufacturers.length})
                </div>
                {filteredManufacturers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedManufacturer(m.id); setSelectedFamily(null); setSelectedModel(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b border-border/40 hover:bg-muted/40 transition-colors",
                      selectedManufacturer === m.id && "bg-primary/8 border-l-2 border-l-primary",
                    )}
                  >
                    <div className="text-[13px] font-medium text-foreground">{m.name}</div>
                    {m.country && <div className="text-[10px] text-muted-foreground">{m.country}</div>}
                  </button>
                ))}
                {filteredManufacturers.length === 0 && (
                  <div className="p-4 text-[11px] text-muted-foreground text-center">No matches</div>
                )}
              </div>

              {/* Family list */}
              <div className="w-56 border-r border-border shrink-0 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">
                  Family ({visibleFamilies.length})
                </div>
                {visibleFamilies.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFamily(f.id); setSelectedModel(null); }}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b border-border/40 hover:bg-muted/40 transition-colors",
                      selectedFamily === f.id && "bg-primary/8 border-l-2 border-l-primary",
                    )}
                  >
                    <div className="text-[13px] font-medium text-foreground">{f.name}</div>
                    {f.category && <div className="text-[10px] text-muted-foreground">{f.category}</div>}
                  </button>
                ))}
                {!selectedManufacturer && (
                  <div className="p-4 text-[11px] text-muted-foreground text-center">Pick a manufacturer</div>
                )}
              </div>

              {/* Model / detail pane */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">
                  Model ({visibleModels.length})
                </div>
                {visibleModels.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={cn(
                      "px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer",
                      selectedModel === m.id && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-[14px] font-semibold text-foreground">{m.name}</div>
                      {m.modelNumber && <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{m.modelNumber}</code>}
                      {m.status && (
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded",
                          m.status === "current" ? "bg-emerald-500/10 text-emerald-600" :
                          m.status === "legacy" ? "bg-amber-500/10 text-amber-600" :
                          "bg-muted text-muted-foreground",
                        )}>{m.status}</span>
                      )}
                    </div>
                    {m.description && <p className="text-[11px] text-muted-foreground leading-relaxed">{m.description}</p>}
                    {selectedModel === m.id && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Linked documents</p>
                        {documents.filter(d => d.modelId === m.id).map(d => (
                          <div key={d.id} className="flex items-start gap-2 py-1">
                            <FileText size={10} className="text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[11px] text-foreground truncate">{d.title}</div>
                              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{d.kind}</div>
                            </div>
                          </div>
                        ))}
                        {documents.filter(d => d.modelId === m.id).length === 0 && (
                          <p className="text-[10px] text-muted-foreground italic">No documents linked yet — ask the agent to find the manual.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {!selectedFamily && (
                  <div className="p-4 text-[11px] text-muted-foreground text-center">Pick a family</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Documents ({visibleDocuments.length})
              </div>
              <div className="space-y-2">
                {visibleDocuments.map(d => (
                  <div key={d.id} className="p-3 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={12} className="text-primary shrink-0" />
                          <p className="text-[13px] font-medium text-foreground">{d.title}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="uppercase tracking-wide">{d.kind}</span>
                          {d.tags && d.tags.length > 0 && (
                            <>
                              <span>·</span>
                              <span>{d.tags.join(" · ")}</span>
                            </>
                          )}
                        </div>
                        {d.notes && <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{d.notes}</p>}
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
                {visibleDocuments.length === 0 && (
                  <div className="text-center py-12 text-[11px] text-muted-foreground">
                    No documents {search ? "match" : "available"}. Ask the agent: "find every Pertronic F220 manual".
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "standards" && (
            <div className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Australian Standards ({filteredStandards.length})
              </div>
              <div className="space-y-2">
                {filteredStandards.map(s => (
                  <div key={s.id} className="p-3 bg-card border border-border rounded-lg">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <ScrollText size={12} className="text-primary shrink-0" />
                        <code className="text-[12px] font-mono font-semibold text-foreground">{s.code}</code>
                        {s.year && <span className="text-[10px] text-muted-foreground">{s.year}</span>}
                      </div>
                      {s.jurisdiction && (
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.jurisdiction}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-foreground mb-1">{s.title}</p>
                    {s.notes && <p className="text-[10px] text-muted-foreground leading-relaxed">{s.notes}</p>}
                  </div>
                ))}
                {filteredStandards.length === 0 && (
                  <div className="text-center py-12 text-[11px] text-muted-foreground">
                    No standards match. Ask the agent: "show every AS 1670 revision we have".
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "faults" && (
            <div className="p-4 text-center">
              <AlertCircle size={24} className="text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-[13px] font-medium text-foreground mb-1">Fault code library</p>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto mb-4">
                {status.counts?.faultSignatures ?? 0} fault signatures seeded so far. Ask the agent to add more:
              </p>
              <div className="text-[11px] text-muted-foreground max-w-md mx-auto">
                Try: <em>"Add a fault signature for Pertronic F220 code E-03 — loop 1 earth fault, first check the shield drain wire, next step swap the loop card"</em>
              </div>
            </div>
          )}
        </div>

        {/* Right — embedded agent */}
        <div className="w-[400px] border-l border-border shrink-0 flex flex-col">
          <AnalyticsPanel section="fip" title="FIP Technician Agent" embedded />
        </div>
      </div>
    </div>
  );
}

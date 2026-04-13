import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Shield, ChevronRight, FileText, BookOpen, Search,
  Building2, Cpu, Package, AlertTriangle, ExternalLink,
  Loader2, RefreshCw
} from "lucide-react";

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  country?: string;
  website?: string;
  notes?: string;
}

interface FipModel {
  id: string;
  name: string;
  slug: string;
  manufacturerId: string;
  familyId?: string;
  panelType?: string;
  loopProtocol?: string;
  maxLoops?: number;
  maxDevicesPerLoop?: number;
  networkCapable?: boolean;
  notes?: string;
}

interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  manufacturerId: string;
  generation?: string;
  notes?: string;
}

interface FipDocument {
  id: string;
  title: string;
  docType: string;
  modelId?: string;
  familyId?: string;
  manufacturerId?: string;
  url?: string;
  notes?: string;
}

interface FipStandard {
  id: string;
  code: string;
  title: string;
  jurisdiction?: string;
  category?: string;
  currentVersion?: string;
  url?: string;
  notes?: string;
}

interface FipStatus {
  enabled: boolean;
  counts: {
    manufacturers: number;
    models: number;
    components: number;
    faultSignatures: number;
    sessions: number;
    escalations: number;
  };
}

type Tab = "overview" | "manufacturers" | "models" | "documents" | "standards";

export default function FIPKnowledgeBase() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<FipStatus | null>(null);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [models, setModels] = useState<FipModel[]>([]);
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [documents, setDocuments] = useState<FipDocument[]>([]);
  const [standards, setStandards] = useState<FipStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMfr, setSelectedMfr] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [st, mfrs, mods, fams, docs, stds] = await Promise.all([
        apiFetch<FipStatus>("/fip/status"),
        apiFetch<Manufacturer[]>("/fip/manufacturers").catch(() => []),
        apiFetch<FipModel[]>("/fip/models").catch(() => []),
        apiFetch<ProductFamily[]>("/fip/product-families").catch(() => []),
        apiFetch<FipDocument[]>("/fip/documents").catch(() => []),
        apiFetch<FipStandard[]>("/fip/standards").catch(() => []),
      ]);
      setStatus(st);
      setManufacturers(mfrs);
      setModels(mods);
      setFamilies(fams);
      setDocuments(docs);
      setStandards(stds);
    } catch (e) {
      console.error("FIP load error:", e);
    } finally {
      setLoading(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield; count?: number }[] = [
    { key: "overview", label: "Overview", icon: Shield },
    { key: "manufacturers", label: "Manufacturers", icon: Building2, count: manufacturers.length },
    { key: "models", label: "Panel Models", icon: Cpu, count: models.length },
    { key: "documents", label: "Documents", icon: FileText, count: documents.length },
    { key: "standards", label: "Standards", icon: BookOpen, count: standards.length },
  ];

  const mfrMap = Object.fromEntries(manufacturers.map(m => [m.id, m.name]));
  const famMap = Object.fromEntries(families.map(f => [f.id, f.name]));

  const filteredModels = models.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || mfrMap[m.manufacturerId]?.toLowerCase().includes(q);
    const matchMfr = !selectedMfr || m.manufacturerId === selectedMfr;
    return matchSearch && matchMfr;
  });

  const filteredDocs = documents.filter(d => {
    const q = search.toLowerCase();
    return !q || d.title.toLowerCase().includes(q) || d.docType?.toLowerCase().includes(q);
  });

  const filteredStandards = standards.filter(s => {
    const q = search.toLowerCase();
    return !q || s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
  });

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

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            FIP Knowledge Base
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Fire Indicator Panel reference — manufacturers, models, documents & standards
          </p>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeTab === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab !== "overview" && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {activeTab === "models" && manufacturers.length > 0 && (
            <select
              value={selectedMfr || ""}
              onChange={e => setSelectedMfr(e.target.value || null)}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {activeTab === "overview" && <OverviewTab status={status} manufacturers={manufacturers} models={models} families={families} documents={documents} standards={standards} />}
      {activeTab === "manufacturers" && <ManufacturersTab manufacturers={manufacturers} models={models} families={families} onSelectMfr={(id) => { setSelectedMfr(id); setActiveTab("models"); }} />}
      {activeTab === "models" && <ModelsTab models={filteredModels} mfrMap={mfrMap} famMap={famMap} />}
      {activeTab === "documents" && <DocumentsTab documents={filteredDocs} mfrMap={mfrMap} />}
      {activeTab === "standards" && <StandardsTab standards={filteredStandards} />}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Shield; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function OverviewTab({ status, manufacturers, models, families, documents, standards }: {
  status: FipStatus;
  manufacturers: Manufacturer[];
  models: FipModel[];
  families: ProductFamily[];
  documents: FipDocument[];
  standards: FipStandard[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Manufacturers" value={manufacturers.length} icon={Building2} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Panel Models" value={models.length} icon={Cpu} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="Documents" value={documents.length} icon={FileText} color="bg-amber-500/10 text-amber-500" />
        <StatCard label="Standards" value={standards.length} icon={BookOpen} color="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Manufacturers
          </h3>
          <div className="space-y-2">
            {manufacturers.map(m => {
              const modelCount = models.filter(mod => mod.manufacturerId === m.id).length;
              const familyCount = families.filter(f => f.manufacturerId === m.id).length;
              return (
                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{familyCount} families, {modelCount} models</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Product Families
          </h3>
          <div className="space-y-2">
            {families.map(f => {
              const modelCount = models.filter(m => m.familyId === f.id).length;
              return (
                <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mfrName(f.manufacturerId)} · {modelCount} models
                      {f.generation && ` · Gen ${f.generation}`}
                    </p>
                  </div>
                </div>
              );
            })}
            {families.length === 0 && <p className="text-xs text-muted-foreground py-2">No product families yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );

  function mfrName(id: string) {
    return manufacturers.find(m => m.id === id)?.name || "Unknown";
  }
}

function ManufacturersTab({ manufacturers, models, families, onSelectMfr }: {
  manufacturers: Manufacturer[];
  models: FipModel[];
  families: ProductFamily[];
  onSelectMfr: (id: string) => void;
}) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {manufacturers.map(m => {
        const mfrModels = models.filter(mod => mod.manufacturerId === m.id);
        const mfrFamilies = families.filter(f => f.manufacturerId === m.id);
        return (
          <div key={m.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              {m.website && (
                <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{m.name}</h3>
            {m.country && <p className="text-xs text-muted-foreground mb-3">{m.country}</p>}
            {m.notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.notes}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>{mfrFamilies.length} families</span>
              <span>·</span>
              <span>{mfrModels.length} models</span>
            </div>
            {mfrFamilies.length > 0 && (
              <div className="border-t border-border pt-3 space-y-1">
                {mfrFamilies.map(f => (
                  <p key={f.id} className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{f.name}</span>
                    {f.generation && <span className="ml-1 text-primary/60">Gen {f.generation}</span>}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => onSelectMfr(m.id)}
              className="mt-3 w-full px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              View Models →
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ModelsTab({ models, mfrMap, famMap }: { models: FipModel[]; mfrMap: Record<string, string>; famMap: Record<string, string> }) {
  if (models.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No models match your search.</p>;
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Manufacturer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Family</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loops</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Protocol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Network</th>
            </tr>
          </thead>
          <tbody>
            {models.map(m => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{m.name}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{mfrMap[m.manufacturerId] || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.familyId ? famMap[m.familyId] || "—" : "—"}</td>
                <td className="px-4 py-3">
                  {m.panelType && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{m.panelType}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.maxLoops || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{m.loopProtocol || "—"}</td>
                <td className="px-4 py-3">
                  {m.networkCapable !== undefined && m.networkCapable !== null && (
                    <span className={cn("text-xs font-medium", m.networkCapable ? "text-emerald-500" : "text-muted-foreground")}>
                      {m.networkCapable ? "Yes" : "No"}
                    </span>
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

function DocumentsTab({ documents, mfrMap }: { documents: FipDocument[]; mfrMap: Record<string, string> }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No documents match your search.</p>;
  }

  const docTypeColors: Record<string, string> = {
    manual: "bg-blue-500/10 text-blue-500",
    datasheet: "bg-emerald-500/10 text-emerald-500",
    installation_guide: "bg-amber-500/10 text-amber-500",
    programming_guide: "bg-purple-500/10 text-purple-500",
    certificate: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map(d => (
        <div key={d.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-foreground line-clamp-2">{d.title}</h4>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {d.docType && (
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", docTypeColors[d.docType] || "bg-muted text-muted-foreground")}>
                    {d.docType.replace(/_/g, " ")}
                  </span>
                )}
                {d.manufacturerId && (
                  <span className="text-[10px] text-muted-foreground">{mfrMap[d.manufacturerId] || ""}</span>
                )}
              </div>
              {d.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{d.notes}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StandardsTab({ standards }: { standards: FipStandard[] }) {
  if (standards.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No standards match your search.</p>;
  }

  return (
    <div className="space-y-2">
      {standards.map(s => (
        <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/30 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">{s.code}</h4>
              {s.jurisdiction && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">{s.jurisdiction}</span>
              )}
              {s.category && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{s.category}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{s.title}</p>
            {s.currentVersion && <p className="text-[10px] text-muted-foreground mt-1">Version: {s.currentVersion}</p>}
            {s.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.notes}</p>}
          </div>
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Upload, Trash2, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch, parseCSV } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DashboardSpec {
  type: string;
  factType: string;
  label: string;
  fields: { field: string; synonyms: string[]; required: boolean; numeric: boolean; date: boolean }[];
}

interface Detection {
  type: string;
  factType: string;
  confidence: number;
  columnMap: Record<string, string>;
  unmapped: string[];
  missingRequired: string[];
  warnings: string[];
}

interface UptickImportRow {
  id: string;
  dashboardType: string;
  sourceFilename: string | null;
  importedAt: string;
  importedBy: string | null;
  rowCount: number;
  factCount: number;
  detectedConfidence: string | null;
  warnings: string[] | null;
}

export default function UptickImportPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [specs, setSpecs] = useState<DashboardSpec[]>([]);
  const [imports, setImports] = useState<UptickImportRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [typeOverride, setTypeOverride] = useState<string>("");
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch<{ enabled: boolean; specs: DashboardSpec[] }>("/uptick/dashboard-specs")
      .then((d) => { setEnabled(d.enabled); setSpecs(d.specs); })
      .catch(() => setEnabled(false));
    refreshImports();
  }, []);

  function refreshImports() {
    apiFetch<UptickImportRow[]>("/uptick/imports").then(setImports).catch(() => setImports([]));
  }

  async function handleFile(f: File) {
    setFile(f);
    setError("");
    setSuccess("");
    const text = await f.text();
    const p = parseCSV(text);
    if (!p.headers.length) { setError("No headers found in CSV"); return; }
    setParsed(p);
    try {
      const det = await apiFetch<Detection>("/uptick/detect", {
        method: "POST",
        body: JSON.stringify({ headers: p.headers }),
      });
      setDetection(det);
      setTypeOverride(det.type);
      setColumnMap(det.columnMap);
    } catch (err: any) {
      setError(err.message || "Detection failed");
    }
  }

  async function handleImport() {
    if (!parsed || !file) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ importId: string; factCount: number; detection: Detection }>(
        "/uptick/import",
        {
          method: "POST",
          body: JSON.stringify({
            rows: parsed.rows,
            originalHeaders: parsed.headers,
            filename: file.name,
            dashboardTypeHint: typeOverride || undefined,
            columnMap,
          }),
        },
      );
      setSuccess(`Imported ${result.factCount} ${result.detection.factType} rows (${result.detection.type}).`);
      setFile(null);
      setParsed(null);
      setDetection(null);
      refreshImports();
    } catch (err: any) {
      setError(err.message || "Import failed");
    }
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Soft-delete this import? (Rows are preserved; analytics will stop counting them.)")) return;
    try {
      await apiFetch(`/uptick/imports/${id}`, { method: "DELETE" });
      refreshImports();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  }

  const activeSpec = specs.find((s) => s.type === typeOverride);

  if (enabled === null) {
    return <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  }

  if (!enabled) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Uptick imports are disabled</h3>
            <p className="text-xs text-muted-foreground">
              Set <code className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono">UPTICK_IMPORTS_ENABLED=1</code> in Replit Secrets and redeploy to enable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Import Uptick Export</h3>
        <label
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary/40 rounded-xl py-8 cursor-pointer transition-colors"
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <Upload size={22} className="text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">Drop a CSV export from Uptick here</p>
          <p className="text-[11px] text-muted-foreground">or click to browse</p>
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Supported: Financial Performance · Workforce Performance · Client Revenue · Client Profitability · Programme Maintenance · PM Forecast · Service Quoting · Defect Quoting · Revenue Report · Task Activity
          </p>
        </label>

        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs">
            <CheckCircle2 size={12} /> {success}
          </div>
        )}

        {parsed && detection && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-xl px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Detected</p>
                <p className="text-sm font-bold text-foreground">{detection.type.replace(/_/g, " ")}</p>
              </div>
              <div className="bg-muted/30 rounded-xl px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Confidence</p>
                <p className="text-sm font-bold text-foreground">{Math.round(detection.confidence * 100)}%</p>
              </div>
              <div className="bg-muted/30 rounded-xl px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rows</p>
                <p className="text-sm font-bold text-foreground">{parsed.rows.length.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Override dashboard type</label>
              <select
                value={typeOverride}
                onChange={(e) => setTypeOverride(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              >
                {specs.map((s) => <option key={s.type} value={s.type}>{s.label}</option>)}
              </select>
            </div>

            {activeSpec && (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Column mapping ({parsed.headers.length} headers)</p>
                {parsed.headers.map((h) => (
                  <div key={h} className="flex items-center gap-2 text-xs">
                    <span className="w-[40%] truncate font-medium text-foreground">{h}</span>
                    <span className="text-muted-foreground shrink-0">→</span>
                    <select
                      value={columnMap[h] ?? ""}
                      onChange={(e) => setColumnMap({ ...columnMap, [h]: e.target.value })}
                      className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-[11px]"
                    >
                      <option value="">Skip</option>
                      {activeSpec.fields.map((f) => (
                        <option key={f.field} value={f.field}>{f.field}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {detection.warnings.length > 0 && (
              <div className="text-[11px] text-amber-600 space-y-1">
                {detection.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setFile(null); setParsed(null); setDetection(null); }}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={busy}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Importing…" : `Import ${parsed.rows.length} rows`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Import History</h3>
        {imports.length === 0 ? (
          <p className="text-xs text-muted-foreground">No imports yet.</p>
        ) : (
          <div className="space-y-1.5">
            {imports.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet size={12} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {imp.sourceFilename || imp.id.slice(0, 8)}
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground">{imp.dashboardType.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(imp.importedAt).toLocaleString()} · {imp.factCount} facts · {imp.detectedConfidence ? `${Math.round(Number(imp.detectedConfidence) * 100)}% confidence` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(imp.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  title="Soft delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

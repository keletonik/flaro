/**
 * FipConfigAnalysisCard — upload a panel configuration file
 * (text export, CSV, JSON, XML, PDF, screenshot) and get a
 * structured technical analysis from Claude.
 *
 * Flow:
 *   1. Drop or pick a file (any of: .txt .csv .log .json .xml .ini .pdf .jpg .png)
 *   2. POST to /api/attachments (source="fip-config")
 *   3. POST attachmentId + optional context + optional panel hint
 *      to /api/fip/config-analysis
 *   4. Render: panel ID + confidence, top-line counts grid, device
 *      breakdown, per-loop summary, cause-and-effect rules, anomalies
 *      (severity-coloured), AS compliance flags, ranked recommendations,
 *      warnings.
 *
 * Sits alongside DefectImageAnalysisCard but with different file
 * acceptance + a different result shape. No conversation history.
 */

import { Fragment, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { apiFetch, uploadAttachment, type AttachmentMeta } from "@/lib/api";
import {
  FileText, Loader2, X, AlertTriangle, CheckCircle, Wrench, Info,
  Network, Cpu, ShieldCheck, ListOrdered, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigCounts {
  loops: number; zones: number; devices: number;
  mcps: number; sounders: number; modules: number; isolators: number;
}

interface DeviceLine { type: string; count: number; notes: string; }

interface LoopLine {
  loop: string; deviceCount: number; isolators: number;
  highestAddress: number; note: string;
}

interface CnELine { trigger: string; action: string; note: string; }

interface Anomaly {
  severity: "critical" | "high" | "medium" | "low";
  issue: string; evidence: string;
}

interface ComplianceFlag { standard: string; note: string; }

interface Recommendation {
  priority: number; action: string;
  estimatedTimeMin: number; skillLevel: "tech1" | "tech2" | "senior";
}

interface ConfigAnalysis {
  summary: string;
  panelMake: string;
  panelModel: string;
  confidence: "high" | "medium" | "low";
  configTool: string;
  counts: ConfigCounts;
  deviceBreakdown: DeviceLine[];
  loopSummary: LoopLine[];
  causeAndEffect: CnELine[];
  anomalies: Anomaly[];
  complianceFlags: ComplianceFlag[];
  recommendations: Recommendation[];
  warnings: string[];
}

const SEV: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
};

const CONFIDENCE: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const ACCEPT =
  ".txt,.csv,.log,.json,.xml,.ini,.cfg,.conf,.pdf,.jpg,.jpeg,.png,.webp,application/pdf,text/*,image/*";

export function FipConfigAnalysisCard() {
  const [file, setFile] = useState<AttachmentMeta | null>(null);
  const [context, setContext] = useState("");
  const [panelHint, setPanelHint] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<ConfigAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setError(null);
    setAnalysis(null);
    setUploading(true);
    try {
      const meta = await uploadAttachment(f, "fip-config");
      setFile(meta);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  function clearFile() {
    setFile(null);
    setAnalysis(null);
    setError(null);
  }

  async function analyse() {
    if (!file) return;
    setAnalysing(true);
    setError(null);
    try {
      const result = await apiFetch<ConfigAnalysis>("/fip/config-analysis", {
        method: "POST",
        body: JSON.stringify({
          attachmentId: file.id,
          context: context.trim() || undefined,
          panelHint: panelHint.trim() || undefined,
        }),
      });
      setAnalysis(result);
    } catch (e: any) {
      setError(e?.message ?? "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-4 md:p-6 max-w-5xl">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Panel Config Analyser</h3>
            <p className="text-[11px] text-muted-foreground">
              Upload a panel programming export — text, CSV, JSON, XML, PDF, or screenshot — for a full technical breakdown.
            </p>
          </div>
        </div>
      </header>

      {!file ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
          )}
        >
          <FileText className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-1">
            Drop a panel config file here or click to upload
          </p>
          <p className="text-[10px] text-muted-foreground/70 mb-3">
            Pertronic LCT/Lifecycle · Notifier VeriFire/CAMWorks · Simplex SDU · Ampac · Vigilant MX1 · Bosch FPA · Hochiki Latitude · Inertia
          </p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onInputChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Choose file"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{file.filename || "Config file"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {(file.size / 1024).toFixed(0)} KB · {file.contentType} · kind: {file.kind}
              </p>
              <button
                type="button"
                onClick={clearFile}
                className="text-[10px] text-muted-foreground hover:text-red-500 mt-1 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={panelHint}
              onChange={(e) => setPanelHint(e.target.value)}
              placeholder="Panel hint (optional). e.g. 'Pertronic F220'"
              className="px-2 py-1.5 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Site / what to focus on (optional)"
              className="px-2 py-1.5 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="button"
            onClick={analyse}
            disabled={analysing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            {analysing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing config…
              </>
            ) : (
              <>Run full analysis</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-500">
          {error}
        </div>
      )}

      {analysis && <ConfigResult analysis={analysis} />}
    </section>
  );
}

function ConfigResult({ analysis }: { analysis: ConfigAnalysis }) {
  return (
    <div className="mt-5 space-y-4">
      {/* Identification banner */}
      <div className="p-3 rounded-lg border border-border bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {analysis.panelMake}
                {analysis.panelModel && <span className="text-muted-foreground"> · {analysis.panelModel}</span>}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase border",
                CONFIDENCE[analysis.confidence] ?? CONFIDENCE.low,
              )}>
                {analysis.confidence} confidence
              </span>
              {analysis.configTool && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium border border-border bg-background text-muted-foreground">
                  {analysis.configTool}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground mt-1.5">{analysis.summary}</p>
          </div>
        </div>
      </div>

      {/* Top-line counts grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <CountTile label="Loops" value={analysis.counts.loops} />
        <CountTile label="Zones" value={analysis.counts.zones} />
        <CountTile label="Devices" value={analysis.counts.devices} />
        <CountTile label="MCPs" value={analysis.counts.mcps} />
        <CountTile label="AV/Sndr" value={analysis.counts.sounders} />
        <CountTile label="Modules" value={analysis.counts.modules} />
        <CountTile label="Isolators" value={analysis.counts.isolators} />
      </div>

      {/* Device breakdown + Loop summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {analysis.deviceBreakdown.length > 0 && (
          <Block title="Device breakdown" icon={Activity}>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">Type</th>
                    <th className="text-right px-2 py-1 font-medium w-12">Qty</th>
                    <th className="text-left px-2 py-1 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.deviceBreakdown.map((d, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1 text-foreground">{d.type}</td>
                      <td className="px-2 py-1 text-right font-mono text-foreground">{d.count}</td>
                      <td className="px-2 py-1 text-muted-foreground">{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        )}

        {analysis.loopSummary.length > 0 && (
          <Block title="Loop summary" icon={Network}>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">Loop</th>
                    <th className="text-right px-2 py-1 font-medium w-14">Devices</th>
                    <th className="text-right px-2 py-1 font-medium w-12">Iso</th>
                    <th className="text-right px-2 py-1 font-medium w-14">Max@</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.loopSummary.map((l, i) => (
                    <Fragment key={i}>
                      <tr className="border-t border-border">
                        <td className="px-2 py-1 text-foreground font-medium">{l.loop}</td>
                        <td className="px-2 py-1 text-right font-mono text-foreground">{l.deviceCount}</td>
                        <td className="px-2 py-1 text-right font-mono text-foreground">{l.isolators}</td>
                        <td className="px-2 py-1 text-right font-mono text-muted-foreground">{l.highestAddress || "—"}</td>
                      </tr>
                      {l.note && (
                        <tr className="bg-muted/10">
                          <td colSpan={4} className="px-2 py-1 text-[10px] text-muted-foreground italic">{l.note}</td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        )}
      </div>

      {/* Cause & effect */}
      {analysis.causeAndEffect.length > 0 && (
        <Block title="Cause & effect / output programming" icon={Wrench}>
          <div className="space-y-1.5">
            {analysis.causeAndEffect.map((c, i) => (
              <div key={i} className="p-2 rounded-md border border-border bg-muted/20">
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 md:w-1/2">
                    <span className="text-blue-500">when</span> {c.trigger}
                  </span>
                  <span className="text-[11px] text-foreground md:flex-1">
                    <span className="text-emerald-500 font-mono">→</span> {c.action}
                  </span>
                </div>
                {c.note && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">{c.note}</p>
                )}
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* Anomalies */}
      {analysis.anomalies.length > 0 && (
        <Block title="Anomalies" icon={AlertTriangle}>
          <div className="space-y-1.5">
            {analysis.anomalies.map((a, i) => (
              <div key={i} className="p-2 rounded-md border border-border bg-muted/20">
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0",
                    SEV[a.severity] ?? SEV.low,
                  )}>
                    {a.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground">{a.issue}</p>
                    {a.evidence && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{a.evidence}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* Compliance + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {analysis.complianceFlags.length > 0 && (
          <Block title="AS compliance" icon={ShieldCheck}>
            <ul className="space-y-1">
              {analysis.complianceFlags.map((c, i) => (
                <li key={i} className="text-[11px]">
                  <span className="font-mono text-blue-500">{c.standard}</span>
                  <span className="text-foreground"> — {c.note}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {analysis.recommendations.length > 0 && (
          <Block title="Recommendations" icon={ListOrdered}>
            <div className="space-y-1.5">
              {analysis.recommendations
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((r, i) => (
                  <div key={i} className="p-2 rounded-md border border-border bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-foreground">
                        <span className="text-primary mr-1">#{r.priority}</span>
                        {r.action}
                      </p>
                      <span className="text-[9px] text-muted-foreground shrink-0">{r.estimatedTimeMin} min</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Skill: {r.skillLevel}</p>
                  </div>
                ))}
            </div>
          </Block>
        )}
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <Block title="Warnings & data-quality" icon={Info}>
          <ul className="space-y-0.5 text-[11px]">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="text-amber-500">⚠ {w}</li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded-md border border-border bg-muted/20 text-center">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-base font-mono font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function Block({
  title, icon: Icon, children,
}: { title: string; icon: typeof Info; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        <Icon className="w-3 h-3" /> {title}
      </div>
      {children}
    </div>
  );
}

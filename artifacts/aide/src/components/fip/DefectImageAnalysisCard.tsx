/**
 * DefectImageAnalysisCard — upload an image + get a structured
 * defect diagnosis from the vision backend.
 *
 * Flow:
 *   1. Drag-drop or click-upload an image (jpg/png/webp)
 *   2. Upload the file to /api/attachments (source="fip-defect")
 *   3. POST the attachmentId + optional context note to
 *      /api/fip/defect-analysis
 *   4. Render the structured response: summary, severity pill,
 *      observations, likely causes, ranked fix options, compliance
 *      notes, warnings.
 *
 * Separate from the main FIP chat — dedicated context, no
 * conversation history, just image in / analysis out.
 */

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { apiFetch, uploadAttachment, type AttachmentMeta } from "@/lib/api";
import { ImageIcon, Loader2, X, AlertTriangle, CheckCircle, Wrench, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface FixOption {
  priority: number;
  action: string;
  skillLevel: "tech1" | "tech2" | "senior";
  tools: string[];
  estimatedTimeMin: number;
  safetyNotes: string;
}

interface DefectAnalysis {
  summary: string;
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  category: string;
  mode?: "diagnosis" | "identification" | "unknown";
  observations: string[];
  likelyCauses: string[];
  fixOptions: FixOption[];
  complianceNotes: string[];
  warnings: string[];
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function DefectImageAnalysisCard() {
  const [image, setImage] = useState<AttachmentMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<DefectAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Release the object URL when the component unmounts so the
  // browser isn't holding onto the preview blob forever.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File) {
    setError(null);
    setAnalysis(null);
    setUploading(true);
    try {
      const meta = await uploadAttachment(file, "fip-defect");
      setImage(meta);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void handleFile(file);
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setError(null);
  }

  async function analyse() {
    if (!image) return;
    setAnalysing(true);
    setError(null);
    try {
      const result = await apiFetch<DefectAnalysis>("/fip/defect-analysis", {
        method: "POST",
        body: JSON.stringify({
          attachmentId: image.id,
          context: context.trim() || undefined,
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
    <section className="bg-card border border-border rounded-2xl p-4">
      <header className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Defect Image Analysis</h3>
          <p className="text-[10px] text-muted-foreground">
            Upload a photo · AI diagnosis · ranked fix options
          </p>
        </div>
      </header>

      {!image ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
          )}
        >
          <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-2">
            Drop a photo here or click to upload
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
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
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border">
            {previewUrl && (
              <img
                src={previewUrl}
                alt=""
                className="w-20 h-20 object-cover rounded-md shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{image.filename || "Image"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {(image.size / 1024).toFixed(0)} KB · {image.contentType}
              </p>
              <button
                type="button"
                onClick={clearImage}
                className="text-[10px] text-muted-foreground hover:text-red-500 mt-1 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>

          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="What do you want to know? e.g. 'identify this panel' or 'what's wrong with this wiring'"
            rows={2}
            className="w-full px-2 py-1.5 rounded-md bg-background border border-border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <button
            type="button"
            onClick={analyse}
            disabled={analysing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            {analysing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…
              </>
            ) : (
              <>Analyse image</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-500">
          {error}
        </div>
      )}

      {analysis && <DefectResult analysis={analysis} />}
    </section>
  );
}

function DefectResult({ analysis }: { analysis: DefectAnalysis }) {
  const isIdentification = analysis.mode === "identification";
  const pillLabel = isIdentification ? "identify" : analysis.severity;
  const pillStyle = isIdentification
    ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
    : SEVERITY_STYLE[analysis.severity] ?? SEVERITY_STYLE.unknown;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase border shrink-0",
          pillStyle,
        )}>
          {pillLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{analysis.summary}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{analysis.category}</p>
        </div>
      </div>

      {analysis.observations.length > 0 && (
        <Block title="Observations" icon={Info}>
          <ul className="space-y-0.5 text-[11px]">
            {analysis.observations.map((o, i) => (
              <li key={i} className="text-foreground">— {o}</li>
            ))}
          </ul>
        </Block>
      )}

      {analysis.likelyCauses.length > 0 && (
        <Block title="Likely causes" icon={AlertTriangle}>
          <ol className="space-y-0.5 text-[11px] list-decimal list-inside">
            {analysis.likelyCauses.map((c, i) => (
              <li key={i} className="text-foreground">{c}</li>
            ))}
          </ol>
        </Block>
      )}

      {analysis.fixOptions.length > 0 && (
        <Block title="Fix options (ranked)" icon={Wrench}>
          <div className="space-y-2">
            {analysis.fixOptions.map((f, i) => (
              <div key={i} className="p-2 rounded-md border border-border bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground">
                    <span className="text-primary mr-1">#{f.priority}</span>
                    {f.action}
                  </p>
                  <span className="text-[9px] text-muted-foreground shrink-0">{f.estimatedTimeMin} min</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Skill: {f.skillLevel}
                  {f.tools.length > 0 && ` · Tools: ${f.tools.join(", ")}`}
                </p>
                {f.safetyNotes && (
                  <p className="text-[10px] text-red-500 mt-0.5">⚠ {f.safetyNotes}</p>
                )}
              </div>
            ))}
          </div>
        </Block>
      )}

      {analysis.complianceNotes.length > 0 && (
        <Block title="Compliance" icon={CheckCircle}>
          <ul className="space-y-0.5 text-[11px]">
            {analysis.complianceNotes.map((c, i) => (
              <li key={i} className="text-foreground">— {c}</li>
            ))}
          </ul>
        </Block>
      )}

      {analysis.warnings.length > 0 && (
        <Block title="Warnings" icon={AlertTriangle}>
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

function Block({
  title, icon: Icon, children,
}: { title: string; icon: typeof Info; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        <Icon className="w-3 h-3" /> {title}
      </div>
      {children}
    </div>
  );
}

/**
 * MyManuals - on-device manual library for the technician.
 *
 * IMPORTANT: this feature stores PDFs the technician has personally
 * uploaded onto their own device. Files never leave the device, never
 * get sent to our backend, and never get committed to the repository.
 * The repo never holds manufacturer manuals; that is non-negotiable
 * (see ./README.md).
 *
 * Backed by lib/idb.ts cached-manuals store. ~50 MB practical cap;
 * larger uploads are rejected with a friendly message.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload, ExternalLink, X, AlertTriangle } from "lucide-react";
import {
  addCachedManual,
  listCachedManuals,
  removeCachedManual,
  type CachedManual,
} from "@/lib/idb";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPT = "application/pdf,image/*";

interface MyManualsProps {
  className?: string;
  /** Optional brand/model context for tagging on upload. */
  brandId?: string;
  modelId?: string;
}

export function MyManuals({ className, brandId, modelId }: MyManualsProps) {
  const [items, setItems] = useState<CachedManual[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listCachedManuals());
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Revoke object URL on unmount or when preview swaps.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onUpload = useCallback(async (files: FileList | null) => {
    setError(null);
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) {
        setError(`${f.name} is larger than 50 MB - upload skipped.`);
        continue;
      }
      try {
        await addCachedManual({
          brandId,
          modelId,
          filename: f.name,
          mime: f.type || "application/octet-stream",
          size: f.size,
          blob: f,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed.";
        setError(msg);
      }
    }
    await load();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [brandId, modelId, load]);

  const onPreview = useCallback((m: CachedManual) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(m.blob);
    setPreviewUrl(url);
    setPreviewName(m.filename);
  }, [previewUrl]);

  const onRemove = useCallback(async (id: string) => {
    await removeCachedManual(id);
    setItems((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-3", className)}>
      <header className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            My manuals
          </span>
          {loaded && (
            <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
              · {items.length}
            </span>
          )}
        </div>
        <label
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/40 cursor-pointer transition-colors min-h-[36px]"
        >
          <Upload size={12} />
          <span>Add</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={(e) => onUpload(e.target.files)}
            className="sr-only"
          />
        </label>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-300 mb-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <p className="leading-snug flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="shrink-0 -mt-0.5"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {loaded && items.length === 0 && (
        <p className="px-2 py-3 text-[11px] text-muted-foreground leading-relaxed">
          Add a PDF you already have on this device. Files stay on your phone -
          never uploaded, never shared.
        </p>
      )}

      <ul className="space-y-1">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreview(m)}
              className="flex-1 flex items-center gap-2 min-h-[44px] px-2.5 py-2 rounded-md hover:bg-muted/30 transition-colors text-left"
            >
              <FileText size={13} className="text-muted-foreground shrink-0" />
              <span className="text-[12px] font-medium text-foreground truncate flex-1">
                {m.filename}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground/70 tabular-nums shrink-0">
                {(m.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <ExternalLink size={11} className="text-muted-foreground/50 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(m.id)}
              aria-label={`Remove ${m.filename}`}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 px-1 font-mono text-[9px] text-muted-foreground/60 leading-relaxed">
        On-device only. Manufacturer manuals are linked at their source -
        never reproduced in this app.
      </p>

      {previewUrl && (
        <div className="fixed inset-0 z-[65] bg-black/85 flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border">
            <span className="text-[12px] font-medium text-foreground truncate">{previewName}</span>
            <button
              type="button"
              onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
              aria-label="Close preview"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              <X size={14} />
            </button>
          </div>
          <iframe
            title={previewName}
            src={previewUrl}
            className="flex-1 w-full bg-white"
          />
        </div>
      )}
    </section>
  );
}

export default MyManuals;

/**
 * PanelIdCapture - on-site rear-camera capture for panel identification.
 *
 * Flow:
 *   1. Tech taps the camera button.
 *   2. We request rear-camera permission via lib/camera.ts.
 *   3. Live preview renders fullscreen with a salmon shutter ring.
 *   4. Tap the shutter: frame captured as JPEG blob.
 *   5. Blob handed to AIDE chat with the prompt "Identify this fire panel..."
 *      via the existing aide-files-dropped event the EmbeddedAgentChat listens for.
 *
 * Permission denied or no camera: fall back to a "describe what you see"
 * text-only form that submits the same way.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Type, AlertTriangle } from "lucide-react";
import { startCamera, isCameraAvailable, type CameraSession } from "@/lib/camera";
import { cn } from "@/lib/utils";

interface PanelIdCaptureProps {
  open: boolean;
  onClose: () => void;
}

const PROMPT = "Identify this fire panel from the photo. Tell me the manufacturer and model if you can, and the closest match if not. Note any visible fault LEDs or labels.";

export function PanelIdCapture({ open, onClose }: PanelIdCaptureProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<CameraSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState("");

  // Start camera when sheet opens, stop on close.
  useEffect(() => {
    if (!open) return;
    if (!isCameraAvailable()) {
      setError("Camera not supported on this device.");
      return;
    }
    let cancelled = false;
    let active: CameraSession | null = null;
    (async () => {
      try {
        const s = await startCamera();
        if (cancelled) { s.stop(); return; }
        active = s;
        setSession(s);
        // Mount the live <video> into the preview container.
        if (containerRef.current) {
          s.video.className = "absolute inset-0 w-full h-full object-cover";
          containerRef.current.appendChild(s.video);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera permission denied or unavailable.";
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
      if (active) active.stop();
      setSession(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submitToChat = useCallback((blob: Blob | null, fallbackText: string) => {
    if (blob) {
      // Hand off as a File so EmbeddedAgentChat treats it like a normal upload.
      const file = new File([blob], `panel-${Date.now()}.jpg`, { type: "image/jpeg" });
      window.dispatchEvent(new CustomEvent("aide-files-dropped", { detail: { files: [file] } }));
    }
    // Always send the prompt - either alongside the photo or alone.
    const promptText = blob ? PROMPT : `${PROMPT}\n\nNo photo available - description: ${fallbackText}`;
    window.dispatchEvent(new CustomEvent("aide-open-with-prompt", { detail: { prompt: promptText } }));
    // Open the AIDE tray so the tech sees the response.
    window.dispatchEvent(new CustomEvent("aide-toggle"));
    onClose();
  }, [onClose]);

  const onShutter = useCallback(async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const blob = await session.capture();
      submitToChat(blob, "");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Capture failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [session, busy, submitToChat]);

  const onFallbackSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!fallback.trim()) return;
    submitToChat(null, fallback.trim());
    setFallback("");
  }, [fallback, submitToChat]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col" role="dialog" aria-modal="true">
      <div ref={containerRef} className="relative flex-1 bg-black overflow-hidden">
        {!session && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full bg-primary/40 warm-breathe" />
                <div className="absolute inset-3 rounded-full bg-primary" />
              </div>
              <p className="font-mono text-[11px] tracking-wider uppercase">Starting camera</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-white">
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 max-w-sm">
              <div className="flex items-center gap-2 mb-2 text-amber-200">
                <AlertTriangle size={14} />
                <span className="font-mono text-[10px] uppercase tracking-wider">Camera unavailable</span>
              </div>
              <p className="text-[13px] leading-relaxed mb-4">{error}</p>
              <form onSubmit={onFallbackSubmit} className="space-y-2">
                <label className="block text-[11px] text-white/70">Describe what you see instead:</label>
                <textarea
                  value={fallback}
                  onChange={(e) => setFallback(e.target.value)}
                  rows={4}
                  placeholder="e.g. Pertronic-style cream panel, LCD top, one zone in alarm, brigade LED on..."
                  className="w-full rounded-md bg-black/40 border border-white/20 text-white placeholder:text-white/40 p-2 text-[13px] focus:outline-none focus:border-primary/60"
                />
                <button
                  type="submit"
                  disabled={!fallback.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground disabled:opacity-40"
                >
                  <Type size={14} />
                  Send to AIDE
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Top bar - close */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 z-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white"
        >
          <X size={18} />
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
          Identify panel
        </span>
        <span className="w-11 h-11" aria-hidden />
      </div>

      {/* Bottom bar - shutter */}
      {session && !error && (
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center pb-8 pt-4 z-10">
          <button
            type="button"
            onClick={onShutter}
            disabled={busy}
            aria-label="Capture photo"
            className={cn(
              "inline-flex items-center justify-center w-20 h-20 rounded-full",
              "border-4 border-white",
              "bg-primary text-primary-foreground",
              "shadow-[0_8px_28px_-8px_hsl(var(--primary)/0.7)]",
              "active:scale-95 transition-transform",
              busy && "opacity-60",
            )}
          >
            <Camera size={28} />
          </button>
        </div>
      )}
    </div>
  );
}

export default PanelIdCapture;

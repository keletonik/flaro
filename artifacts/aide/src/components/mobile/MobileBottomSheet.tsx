/**
 * MobileBottomSheet - bottom-anchored modal sheet with a drag handle.
 *
 * Designed for one-handed phone use. Default snap point is 60vh; user
 * drags the handle up for full-height (95vh) or part-way down to peek
 * (30vh). Tap the backdrop or swipe past the bottom snap to close.
 *
 * Pure CSS animation, no library, no dragging dep. Touch-first; mouse
 * events are also wired so it works in dev tools mobile mode.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SnapPoint = "peek" | "half" | "full";

const SNAP_VH: Record<SnapPoint, number> = {
  peek: 30,
  half: 60,
  full: 95,
};

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional title rendered in the sticky header. */
  title?: string;
  /** Default snap point on open. */
  initialSnap?: SnapPoint;
  /** Visible content - typically a chat or list. */
  children: ReactNode;
}

export function MobileBottomSheet({
  open, onClose, title, initialSnap = "half", children,
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [snap, setSnap] = useState<SnapPoint>(initialSnap);
  const dragState = useRef<{ startY: number; startVh: number } | null>(null);

  // Reset snap on each open so reopening always shows the default.
  useEffect(() => {
    if (open) setSnap(initialSnap);
  }, [open, initialSnap]);

  // Esc closes the sheet.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const onHandleStart = useCallback((clientY: number) => {
    dragState.current = { startY: clientY, startVh: SNAP_VH[snap] };
  }, [snap]);

  const onHandleMove = useCallback((clientY: number) => {
    if (!dragState.current || !sheetRef.current) return;
    const dy = dragState.current.startY - clientY;
    const dvh = (dy / window.innerHeight) * 100;
    const next = Math.max(20, Math.min(98, dragState.current.startVh + dvh));
    sheetRef.current.style.height = `${next}vh`;
  }, []);

  const onHandleEnd = useCallback((clientY: number) => {
    if (!dragState.current || !sheetRef.current) return;
    const dy = dragState.current.startY - clientY;
    const dvh = (dy / window.innerHeight) * 100;
    const target = dragState.current.startVh + dvh;
    dragState.current = null;
    sheetRef.current.style.height = ""; // clear inline so the class snap takes over

    if (target < 22) { onClose(); return; }
    if (target < 45) { setSnap("peek"); return; }
    if (target < 78) { setSnap("half"); return; }
    setSnap("full");
  }, [onClose]);

  if (!open) return null;

  const heightClass =
    snap === "peek" ? "h-[30vh]" : snap === "half" ? "h-[60vh]" : "h-[95vh]";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/30 backdrop-blur-[2px] cursor-pointer"
      />
      <div
        ref={sheetRef}
        className={cn(
          "relative flex flex-col bg-card border-t border-border",
          "rounded-t-2xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.25)]",
          "transition-[height] duration-300 ease-out",
          heightClass,
        )}
      >
        {/* Drag handle - generous hit area, glove-friendly */}
        <div
          onPointerDown={(e) => onHandleStart(e.clientY)}
          onPointerMove={(e) => { if (e.buttons) onHandleMove(e.clientY); }}
          onPointerUp={(e) => onHandleEnd(e.clientY)}
          onPointerCancel={(e) => onHandleEnd(e.clientY)}
          className="touch-none cursor-grab active:cursor-grabbing flex items-center justify-center pt-2 pb-1 select-none"
        >
          <span className="block h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between gap-2 px-4 pb-2 border-b border-border">
            <h2 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sheet"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default MobileBottomSheet;

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/hooks/useTableColumns";

interface TableColumnPickerProps {
  orderedColumns: ColumnDef[];
  visibleColumns: ColumnDef[];
  hiddenSet?: Set<string>;
  toggle: (key: string) => void;
  reorder: (from: number, to: number) => void;
  reset: () => void;
  customised: boolean;
}

/**
 * Dropdown that lets the user reorder columns (drag), hide/show (checkbox),
 * or reset to defaults. State lives in the parent — this is pure UI.
 */
export function TableColumnPicker({
  orderedColumns,
  visibleColumns,
  toggle,
  reorder,
  reset,
  customised,
}: TableColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleKeys = new Set(visibleColumns.map(c => c.key));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onRowDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragFrom(idx);
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires dataTransfer to be set for drag to fire.
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch {}
  };
  const onRowDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === idx) return;
    setDragOver(idx);
  };
  const onRowDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === idx) { setDragFrom(null); setDragOver(null); return; }
    reorder(dragFrom, idx);
    setDragFrom(null);
    setDragOver(null);
  };
  const onRowDragEnd = () => { setDragFrom(null); setDragOver(null); };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all",
          open
            ? "text-foreground border-primary/40 bg-primary/5"
            : "text-muted-foreground hover:text-foreground border-border hover:bg-muted/50",
        )}
      >
        <Eye size={10} /> Columns ({visibleColumns.length}/{orderedColumns.length})
        {customised && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-card border border-border rounded-lg shadow-xl p-1">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border mb-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">columns</span>
            <button
              onClick={reset}
              disabled={!customised}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Reset to defaults"
            >
              reset
            </button>
          </div>
          <div className="py-1">
            {orderedColumns.map((col, idx) => {
              const isHidden = !visibleKeys.has(col.key);
              return (
                <div
                  key={col.key}
                  draggable
                  onDragStart={onRowDragStart(idx)}
                  onDragOver={onRowDragOver(idx)}
                  onDrop={onRowDrop(idx)}
                  onDragEnd={onRowDragEnd}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded cursor-grab hover:bg-muted/50",
                    dragFrom === idx && "opacity-40",
                    dragOver === idx && dragFrom !== idx && "bg-primary/10 outline outline-1 outline-primary/50",
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground/60 select-none">⋮⋮</span>
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => toggle(col.key)}
                    className="rounded border-border"
                    onClick={e => e.stopPropagation()}
                  />
                  <span className={cn("flex-1 text-[11px]", isHidden ? "text-muted-foreground/50 line-through" : "text-foreground")}>
                    {col.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="px-2 py-1.5 font-mono text-[9px] text-muted-foreground/60 border-t border-border mt-1">
            drag ⋮⋮ to reorder · drag column edge to resize
          </p>
        </div>
      )}
    </div>
  );
}

export default TableColumnPicker;

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSavedFilters, type SavedFilter } from "@/hooks/useSavedFilters";

interface Props<T> {
  scope: string;
  currentValue: T;
  isEmpty?: (v: T) => boolean;
  onApply: (value: T) => void;
  className?: string;
}

export function SavedFiltersBar<T>({
  scope,
  currentValue,
  isEmpty,
  onApply,
  className,
}: Props<T>) {
  const {
    pinned,
    unpinned,
    addFilter,
    removeFilter,
    togglePin,
  } = useSavedFilters<T>(scope);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const empty = isEmpty ? isEmpty(currentValue) : false;

  const handleSave = () => {
    if (!name.trim()) return;
    addFilter(name, currentValue);
    setName("");
    setSaveOpen(false);
  };

  const renderChip = (f: SavedFilter<T>) => (
    <div
      key={f.id}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-mono transition-colors",
        f.pinned
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80",
      )}
    >
      <button
        type="button"
        onClick={() => togglePin(f.id)}
        title={f.pinned ? "Unpin" : "Pin"}
        className="text-[10px] opacity-60 hover:opacity-100"
      >
        {f.pinned ? "[*]" : "[ ]"}
      </button>
      <button
        type="button"
        onClick={() => onApply(f.value)}
        className="truncate max-w-[180px]"
        title="Apply filter"
      >
        {f.name}
      </button>
      <button
        type="button"
        onClick={() => removeFilter(f.id)}
        title="Remove"
        className="text-[10px] opacity-40 hover:opacity-100 hover:text-red-500"
      >
        x
      </button>
    </div>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {pinned.map(renderChip)}
      {unpinned.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {unpinned.slice(0, 8).map(renderChip)}
        </div>
      )}
      {!empty && (
        saveOpen ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-1.5 py-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setSaveOpen(false); setName(""); }
              }}
              placeholder="filter name"
              className="bg-transparent text-[11px] font-mono focus:outline-none placeholder:text-muted-foreground/50 w-28"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="text-[11px] font-mono text-primary disabled:opacity-40"
            >
              save
            </button>
            <button
              type="button"
              onClick={() => { setSaveOpen(false); setName(""); }}
              className="text-[10px] font-mono opacity-60 hover:opacity-100"
            >
              x
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Save current filters as a preset"
          >
            + save filter
          </button>
        )
      )}
    </div>
  );
}

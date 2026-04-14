/**
 * DrillDownPanel — side sheet showing a metric's underlying rows.
 *
 * Opens from the ChartShell "Drill down" action. Renders a simple
 * table of label/value/target plus a collapsible "What this query
 * does" block that shows the metric's `explainQuery` in plain
 * English. No heavy table library — the metric registry caps each
 * metric at ~30 rows in practice.
 *
 * Close via X button, escape key, or click outside.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ChartShellMetric } from "./ChartShell";
import { cn } from "@/lib/utils";

interface Props {
  metric: ChartShellMetric | null;
  open: boolean;
  onClose: () => void;
}

export function DrillDownPanel({ metric, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !metric) return null;

  const metaKeys = new Set<string>();
  metric.rows.forEach((r) => {
    if (r.meta) Object.keys(r.meta).forEach((k) => metaKeys.add(k));
  });
  const metaCols = [...metaKeys];

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside
        className={cn(
          "w-full max-w-[520px] bg-background border-l border-border",
          "flex flex-col shadow-xl",
        )}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{metric.displayName}</h2>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {metric.id} · {metric.period}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            What this query does
          </p>
          <p className="text-xs leading-relaxed">{metric.explainQuery}</p>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium text-right">Value</th>
                {metaCols.map((k) => (
                  <th key={k} className="px-4 py-2 font-medium">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metric.rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="px-4 py-2">{r.label}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.value}</td>
                  {metaCols.map((k) => (
                    <td key={k} className="px-4 py-2 text-muted-foreground">
                      {r.meta?.[k] != null ? String(r.meta[k]) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground font-mono flex items-center justify-between">
          <span>{metric.rows.length} rows</span>
          <span>{metric.periodStart.slice(0, 10)} → {metric.periodEnd.slice(0, 10)}</span>
        </footer>
      </aside>
    </div>
  );
}

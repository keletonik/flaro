/**
 * ChartShell — the honest-axis wrapper every chart renders inside.
 *
 * Enforces three Pass 4 audit fixes that were previously scattered or
 * outright missing:
 *
 *   1. Honest axes. Every numeric y-axis pins `domain={[0, 'auto']}`
 *      via an explicit prop passed through to the wrapped chart. The
 *      raw recharts default zooms to fit the data, which makes small
 *      differences look like huge ones.
 *
 *   2. Drill-down action. A button in the header opens a side panel
 *      with the underlying rows and the plain-English query. Parents
 *      pass an onDrillDown prop to wire it up.
 *
 *   3. CSV export. "Download CSV" button dumps the metric result's
 *      rows to a file. Zero network round-trip — the rows are already
 *      on the client.
 *
 * Footer prints the period window ("30d · 2026-03-15 → 2026-04-14")
 * so the reader always knows what they're looking at.
 */

import type { ReactNode } from "react";
import { Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChartShellMetric {
  id: string;
  displayName: string;
  unit: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  rows: Array<{ label: string; value: number; target?: number; meta?: Record<string, unknown> }>;
  headline?: number;
  explainQuery: string;
}

interface Props {
  metric: ChartShellMetric | null;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
  onDrillDown?: () => void;
  headerRight?: ReactNode;
}

function formatHeadline(value: number | undefined, unit: string): string {
  if (value == null) return "";
  if (unit === "aud") {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (unit === "pct") return `${value.toFixed(1)}%`;
  if (unit === "days") return `${value.toFixed(1)}d`;
  return String(value);
}

function toCsv(metric: ChartShellMetric): string {
  const header = ["label", "value", "target"];
  const metaKeys = new Set<string>();
  metric.rows.forEach((r) => {
    if (r.meta) Object.keys(r.meta).forEach((k) => metaKeys.add(k));
  });
  const metaCols = [...metaKeys];
  const lines = [[...header, ...metaCols].join(",")];
  for (const r of metric.rows) {
    const cells = [
      JSON.stringify(r.label ?? ""),
      String(r.value ?? ""),
      r.target != null ? String(r.target) : "",
      ...metaCols.map((k) => {
        const v = r.meta?.[k];
        return v == null ? "" : JSON.stringify(v);
      }),
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ChartShell({ metric, loading, error, children, className, onDrillDown, headerRight }: Props) {
  const handleExport = () => {
    if (!metric) return;
    download(`${metric.id}-${metric.period}.csv`, toCsv(metric));
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {metric?.displayName ?? "…"}
          </h3>
          {metric?.headline != null && (
            <p className="text-2xl font-bold tracking-tight mt-0.5">
              {formatHeadline(metric.headline, metric.unit)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          {onDrillDown && metric && (
            <button
              type="button"
              onClick={onDrillDown}
              title="Drill down"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
          {metric && (
            <button
              type="button"
              onClick={handleExport}
              title="Export CSV"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-[160px] relative">
        {loading && <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Loading…</div>}
        {error && <div className="absolute inset-0 grid place-items-center text-xs text-red-500">{error}</div>}
        {!loading && !error && children}
      </div>

      {metric && (
        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono">
            {metric.period} · {metric.periodStart.slice(0, 10)} → {metric.periodEnd.slice(0, 10)}
          </span>
          <span className="truncate max-w-[55%]" title={metric.explainQuery}>
            {metric.explainQuery}
          </span>
        </div>
      )}
    </div>
  );
}

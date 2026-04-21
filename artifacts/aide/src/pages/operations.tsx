/**
 * Operations · Pipeline view.
 *
 * One surface, one purpose: show the manager where the money's flowing
 * through the funnel right now — and where it's stuck.
 *
 * Replaces the previous 4-tab grid (WIP / Quotes / Defects / Invoices).
 * Detail editing lives on /jobs; CSV import lives in the AIDE tray's
 * FileIntakeDialog. This page is a briefing, not a spreadsheet.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { apiFetch, formatCurrency } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { CountUp } from "@/components/ui/CountUp";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { cn } from "@/lib/utils";

interface KpiMetrics {
  overview: { activeJobs: number; completedToday: number; completedThisWeek: number; criticalJobs: number };
  wip: { total: number; active: number; totalQuoteValue: number; totalInvoiced: number; byStatus: Record<string, number> };
  quotes: { total: number; pending: number; accepted: number; totalValue: number; acceptedValue: number; conversionRate: number; byStatus: Record<string, number> };
  defects: { total: number; open: number; critical: number };
  invoices: { total: number; outstanding: number; overdue: number; outstandingTotal: number; revenueThisWeek: number; revenueThisMonth: number };
}

interface AtRiskItem {
  quoteNumber?: string | null;
  invoiceNumber?: string | null;
  taskNumber?: string | null;
  site?: string | null;
  client?: string | null;
  amount?: number;
  invoiceAmount?: number;
  quoteAmount?: number;
  gap?: number;
}

interface PipelineGaps {
  totalAtRisk: number;
  quotesWithoutWip: AtRiskItem[];
  wipWithoutInvoice: AtRiskItem[];
  underInvoiced: AtRiskItem[];
  summary: {
    quotesWithoutWipCount: number;  quotesWithoutWipValue: number;
    wipWithoutInvoiceCount: number; wipWithoutInvoiceValue: number;
    underInvoicedCount: number;     underInvoicedGap: number;
  };
}

function titleOf(item: AtRiskItem): string {
  if (item.taskNumber) return item.taskNumber;
  if (item.invoiceNumber) return item.invoiceNumber;
  if (item.quoteNumber) return item.quoteNumber;
  if (item.site && item.site !== "Unknown") return item.site;
  if (item.client && item.client !== "Unknown") return item.client;
  return "—";
}

function subtitleOf(item: AtRiskItem): string {
  const bits: string[] = [];
  if (item.client && item.client !== "Unknown") bits.push(item.client);
  if (item.site && item.site !== "Unknown" && item.site !== item.client) bits.push(item.site);
  return bits.join(" · ") || "no client set";
}

/** One stage of the pipeline: label, big number, dollar amount, drill link. */
function Stage({
  label, count, value, drillTo, setLocation, accent,
}: {
  label: string; count: number; value: number; drillTo: string;
  setLocation: (path: string) => void; accent: string;
}) {
  return (
    <button
      onClick={() => setLocation(drillTo)}
      className="flex-1 px-4 py-3 text-left hover:bg-muted/20 transition-colors group"
    >
      <p className={cn("font-mono text-[9px] uppercase tracking-[0.15em] opacity-70", accent)}>
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <CountUp value={count} className="font-mono text-[24px] font-bold text-foreground tracking-tight tabular-nums leading-none" />
        <CountUp value={value} format={formatCurrency} className="font-mono text-[11px] text-muted-foreground tabular-nums" />
      </div>
      <p className="font-mono text-[9px] text-muted-foreground/60 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        drill →
      </p>
    </button>
  );
}

/** One at-risk row inside a stack (quote chase / WIP stuck / invoice overdue). */
function RiskRow({
  item, onClick,
}: { item: AtRiskItem; onClick?: () => void }) {
  const amount = item.amount ?? item.gap ?? item.invoiceAmount ?? item.quoteAmount ?? 0;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/20 transition-colors text-left disabled:hover:bg-transparent disabled:cursor-default"
    >
      <span className="font-mono text-[10px] text-primary/70 shrink-0">&gt;</span>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[12px] font-semibold text-foreground tracking-tight truncate">
          {titleOf(item)}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground truncate">
          {subtitleOf(item)}
        </p>
      </div>
      {amount > 0 && (
        <span className="font-mono text-[11px] font-bold text-foreground tabular-nums shrink-0">
          {formatCurrency(amount)}
        </span>
      )}
    </button>
  );
}

/** Grouping box for at-risk items with a count + dollar header. */
function RiskStack({
  label, count, value, items, emptyMessage, onRowClick,
}: {
  label: string; count: number; value: number;
  items: AtRiskItem[]; emptyMessage: string;
  onRowClick?: (item: AtRiskItem) => void;
}) {
  return (
    <section className="border border-border rounded-lg overflow-hidden">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] tabular-nums">
          <span className="text-foreground font-bold">{count}</span>
          {value > 0 && <span className="text-muted-foreground"> · {formatCurrency(value)}</span>}
        </span>
      </header>
      <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-3 py-6 font-mono text-[11px] text-center text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          items.slice(0, 8).map((item, i) => (
            <RiskRow
              key={i}
              item={item}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function Operations() {
  const [, setLocation] = useLocation();
  const [kpi, setKpi] = useState<KpiMetrics | null>(null);
  const [gaps, setGaps] = useState<PipelineGaps | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [k, g] = await Promise.all([
        apiFetch<KpiMetrics>("/kpi/metrics"),
        apiFetch<PipelineGaps>("/analytics/pipeline-gaps"),
      ]);
      setKpi(k);
      setGaps(g);
    } catch {
      // Leave state as-is; loading toggles off regardless.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useLiveUpdates(() => { void load(); });

  const drillToJob = (item: AtRiskItem) => {
    // Prefer task number for the jobs list filter. Falls back to site search.
    if (item.taskNumber) setLocation(`/jobs?search=${encodeURIComponent(item.taskNumber)}`);
    else if (item.site) setLocation(`/jobs?search=${encodeURIComponent(item.site)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader prefix="::" title="Operations" subtitle="Pipeline briefing" />
        <div className="px-4 py-4 space-y-4 max-w-[1400px]">
          <div className="border border-border rounded-lg h-[88px] skeleton-shimmer" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <div key={i} className="border border-border rounded-lg h-[320px] skeleton-shimmer" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!kpi || !gaps) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader prefix="::" title="Operations" subtitle="Pipeline briefing" />
        <div className="px-4 py-4">
          <p className="font-mono text-[12px] text-muted-foreground">
            Pipeline data unavailable — server returned no metrics. Try refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background">
      <PageHeader
        prefix="::"
        title="Operations"
        subtitle="Pipeline briefing · where the money's flowing, where it's stuck"
      />

      <div className="px-4 py-4 space-y-4 max-w-[1400px]">
        {/* Pipeline stages — quotes → wip → done → invoiced. One bordered
            strip with divider-x cells so each stage reads as a column. */}
        <section className="border border-border rounded-lg overflow-hidden">
          <header className="px-3 py-2 border-b border-border flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              pipeline
            </span>
          </header>
          <div className="flex divide-x divide-border/60">
            <Stage
              label="quotes pending"
              count={kpi.quotes.pending}
              value={kpi.quotes.totalValue}
              drillTo="/jobs?search=quote"
              setLocation={setLocation}
              accent="text-blue-500"
            />
            <Stage
              label="wip open"
              count={kpi.wip.active}
              value={kpi.wip.totalQuoteValue}
              drillTo="/jobs?status=In Progress"
              setLocation={setLocation}
              accent="text-amber-500"
            />
            <Stage
              label="done 7d"
              count={kpi.overview.completedThisWeek}
              value={kpi.wip.totalInvoiced}
              drillTo="/jobs?status=Done"
              setLocation={setLocation}
              accent="text-emerald-500"
            />
            <Stage
              label="overdue invoices"
              count={kpi.invoices.overdue}
              value={kpi.invoices.outstandingTotal}
              drillTo="/jobs?search=overdue"
              setLocation={setLocation}
              accent="text-red-500"
            />
          </div>
        </section>

        {/* Revenue leakage summary — one line that owns the at-risk dollars. */}
        {gaps.totalAtRisk > 0 && (
          <section className="border border-red-500/40 bg-red-500/[0.04] rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] text-red-500 uppercase tracking-[0.15em]">
              ! revenue at risk
            </span>
            <span className="font-mono text-[14px] font-bold text-red-500 tabular-nums">
              {formatCurrency(gaps.totalAtRisk)}
            </span>
          </section>
        )}

        {/* Three at-risk stacks, horizontal on desktop, stacked on mobile. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RiskStack
            label="quotes to chase"
            count={gaps.summary.quotesWithoutWipCount}
            value={gaps.summary.quotesWithoutWipValue}
            items={gaps.quotesWithoutWip}
            emptyMessage="every accepted quote has a WIP. clean."
            onRowClick={drillToJob}
          />
          <RiskStack
            label="wip not invoiced"
            count={gaps.summary.wipWithoutInvoiceCount}
            value={gaps.summary.wipWithoutInvoiceValue}
            items={gaps.wipWithoutInvoice}
            emptyMessage="every completed WIP is invoiced."
            onRowClick={drillToJob}
          />
          <RiskStack
            label="under-invoiced"
            count={gaps.summary.underInvoicedCount}
            value={gaps.summary.underInvoicedGap}
            items={gaps.underInvoiced}
            emptyMessage="no under-invoicing detected."
            onRowClick={drillToJob}
          />
        </div>

        {/* Hint footer — tells the manager what lives where now. */}
        <p className="font-mono text-[10px] text-muted-foreground/70 px-1">
          drill into any row for the detail. CSV imports drop onto the AIDE tray.
          raw entity grids live on <a className="underline text-primary/80 hover:text-primary" href="/jobs">/jobs</a>.
        </p>
      </div>
    </div>
  );
}

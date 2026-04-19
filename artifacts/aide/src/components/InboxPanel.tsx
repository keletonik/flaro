/**
 * Dashboard inbox block — "what needs me today" (Pass 7 fix 1).
 *
 * Three columns:
 *   - Oldest open critical defects (5)
 *   - Most-overdue unpaid invoices (5)
 *   - Highest-value open WIPs (5)
 *
 * Each row is clickable and drops the user on the filtered
 * operations tab with the right id. Data fetched from the
 * existing list endpoints; sorted + trimmed client-side. No
 * new API calls.
 *
 * The core complaint from Pass 7 §3.1 was "I open three pages
 * to see what needs me today" — this block answers all three in
 * one glance.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Clock, DollarSign } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DefectRow {
  id: string;
  task_number?: string | null;
  taskNumber?: string | null;
  site: string;
  client: string;
  severity?: string | null;
  status?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface InvoiceRow {
  id: string;
  invoice_number?: string | null;
  invoiceNumber?: string | null;
  site: string;
  client: string;
  status?: string | null;
  total_amount?: number | null;
  totalAmount?: number | null;
  amount?: number | null;
  date_due?: string | null;
  dateDue?: string | null;
}

interface WipRow {
  id: string;
  task_number?: string | null;
  taskNumber?: string | null;
  site: string;
  client: string;
  status?: string | null;
  quote_amount?: number | null;
  quoteAmount?: number | null;
}

function pick<T>(...xs: (T | null | undefined)[]): T | undefined {
  for (const x of xs) if (x != null) return x as T;
  return undefined;
}

function daysSince(iso: string | undefined): number {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

const fmtAud = (v: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(v);

export function InboxPanel() {
  const [, setLocation] = useLocation();
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [wips, setWips] = useState<WipRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, i, w] = await Promise.all([
          apiFetch<{ rows?: DefectRow[] } | DefectRow[]>("/defects?severity=Critical&status=Open"),
          apiFetch<{ rows?: InvoiceRow[] } | InvoiceRow[]>("/invoices?status=Overdue"),
          apiFetch<{ rows?: WipRow[] } | WipRow[]>("/wip?status=Open"),
        ]);
        const unwrap = <T,>(x: { rows?: T[] } | T[]): T[] => (Array.isArray(x) ? x : x.rows ?? []);
        const defectList = unwrap(d)
          .sort((a, b) => daysSince(pick(b.created_at, b.createdAt)) - daysSince(pick(a.created_at, a.createdAt)))
          .slice(0, 5);
        const invoiceList = unwrap(i)
          .filter((x) => Number(pick(x.total_amount, x.totalAmount, x.amount) ?? 0) > 0)
          .sort((a, b) => {
            const da = daysSince(pick(a.date_due, a.dateDue));
            const db = daysSince(pick(b.date_due, b.dateDue));
            return db - da;
          })
          .slice(0, 5);
        const wipList = unwrap(w)
          .map((x) => ({ ...x, _v: Number(pick(x.quote_amount, x.quoteAmount) ?? 0) }))
          .sort((a, b) => b._v - a._v)
          .slice(0, 5);
        setDefects(defectList);
        setInvoices(invoiceList);
        setWips(wipList);
      } catch (e) {
        // silent — inbox block is non-critical
        // eslint-disable-next-line no-console
        console.warn("[InboxPanel] load failed", e);
      }
    };
    void load();
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
          Today's inbox
        </h2>
        <span className="text-[10px] text-muted-foreground">What needs you right now</span>
      </header>

      <div className={(() => {
        const filled = [defects.length > 0, invoices.length > 0, wips.length > 0].filter(Boolean).length;
        if (filled <= 1) return "grid grid-cols-1 gap-4";
        if (filled === 2) return "grid grid-cols-1 md:grid-cols-2 gap-4";
        return "grid grid-cols-1 md:grid-cols-3 gap-4";
      })()}>
        {defects.length > 0 && (<div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-red-500 uppercase tracking-wide">
            <AlertTriangle className="w-3 h-3" /> Critical defects
          </div>
          {defects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open critical defects.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {defects.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setLocation(`/operations?tab=defects&id=${d.id}`)}
                    className="w-full text-left py-1 px-2 rounded-md hover:bg-muted"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">{pick(d.task_number, d.taskNumber) ?? d.id.slice(0, 6)} · {d.site}</span>
                      <span className="text-muted-foreground shrink-0">{daysSince(pick(d.created_at, d.createdAt))}d</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{d.client}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>)}

        {invoices.length > 0 && (<div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-amber-500 uppercase tracking-wide">
            <Clock className="w-3 h-3" /> Overdue invoices
          </div>
          {invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing overdue.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {invoices.map((inv) => {
                const v = Number(pick(inv.total_amount, inv.totalAmount, inv.amount) ?? 0);
                return (
                  <li key={inv.id}>
                    <button
                      onClick={() => setLocation(`/operations?tab=invoices&id=${inv.id}`)}
                      className="w-full text-left py-1 px-2 rounded-md hover:bg-muted"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="truncate font-medium">{pick(inv.invoice_number, inv.invoiceNumber) ?? inv.id.slice(0, 6)}</span>
                        <span className="shrink-0 tabular-nums">{fmtAud(v)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{inv.client}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>)}

        {wips.length > 0 && (<div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-blue-500 uppercase tracking-wide">
            <DollarSign className="w-3 h-3" /> Top open WIPs
          </div>
          {wips.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open WIPs.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {wips.map((w) => {
                const v = Number(pick(w.quote_amount, w.quoteAmount) ?? 0);
                return (
                  <li key={w.id}>
                    <button
                      onClick={() => setLocation(`/operations?tab=wip&id=${w.id}`)}
                      className="w-full text-left py-1 px-2 rounded-md hover:bg-muted"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="truncate font-medium">{pick(w.task_number, w.taskNumber) ?? w.id.slice(0, 6)}</span>
                        <span className="shrink-0 tabular-nums">{fmtAud(v)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{w.client}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>)}
        {defects.length === 0 && invoices.length === 0 && wips.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">All clear — nothing critical right now.</p>
        )}
      </div>
    </section>
  );
}

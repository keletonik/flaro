/**
 * Full estimation workbench. Mounted inside the /suppliers page as an
 * 'Estimation' view alongside the existing Supplier Directory.
 *
 * Layout (desktop): three columns
 *   [ product catalogue 36% ][ estimate builder 40% ][ embedded agent 24% ]
 *
 * Product catalogue  — searchable list of every supplier_product row,
 *                      with cost and sell price. Click a row (or the +
 *                      button) to append it to the current estimate.
 *
 * Estimate builder   — header fields (title, client, site, default
 *                      markup, labour rate), live line table with
 *                      inline editing of qty / cost / markup, live
 *                      totals sidebar (subtotal cost, subtotal sell,
 *                      margin $, margin %, GST, grand total), and a
 *                      row of list/new/reprice/delete actions.
 *
 * Agent              — embedded AnalyticsPanel speaking
 *                      section='estimation'. Can call estimate_*
 *                      tools and every write auto-refreshes this
 *                      workbench via the aide-data-changed channel.
 *
 * Every write is sent to /api/estimates, which recomputes totals in
 * the same transaction and fires broadcastEvent('data_change'), so the
 * workbench never has to compute totals locally — it just displays
 * what the server returns.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  FilePlus2,
  FileText,
  Loader2,
  Save,
  Percent,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import EmbeddedAgentChat from "@/components/EmbeddedAgentChat";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────
interface CatalogueRow {
  id: string;
  product_name: string;
  product_code: string | null;
  category: string | null;
  cost_price: string | number | null;
  unit_price: string | number | null;
  unit: string | null;
  supplier_name: string | null;
}

interface EstimateLine {
  id: string;
  estimate_id: string;
  kind: string;
  product_id: string | null;
  product_code: string | null;
  description: string;
  supplier_name: string | null;
  category: string | null;
  quantity: string | number;
  unit: string;
  cost_price: string | number;
  markup_pct: string | number;
  sell_price: string | number;
  line_cost: string | number;
  line_sell: string | number;
  line_margin: string | number;
  position: number;
  notes: string | null;
}

interface EstimateHeader {
  id: string;
  number: string;
  title: string;
  client: string | null;
  site: string | null;
  project: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  default_markup_pct: string | number;
  labour_rate: string | number;
  gst_rate: string | number;
  subtotal_cost: string | number;
  subtotal_sell: string | number;
  margin_total: string | number;
  gst_total: string | number;
  grand_total: string | number;
  notes: string | null;
  valid_until: string | null;
  created_at?: string;
}

interface EstimateDetail extends EstimateHeader {
  lines: EstimateLine[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const n = (v: any, fallback = 0): number => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : fallback;
};
const fmt$ = (v: any): string => {
  const x = n(v);
  return `$${x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtPct = (v: any, digits = 1): string => `${n(v).toFixed(digits)}%`;

// ─── Main component ────────────────────────────────────────────────────────
export default function EstimationWorkbench() {
  const { toast } = useToast();

  // Catalogue
  const [catalogue, setCatalogue] = useState<CatalogueRow[]>([]);
  const [catTotal, setCatTotal] = useState(0);
  const [catSearch, setCatSearch] = useState("");
  const [catSupplier, setCatSupplier] = useState("");
  const [catCategory, setCatCategory] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  // Estimates
  const [estimates, setEstimates] = useState<EstimateHeader[]>([]);
  const [activeEstimate, setActiveEstimate] = useState<EstimateDetail | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // ── fetchers ────────────────────────────────────────────────────────────
  const fetchCatalogue = useCallback(async () => {
    setCatLoading(true);
    try {
      const params = new URLSearchParams();
      if (catSearch) params.set("q", catSearch);
      if (catSupplier) params.set("supplier", catSupplier);
      if (catCategory) params.set("category", catCategory);
      params.set("limit", "150");
      const res = await apiFetch<{ rows: CatalogueRow[]; total: number }>(
        `/estimates/products?${params}`,
      );
      setCatalogue(res.rows ?? []);
      setCatTotal(res.total ?? 0);
    } catch (e) {
      toast({ title: "Catalogue load failed", variant: "destructive" });
    } finally {
      setCatLoading(false);
    }
  }, [catSearch, catSupplier, catCategory, toast]);

  const fetchEstimates = useCallback(async () => {
    try {
      const rows = await apiFetch<EstimateHeader[]>("/estimates");
      setEstimates(rows ?? []);
    } catch {
      /* no-op */
    }
  }, []);

  const fetchEstimate = useCallback(async (id: string) => {
    setLoadingEstimate(true);
    try {
      const detail = await apiFetch<EstimateDetail>(`/estimates/${id}`);
      setActiveEstimate(detail);
    } catch (e) {
      toast({ title: "Load failed", variant: "destructive" });
    } finally {
      setLoadingEstimate(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  // React to agent writes. Every aide-data-changed event refreshes the
  // list AND (if an estimate is open) the full detail — so when the
  // agent does estimate_add_line or estimate_set_markup the workbench
  // updates instantly without the user refreshing.
  useEffect(() => {
    const handler = () => {
      fetchEstimates();
      if (activeEstimate?.id) fetchEstimate(activeEstimate.id);
    };
    window.addEventListener("aide-data-changed", handler);
    return () => window.removeEventListener("aide-data-changed", handler);
  }, [fetchEstimates, fetchEstimate, activeEstimate?.id]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const createEstimate = async () => {
    const title = prompt("Estimate title?", "New estimate");
    if (!title) return;
    const client = prompt("Client (optional)?", "") ?? "";
    const site = prompt("Site (optional)?", "") ?? "";
    const row = await apiFetch<EstimateHeader>("/estimates", {
      method: "POST",
      body: JSON.stringify({ title, client, site, default_markup_pct: 40 }),
    });
    toast({ title: `Created ${row.number}` });
    await fetchEstimates();
    await fetchEstimate(row.id);
  };

  const deleteEstimate = async (id: string) => {
    if (!confirm("Delete this estimate?")) return;
    await apiFetch(`/estimates/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" });
    if (activeEstimate?.id === id) setActiveEstimate(null);
    fetchEstimates();
  };

  const addProductLine = async (p: CatalogueRow) => {
    if (!activeEstimate) {
      toast({ title: "Create or open an estimate first", variant: "destructive" });
      return;
    }
    await apiFetch(`/estimates/${activeEstimate.id}/lines`, {
      method: "POST",
      body: JSON.stringify({
        product_id: p.id,
        description: p.product_name,
        quantity: 1,
        cost_price: n(p.cost_price),
      }),
    });
    await fetchEstimate(activeEstimate.id);
  };

  const addLabourLine = async () => {
    if (!activeEstimate) return;
    const hours = parseFloat(prompt("Hours?", "1") ?? "0");
    if (!hours || hours <= 0) return;
    const desc = prompt("Description", "Technician labour") ?? "Labour";
    await apiFetch(`/estimates/${activeEstimate.id}/lines`, {
      method: "POST",
      body: JSON.stringify({
        kind: "labour",
        description: desc,
        quantity: hours,
        unit: "hr",
        cost_price: n(activeEstimate.labour_rate),
        markup_pct: 0,
      }),
    });
    await fetchEstimate(activeEstimate.id);
  };

  const updateLine = async (
    lineId: string,
    patch: Partial<Pick<EstimateLine, "quantity" | "cost_price" | "markup_pct" | "description">>,
  ) => {
    if (!activeEstimate) return;
    await apiFetch(`/estimates/${activeEstimate.id}/lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await fetchEstimate(activeEstimate.id);
  };

  const deleteLine = async (lineId: string) => {
    if (!activeEstimate) return;
    await apiFetch(`/estimates/${activeEstimate.id}/lines/${lineId}`, { method: "DELETE" });
    await fetchEstimate(activeEstimate.id);
  };

  const repriceAll = async () => {
    if (!activeEstimate) return;
    const raw = prompt(
      `Set default markup and reprice every line on ${activeEstimate.number}?`,
      String(n(activeEstimate.default_markup_pct, 40)),
    );
    if (raw == null) return;
    const pct = n(raw);
    if (!Number.isFinite(pct) || pct < 0) return;
    await apiFetch(`/estimates/${activeEstimate.id}?reprice=1`, {
      method: "PATCH",
      body: JSON.stringify({ default_markup_pct: pct, reprice: true }),
    });
    await fetchEstimate(activeEstimate.id);
    toast({ title: `Repriced at ${pct}%` });
  };

  const patchHeader = async (patch: Partial<EstimateHeader>) => {
    if (!activeEstimate) return;
    await apiFetch(`/estimates/${activeEstimate.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await fetchEstimate(activeEstimate.id);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const marginPct = useMemo(() => {
    if (!activeEstimate) return 0;
    const sell = n(activeEstimate.subtotal_sell);
    const cost = n(activeEstimate.subtotal_cost);
    return sell > 0 ? ((sell - cost) / sell) * 100 : 0;
  }, [activeEstimate]);

  const suppliersInCatalogue = useMemo(() => {
    const set = new Set<string>();
    catalogue.forEach((r) => r.supplier_name && set.add(r.supplier_name));
    return Array.from(set).sort();
  }, [catalogue]);

  const categoriesInCatalogue = useMemo(() => {
    const set = new Set<string>();
    catalogue.forEach((r) => r.category && set.add(r.category));
    return Array.from(set).sort();
  }, [catalogue]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ═══ LEFT — Catalogue ═══ */}
      <div className="w-[36%] min-w-[360px] border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-foreground">Product Catalogue</h3>
            <span className="text-[10px] text-muted-foreground">{catTotal.toLocaleString()} items</span>
          </div>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search name, code, supplier..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={catSupplier}
              onChange={(e) => setCatSupplier(e.target.value)}
              className="flex-1 px-2 py-1 text-[11px] bg-muted/30 border border-border rounded-md"
            >
              <option value="">All suppliers</option>
              {suppliersInCatalogue.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={catCategory}
              onChange={(e) => setCatCategory(e.target.value)}
              className="flex-1 px-2 py-1 text-[11px] bg-muted/30 border border-border rounded-md"
            >
              <option value="">All categories</option>
              {categoriesInCatalogue.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {catLoading && (
            <div className="p-6 flex items-center justify-center text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
            </div>
          )}
          {!catLoading && catalogue.length === 0 && (
            <div className="p-6 text-center text-[11px] text-muted-foreground">
              No products match. The FireMate catalogue is seeded on backend startup — if this is
              empty, check the boot logs for <code className="font-mono">firemate products seeded</code>.
            </div>
          )}
          {catalogue.map((p) => {
            const cost = n(p.cost_price);
            const sell = n(p.unit_price);
            const markup = cost > 0 ? ((sell - cost) / cost) * 100 : 0;
            return (
              <div
                key={p.id}
                className="px-3 py-2 border-b border-border/40 hover:bg-muted/40 group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-foreground truncate">
                      {p.product_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {p.supplier_name} {p.product_code ? `· ${p.product_code}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => addProductLine(p)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-all"
                    title="Add to estimate"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">Cost <strong className="font-mono text-foreground">{fmt$(cost)}</strong></span>
                  <span className="text-muted-foreground">Sell <strong className="font-mono text-foreground">{fmt$(sell)}</strong></span>
                  {cost > 0 && (
                    <span className={cn(
                      "text-[9px] px-1 rounded",
                      markup >= 40 ? "bg-emerald-500/10 text-emerald-600"
                        : markup >= 20 ? "bg-amber-500/10 text-amber-600"
                        : "bg-red-500/10 text-red-600",
                    )}>
                      {fmtPct(markup, 0)} mu
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ MIDDLE — Estimate Builder ═══ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Estimate selector + actions */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={activeEstimate?.id ?? ""}
              onChange={(e) => (e.target.value ? fetchEstimate(e.target.value) : setActiveEstimate(null))}
              className="flex-1 px-3 py-1.5 text-[12px] bg-muted/30 border border-border rounded-lg"
            >
              <option value="">— Select or create an estimate —</option>
              {estimates.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.number} · {e.title}{e.client ? ` · ${e.client}` : ""} · {fmt$(e.grand_total)}
                </option>
              ))}
            </select>
            <button
              onClick={createEstimate}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-primary-foreground bg-primary rounded-lg hover:opacity-90"
              title="New estimate"
            >
              <FilePlus2 size={12} /> New
            </button>
            {activeEstimate && (
              <>
                <button
                  onClick={repriceAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg"
                  title="Reprice every line at a new default markup"
                >
                  <Percent size={12} /> Reprice
                </button>
                <button
                  onClick={addLabourLine}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg"
                >
                  <Plus size={12} /> Labour
                </button>
                <button
                  onClick={() => deleteEstimate(activeEstimate.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 border border-border rounded-lg"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
          {activeEstimate && (
            <div className="grid grid-cols-4 gap-2">
              <input
                value={activeEstimate.title}
                onChange={(e) => setActiveEstimate({ ...activeEstimate, title: e.target.value })}
                onBlur={(e) => patchHeader({ title: e.target.value })}
                placeholder="Title"
                className="px-2 py-1 text-[11px] bg-muted/20 border border-border rounded-md"
              />
              <input
                value={activeEstimate.client ?? ""}
                onChange={(e) => setActiveEstimate({ ...activeEstimate, client: e.target.value })}
                onBlur={(e) => patchHeader({ client: e.target.value })}
                placeholder="Client"
                className="px-2 py-1 text-[11px] bg-muted/20 border border-border rounded-md"
              />
              <input
                value={activeEstimate.site ?? ""}
                onChange={(e) => setActiveEstimate({ ...activeEstimate, site: e.target.value })}
                onBlur={(e) => patchHeader({ site: e.target.value })}
                placeholder="Site"
                className="px-2 py-1 text-[11px] bg-muted/20 border border-border rounded-md"
              />
              <input
                value={activeEstimate.project ?? ""}
                onChange={(e) => setActiveEstimate({ ...activeEstimate, project: e.target.value })}
                onBlur={(e) => patchHeader({ project: e.target.value })}
                placeholder="Project"
                className="px-2 py-1 text-[11px] bg-muted/20 border border-border rounded-md"
              />
            </div>
          )}
        </div>

        {/* Line table */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!activeEstimate && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <FileText size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-[13px] font-medium text-foreground mb-1">No estimate open</p>
              <p className="text-[11px] text-muted-foreground mb-4 max-w-sm">
                Create a new estimate or pick an existing one from the dropdown above. Every line
                you add from the catalogue will show its cost, markup and sell price live, and
                the totals on the right update instantly.
              </p>
              <button
                onClick={createEstimate}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-primary-foreground bg-primary rounded-lg"
              >
                <FilePlus2 size={13} /> Create estimate
              </button>
            </div>
          )}

          {loadingEstimate && (
            <div className="p-8 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {activeEstimate && !loadingEstimate && (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card z-10 border-b border-border">
                <tr className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-2 py-2 w-14">Qty</th>
                  <th className="text-right px-2 py-2 w-20">Cost</th>
                  <th className="text-right px-2 py-2 w-16">Markup</th>
                  <th className="text-right px-2 py-2 w-20">Sell</th>
                  <th className="text-right px-2 py-2 w-24">Line Total</th>
                  <th className="text-right px-2 py-2 w-20">Margin</th>
                  <th className="w-8 px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {activeEstimate.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground text-[11px]">
                      No lines yet. Click a product on the left, or ask the agent:
                      <br />
                      <em>"Add 2 Pertronic F220 panels with 35% markup"</em>
                    </td>
                  </tr>
                )}
                {activeEstimate.lines.map((line) => {
                  const lineMarginPct = n(line.line_sell) > 0
                    ? (n(line.line_margin) / n(line.line_sell)) * 100
                    : 0;
                  return (
                    <tr key={line.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-1.5">
                        <div className="text-foreground truncate max-w-[260px]" title={line.description}>
                          {line.description}
                        </div>
                        {line.supplier_name && (
                          <div className="text-[9px] text-muted-foreground truncate">
                            {line.supplier_name} {line.product_code ? `· ${line.product_code}` : ""}
                            {line.kind === "labour" && " · LABOUR"}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={n(line.quantity)}
                          onBlur={(e) => {
                            const v = n(e.target.value);
                            if (v !== n(line.quantity)) updateLine(line.id, { quantity: v });
                          }}
                          className="w-full text-right px-1 py-0.5 bg-transparent border border-transparent hover:border-border rounded font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={n(line.cost_price)}
                          onBlur={(e) => {
                            const v = n(e.target.value);
                            if (v !== n(line.cost_price)) updateLine(line.id, { cost_price: v });
                          }}
                          className="w-full text-right px-1 py-0.5 bg-transparent border border-transparent hover:border-border rounded font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={n(line.markup_pct)}
                          onBlur={(e) => {
                            const v = n(e.target.value);
                            if (v !== n(line.markup_pct)) updateLine(line.id, { markup_pct: v });
                          }}
                          className="w-full text-right px-1 py-0.5 bg-transparent border border-transparent hover:border-border rounded font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-foreground">{fmt$(line.sell_price)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-foreground">{fmt$(line.line_sell)}</td>
                      <td className={cn(
                        "px-2 py-1.5 text-right font-mono",
                        lineMarginPct >= 30 ? "text-emerald-600" :
                        lineMarginPct >= 15 ? "text-amber-600" : "text-red-600",
                      )}>
                        {fmt$(line.line_margin)}
                      </td>
                      <td className="px-1 py-1.5 text-right">
                        <button
                          onClick={() => deleteLine(line.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title="Remove"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals bar */}
        {activeEstimate && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3">
            <div className="grid grid-cols-5 gap-3 text-[11px]">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Subtotal cost</div>
                <div className="font-mono text-foreground">{fmt$(activeEstimate.subtotal_cost)}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Subtotal sell</div>
                <div className="font-mono text-foreground">{fmt$(activeEstimate.subtotal_sell)}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Margin</div>
                <div className="font-mono text-emerald-600">
                  {fmt$(activeEstimate.margin_total)} <span className="text-[9px] text-muted-foreground">({fmtPct(marginPct)})</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">GST {fmtPct(activeEstimate.gst_rate, 0)}</div>
                <div className="font-mono text-foreground">{fmt$(activeEstimate.gst_total)}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Grand total</div>
                <div className="font-mono font-bold text-primary text-[13px]">{fmt$(activeEstimate.grand_total)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ RIGHT — Embedded tool-use agent ═══ */}
      <div className="w-[360px] border-l border-border shrink-0 flex flex-col">
        <EmbeddedAgentChat
          section="estimation"
          title="Estimation Agent"
          suggestions={[
            "Create a new estimate for Goodman Silverwater, 42% markup",
            "Find every Pertronic F220 panel",
            "Add 2 Ampac detectors at 35% markup",
            "Reprice the current estimate at 30%",
          ]}
        />
      </div>
    </div>
  );
}

/**
 * CommonProductsCard — curated everyday items catalogue.
 *
 * Reads GET /api/fip/common-products. Searchable by name/manufacturer/
 * part code, category dropdown filter. Renders a compact row list
 * with name, manufacturer, part code, price band, and indicative AUD.
 * Unknown prices are shown as "N/A" in a muted colour.
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Package, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommonProduct {
  id: string;
  category: string;
  name: string;
  manufacturer: string | null;
  partCode: string | null;
  description: string | null;
  unit: string | null;
  priceBand: "$" | "$$" | "$$$" | "N/A";
  indicativePriceAud: number | null;
  notes: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  smoke: "bg-blue-500/10 text-blue-500",
  heat: "bg-orange-500/10 text-orange-500",
  flame: "bg-red-500/10 text-red-500",
  mcp: "bg-rose-500/10 text-rose-500",
  sounder: "bg-purple-500/10 text-purple-500",
  strobe: "bg-yellow-500/10 text-yellow-500",
  base: "bg-slate-500/10 text-slate-500",
  isolator: "bg-indigo-500/10 text-indigo-500",
  module: "bg-cyan-500/10 text-cyan-500",
  battery: "bg-emerald-500/10 text-emerald-500",
  cable: "bg-pink-500/10 text-pink-500",
};

export function CommonProductsCard() {
  const [products, setProducts] = useState<CommonProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    apiFetch<CommonProduct[]>("/fip/common-products")
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.manufacturer ?? "").toLowerCase().includes(q) ||
        (p.partCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  return (
    <section className="bg-card border border-border rounded-2xl p-4 flex flex-col min-h-0">
      <header className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Package className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Common Products</h3>
          <p className="text-[10px] text-muted-foreground">
            Everyday items — codes, prices, notes
          </p>
        </div>
      </header>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, code, brand"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-2 py-1.5 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px] pr-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-6">
            {search || category ? "No matches — adjust filters." : "No products seeded yet."}
          </p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p.manufacturer ?? "—"}
                    {p.partCode && <span className="font-mono ml-1.5">{p.partCode}</span>}
                  </p>
                </div>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0",
                  CATEGORY_COLORS[p.category] ?? "bg-muted text-muted-foreground",
                )}>
                  {p.category}
                </span>
              </div>
              {p.description && (
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
              )}
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn(
                    "font-mono font-semibold",
                    p.priceBand === "N/A" ? "text-muted-foreground/50" : "text-emerald-500",
                  )}>
                    {p.priceBand}
                  </span>
                  {p.indicativePriceAud != null && (
                    <span className="text-foreground">
                      ${p.indicativePriceAud.toLocaleString("en-AU")}
                    </span>
                  )}
                  <span className="text-muted-foreground">/ {p.unit ?? "each"}</span>
                </div>
                {p.notes && (
                  <p className="text-[9px] text-muted-foreground max-w-[50%] truncate" title={p.notes}>
                    {p.notes}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] text-muted-foreground mt-2">
        {filtered.length} of {products.length} products · Prices indicative (May 2025 AUD).
      </p>
    </section>
  );
}

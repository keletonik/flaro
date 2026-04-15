/**
 * CommonProductsCard v2.1 — panel-aware catalogue + material list builder.
 *
 * Three linked surfaces, all inside one card:
 *
 * 1. CATALOGUE BROWSER
 *    - Filters: panel (via prop), category, text search.
 *    - Each product row shows: name, manufacturer, part code, category
 *      pill, live supplier price (cheapest match from supplier_products)
 *      OR the indicative band if no supplier match, an "Add" button.
 *
 * 2. MATERIAL LIST BUILDER
 *    - Persistent working list (one at a time) held in component state
 *      and autosaved to the backend via /fip/material-lists routes.
 *    - Catalogue items are added with qty = 1 by default and inherit
 *      the cheapest live supplier price where available.
 *    - Custom lines: free-form name + qty + unit price + optional notes.
 *    - Running total in the footer.
 *    - "Save as note" button writes the list to the notes table via
 *      POST /fip/material-lists/:id/save-as-note.
 *
 * 3. SAVED LISTS
 *    - Small drawer that lists the operator's previous lists so they
 *      can reload one into the builder without starting from scratch.
 *
 * The parent page passes `selectedPanelSlug` so when the operator picks
 * a panel in PanelTechnicalCard the catalogue auto-filters. Passing
 * undefined shows everything.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Package, Search, Loader2, Plus, X, Trash2, Save, CheckCircle,
  DollarSign, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierMatch {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  productCode: string | null;
  unitPriceAud: number | null;
  costPriceAud: number | null;
  description: string | null;
}

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
  compatiblePanelSlugs: string[] | null;
  supplierMatches: SupplierMatch[];
  livePriceAud: number | null;
  liveSupplierName: string | null;
}

interface MaterialListItem {
  id: string;
  listId: string;
  productId: string | null;
  custom: boolean;
  name: string;
  manufacturer: string | null;
  partCode: string | null;
  category: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  unitPriceAud: number | null;
  totalAud: number | null;
  supplierName: string | null;
  supplierProductCode: string | null;
  sortOrder: number;
  notes: string | null;
}

interface MaterialList {
  id: string;
  name: string;
  owner: string;
  panelSlug: string | null;
  siteRef: string | null;
  taskRef: string | null;
  notes: string | null;
  status: "open" | "saved" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface MaterialListWithItems {
  list: MaterialList;
  items: MaterialListItem[];
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

interface Props {
  /** Optional panel slug — when set, only products compatible with
   * this panel (or marked as universal) are shown in the catalogue. */
  selectedPanelSlug?: string;
}

export function CommonProductsCard({ selectedPanelSlug }: Props) {
  // ── catalogue state ─────────────────────────────────────────────────
  const [products, setProducts] = useState<CommonProduct[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");

  // ── material list state ─────────────────────────────────────────────
  const [activeList, setActiveList] = useState<MaterialList | null>(null);
  const [listItems, setListItems] = useState<MaterialListItem[]>([]);
  const [showBuilder, setShowBuilder] = useState(true);
  const [showSavedLists, setShowSavedLists] = useState(false);
  const [savedLists, setSavedLists] = useState<MaterialList[]>([]);
  const [savingAsNote, setSavingAsNote] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── custom line form state ──────────────────────────────────────────
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customUnitPrice, setCustomUnitPrice] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const savedBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── load catalogue when panel or filters change ────────────────────
  const loadCatalogue = useCallback(async () => {
    setLoadingCatalogue(true);
    try {
      const params = new URLSearchParams();
      if (selectedPanelSlug) params.set("panelSlug", selectedPanelSlug);
      if (category) params.set("category", category);
      const qs = params.toString();
      const rows = await apiFetch<CommonProduct[]>(
        `/fip/common-products${qs ? "?" + qs : ""}`,
      );
      setProducts(rows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load catalogue");
    } finally {
      setLoadingCatalogue(false);
    }
  }, [selectedPanelSlug, category]);

  useEffect(() => { void loadCatalogue(); }, [loadCatalogue]);

  // ── ensure we always have an active list to add items into ────────
  const ensureActiveList = useCallback(async (): Promise<MaterialList> => {
    if (activeList) return activeList;
    const name = selectedPanelSlug
      ? `Materials for ${selectedPanelSlug} · ${new Date().toLocaleDateString("en-AU")}`
      : `Materials · ${new Date().toLocaleDateString("en-AU")}`;
    const created = await apiFetch<MaterialList>("/fip/material-lists", {
      method: "POST",
      body: JSON.stringify({
        name,
        owner: "casper",
        panelSlug: selectedPanelSlug ?? null,
      }),
    });
    setActiveList(created);
    return created;
  }, [activeList, selectedPanelSlug]);

  // ── catalogue search (in-memory on the loaded rows) ────────────────
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.manufacturer ?? "").toLowerCase().includes(q) ||
        (p.partCode ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).sort();
  }, [products]);

  // ── running total for the builder footer ───────────────────────────
  const runningTotal = useMemo(() => {
    return Math.round(
      listItems.reduce((sum, item) => sum + (item.totalAud ?? 0), 0) * 100,
    ) / 100;
  }, [listItems]);

  // ── ADD a catalogue product to the active list ─────────────────────
  async function addProductToList(p: CommonProduct) {
    try {
      const list = await ensureActiveList();
      const unitPrice = p.livePriceAud ?? p.indicativePriceAud ?? null;
      const created = await apiFetch<MaterialListItem>(
        `/fip/material-lists/${list.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            productId: p.id,
            custom: false,
            name: p.name,
            manufacturer: p.manufacturer,
            partCode: p.partCode,
            category: p.category,
            description: p.description,
            quantity: 1,
            unit: p.unit ?? "each",
            unitPriceAud: unitPrice,
            supplierName: p.liveSupplierName,
          }),
        },
      );
      setListItems((prev) => [...prev, created]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add product");
    }
  }

  // ── ADD a custom line item ─────────────────────────────────────────
  async function addCustomLine() {
    const name = customName.trim();
    if (!name) {
      setError("Custom line needs a name");
      return;
    }
    try {
      const list = await ensureActiveList();
      const qty = Number(customQty) || 1;
      const unitPrice = customUnitPrice.trim() ? Number(customUnitPrice) : null;
      const created = await apiFetch<MaterialListItem>(
        `/fip/material-lists/${list.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            custom: true,
            name,
            quantity: qty,
            unit: "each",
            unitPriceAud: unitPrice,
            notes: customNotes.trim() || null,
          }),
        },
      );
      setListItems((prev) => [...prev, created]);
      setCustomName("");
      setCustomQty("1");
      setCustomUnitPrice("");
      setCustomNotes("");
      setShowCustomForm(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add custom line");
    }
  }

  // ── UPDATE an item's quantity or price in place ────────────────────
  async function patchItem(item: MaterialListItem, patch: Partial<MaterialListItem>) {
    if (!activeList) return;
    try {
      const updated = await apiFetch<MaterialListItem>(
        `/fip/material-lists/${activeList.id}/items/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            quantity: patch.quantity,
            unitPriceAud: patch.unitPriceAud,
            notes: patch.notes,
          }),
        },
      );
      setListItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (e: any) {
      setError(e?.message ?? "Failed to update line");
    }
  }

  // ── DELETE an item ─────────────────────────────────────────────────
  async function removeItem(item: MaterialListItem) {
    if (!activeList) return;
    try {
      await apiFetch(`/fip/material-lists/${activeList.id}/items/${item.id}`, {
        method: "DELETE",
      });
      setListItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove line");
    }
  }

  // ── SAVE the list as a note ────────────────────────────────────────
  async function saveAsNote() {
    if (!activeList) return;
    setSavingAsNote(true);
    setError(null);
    try {
      const result = await apiFetch<{ noteId: string; totalAud: number; itemCount: number }>(
        `/fip/material-lists/${activeList.id}/save-as-note`,
        { method: "POST" },
      );
      setSavedBanner(
        `Saved as note · ${result.itemCount} items · $${result.totalAud.toFixed(2)}`,
      );
      if (savedBannerTimer.current) clearTimeout(savedBannerTimer.current);
      savedBannerTimer.current = setTimeout(() => setSavedBanner(null), 4500);
      // Start a fresh list for the next job
      setActiveList(null);
      setListItems([]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save note");
    } finally {
      setSavingAsNote(false);
    }
  }

  // ── LOAD previously saved lists on demand ─────────────────────────
  async function loadSavedLists() {
    try {
      const res = await apiFetch<{ lists: MaterialList[] }>(
        "/fip/material-lists?owner=casper",
      );
      setSavedLists(res.lists ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load saved lists");
    }
  }

  async function reopenList(listId: string) {
    try {
      const res = await apiFetch<MaterialListWithItems>(
        `/fip/material-lists/${listId}`,
      );
      setActiveList(res.list);
      setListItems(res.items);
      setShowSavedLists(false);
      setShowBuilder(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to reopen list");
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────
  return (
    <section className="bg-card border border-border rounded-2xl p-4 flex flex-col min-h-0">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Common Products</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {selectedPanelSlug
                ? `Filtered to ${selectedPanelSlug}`
                : "Searchable catalogue · live supplier pricing"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowSavedLists((v) => !v);
            if (!showSavedLists) void loadSavedLists();
          }}
          className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
        >
          {showSavedLists ? "Hide lists" : "Saved lists"}
        </button>
      </header>

      {/* Saved lists drawer */}
      {showSavedLists && (
        <div className="mb-3 p-2 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              Saved lists
            </p>
            <button
              type="button"
              onClick={() => setShowSavedLists(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {savedLists.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2 text-center">
              No saved lists yet.
            </p>
          ) : (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {savedLists.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => reopenList(l.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <span className="truncate">{l.name}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0 ml-2">
                      {l.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filters */}
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

      {/* Catalogue */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[280px] pr-1 mb-3">
        {loadingCatalogue ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-6">
            {search || category ? "No matches for those filters." : "No products seeded yet."}
          </p>
        ) : (
          filteredProducts.map((p) => <CatalogueRow key={p.id} product={p} onAdd={() => void addProductToList(p)} />)
        )}
      </div>

      {/* Material list builder */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setShowBuilder((v) => !v)}
          className="w-full flex items-center justify-between mb-2 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Materials list
            {listItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px]">
                {listItems.length}
              </span>
            )}
          </span>
          {showBuilder ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showBuilder && (
          <div className="space-y-2">
            {listItems.length === 0 && !showCustomForm && (
              <p className="text-[11px] text-muted-foreground py-2 px-2 bg-muted/20 rounded">
                Empty. Add items from the catalogue above or create a custom line.
              </p>
            )}

            <ul className="space-y-1">
              {listItems.map((item) => (
                <BuilderRow
                  key={item.id}
                  item={item}
                  onPatch={(patch) => void patchItem(item, patch)}
                  onRemove={() => void removeItem(item)}
                />
              ))}
            </ul>

            {showCustomForm ? (
              <div className="p-2 rounded-md border border-border bg-muted/20 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Custom line
                </p>
                <input
                  type="text"
                  placeholder="Description (e.g. 'Labour — 2 tech mobilisation')"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-background border border-border text-[11px]"
                />
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-16 px-2 py-1 rounded bg-background border border-border text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="Unit $"
                    value={customUnitPrice}
                    onChange={(e) => setCustomUnitPrice(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-background border border-border text-[11px]"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-background border border-border text-[11px]"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowCustomForm(false); setCustomName(""); }}
                    className="text-[10px] px-2 py-1 text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void addCustomLine()}
                    disabled={!customName.trim()}
                    className="text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    Add line
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground py-1.5 rounded border border-dashed border-border hover:border-primary/40"
              >
                <Plus className="w-3 h-3" /> Add custom line
              </button>
            )}

            {/* Total + Save */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span className="font-semibold text-foreground">
                  Total ${runningTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void saveAsNote()}
                disabled={!activeList || listItems.length === 0 || savingAsNote}
                className={cn(
                  "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded font-medium",
                  !activeList || listItems.length === 0 || savingAsNote
                    ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-90",
                )}
              >
                {savingAsNote ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save as note
              </button>
            </div>

            {savedBanner && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                {savedBanner}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-[11px] text-red-500">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline hover:text-red-400"
          >
            dismiss
          </button>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground mt-2">
        {filteredProducts.length} of {products.length} products · Prices indicative where no live supplier match.
      </p>
    </section>
  );
}

// ─── sub-components ───────────────────────────────────────────────────
function CatalogueRow({ product, onAdd }: { product: CommonProduct; onAdd: () => void }) {
  const hasLive = product.livePriceAud != null;
  return (
    <div className="p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground line-clamp-1">{product.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {product.manufacturer ?? "—"}
            {product.partCode && <span className="font-mono ml-1.5">{product.partCode}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
            CATEGORY_COLORS[product.category] ?? "bg-muted text-muted-foreground",
          )}>
            {product.category}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="p-1 rounded bg-primary text-primary-foreground hover:opacity-90"
            title="Add to materials list"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      {product.description && (
        <p className="text-[10px] text-muted-foreground line-clamp-2">{product.description}</p>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5 text-[10px]">
          {hasLive ? (
            <>
              <span className="text-emerald-500 font-mono font-semibold">
                ${product.livePriceAud!.toLocaleString("en-AU")}
              </span>
              <span className="text-muted-foreground">· {product.liveSupplierName}</span>
            </>
          ) : product.indicativePriceAud != null ? (
            <>
              <span className="text-foreground font-mono">
                ~${product.indicativePriceAud.toLocaleString("en-AU")}
              </span>
              <span className="text-muted-foreground">indicative</span>
            </>
          ) : (
            <span className="text-muted-foreground/60 font-mono">{product.priceBand}</span>
          )}
          <span className="text-muted-foreground">/ {product.unit ?? "each"}</span>
        </div>
      </div>
    </div>
  );
}

function BuilderRow({
  item,
  onPatch,
  onRemove,
}: {
  item: MaterialListItem;
  onPatch: (patch: Partial<MaterialListItem>) => void;
  onRemove: () => void;
}) {
  const [qtyLocal, setQtyLocal] = useState(String(item.quantity));
  const [priceLocal, setPriceLocal] = useState(
    item.unitPriceAud != null ? String(item.unitPriceAud) : "",
  );

  function commitQty() {
    const n = Number(qtyLocal);
    if (Number.isFinite(n) && n !== item.quantity) {
      onPatch({ quantity: n });
    }
  }
  function commitPrice() {
    const n = priceLocal.trim() ? Number(priceLocal) : null;
    if (n !== item.unitPriceAud) {
      onPatch({ unitPriceAud: n });
    }
  }

  return (
    <li className="p-2 rounded border border-border bg-muted/20 flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {item.custom && (
            <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-semibold uppercase shrink-0">
              custom
            </span>
          )}
          <p className="text-[11px] font-medium text-foreground line-clamp-1">{item.name}</p>
        </div>
        {item.partCode && (
          <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{item.partCode}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <input
            type="number"
            value={qtyLocal}
            onChange={(e) => setQtyLocal(e.target.value)}
            onBlur={commitQty}
            className="w-12 px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono"
            title="Quantity"
          />
          <span className="text-[9px] text-muted-foreground">×</span>
          <input
            type="number"
            value={priceLocal}
            onChange={(e) => setPriceLocal(e.target.value)}
            onBlur={commitPrice}
            placeholder="unit $"
            className="w-16 px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono"
            title="Unit price"
          />
          <span className="text-[9px] text-muted-foreground">=</span>
          <span className="text-[10px] font-mono text-emerald-500 font-semibold">
            ${(item.totalAud ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {item.notes && (
          <p className="text-[9px] text-muted-foreground mt-0.5 italic">{item.notes}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0"
        title="Remove"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </li>
  );
}


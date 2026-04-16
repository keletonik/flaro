import { useState, useEffect } from "react";
import { Search, Plus, X, Upload, Download, Phone, Mail, MapPin, Edit2, Trash2, Package, ChevronDown, Calculator, BookOpen } from "lucide-react";
import { apiFetch, exportToCSV } from "@/lib/api";
import CSVImportModal from "@/components/CSVImportModal";
import EstimationWorkbench from "@/components/EstimationWorkbench";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id: string; name: string; category: string; contactName: string | null; phone: string | null;
  email: string | null; website: string | null; address: string | null; suburb: string | null;
  accountNumber: string | null; paymentTerms: string | null; notes: string | null;
  rating: string; createdAt: string; updatedAt: string;
}

interface Product {
  id: string; supplierId: string; productName: string; productCode: string | null;
  category: string | null; brand: string | null; unitPrice: number | null;
  unit: string | null; description: string | null; notes: string | null;
  createdAt: string; updatedAt: string;
}

const CATEGORIES = ["Fire Panels", "Detectors", "Extinguishers", "Sprinklers", "Emergency Lighting", "Electrical", "General", "Other"];
const RATINGS = ["Preferred", "Approved", "Backup", "New"];
const RATING_COLORS: Record<string, string> = {
  Preferred: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Backup: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  New: "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
};

const PRODUCT_FIELDS = [
  { key: "productName", label: "Product Name", required: true }, { key: "productCode", label: "Product Code" },
  { key: "category", label: "Category" }, { key: "brand", label: "Brand" },
  { key: "unitPrice", label: "Unit Price" }, { key: "unit", label: "Unit (each/m/box)" },
  { key: "description", label: "Description" }, { key: "notes", label: "Notes" },
];

function SupplierForm({ initial, onSubmit, onCancel }: {
  initial?: Partial<Supplier>; onSubmit: (data: any) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "", category: initial?.category || "General",
    contactName: initial?.contactName || "", phone: initial?.phone || "",
    email: initial?.email || "", website: initial?.website || "",
    address: initial?.address || "", suburb: initial?.suburb || "",
    accountNumber: initial?.accountNumber || "", paymentTerms: initial?.paymentTerms || "",
    notes: initial?.notes || "", rating: initial?.rating || "Approved",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Supplier name" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Contact</label>
          <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Contact person" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Phone number" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Email</label>
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Email" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Suburb</label>
          <input value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Suburb" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Rating</label>
          <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            {RATINGS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Website</label>
          <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://..." />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={2} placeholder="Notes..." />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!form.name.trim() || saving}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
          {saving ? "Saving..." : initial?.name ? "Update" : "Add Supplier"}
        </button>
        <button onClick={onCancel} className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function SupplierCard({ supplier, expanded, onToggle, onEdit, onDelete, products, onFetchProducts }: {
  supplier: Supplier; expanded: boolean; onToggle: () => void; onEdit: () => void;
  onDelete: () => void; products: Product[]; onFetchProducts: () => void;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();

  const handleProductImport = async (rows: Record<string, string>[], columnMap: Record<string, string>) => {
    await apiFetch(`/suppliers/${supplier.id}/products/import`, { method: "POST", body: JSON.stringify({ rows, columnMap }) });
    toast({ title: `Products imported for ${supplier.name}` });
    onFetchProducts();
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={onToggle}>
        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Package size={17} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{supplier.name}</p>
            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-semibold", RATING_COLORS[supplier.rating] || RATING_COLORS.Approved)}>{supplier.rating}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
            <span>{supplier.category}</span>
            {supplier.suburb && <span className="flex items-center gap-0.5"><MapPin size={9} />{supplier.suburb}</span>}
            {supplier.contactName && <span>{supplier.contactName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {supplier.phone && <a href={`tel:${supplier.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Phone size={13} /></a>}
          {supplier.email && <a href={`mailto:${supplier.email}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Mail size={13} /></a>}
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"><Trash2 size={13} /></button>
          <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Products ({products.length})</p>
            <div className="flex gap-2">
              {products.length > 0 && (
                <button onClick={() => { exportToCSV(products, `${supplier.name}-products`); toast({ title: "Exported" }); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
                  <Download size={10} /> Export
                </button>
              )}
              <button onClick={() => setImportOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
                <Upload size={10} /> Import Prices
              </button>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="data-table w-full">
                <thead><tr><th>Product</th><th>Code</th><th>Brand</th><th>Category</th><th className="text-right">Price</th><th>Unit</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td className="text-[13px] font-medium">{p.productName}</td>
                      <td className="text-[12px] text-muted-foreground font-mono">{p.productCode || "-"}</td>
                      <td className="text-[13px]">{p.brand || "-"}</td>
                      <td className="text-[13px]">{p.category || "-"}</td>
                      <td className="text-[13px] font-mono text-right">{p.unitPrice != null ? `$${Number(p.unitPrice).toFixed(2)}` : "-"}</td>
                      <td className="text-[12px] text-muted-foreground">{p.unit || "each"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">No products yet. Import a price list to get started.</p>
          )}

          <CSVImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleProductImport} availableFields={PRODUCT_FIELDS} title={`Import ${supplier.name} Price List`} />
        </div>
      )}
    </div>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"directory" | "estimation">("directory");
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const data = await apiFetch(`/suppliers?${params}`);
      setSuppliers(data);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const fetchProducts = async (supplierId: string) => {
    try {
      const data = await apiFetch(`/suppliers/${supplierId}/products`);
      setProducts(prev => ({ ...prev, [supplierId]: data }));
    } catch (e: any) { console.error(e); }
  };

  useEffect(() => { fetchSuppliers(); }, [search, categoryFilter]);

  const handleCreate = async (data: any) => {
    await apiFetch("/suppliers", { method: "POST", body: JSON.stringify(data) });
    toast({ title: "Supplier added" });
    setShowForm(false);
    fetchSuppliers();
  };

  const handleUpdate = async (data: any) => {
    if (!editingId) return;
    await apiFetch(`/suppliers/${editingId}`, { method: "PATCH", body: JSON.stringify(data) });
    toast({ title: "Supplier updated" });
    setEditingId(null);
    fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/suppliers/${id}`, { method: "DELETE" });
    toast({ title: "Supplier removed" });
    fetchSuppliers();
  };

  const handleToggle = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!products[id]) fetchProducts(id);
  };

  const handleExportAll = () => {
    if (!suppliers.length) return;
    exportToCSV(suppliers.map(s => ({ Name: s.name, Category: s.category, Contact: s.contactName, Phone: s.phone, Email: s.email, Suburb: s.suburb, Rating: s.rating })), `suppliers-${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Exported" });
  };

  // Estimation mode short-circuits the supplier directory entirely and
  // renders a full-screen workbench (3-pane: catalogue / builder / agent).
  if (mode === "estimation") {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
                <Calculator size={18} className="text-primary" /> Suppliers — Estimation Workbench
              </h1>
              <p className="text-[11px] text-muted-foreground">1 730 products · live markup/margin · agent embedded right</p>
            </div>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setMode("directory")} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                <BookOpen size={12} /> Directory
              </button>
              <button onClick={() => setMode("estimation")} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground">
                <Calculator size={12} /> Estimation
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <EstimationWorkbench />
        </div>
      </div>
    );
  }

  return (
      <div className="flex-1 min-w-0 min-h-screen bg-background">
        <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
              <Package size={18} className="text-primary" /> Suppliers
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Fire protection supplier directory and price lists</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setMode("directory")} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground">
                <BookOpen size={12} /> Directory
              </button>
              <button onClick={() => setMode("estimation")} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                <Calculator size={12} /> Estimation
              </button>
            </div>
            <button onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
              <Download size={13} /> Export
            </button>
            <button onClick={() => { setShowForm(true); setEditingId(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Plus size={13} /> Add Supplier
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-3 max-w-[1000px]">
        {showForm && (
          <SupplierForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        )}
        {editingId && (
          <SupplierForm initial={suppliers.find(s => s.id === editingId)} onSubmit={handleUpdate} onCancel={() => setEditingId(null)} />
        )}

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-2xl skeleton-pulse" />)}</div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={28} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">No suppliers yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first supplier to start building your directory</p>
          </div>
        ) : (
          suppliers.map(supplier => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              expanded={expandedId === supplier.id}
              onToggle={() => handleToggle(supplier.id)}
              onEdit={() => { setEditingId(supplier.id); setShowForm(false); }}
              onDelete={() => handleDelete(supplier.id)}
              products={products[supplier.id] || []}
              onFetchProducts={() => fetchProducts(supplier.id)}
            />
          ))
        )}
      </div>

      </div>
  );
}

/**
 * /quotes — Quotes & Estimates tracker.
 *
 * Lists all quotes with status filtering, search, and CSV import.
 * The AIDE panel on this page uses the email-intel prompt, so pasting
 * an email trail triggers full fire-industry analysis with automatic
 * task/quote creation.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus, Search, X, Upload, FileText, DollarSign, Send,
  CheckCircle2, Clock, XCircle, Edit2, Trash2, ChevronDown,
  Building2, User, MapPin, AlertTriangle,
} from "lucide-react";
import { apiFetch, exportToCSV } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import LiveToggle from "@/components/LiveToggle";
import CSVImportModal from "@/components/CSVImportModal";
import PageSkeleton from "@/components/ui/PageSkeleton";

interface Quote {
  id: string;
  taskNumber: string | null;
  quoteNumber: string | null;
  site: string;
  address: string | null;
  client: string;
  description: string | null;
  quoteAmount: number | null;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Expired" | "Revised";
  dateCreated: string | null;
  dateSent: string | null;
  dateAccepted: string | null;
  validUntil: string | null;
  assignedTech: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Revised"] as const;
type Status = typeof STATUSES[number];

const STATUS_STYLE: Record<Status, { bg: string; text: string; icon: typeof FileText }> = {
  Draft:    { bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400", icon: FileText },
  Sent:     { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: Send },
  Accepted: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  Declined: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: XCircle },
  Expired:  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: Clock },
  Revised:  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", icon: Edit2 },
};

const IMPORT_FIELDS = [
  { key: "taskNumber", label: "Task Number" }, { key: "quoteNumber", label: "Quote Number" },
  { key: "site", label: "Site", required: true }, { key: "address", label: "Address" },
  { key: "client", label: "Client", required: true }, { key: "description", label: "Description" },
  { key: "quoteAmount", label: "Quote Amount" }, { key: "status", label: "Status" },
  { key: "dateCreated", label: "Date Created" }, { key: "dateSent", label: "Date Sent" },
  { key: "assignedTech", label: "Assigned Tech" }, { key: "contactName", label: "Contact Name" },
  { key: "contactEmail", label: "Contact Email" }, { key: "notes", label: "Notes" },
];

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "TBD";
  return val.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpiringSoon(validUntil: string | null): boolean {
  if (!validUntil) return false;
  const d = new Date(validUntil);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000; // within 14 days
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const { toast } = useToast();

  const fetchQuotes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const data = await apiFetch(`/quotes?${params.toString()}`);
      setQuotes(data as Quote[]);
    } catch {
      toast({ title: "Failed to load quotes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const counts = useMemo(() => {
    const out: Record<Status, number> = { Draft: 0, Sent: 0, Accepted: 0, Declined: 0, Expired: 0, Revised: 0 };
    for (const q of quotes) out[q.status as Status] = (out[q.status as Status] ?? 0) + 1;
    return out;
  }, [quotes]);

  const totalValue = useMemo(() =>
    quotes.filter(q => q.status !== "Declined" && q.status !== "Expired")
      .reduce((sum, q) => sum + (q.quoteAmount ?? 0), 0),
  [quotes]);

  const draftValue = useMemo(() =>
    quotes.filter(q => q.status === "Draft").reduce((sum, q) => sum + (q.quoteAmount ?? 0), 0),
  [quotes]);

  const sentValue = useMemo(() =>
    quotes.filter(q => q.status === "Sent").reduce((sum, q) => sum + (q.quoteAmount ?? 0), 0),
  [quotes]);

  const acceptedValue = useMemo(() =>
    quotes.filter(q => q.status === "Accepted").reduce((sum, q) => sum + (q.quoteAmount ?? 0), 0),
  [quotes]);

  const handleDelete = async (q: Quote) => {
    if (!confirm(`Delete quote for ${q.site}?`)) return;
    try {
      await apiFetch(`/quotes/${q.id}`, { method: "DELETE" });
      toast({ title: "Quote deleted" });
      fetchQuotes();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const handleStatusChange = async (q: Quote, newStatus: Status) => {
    try {
      await apiFetch(`/quotes/${q.id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      toast({ title: `Quote updated to ${newStatus}` });
      fetchQuotes();
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign size={18} className="text-primary" /> Quotes & Estimates
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track quotes, estimates, and sites needing pricing. Paste email trails in the AIDE panel for full analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LiveToggle onTick={fetchQuotes} interval={10_000} />
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors"
            >
              <Upload size={14} /> Import
            </button>
            <button
              onClick={() => { setEditingQuote(null); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> New Quote
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-muted/50 rounded-xl px-3 py-2.5 border border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pipeline Value</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-xl px-3 py-2.5 border border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Drafts</p>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-400">{formatCurrency(draftValue)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5 border border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sent / Pending</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(sentValue)}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2.5 border border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Won</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(acceptedValue)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border px-4 md:px-6 py-3 flex items-center gap-2 flex-wrap">
        <button onClick={() => setStatusFilter(null)}
          className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
            !statusFilter ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:bg-muted"
          )}>
          All ({quotes.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s === statusFilter ? null : s)}
            className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
              s === statusFilter ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:bg-muted"
            )}>
            {s} ({counts[s]})
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes..."
            className="bg-muted border border-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={12} /></button>}
        </div>
      </div>

      {/* Quote list */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 space-y-2">
        {quotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <DollarSign size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No quotes found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create a quote or paste an email trail in the AIDE panel to get started.</p>
          </div>
        )}

        {quotes.map(q => {
          const style = STATUS_STYLE[q.status] || STATUS_STYLE.Draft;
          const Icon = style.icon;
          const expanded = expandedId === q.id;
          const expiring = q.status === "Sent" && isExpiringSoon(q.validUntil);

          return (
            <div key={q.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-xs transition-all">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : q.id)}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", style.bg)}>
                  <Icon size={14} className={style.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground truncate">{q.site}</span>
                    {q.quoteNumber && <span className="text-[10px] text-muted-foreground font-mono">{q.quoteNumber}</span>}
                    {expiring && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangle size={10} /> Expiring soon
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 size={10} /> {q.client}</span>
                    {q.assignedTech && <span className="flex items-center gap-1"><User size={10} /> {q.assignedTech}</span>}
                    {q.address && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin size={10} /> {q.address}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(q.quoteAmount)}</p>
                  <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold", style.bg, style.text)}>{q.status}</span>
                </div>
                <ChevronDown size={14} className={cn("text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")} />
              </div>

              {expanded && (
                <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-3">
                  {q.description && <p className="text-xs text-foreground leading-relaxed">{q.description}</p>}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    {q.taskNumber && <div><span className="text-muted-foreground">Task:</span> <span className="font-mono text-foreground">{q.taskNumber}</span></div>}
                    {q.dateCreated && <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground">{formatDate(q.dateCreated)}</span></div>}
                    {q.dateSent && <div><span className="text-muted-foreground">Sent:</span> <span className="text-foreground">{formatDate(q.dateSent)}</span></div>}
                    {q.dateAccepted && <div><span className="text-muted-foreground">Accepted:</span> <span className="text-foreground">{formatDate(q.dateAccepted)}</span></div>}
                    {q.validUntil && <div><span className="text-muted-foreground">Valid until:</span> <span className={cn("text-foreground", expiring && "text-amber-600 dark:text-amber-400 font-medium")}>{formatDate(q.validUntil)}</span></div>}
                    {q.contactName && <div><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{q.contactName}</span></div>}
                    {q.contactEmail && <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{q.contactEmail}</span></div>}
                  </div>

                  {q.notes && (
                    <div className="bg-background border border-border rounded-lg px-3 py-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{q.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {q.status === "Draft" && (
                      <button onClick={() => handleStatusChange(q, "Sent")}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:opacity-80 transition-opacity">
                        <Send size={11} /> Mark Sent
                      </button>
                    )}
                    {q.status === "Sent" && (
                      <>
                        <button onClick={() => handleStatusChange(q, "Accepted")}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:opacity-80 transition-opacity">
                          <CheckCircle2 size={11} /> Won
                        </button>
                        <button onClick={() => handleStatusChange(q, "Declined")}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:opacity-80 transition-opacity">
                          <XCircle size={11} /> Lost
                        </button>
                      </>
                    )}
                    <button onClick={() => { setEditingQuote(q); setShowForm(true); }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                      <Edit2 size={11} /> Edit
                    </button>
                    <button onClick={() => handleDelete(q)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit form modal */}
      {showForm && (
        <QuoteFormModal
          quote={editingQuote}
          onClose={() => { setShowForm(false); setEditingQuote(null); }}
          onSaved={() => { setShowForm(false); setEditingQuote(null); fetchQuotes(); }}
        />
      )}

      {/* CSV Import */}
      <CSVImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (rows, columnMap) => {
          await apiFetch("/quotes/import", { method: "POST", body: JSON.stringify({ rows, columnMap }) });
          fetchQuotes();
          toast({ title: `Imported ${rows.length} quotes` });
          window.dispatchEvent(new CustomEvent("aide-analyse", { detail: { message: `I just imported ${rows.length} quotes via CSV. Analyse the import: check for duplicate quote numbers, missing site/client fields, value distribution, status breakdown, and flag anything that needs attention. Identify any sites that need estimates.` } }));
        }}
        availableFields={IMPORT_FIELDS}
        title="Import Quotes & Estimates"
      />
    </div>
  );
}

/* ── Quote form modal ──────────────────────────────────────────── */

function QuoteFormModal({ quote, onClose, onSaved }: { quote: Quote | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    site: quote?.site ?? "",
    client: quote?.client ?? "",
    address: quote?.address ?? "",
    taskNumber: quote?.taskNumber ?? "",
    quoteNumber: quote?.quoteNumber ?? "",
    description: quote?.description ?? "",
    quoteAmount: quote?.quoteAmount?.toString() ?? "",
    status: quote?.status ?? "Draft",
    assignedTech: quote?.assignedTech ?? "",
    contactName: quote?.contactName ?? "",
    contactEmail: quote?.contactEmail ?? "",
    validUntil: quote?.validUntil ?? "",
    notes: quote?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.site.trim() || !form.client.trim()) {
      toast({ title: "Site and client are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (k === "quoteAmount") { body[k] = v ? parseFloat(v) : null; }
        else { body[k] = v || null; }
      }
      if (quote) {
        await apiFetch(`/quotes/${quote.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "Quote updated" });
      } else {
        await apiFetch("/quotes", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Quote created" });
      }
      onSaved();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const TECHS = ["", "Bailey Arthur", "Darren Brailey", "Gordon Jenkins", "Haider Al-Heyoury", "Hugo", "Jimmy Kak", "John Minai", "Nick Hollingsworth", "Nu Unasa", "Ryan Robinson", "Tim Hu"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-foreground text-sm">{quote ? "Edit Quote" : "New Quote"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Site *" value={form.site} onChange={v => setForm(f => ({ ...f, site: v }))} />
            <Field label="Client *" value={form.client} onChange={v => setForm(f => ({ ...f, client: v }))} />
            <Field label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
            <Field label="Quote Amount ($)" value={form.quoteAmount} onChange={v => setForm(f => ({ ...f, quoteAmount: v }))} type="number" />
            <Field label="Task Number" value={form.taskNumber} onChange={v => setForm(f => ({ ...f, taskNumber: v }))} />
            <Field label="Quote Number" value={form.quoteNumber} onChange={v => setForm(f => ({ ...f, quoteNumber: v }))} />
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Assigned Tech</label>
              <select value={form.assignedTech} onChange={e => setForm(f => ({ ...f, assignedTech: e.target.value }))}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {TECHS.map(t => <option key={t} value={t}>{t || "Unassigned"}</option>)}
              </select>
            </div>
            <Field label="Contact Name" value={form.contactName} onChange={v => setForm(f => ({ ...f, contactName: v }))} />
            <Field label="Contact Email" value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} />
            <Field label="Valid Until" value={form.validUntil} onChange={v => setForm(f => ({ ...f, validUntil: v }))} type="date" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.site.trim() || !form.client.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : quote ? "Save Changes" : "Create Quote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  Plus, Search, X, CheckCircle2, Circle, Mail, FileText, Link2,
  Filter, Trash2, Pencil, ChevronDown, AlertCircle, CheckSquare,
} from "lucide-react";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import {
  useListPurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  getListPurchaseOrdersQueryKey,
} from "@workspace/api-client-react";
import type { PurchaseOrder, PurchaseOrderChecklistItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUSES = ["Received", "Matched", "Approved", "Actioned", "Completed", "Cancelled"] as const;
type Status = typeof STATUSES[number];

const STATUS_TONE: Record<Status, string> = {
  Received:  "bg-slate-500/15 text-slate-300 border-slate-500/30",
  Matched:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Approved:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Actioned:  "bg-violet-500/15 text-violet-300 border-violet-500/30",
  Completed: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  Cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

interface POFormData {
  poNumber: string;
  client: string;
  site: string;
  amount: string;
  status: Status;
  defectId: string;
  quoteId: string;
  quoteNumber: string;
  taskNumber: string;
  emailSubject: string;
  emailFrom: string;
  emailReceivedAt: string;
  emailBody: string;
  approvedBy: string;
  notes: string;
}

const DEFAULT_FORM: POFormData = {
  poNumber: "", client: "", site: "", amount: "",
  status: "Received",
  defectId: "", quoteId: "", quoteNumber: "", taskNumber: "",
  emailSubject: "", emailFrom: "", emailReceivedAt: "", emailBody: "",
  approvedBy: "", notes: "",
};

function formatCurrency(amount: string | null | undefined): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function checklistProgress(items: PurchaseOrderChecklistItem[] | null | undefined) {
  if (!items || items.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
}

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<POFormData>(DEFAULT_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listQuery = useListPurchaseOrders({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
  });

  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();

  const pos = (listQuery.data ?? []) as PurchaseOrder[];

  const counts = useMemo(() => {
    const out: Record<Status, number> = {
      Received: 0, Matched: 0, Approved: 0, Actioned: 0, Completed: 0, Cancelled: 0,
    };
    for (const p of pos) out[p.status as Status] = (out[p.status as Status] ?? 0) + 1;
    return out;
  }, [pos]);

  const openCreate = () => {
    setEditingPO(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setForm({
      poNumber: po.poNumber ?? "",
      client: po.client ?? "",
      site: po.site ?? "",
      amount: po.amount ?? "",
      status: (po.status as Status) ?? "Received",
      defectId: po.defectId ?? "",
      quoteId: po.quoteId ?? "",
      quoteNumber: po.quoteNumber ?? "",
      taskNumber: po.taskNumber ?? "",
      emailSubject: po.emailSubject ?? "",
      emailFrom: po.emailFrom ?? "",
      emailReceivedAt: po.emailReceivedAt ? po.emailReceivedAt.slice(0, 16) : "",
      emailBody: po.emailBody ?? "",
      approvedBy: po.approvedBy ?? "",
      notes: po.notes ?? "",
    });
    setShowModal(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
  };

  const submit = async () => {
    if (!form.poNumber.trim() || !form.client.trim()) {
      toast({ title: "PO number and client are required", variant: "destructive" });
      return;
    }
    // Prune empty strings so the server gets undefined rather than ""
    const data: any = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === null) continue;
      if (k === "emailReceivedAt") data[k] = new Date(v as string).toISOString();
      else data[k] = v;
    }
    try {
      if (editingPO) {
        await updateMutation.mutateAsync({ id: editingPO.id, data });
        toast({ title: "PO updated" });
      } else {
        await createMutation.mutateAsync({ data });
        toast({ title: "PO created" });
      }
      invalidate();
      setShowModal(false);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message, variant: "destructive" });
    }
  };

  const toggleChecklistItem = async (po: PurchaseOrder, itemId: string, next: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: po.id,
        data: { checklistToggle: { id: itemId, done: next } } as any,
      });
      invalidate();
    } catch (err: any) {
      toast({ title: "Checklist update failed", description: err?.message, variant: "destructive" });
    }
  };

  const markApproved = async (po: PurchaseOrder) => {
    try {
      await updateMutation.mutateAsync({
        id: po.id,
        data: { status: "Approved", approvedAt: new Date().toISOString() } as any,
      });
      invalidate();
      toast({ title: `PO ${po.poNumber} marked Approved` });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const remove = async (po: PurchaseOrder) => {
    if (!confirm(`Delete PO ${po.poNumber}?`)) return;
    try {
      await deleteMutation.mutateAsync({ id: po.id });
      invalidate();
      toast({ title: "PO deleted" });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mail size={18} className="text-primary" /> Purchase Orders
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Match approval emails to defects &amp; service quotes, then tick off the follow-up checklist.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> New PO
          </button>
        </div>

        {/* Status chips */}
        <div className="border-b border-border px-4 md:px-6 py-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
              statusFilter === null
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-card text-muted-foreground border-border hover:border-primary/40",
            )}
          >
            All · {pos.length}
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                statusFilter === s ? STATUS_TONE[s] : "bg-card text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              {s} · {counts[s] ?? 0}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO#, client, defect, quote, email…"
                className="pl-7 pr-2 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-[280px]"
              />
            </div>
            {(search || statusFilter) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(null); }}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {listQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading purchase orders…</p>
          )}
          {listQuery.isError && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle size={14} /> Failed to load purchase orders.
            </div>
          )}
          {!listQuery.isLoading && pos.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">No purchase orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Paste an approval email into a new PO, or ask AIDE: <i>"log this PO from the email"</i>
              </p>
            </div>
          )}

          <div className="space-y-2">
            {pos.map((po) => {
              const checklist = (po.checklist as PurchaseOrderChecklistItem[] | null) ?? [];
              const prog = checklistProgress(checklist);
              const isOpen = expandedId === po.id;
              return (
                <div
                  key={po.id}
                  className="border border-border bg-card rounded-lg overflow-hidden"
                >
                  <div
                    className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedId(isOpen ? null : po.id)}
                  >
                    <ChevronDown
                      size={14}
                      className={cn(
                        "text-muted-foreground mt-0.5 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-foreground font-semibold">{po.poNumber}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                            STATUS_TONE[po.status as Status] ?? "bg-card text-muted-foreground border-border",
                          )}
                        >
                          {po.status}
                        </span>
                        {po.taskNumber && (
                          <span className="text-[10px] text-muted-foreground font-mono">Task {po.taskNumber}</span>
                        )}
                        {po.defectId && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-300">
                            <Link2 size={10} /> Defect {po.defectId.slice(0, 8)}
                          </span>
                        )}
                        {po.quoteNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                            <FileText size={10} /> Quote {po.quoteNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-foreground mt-0.5 truncate">
                        {po.client}{po.site ? ` · ${po.site}` : ""}
                      </div>
                      {po.emailSubject && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          <Mail size={10} className="inline mr-1" />
                          {po.emailSubject}
                          {po.emailFrom ? ` — ${po.emailFrom}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(po.amount)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {po.approvedAt ? `✓ ${formatDate(po.approvedAt)}` : formatDate(po.createdAt)}
                      </div>
                      {prog.total > 0 && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <CheckSquare size={10} className="text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{prog.done}/{prog.total}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                      {/* Quick actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {po.status !== "Approved" && po.status !== "Completed" && (
                          <button
                            onClick={() => markApproved(po)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium hover:bg-emerald-500/25"
                          >
                            <CheckCircle2 size={12} /> Mark Approved
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(po)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] text-foreground hover:border-primary/40"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => remove(po)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] text-red-400 hover:border-red-500/40"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>

                      {/* Checklist */}
                      {checklist.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                              Follow-up checklist
                            </h4>
                            <span className="text-[10px] text-muted-foreground">{prog.done}/{prog.total} · {prog.pct}%</span>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${prog.pct}%` }}
                            />
                          </div>
                          <ul className="space-y-1">
                            {checklist.map((item) => (
                              <li key={item.id}>
                                <button
                                  onClick={() => toggleChecklistItem(po, item.id, !item.done)}
                                  className="flex items-center gap-2 text-left w-full px-2 py-1 rounded hover:bg-muted/50"
                                >
                                  {item.done ? (
                                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <Circle size={14} className="text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className={cn("text-xs", item.done ? "line-through text-muted-foreground" : "text-foreground")}>
                                    {item.label}
                                  </span>
                                  {item.done && item.doneAt && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(item.doneAt)}</span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wide text-[9px]">Amount</div>
                          <div className="text-foreground font-medium">{formatCurrency(po.amount)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wide text-[9px]">Approved By</div>
                          <div className="text-foreground">{po.approvedBy ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wide text-[9px]">Email Received</div>
                          <div className="text-foreground">{formatDate(po.emailReceivedAt)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wide text-[9px]">Quote / Task</div>
                          <div className="text-foreground font-mono">{po.quoteNumber ?? po.taskNumber ?? "—"}</div>
                        </div>
                      </div>

                      {po.notes && (
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wide text-[9px] mb-1">Notes</div>
                          <p className="text-xs text-foreground whitespace-pre-wrap">{po.notes}</p>
                        </div>
                      )}
                      {po.emailBody && (
                        <details>
                          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                            Original email body
                          </summary>
                          <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap bg-background/40 border border-border rounded p-2 max-h-[200px] overflow-auto">
                            {po.emailBody}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnalyticsPanel section="purchase-orders" />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {editingPO ? `Edit PO ${editingPO.poNumber}` : "New Purchase Order"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="PO Number *" value={form.poNumber} onChange={(v) => setForm({ ...form, poNumber: v })} />
                <Field label="Client *" value={form.client} onChange={(v) => setForm({ ...form, client: v })} />
                <Field label="Site" value={form.site} onChange={(v) => setForm({ ...form, site: v })} />
                <Field label="Amount (AUD)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Field label="Approved By" value={form.approvedBy} onChange={(v) => setForm({ ...form, approvedBy: v })} />
              </div>

              <div className="border-t border-border pt-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Link to</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Defect ID" value={form.defectId} onChange={(v) => setForm({ ...form, defectId: v })} />
                  <Field label="Quote Number" value={form.quoteNumber} onChange={(v) => setForm({ ...form, quoteNumber: v })} />
                  <Field label="Quote ID" value={form.quoteId} onChange={(v) => setForm({ ...form, quoteId: v })} />
                  <Field label="Task Number" value={form.taskNumber} onChange={(v) => setForm({ ...form, taskNumber: v })} />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Approval email</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="From" value={form.emailFrom} onChange={(v) => setForm({ ...form, emailFrom: v })} />
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Received</label>
                    <input
                      type="datetime-local"
                      value={form.emailReceivedAt}
                      onChange={(e) => setForm({ ...form, emailReceivedAt: e.target.value })}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <Field label="Subject" value={form.emailSubject} onChange={(v) => setForm({ ...form, emailSubject: v })} className="mt-3" />
                <div className="mt-3">
                  <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Body (paste the email)</label>
                  <textarea
                    value={form.emailBody}
                    onChange={(e) => setForm({ ...form, emailBody: e.target.value })}
                    rows={4}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {editingPO ? "Save changes" : "Create PO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

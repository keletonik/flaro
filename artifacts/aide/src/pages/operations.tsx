import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, Upload, Download, Filter, X, ChevronDown, MessageCircle, Send, Trash2, PanelRightClose, PanelRightOpen, Loader2, Pencil, Eye, ArrowUpDown } from "lucide-react";
import { apiFetch, exportToCSV, streamChat } from "@/lib/api";
import CSVImportModal from "@/components/CSVImportModal";
import LiveToggle from "@/components/LiveToggle";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/PageHeader";

type TabKey = "wip" | "quotes" | "defects" | "invoices";

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "wip", label: "WIP", color: "text-blue-500" },
  { key: "quotes", label: "Quotes", color: "text-purple-500" },
  { key: "defects", label: "Defects", color: "text-amber-500" },
  { key: "invoices", label: "Invoices", color: "text-emerald-500" },
];

const WIP_FIELDS = [
  { key: "taskNumber", label: "Task Number" }, { key: "site", label: "Site", required: true },
  { key: "address", label: "Address" }, { key: "client", label: "Client", required: true },
  { key: "jobType", label: "Job Type" }, { key: "description", label: "Description" },
  { key: "status", label: "Status" }, { key: "priority", label: "Priority" },
  { key: "assignedTech", label: "Assigned Tech" }, { key: "dueDate", label: "Due Date" },
  { key: "dateCreated", label: "Date Created" }, { key: "quoteAmount", label: "Quote Amount" },
  { key: "invoiceAmount", label: "Invoice Amount" }, { key: "poNumber", label: "PO Number" },
  { key: "notes", label: "Notes" },
];
const QUOTE_FIELDS = [
  { key: "taskNumber", label: "Task Number" }, { key: "quoteNumber", label: "Quote Number" },
  { key: "site", label: "Site", required: true }, { key: "client", label: "Client", required: true },
  { key: "description", label: "Description" }, { key: "quoteAmount", label: "Quote Amount" },
  { key: "status", label: "Status" }, { key: "dateCreated", label: "Date Created" },
  { key: "dateSent", label: "Date Sent" }, { key: "assignedTech", label: "Assigned Tech" },
  { key: "contactName", label: "Contact Name" }, { key: "contactEmail", label: "Contact Email" },
  { key: "notes", label: "Notes" },
];
const DEFECT_FIELDS = [
  { key: "taskNumber", label: "Task Number" }, { key: "site", label: "Site", required: true },
  { key: "client", label: "Client", required: true }, { key: "description", label: "Description", required: true },
  { key: "severity", label: "Severity" }, { key: "status", label: "Status" },
  { key: "buildingClass", label: "Building Class" }, { key: "assetType", label: "Asset Type" },
  { key: "location", label: "Location" }, { key: "recommendation", label: "Recommendation" },
  { key: "dateIdentified", label: "Date Identified" }, { key: "notes", label: "Notes" },
];
const INVOICE_FIELDS = [
  { key: "invoiceNumber", label: "Invoice Number" }, { key: "taskNumber", label: "Task Number" },
  { key: "site", label: "Site", required: true }, { key: "client", label: "Client", required: true },
  { key: "description", label: "Description" }, { key: "amount", label: "Amount" },
  { key: "gstAmount", label: "GST" }, { key: "totalAmount", label: "Total Amount" },
  { key: "status", label: "Status" }, { key: "dateIssued", label: "Date Issued" },
  { key: "dateDue", label: "Date Due" }, { key: "datePaid", label: "Date Paid" },
  { key: "notes", label: "Notes" },
];

const FIELDS_MAP: Record<TabKey, typeof WIP_FIELDS> = { wip: WIP_FIELDS, quotes: QUOTE_FIELDS, defects: DEFECT_FIELDS, invoices: INVOICE_FIELDS };
const ENDPOINTS: Record<TabKey, string> = { wip: "/wip", quotes: "/quotes", defects: "/defects", invoices: "/invoices" };

const STATUS_OPTIONS: Record<TabKey, string[]> = {
  wip: ["Open", "In Progress", "Quoted", "Scheduled", "Completed", "On Hold"],
  quotes: ["Draft", "Sent", "Accepted", "Declined", "Expired", "Revised"],
  defects: ["Open", "Quoted", "Scheduled", "Resolved", "Deferred"],
  invoices: ["Draft", "Sent", "Overdue", "Paid", "Void", "Partial"],
};

function formatCurrency(n: any) {
  const num = Number(n);
  return isNaN(num) ? "-" : `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusPill({ status }: { status: string; tab?: TabKey }) {
  const colorMap: Record<string, string> = {
    Open: "text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-800",
    "In Progress": "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800",
    Quoted: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800",
    Scheduled: "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
    Completed: "text-slate-500 border-slate-200 dark:text-slate-400 dark:border-slate-700",
    "On Hold": "text-red-600 border-red-200 dark:text-red-400 dark:border-red-800",
    Draft: "text-slate-500 border-slate-200 dark:text-slate-400 dark:border-slate-700",
    Sent: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800",
    Accepted: "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
    Declined: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-800",
    Expired: "text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800",
    Revised: "text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-800",
    Resolved: "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
    Deferred: "text-slate-500 border-slate-200 dark:text-slate-400 dark:border-slate-700",
    Overdue: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-800",
    Paid: "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
    Void: "text-slate-500 border-slate-200 dark:text-slate-400 dark:border-slate-700",
    Partial: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800",
  };
  const dotMap: Record<string, string> = {
    Open: "●", "In Progress": "●", Quoted: "●", Scheduled: "●", Completed: "✓",
    "On Hold": "◻", Draft: "○", Sent: "●", Accepted: "✓", Declined: "✗",
    Expired: "○", Revised: "●", Resolved: "✓", Deferred: "○", Overdue: "!!",
    Paid: "✓", Void: "—", Partial: "◐",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[10px] font-medium", colorMap[status] || "text-muted-foreground border-border")}>
      <span className="text-[8px]">{dotMap[status] || "●"}</span>{status}
    </span>
  );
}

const EMPTY_STATE_COPY: Record<TabKey, { title: string; lead: string; tips: string[]; aidePrompt: string }> = {
  wip: {
    title: "No WIP records yet",
    lead: "Import your in-progress jobs from Uptick or create one manually.",
    tips: [
      "Export the Open WIPs view from Uptick as CSV",
      "Columns auto-map on the Site, Client, Task # and Description fields",
      "Missing columns are skipped, not blocked",
    ],
    aidePrompt: "Walk me through setting up my WIP pipeline from an Uptick export.",
  },
  quotes: {
    title: "No quotes yet",
    lead: "Log quotes manually or import an Uptick quotes export. Add to the quoting pipeline from anywhere with the Quotes To Do panel.",
    tips: [
      "Status defaults to 'To Quote' so new entries land in the quoting queue",
      "Tag each quote with urgency (Urgent / This Week / Normal / Low)",
      "The dashboard and PA also expose a Quotes To Do widget for quick-add",
    ],
    aidePrompt: "Log a new quote for Site X with Urgent priority.",
  },
  defects: {
    title: "No defects yet",
    lead: "Defects feed scope and quoting. Import AFSS reports or create individual defect rows.",
    tips: [
      "Severity drives priority: Critical is 7-day action, High is 30-day",
      "Link each defect to the quote that resolves it",
      "Use 'Draft scope from defect' in AIDE to auto-populate a quote",
    ],
    aidePrompt: "Show me how to import an AFSS defect register.",
  },
  invoices: {
    title: "No invoices yet",
    lead: "Invoices track outstanding and paid amounts against completed WIP.",
    tips: [
      "Outstanding = Sent + Overdue + Partial",
      "Importing here updates Dashboard revenue and cash-flow metrics",
      "Ask AIDE 'who hasn't paid?' to pull the overdue list",
    ],
    aidePrompt: "Summarise overdue invoices by client.",
  },
};

function EmptyTabState({ tab, onImport, onCreate }: { tab: TabKey; onImport: () => void; onCreate?: () => void }) {
  const copy = EMPTY_STATE_COPY[tab];
  const askAide = () => {
    window.dispatchEvent(new CustomEvent("aide-open-with-prompt", { detail: { prompt: copy.aidePrompt } }));
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border flex items-center justify-center mb-4">
        <Upload size={18} className="text-muted-foreground/60" />
      </div>
      <p className="text-sm font-semibold text-foreground">{copy.title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{copy.lead}</p>
      <div className="flex items-center gap-2 mt-4">
        <button onClick={onImport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Upload size={11} /> Import CSV
        </button>
        {onCreate && (
          <button onClick={onCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted">
            + Add manually
          </button>
        )}
        <button onClick={askAide} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted">
          ⚡ Ask AIDE
        </button>
      </div>
      <ul className="mt-5 text-left space-y-1">
        {copy.tips.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataTable({ data, tab, onDelete, onStatusChange, onEdit, selectedIds, onToggleSelect, onToggleAll, onImport, onCreate }: {
  data: any[]; tab: TabKey; onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (row: any) => void;
  selectedIds: Set<string>; onToggleSelect: (id: string) => void; onToggleAll: () => void;
  onImport?: () => void; onCreate?: () => void;
}) {
  const allColumns = getColumns(tab);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showColMenu, setShowColMenu] = useState(false);

  const visibleColumns = allColumns.filter(c => !hiddenCols.has(c.key));

  const toggleCol = (key: string) => setHiddenCols(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const handleSort = (key: string) => {
    if (sortCol === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(key); setSortDir("asc"); }
  };

  // Apply column-level filters
  const filtered = useMemo(() => {
    let result = data;
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val) continue;
      result = result.filter(r => String(r[key] ?? "").toLowerCase().includes(val.toLowerCase()));
    }
    return result;
  }, [data, colFilters]);

  // Apply sorting
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const numA = Number(av), numB = Number(bv);
      if (!isNaN(numA) && !isNaN(numB)) return sortDir === "asc" ? numA - numB : numB - numA;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortCol, sortDir]);

  if (!data.length) return <EmptyTabState tab={tab} onImport={onImport ?? (() => {})} onCreate={onCreate} />;

  return (
    <div>
      {/* Column visibility toggle */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <button onClick={() => setShowColMenu(v => !v)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-all">
            <Eye size={10} /> Columns ({visibleColumns.length}/{allColumns.length})
          </button>
          {showColMenu && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-md p-2 z-50 min-w-[160px]">
              {allColumns.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-foreground hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" checked={!hiddenCols.has(col.key)} onChange={() => toggleCol(col.key)} className="rounded border-border" />
                  {col.label}
                </label>
              ))}
              <button onClick={() => setHiddenCols(new Set())} className="w-full text-left px-2 py-1 mt-1 text-[10px] text-primary hover:underline">Show all</button>
            </div>
          )}
        </div>
        {sortCol && (
          <span className="text-[10px] text-muted-foreground">Sorted by {allColumns.find(c => c.key === sortCol)?.label} {sortDir === "asc" ? "↑" : "↓"}</span>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">{sorted.length} of {data.length} records</span>
      </div>

      {/* Excel-grade table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            {/* Header row */}
            <tr className="bg-muted/30">
              <th className="w-8 px-2 py-2 text-left border-b border-r border-border sticky top-0 bg-muted/30 z-10">
                <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0} onChange={onToggleAll} className="rounded border-border" />
              </th>
              {visibleColumns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className={cn("px-2 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-muted-foreground border-b border-r border-border sticky top-0 bg-muted/30 z-10 cursor-pointer hover:text-foreground hover:bg-muted/60 select-none whitespace-nowrap",
                    sortCol === col.key && "text-primary"
                  )}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && <ArrowUpDown size={9} className="text-primary" />}
                  </div>
                </th>
              ))}
              <th className="w-12 px-1 py-2 border-b border-border sticky top-0 bg-muted/30 z-10"></th>
            </tr>
            {/* Filter row */}
            <tr className="bg-card">
              <td className="px-2 py-1 border-b border-r border-border"></td>
              {visibleColumns.map(col => (
                <td key={col.key} className="px-1 py-1 border-b border-r border-border">
                  {col.key !== "status" ? (
                    <input value={colFilters[col.key] || ""} onChange={e => setColFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                      placeholder="Filter..." className="w-full bg-transparent text-[10px] px-1 py-0.5 border border-border rounded focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/30" />
                  ) : (
                    <select value={colFilters[col.key] || ""} onChange={e => setColFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                      className="w-full bg-transparent text-[10px] px-1 py-0.5 border border-border rounded focus:outline-none">
                      <option value="">All</option>
                      {STATUS_OPTIONS[tab].map(s => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </td>
              ))}
              <td className="px-1 py-1 border-b border-border">
                {Object.values(colFilters).some(v => v) && (
                  <button onClick={() => setColFilters({})} className="text-[9px] text-primary hover:underline">Clear</button>
                )}
              </td>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className={cn("hover:bg-muted/30 transition-colors", selectedIds.has(row.id) && "bg-primary/4")}>
                <td className="px-2 py-1.5 border-b border-r border-border">
                  <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => onToggleSelect(row.id)} className="rounded border-border" />
                </td>
                {visibleColumns.map(col => (
                  <td key={col.key} className={cn("px-2 py-1.5 border-b border-r border-border whitespace-nowrap",
                    (col.key.includes("amount") || col.key.includes("Amount")) && "font-mono text-right"
                  )}>
                    {col.key === "status" ? (
                      <select value={row.status} onChange={e => onStatusChange(row.id, e.target.value)}
                        className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer">
                        {STATUS_OPTIONS[tab].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : col.render ? col.render(row) : (
                      <span className="text-[12px]">{row[col.key] ?? ""}</span>
                    )}
                  </td>
                ))}
                <td className="px-1 py-1.5 border-b border-border">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEdit(row)} className="p-0.5 rounded text-muted-foreground hover:text-primary" title="Edit"><Pencil size={10} /></button>
                    <button onClick={() => onDelete(row.id)} className="p-0.5 rounded text-muted-foreground hover:text-red-500" title="Delete"><X size={10} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getColumns(tab: TabKey) {
  switch (tab) {
    case "wip": return [
      { key: "taskNumber", label: "Task #" },
      { key: "site", label: "Site" },
      { key: "client", label: "Client" },
      { key: "jobType", label: "Type" },
      { key: "status", label: "Status" },
      { key: "assignedTech", label: "Tech" },
      { key: "quoteAmount", label: "Quote", render: (r: any) => <span className="font-mono text-[13px]">{formatCurrency(r.quoteAmount)}</span> },
      { key: "invoiceAmount", label: "Invoiced", render: (r: any) => <span className="font-mono text-[13px]">{formatCurrency(r.invoiceAmount)}</span> },
      { key: "dueDate", label: "Due" },
    ];
    case "quotes": return [
      { key: "quoteNumber", label: "Quote #", render: (r: any) => <span className="text-[13px]">{r.quoteNumber || r.taskNumber || "-"}</span> },
      { key: "site", label: "Site" },
      { key: "client", label: "Client" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
      { key: "quoteAmount", label: "Amount", render: (r: any) => <span className="font-mono text-[13px]">{formatCurrency(r.quoteAmount)}</span> },
      { key: "dateCreated", label: "Created" },
    ];
    case "defects": return [
      { key: "taskNumber", label: "Task #" },
      { key: "site", label: "Site" },
      { key: "client", label: "Client" },
      { key: "description", label: "Description" },
      { key: "severity", label: "Severity", render: (r: any) => <StatusPill status={r.severity || "Medium"} tab="defects" /> },
      { key: "status", label: "Status" },
      { key: "assetType", label: "Asset Type" },
      { key: "dateIdentified", label: "Identified" },
    ];
    case "invoices": return [
      { key: "invoiceNumber", label: "Invoice #" },
      { key: "site", label: "Site" },
      { key: "client", label: "Client" },
      { key: "status", label: "Status" },
      { key: "totalAmount", label: "Total", render: (r: any) => <span className="font-mono text-[13px]">{formatCurrency(r.totalAmount || r.amount)}</span> },
      { key: "dateIssued", label: "Issued" },
      { key: "dateDue", label: "Due" },
    ];
  }
}

function SummaryBar({ data, tab }: { data: any[]; tab: TabKey }) {
  const stats = useMemo(() => {
    if (tab === "wip") {
      const totalQuote = data.reduce((s, r) => s + (Number(r.quoteAmount) || 0), 0);
      const totalInvoice = data.reduce((s, r) => s + (Number(r.invoiceAmount) || 0), 0);
      return [
        { label: "Records", value: data.length },
        { label: "Quote Value", value: formatCurrency(totalQuote) },
        { label: "Invoiced", value: formatCurrency(totalInvoice) },
        { label: "Gap", value: formatCurrency(totalQuote - totalInvoice) },
      ];
    }
    if (tab === "quotes") {
      const total = data.reduce((s, r) => s + (Number(r.quoteAmount) || 0), 0);
      const accepted = data.filter(r => r.status === "Accepted").reduce((s, r) => s + (Number(r.quoteAmount) || 0), 0);
      return [
        { label: "Total Quotes", value: data.length },
        { label: "Total Value", value: formatCurrency(total) },
        { label: "Accepted", value: formatCurrency(accepted) },
        { label: "Pending", value: data.filter(r => r.status === "Sent" || r.status === "Draft").length },
      ];
    }
    if (tab === "defects") {
      return [
        { label: "Total", value: data.length },
        { label: "Open", value: data.filter(r => r.status === "Open").length },
        { label: "Critical", value: data.filter(r => r.severity === "Critical").length },
        { label: "Resolved", value: data.filter(r => r.status === "Resolved").length },
      ];
    }
    // invoices
    const outstanding = data.filter(r => r.status === "Sent" || r.status === "Overdue").reduce((s, r) => s + (Number(r.totalAmount) || Number(r.amount) || 0), 0);
    return [
      { label: "Total", value: data.length },
      { label: "Outstanding", value: formatCurrency(outstanding) },
      { label: "Overdue", value: data.filter(r => r.status === "Overdue").length },
      { label: "Paid", value: data.filter(r => r.status === "Paid").length },
    ];
  }, [data, tab]);

  return (
    <div className="flex gap-4 flex-wrap">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
          <span className="text-xs font-bold text-foreground">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Parse the current window.location.search on mount so that a
 * drill-through from the Dashboard KPI cards (and soon every other
 * surface that deep-links into /operations) can pre-apply the
 * tab and status filter. Query params honoured:
 *
 *   ?tab=wip|quotes|defects|invoices
 *   ?status=<any status string>
 *
 * Returns safe defaults if anything is missing or unknown.
 */
function readInitialTabAndStatus(): { tab: TabKey; status: string } {
  if (typeof window === "undefined") return { tab: "wip", status: "" };
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const status = params.get("status") ?? "";
  const valid: TabKey[] = ["wip", "quotes", "defects", "invoices"];
  return {
    tab: valid.includes(tab as TabKey) ? (tab as TabKey) : "wip",
    status,
  };
}

export default function Operations() {
  const initial = readInitialTabAndStatus();
  const [activeTab, setActiveTab] = useState<TabKey>(initial.tab);
  const [data, setData] = useState<Record<TabKey, any[]>>({ wip: [], quotes: [], defects: [], invoices: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initial.status);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<any>(null);
  const { toast } = useToast();

  const handleEditSave = async (id: string, updates: Record<string, any>) => {
    try {
      await apiFetch(`${ENDPOINTS[activeTab]}/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
      toast({ title: "Record updated" });
      setEditingRow(null);
      fetchData(activeTab);
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { const current = data[activeTab]; if (selectedIds.size === current.length) setSelectedIds(new Set()); else setSelectedIds(new Set(current.map((r: any) => r.id))); };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    try {
      await apiFetch(`${ENDPOINTS[activeTab]}/bulk`, { method: "PATCH", body: JSON.stringify({ ids, status }) });
      toast({ title: `${ids.length} records updated to ${status}` });
      clearSelection();
      fetchData(activeTab);
    } catch { toast({ title: "Bulk update failed", variant: "destructive" }); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} selected records?`)) return;
    try {
      for (const id of ids) { await apiFetch(`${ENDPOINTS[activeTab]}/${id}`, { method: "DELETE" }); }
      toast({ title: `${ids.length} records deleted` });
      clearSelection();
      fetchData(activeTab);
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const fetchData = async (tab: TabKey) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const result = await apiFetch(`${ENDPOINTS[tab]}?${params}&limit=500`);
      // Handle both paginated {data:[]} and flat array responses
      const records = Array.isArray(result) ? result : (result.data || []);
      setData(prev => ({ ...prev, [tab]: records }));
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(activeTab); }, [activeTab, search, statusFilter]);

  const handleImport = async (rows: Record<string, string>[], columnMap: Record<string, string>) => {
    await apiFetch(`${ENDPOINTS[activeTab]}/import`, { method: "POST", body: JSON.stringify({ rows, columnMap }) });
    toast({ title: `${rows.length} records imported` });
    fetchData(activeTab);
    window.dispatchEvent(new CustomEvent("aide-analyse", { detail: { message: `I just imported ${rows.length} rows of ${activeTab.toUpperCase()} data. Analyse the import: check for duplicates, missing fields, data quality issues, and patterns. Cross-reference with existing records and flag anything that needs attention.` } }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      await apiFetch(`${ENDPOINTS[activeTab]}/${id}`, { method: "DELETE" });
      fetchData(activeTab);
    } catch { toast({ title: "Could not delete record", variant: "destructive" }); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiFetch(`${ENDPOINTS[activeTab]}/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      fetchData(activeTab);
    } catch { toast({ title: "Could not update status", variant: "destructive" }); }
  };

  const handleExport = () => {
    if (!data[activeTab].length) return;
    exportToCSV(data[activeTab], `${activeTab}-export-${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Export downloaded" });
  };

  const currentData = data[activeTab];

  // --- Inline Analytics Chat ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const scrollChat = () => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; };
  useEffect(() => { scrollChat(); }, [chatMessages]);

  const sendChatMsg = () => {
    const text = chatInput.trim();
    if (!text || chatStreaming) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: text }]);
    setChatStreaming(true);
    let assistantContent = "";
    setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
    controllerRef.current = streamChat(activeTab, text, chatMessages,
      (chunk) => { assistantContent += chunk; setChatMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistantContent }; return u; }); },
      () => setChatStreaming(false),
      () => setChatStreaming(false),
    );
  };

  const chatSuggestions: Record<TabKey, string[]> = {
    wip: ["What's the total value of open WIP?", "Which tech has the most jobs?", "Show me overdue jobs"],
    quotes: ["What's our quote conversion rate?", "Highest value pending quote?", "Summarise quote pipeline"],
    defects: ["How many critical defects are open?", "Which site has the most defects?", "Defects needing quotes"],
    invoices: ["Total outstanding amount?", "Which invoices are overdue?", "Revenue breakdown this month"],
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        prefix="::"
        title="Operations"
        subtitle="Uptick data management and analytics"
        actions={
          <>
            <LiveToggle onTick={() => fetchData(activeTab)} interval={10_000} />
            <button onClick={() => setChatOpen(v => !v)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", chatOpen ? "bg-primary text-white border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted border-border")} title="Toggle analyst panel">
              {chatOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />} Analyst
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors" title="Export CSV">
              <Download size={13} /> Export
            </button>
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Upload size={13} /> Import CSV
            </button>
          </>
        }
        below={
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setStatusFilter(""); setSearch(""); clearSelection(); }}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                {tab.label}
                <span className={cn("ml-1 text-[10px]", activeTab === tab.key ? "opacity-70" : "opacity-50")}>{data[tab.key].length}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`}
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="relative">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="pl-8 pr-6 py-2 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                <option value="">All statuses</option>
                {STATUS_OPTIONS[activeTab].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <SummaryBar data={currentData} tab={activeTab} />
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-card border border-border rounded-xl skeleton-pulse" />)}</div>
          ) : (
            <>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/8 border border-primary/20 rounded-xl mb-3">
                <span className="text-xs font-semibold text-primary">{selectedIds.size} selected</span>
                <div className="flex items-center gap-1.5">
                  {STATUS_OPTIONS[activeTab].map(s => (
                    <button key={s} onClick={() => handleBulkStatus(s)} className="px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-card border border-border transition-all">{s}</button>
                  ))}
                </div>
                <button onClick={handleBulkDelete} className="px-2 py-1 rounded-md text-[10px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-red-200 dark:border-red-800 transition-all ml-auto">Delete</button>
                <button onClick={clearSelection} className="px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground transition-all">Clear</button>
              </div>
            )}
            <DataTable data={currentData} tab={activeTab} onDelete={handleDelete} onStatusChange={handleStatusChange} onEdit={setEditingRow} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleAll={toggleSelectAll} onImport={() => setImportOpen(true)} />
            </>
          )}
        </div>

        {/* Inline Analytics Chat Panel */}
        {chatOpen && (
          <div className="w-[380px] max-w-[40vw] border-l border-border bg-card flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{TABS.find(t => t.key === activeTab)?.label} Analyst</span>
              </div>
              <div className="flex items-center gap-1">
                {chatMessages.length > 0 && <button onClick={() => { if (controllerRef.current) controllerRef.current.abort(); setChatMessages([]); setChatStreaming(false); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={12} /></button>}
                <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={13} /></button>
              </div>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-3">
                  <MessageCircle size={20} className="text-primary/30 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Ask about your data</p>
                  <p className="text-xs text-muted-foreground mb-4">I can analyse your {activeTab} data, find patterns, and give insights.</p>
                  <div className="space-y-1.5 w-full">
                    {chatSuggestions[activeTab].map((s, i) => (
                      <button key={i} onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border transition-all">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[90%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    msg.role === "user" ? "chat-user-bubble rounded-br-sm" : "bg-muted/50 text-foreground rounded-bl-sm"
                  )}>
                    {msg.role === "assistant" && !msg.content && chatStreaming && i === chatMessages.length - 1 ? (
                      <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-primary" /><span className="text-muted-foreground text-xs">Analysing...</span></span>
                    ) : <span className="whitespace-pre-wrap">{msg.content}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-3 py-2.5">
              <div className="flex items-end gap-2 bg-muted/30 rounded-xl px-3 py-2 border border-border focus-within:border-primary/30 transition-all">
                <textarea ref={chatInputRef} value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMsg(); } }}
                  placeholder="Ask about your data..." rows={1}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[20px] max-h-[80px]"
                  style={{ height: 'auto', overflow: 'hidden' }}
                  onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 80) + 'px'; }} />
                <button onClick={sendChatMsg} disabled={!chatInput.trim() || chatStreaming}
                  className={cn("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                    chatInput.trim() && !chatStreaming ? "bg-primary text-white" : "bg-muted text-muted-foreground/30")}><Send size={12} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CSVImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} availableFields={FIELDS_MAP[activeTab]} title={`Import ${activeTab.toUpperCase()} Data`} />

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingRow(null)}>
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Edit Record</h3>
              <button onClick={() => setEditingRow(null)} className="p-1 rounded text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {FIELDS_MAP[activeTab].map(field => (
                <div key={field.key}>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{field.label}</label>
                  {field.key === "status" ? (
                    <select value={editingRow[field.key] || ""} onChange={e => setEditingRow((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {STATUS_OPTIONS[activeTab].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={editingRow[field.key] || ""} onChange={e => setEditingRow((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button onClick={() => setEditingRow(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={() => { const { id, createdAt, updatedAt, rawData, importBatchId, ...updates } = editingRow; handleEditSave(id, updates); }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

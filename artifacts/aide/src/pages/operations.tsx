import { useState, useEffect, useMemo } from "react";
import { Search, Upload, Download, Filter, Plus, X, ChevronDown, BarChart3 } from "lucide-react";
import { apiFetch, exportToCSV } from "@/lib/api";
import CSVImportModal from "@/components/CSVImportModal";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

function StatusPill({ status, tab }: { status: string; tab: TabKey }) {
  const colorMap: Record<string, string> = {
    Open: "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
    "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    Quoted: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    Scheduled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Completed: "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
    "On Hold": "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    Draft: "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
    Sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    Accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Declined: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    Expired: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    Revised: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Deferred: "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
    Overdue: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    Void: "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
    Partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold", colorMap[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

function DataTable({ data, tab, onDelete, onStatusChange }: {
  data: any[]; tab: TabKey; onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const columns = getColumns(tab);
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Upload size={28} className="text-muted-foreground/30 mb-3" />
      <p className="text-sm font-semibold text-foreground">No records yet</p>
      <p className="text-xs text-muted-foreground mt-1">Import a CSV from Uptick to get started</p>
    </div>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="data-table w-full">
        <thead>
          <tr>
            {columns.map(col => <th key={col.key}>{col.label}</th>)}
            <th className="w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="group">
              {columns.map(col => (
                <td key={col.key} className={cn(col.key.includes("amount") || col.key.includes("Amount") ? "font-mono text-right" : "")}>
                  {col.key === "status" ? (
                    <select
                      value={row.status}
                      onChange={e => onStatusChange(row.id, e.target.value)}
                      className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                    >
                      {STATUS_OPTIONS[tab].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : col.render ? col.render(row) : (
                    <span className="text-[13px]">{row[col.key] ?? "-"}</span>
                  )}
                </td>
              ))}
              <td>
                <button
                  onClick={() => onDelete(row.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 transition-all"
                >
                  <X size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default function Operations() {
  const [activeTab, setActiveTab] = useState<TabKey>("wip");
  const [data, setData] = useState<Record<TabKey, any[]>>({ wip: [], quotes: [], defects: [], invoices: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async (tab: TabKey) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const result = await apiFetch(`${ENDPOINTS[tab]}?${params}`);
      setData(prev => ({ ...prev, [tab]: result }));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(activeTab); }, [activeTab, search, statusFilter]);

  const handleImport = async (rows: Record<string, string>[], columnMap: Record<string, string>) => {
    await apiFetch(`${ENDPOINTS[activeTab]}/import`, { method: "POST", body: JSON.stringify({ rows, columnMap }) });
    toast({ title: `${rows.length} records imported` });
    fetchData(activeTab);
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`${ENDPOINTS[activeTab]}/${id}`, { method: "DELETE" });
    fetchData(activeTab);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await apiFetch(`${ENDPOINTS[activeTab]}/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    fetchData(activeTab);
  };

  const handleExport = () => {
    if (!data[activeTab].length) return;
    exportToCSV(data[activeTab], `${activeTab}-export-${new Date().toISOString().split("T")[0]}`);
    toast({ title: "Export downloaded" });
  };

  const currentData = data[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-foreground font-bold text-lg tracking-tight flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" /> Operations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Uptick data management and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors" title="Export CSV">
              <Download size={13} /> Export
            </button>
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Upload size={13} /> Import CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setStatusFilter(""); setSearch(""); }}
              className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              {tab.label}
              <span className={cn("ml-1 text-[10px]", activeTab === tab.key ? "opacity-70" : "opacity-50")}>
                {data[tab.key].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
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

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-card border border-border rounded-xl skeleton-pulse" />)}</div>
        ) : (
          <DataTable data={currentData} tab={activeTab} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        )}
      </div>

      <CSVImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} availableFields={FIELDS_MAP[activeTab]} title={`Import ${activeTab.toUpperCase()} Data`} />
      <AnalyticsPanel section={activeTab} title={`${TABS.find(t => t.key === activeTab)?.label} Analyst`} />
    </div>
  );
}

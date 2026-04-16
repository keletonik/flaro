import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getListTodosQueryKey } from "@workspace/api-client-react";

interface TableResult {
  tableId: string;
  inserted: number;
  updated: number;
  deleted: number;
  total: number;
  error: string | null;
}

interface SyncStatus {
  enabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  pollIntervalMs: number;
  tables: Record<string, TableResult>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export default function AirtableSyncBadge() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<SyncStatus>("/airtable/status");
      setStatus(data);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const i = setInterval(fetchStatus, 10000);
    return () => clearInterval(i);
  }, []);

  const manualSync = async () => {
    setSyncing(true);
    try {
      await apiFetch("/airtable/sync", { method: "POST" });
      await fetchStatus();
      queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
    } finally { setSyncing(false); }
  };

  if (!status || !status.enabled) return null;

  const hasError = !!status.lastError;
  const totals = status.tables ? Object.entries(status.tables).map(([k, v]) => `${v.total} ${k}`).join(" • ") : "";

  return (
    <button
      onClick={manualSync}
      disabled={syncing}
      title={hasError ? status.lastError! : `${totals} synced every ${Math.round(status.pollIntervalMs / 1000)}s. Click to sync now.`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium transition ${
        hasError
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
      } ${syncing ? "opacity-60" : ""}`}
    >
      {hasError ? (
        <AlertCircle size={10} />
      ) : syncing ? (
        <RefreshCw size={10} className="animate-spin" />
      ) : (
        <CheckCircle2 size={10} />
      )}
      <span>Airtable</span>
      <span className="opacity-70">· {timeAgo(status.lastSyncAt)}</span>
    </button>
  );
}

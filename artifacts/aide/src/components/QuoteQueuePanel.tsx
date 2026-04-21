import { useState, useEffect, useCallback } from "react";
import { apiFetch, formatCurrency } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface QueueQuote {
  id: string;
  site: string;
  client: string;
  description: string | null;
  quoteNumber: string | null;
  urgency: string | null;
  status: string;
  quoteAmount: string | null;
  assignedTech: string | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
}

/**
 * Historical imports with unmapped columns wrote the literal "Unknown" into
 * site/client. Render a readable fallback instead of repeating "Unknown".
 */
function displayTitle(q: QueueQuote): string {
  if (q.site && q.site !== "Unknown") return q.site;
  if (q.description) return q.description.slice(0, 80);
  if (q.quoteNumber) return q.quoteNumber;
  return "(untitled quote)";
}
function displaySub(q: QueueQuote): string | null {
  if (q.client && q.client !== "Unknown") return q.client;
  if (q.quoteNumber && q.site !== q.quoteNumber) return q.quoteNumber;
  return null;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Urgent: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-600 dark:text-red-400", label: "URGENT" },
  "This Week": { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-700 dark:text-amber-400", label: "THIS WEEK" },
  Normal: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-600 dark:text-blue-400", label: "NORMAL" },
  Low: { bg: "bg-muted/50 border-border", text: "text-muted-foreground", label: "LOW" },
};

const URGENCIES = ["Urgent", "This Week", "Normal", "Low"] as const;

interface Props {
  compact?: boolean;
  maxItems?: number;
  className?: string;
}

export function QuoteQueuePanel({ compact = false, maxItems = 10, className }: Props) {
  const [quotes, setQuotes] = useState<QueueQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [site, setSite] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<string>("Normal");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchQueue = useCallback(async () => {
    try {
      const all = await apiFetch<QueueQuote[]>("/quotes?status=To Quote,Draft");
      const sorted = all.sort((a, b) => {
        const order: Record<string, number> = { Urgent: 0, "This Week": 1, Normal: 2, Low: 3 };
        return (order[a.urgency || "Normal"] ?? 2) - (order[b.urgency || "Normal"] ?? 2);
      });
      setQuotes(sorted.slice(0, maxItems));
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleAdd = async () => {
    if (!site.trim() || !client.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch("/quotes", {
        method: "POST",
        body: JSON.stringify({
          site: site.trim(),
          client: client.trim(),
          description: description.trim() || null,
          urgency,
          status: "To Quote",
        }),
      });
      setSite("");
      setClient("");
      setDescription("");
      setUrgency("Normal");
      setAdding(false);
      fetchQueue();
      toast({ title: "Quote added to queue" });
    } catch {
      toast({ title: "Failed to add quote", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiFetch(`/quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      fetchQueue();
    } catch {
      toast({ title: "Failed to update quote", variant: "destructive" });
    }
  };

  const handleUrgencyChange = async (id: string, newUrgency: string) => {
    try {
      await apiFetch(`/quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ urgency: newUrgency }),
      });
      fetchQueue();
    } catch {
      toast({ title: "Failed to update urgency", variant: "destructive" });
    }
  };

  const urgentCount = quotes.filter((q) => q.urgency === "Urgent").length;
  const thisWeekCount = quotes.filter((q) => q.urgency === "This Week").length;

  return (
    <div className={cn("bg-card border border-border rounded-xl p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">quotes to do</span>
          <span className="text-[12px] font-semibold text-foreground">{quotes.length}</span>
          {urgentCount > 0 && (
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{urgentCount} urgent</span>
          )}
          {thisWeekCount > 0 && (
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{thisWeekCount} this week</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
        >
          {adding ? "cancel" : "+ add quote"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 p-3 bg-muted/20 border border-border rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              autoFocus
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Site name..."
              className="bg-background border border-border rounded px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client..."
              className="bg-background border border-border rounded px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="Scope / description..."
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {URGENCIES.map((u) => {
                const style = URGENCY_STYLES[u];
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[10px] font-bold transition-colors",
                      urgency === u
                        ? `${style.bg} ${style.text} border-current`
                        : "bg-transparent text-muted-foreground border-border hover:text-foreground",
                    )}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!site.trim() || !client.trim() || submitting}
              className="px-3 py-1 rounded text-[11px] font-semibold bg-primary text-primary-foreground disabled:opacity-40"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" style={{ width: `${90 - i * 10}%` }} />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <p className="text-[12px] text-muted-foreground text-center py-4">No quotes in the pipeline. Add one above or ask AIDE to log a quote for you.</p>
      ) : (
        <div className="space-y-1.5">
          {quotes.map((q) => {
            const style = URGENCY_STYLES[q.urgency || "Normal"] || URGENCY_STYLES.Normal;
            return (
              <div
                key={q.id}
                className={cn(
                  "group flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/20",
                  style.bg,
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold text-foreground truncate">{displayTitle(q)}</span>
                    {displaySub(q) && (
                      <span className="text-[10px] text-muted-foreground">/ {displaySub(q)}</span>
                    )}
                  </div>
                  {q.description && !compact && q.site !== "Unknown" && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{q.description}</p>
                  )}
                </div>
                <select
                  value={q.urgency || "Normal"}
                  onChange={(e) => handleUrgencyChange(q.id, e.target.value)}
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-3",
                    style.text,
                  )}
                  title="Change urgency"
                >
                  {URGENCIES.map((u) => <option key={u} value={u}>{URGENCY_STYLES[u].label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => handleStatusChange(q.id, "Draft")}
                  title="Move to Draft (started writing)"
                  className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-primary hover:underline shrink-0"
                >
                  start
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(q.id, "Sent")}
                  title="Mark as Sent"
                  className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-emerald-600 hover:underline shrink-0"
                >
                  sent
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

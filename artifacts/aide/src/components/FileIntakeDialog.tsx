/**
 * File intake dialog — listens for `aide-files-dropped` events from the AIDE
 * tray, detects which entity the CSV belongs to, and routes the import to the
 * right existing endpoint. No backend changes needed.
 */

import { useEffect, useState, useCallback } from "react";
import { apiFetch, parseCSV } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type EntityKey = "jobs" | "wip" | "quotes" | "defects" | "invoices";

interface IntakeState {
  file: File;
  text: string;
  headers: string[];
  rowCount: number;
  detected: EntityKey;
  scores: Record<EntityKey, number>;
}

// Header keywords per entity. Case-insensitive substring match. The entity
// with the highest score wins; ties go alphabetically to the earlier key.
const KEYWORDS: Record<EntityKey, string[]> = {
  jobs:     ["task", "site", "client", "tech", "priority", "due", "status", "scope"],
  wip:      ["wip", "task", "site", "client", "job type", "quote amount", "invoice amount", "po"],
  quotes:   ["quote", "quote ref", "site", "client", "scope", "deadline", "amount", "validity"],
  defects:  ["defect", "remark", "severity", "building class", "asset type", "location", "recommend"],
  invoices: ["invoice", "inv", "amount", "gst", "total", "issued", "due", "paid", "overdue"],
};

const ENDPOINT: Record<EntityKey, string> = {
  jobs:     "/jobs",          // jobs has no /import; use chat upload path instead
  wip:      "/wip/import",
  quotes:   "/quotes/import",
  defects:  "/defects/import",
  invoices: "/invoices/import",
};

// Column maps from common CSV header labels → DB field keys. Mirror the maps
// in operations.tsx so an import works without the user choosing mappings.
const COLUMN_MAP: Record<EntityKey, Record<string, string>> = {
  jobs: {
    "task number": "taskNumber", "site": "site", "address": "address",
    "client": "client", "scope": "actionRequired", "priority": "priority",
    "status": "status", "assigned tech": "assignedTech", "tech": "assignedTech",
    "due": "dueDate", "due date": "dueDate", "contact": "contactName",
    "email": "contactEmail", "phone": "contactNumber", "notes": "notes",
  },
  wip: {
    "task number": "taskNumber", "site": "site", "address": "address",
    "client": "client", "job type": "jobType", "description": "description",
    "status": "status", "priority": "priority", "assigned tech": "assignedTech",
    "due date": "dueDate", "date created": "dateCreated",
    "quote amount": "quoteAmount", "invoice amount": "invoiceAmount",
    "po number": "poNumber", "notes": "notes",
  },
  quotes: {
    "task number": "taskNumber", "quote reference": "quoteNumber",
    "quote number": "quoteNumber", "site": "site", "client": "client",
    "description": "description", "scope": "description",
    "quote amount": "quoteAmount", "amount": "quoteAmount",
    "status": "status", "date created": "dateCreated",
    "deadline": "validUntil", "valid until": "validUntil",
    "contact": "contactName", "contact name": "contactName",
    "contact email": "contactEmail", "email": "contactEmail",
    "notes": "notes",
  },
  defects: {
    "task number": "taskNumber", "site": "site", "client": "client",
    "description": "description", "remark": "description",
    "severity": "severity", "status": "status",
    "building class": "buildingClass", "asset type": "assetType",
    "location": "location", "recommendation": "recommendation",
    "date identified": "dateIdentified", "notes": "notes",
  },
  invoices: {
    "invoice number": "invoiceNumber", "task number": "taskNumber",
    "site": "site", "client": "client", "description": "description",
    "amount": "amount", "gst": "gstAmount", "total amount": "totalAmount",
    "total": "totalAmount", "status": "status",
    "date issued": "dateIssued", "date due": "dateDue",
    "date paid": "datePaid", "notes": "notes",
  },
};

function scoreHeaders(headers: string[]): { detected: EntityKey; scores: Record<EntityKey, number> } {
  const lower = headers.map(h => h.toLowerCase());
  const scores: Record<EntityKey, number> = { jobs: 0, wip: 0, quotes: 0, defects: 0, invoices: 0 };
  for (const [key, words] of Object.entries(KEYWORDS) as [EntityKey, string[]][]) {
    for (const w of words) {
      if (lower.some(h => h.includes(w))) scores[key]++;
    }
  }
  const detected = (Object.entries(scores) as [EntityKey, number][])
    .sort(([, a], [, b]) => b - a)[0][0];
  return { detected, scores };
}

function autoMap(headers: string[], entity: EntityKey): Record<string, string> {
  const map = COLUMN_MAP[entity];
  const out: Record<string, string> = {};
  for (const h of headers) {
    const key = h.toLowerCase().trim();
    if (map[key]) out[h] = map[key];
  }
  return out;
}

export function FileIntakeDialog() {
  const [state, setState] = useState<IntakeState | null>(null);
  const [override, setOverride] = useState<EntityKey | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const files = (e as CustomEvent).detail?.files as File[] | undefined;
      if (!files || files.length === 0) return;
      // Take the first file; multi-file intake deferred.
      const file = files[0];
      const lower = file.name.toLowerCase();

      // .msg → email intake. Bypass the CSV dialog entirely; ship straight to
      // /msg/intake which parses, categorises, and creates a Job + Airtable row.
      if (lower.endsWith(".msg")) {
        const rdr = new FileReader();
        rdr.onload = async (ev) => {
          const result = ev.target?.result as string | null;
          if (!result) {
            toast({ title: "Could not read .msg", description: file.name, variant: "destructive" });
            return;
          }
          // FileReader.readAsDataURL returns "data:<mime>;base64,<payload>".
          const data = result.includes(",") ? result.split(",", 2)[1] : result;
          try {
            const r: any = await apiFetch("/msg/intake", {
              method: "POST",
              body: JSON.stringify({ filename: file.name, data }),
            });
            toast({
              title: `Email imported · ${r?.priority || "Medium"}`,
              description: `${r?.category || "General"}${r?.taskNumber ? ` · ${r.taskNumber}` : ""}`,
            });
          } catch (err: any) {
            toast({ title: "Email import failed", description: String(err?.message || err), variant: "destructive" });
          }
        };
        rdr.readAsDataURL(file);
        return;
      }

      if (!lower.endsWith(".csv")) {
        toast({ title: "Only CSV and .msg are supported right now", description: file.name, variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) || "";
        const parsed = parseCSV(text);
        if (!parsed.headers.length) {
          toast({ title: "Empty CSV", description: file.name, variant: "destructive" });
          return;
        }
        const { detected, scores } = scoreHeaders(parsed.headers);
        setOverride(null);
        setState({
          file, text,
          headers: parsed.headers,
          rowCount: parsed.rows.length,
          detected, scores,
        });
      };
      reader.readAsText(file);
    };
    window.addEventListener("aide-files-dropped", handler);
    return () => window.removeEventListener("aide-files-dropped", handler);
  }, [toast]);

  const close = useCallback(() => { setState(null); setOverride(null); }, []);

  const confirmImport = useCallback(async () => {
    if (!state) return;
    const entity = override || state.detected;

    if (entity === "jobs") {
      // Jobs doesn't have an /import endpoint. Upserting one-by-one would be
      // heavy, and the master prompt wants Airtable to own job creation, so
      // redirect the user to paste-edit via the Jobs page. Surface explanation.
      toast({
        title: "Jobs intake via Airtable",
        description: "Add the rows to Airtable and the sync will pull them in within 30s.",
      });
      close();
      return;
    }

    const parsed = parseCSV(state.text);
    const columnMap = autoMap(state.headers, entity);
    if (Object.keys(columnMap).length === 0) {
      toast({
        title: "No columns could be auto-mapped",
        description: "Open the target page and use its Import CSV button to map manually.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const result: any = await apiFetch(ENDPOINT[entity], {
        method: "POST",
        body: JSON.stringify({ rows: parsed.rows, columnMap }),
      });
      toast({
        title: `Imported ${result?.imported ?? parsed.rows.length} rows`,
        description: `${entity} · batch ${String(result?.batchId || "").slice(0, 8)}`,
      });
      close();
    } catch (err: any) {
      toast({ title: "Import failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }, [state, override, toast, close]);

  if (!state) return null;
  const chosen = override || state.detected;
  const alternatives: EntityKey[] = (Object.keys(state.scores) as EntityKey[])
    .filter(k => k !== chosen)
    .sort((a, b) => state.scores[b] - state.scores[a]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-[0_24px_56px_-16px_rgba(0,0,0,0.48)] p-5 page-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Intake · CSV</p>
            <h2 className="font-mono text-sm font-bold text-foreground mt-0.5 truncate">{state.file.name}</h2>
          </div>
          <button onClick={close} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">×</button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rows</span>
            <span className="font-mono font-bold tabular-nums">{state.rowCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Columns</span>
            <span className="font-mono font-bold tabular-nums">{state.headers.length}</span>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Detected target</p>
            <div className="flex flex-wrap gap-2">
              {([chosen, ...alternatives]).map((k) => (
                <button
                  key={k}
                  onClick={() => setOverride(k)}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-mono text-xs border transition-colors",
                    k === chosen
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {k} · {state.scores[k]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={close}
            disabled={importing}
            className="px-3 py-2 rounded-md font-mono text-xs text-muted-foreground hover:text-foreground border border-border"
          >
            cancel
          </button>
          <button
            onClick={confirmImport}
            disabled={importing}
            className="flex-1 px-3 py-2 rounded-md font-mono text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {importing ? "importing…" : `import to ${chosen}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileIntakeDialog;

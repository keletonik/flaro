import { db } from "@workspace/db";
import { todos } from "@workspace/db";
import { eq, isNotNull, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appuKqojpI3bmO79D";
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID || "tblfX6SQYVJJmkdeK";
const POLL_INTERVAL_MS = parseInt(process.env.AIRTABLE_POLL_MS || "30000", 10);

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

interface SyncStatus {
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncDurationMs: number | null;
  recordsFromAirtable: number;
  lastError: string | null;
  nextSyncAt: string | null;
  pollIntervalMs: number;
  baseId: string;
  tableId: string;
}

const status: SyncStatus = {
  enabled: !!AIRTABLE_PAT,
  lastSyncAt: null,
  lastSyncDurationMs: null,
  recordsFromAirtable: 0,
  lastError: null,
  nextSyncAt: null,
  pollIntervalMs: POLL_INTERVAL_MS,
  baseId: AIRTABLE_BASE_ID,
  tableId: AIRTABLE_TABLE_ID,
};

export function getSyncStatus(): SyncStatus {
  return { ...status };
}

function mapStatus(airtableStatus: string | undefined): { completed: boolean } {
  if (!airtableStatus) return { completed: false };
  const s = airtableStatus.toLowerCase();
  return { completed: s === "done" || s === "completed" };
}

function mapPriority(p: any): "Critical" | "High" | "Medium" | "Low" {
  if (!p) return "Medium";
  const s = String(p).toLowerCase();
  if (s.includes("critical") || s.includes("urgent")) return "Critical";
  if (s.includes("high")) return "High";
  if (s.includes("low")) return "Low";
  return "Medium";
}

async function fetchAllAirtableRecords(): Promise<AirtableRecord[]> {
  if (!AIRTABLE_PAT) throw new Error("AIRTABLE_PAT not set");
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    if (offset) url.searchParams.set("offset", offset);
    url.searchParams.set("pageSize", "100");
    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });
    if (!resp.ok) throw new Error(`Airtable API ${resp.status}: ${await resp.text()}`);
    const data: any = await resp.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

export async function syncAirtableToTodos(): Promise<{ inserted: number; updated: number; deleted: number; total: number }> {
  const startedAt = Date.now();
  const records = await fetchAllAirtableRecords();
  const airtableIds = new Set(records.map((r) => r.id));

  let inserted = 0;
  let updated = 0;
  const now = new Date();

  for (const rec of records) {
    const f = rec.fields;
    const name: string = (f["Name"] || f["name"] || f["Task"] || "").toString().trim();
    if (!name) continue;

    const { completed } = mapStatus(f["Status"]);
    const priority = mapPriority(f["Priority"]);
    const notes: string | null = f["Notes"] ? String(f["Notes"]).trim() : null;
    const assignee: string | null = f["Assignee"]?.name || f["Assignee"] || null;
    const dueDate: string | null = f["Due"] || f["Due Date"] || null;

    const [existing] = await db.select().from(todos).where(eq(todos.airtableRecordId, rec.id));

    if (existing) {
      await db
        .update(todos)
        .set({
          text: name,
          completed,
          priority,
          notes,
          assignee: typeof assignee === "string" ? assignee : null,
          dueDate: typeof dueDate === "string" ? dueDate : null,
          updatedAt: now,
        })
        .where(eq(todos.id, existing.id));
      updated++;
    } else {
      await db.insert(todos).values({
        id: randomUUID(),
        text: name,
        completed,
        priority,
        category: "Work",
        notes,
        assignee: typeof assignee === "string" ? assignee : null,
        dueDate: typeof dueDate === "string" ? dueDate : null,
        dependencies: [],
        airtableRecordId: rec.id,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
  }

  // Remove todos whose Airtable records are gone
  const existingSynced = await db.select().from(todos).where(isNotNull(todos.airtableRecordId));
  const toDelete = existingSynced.filter((t) => t.airtableRecordId && !airtableIds.has(t.airtableRecordId)).map((t) => t.id);
  let deleted = 0;
  if (toDelete.length > 0) {
    await db.delete(todos).where(inArray(todos.id, toDelete));
    deleted = toDelete.length;
  }

  status.lastSyncAt = new Date().toISOString();
  status.lastSyncDurationMs = Date.now() - startedAt;
  status.recordsFromAirtable = records.length;
  status.lastError = null;
  status.nextSyncAt = new Date(Date.now() + POLL_INTERVAL_MS).toISOString();

  return { inserted, updated, deleted, total: records.length };
}

let pollTimer: NodeJS.Timeout | null = null;

export function startAirtableSync() {
  if (!AIRTABLE_PAT) {
    console.log("[airtable-sync] AIRTABLE_PAT not set, sync disabled");
    return;
  }
  if (pollTimer) return;
  console.log(`[airtable-sync] Starting poll every ${POLL_INTERVAL_MS}ms for base ${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);

  const runSync = async () => {
    try {
      const result = await syncAirtableToTodos();
      if (result.inserted + result.updated + result.deleted > 0) {
        console.log(`[airtable-sync] +${result.inserted} / ~${result.updated} / -${result.deleted} (${result.total} total)`);
      }
    } catch (err: any) {
      status.lastError = err?.message || String(err);
      console.error("[airtable-sync] Error:", status.lastError);
    }
  };

  // First sync after 5s, then on interval
  setTimeout(runSync, 5000);
  pollTimer = setInterval(runSync, POLL_INTERVAL_MS);
}

export function stopAirtableSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

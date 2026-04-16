import { db } from "@workspace/db";
import { todos, jobs, quotes, contacts } from "@workspace/db";
import { eq, isNotNull, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appuKqojpI3bmO79D";
const POLL_INTERVAL_MS = parseInt(process.env.AIRTABLE_POLL_MS || "30000", 10);

const TABLES = {
  jobs: "tblfX6SQYVJJmkdeK",
  quotes: "tbl6k5nXbDVGE4Pnd",
  contacts: "tblzyaBUUZTF8fn6J",
};

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

interface TableSyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  total: number;
  error: string | null;
}

interface SyncStatus {
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncDurationMs: number | null;
  lastError: string | null;
  nextSyncAt: string | null;
  pollIntervalMs: number;
  baseId: string;
  tables: Record<string, TableSyncResult & { tableId: string }>;
}

const status: SyncStatus = {
  enabled: !!AIRTABLE_PAT,
  lastSyncAt: null,
  lastSyncDurationMs: null,
  lastError: null,
  nextSyncAt: null,
  pollIntervalMs: POLL_INTERVAL_MS,
  baseId: AIRTABLE_BASE_ID,
  tables: {
    jobs: { tableId: TABLES.jobs, inserted: 0, updated: 0, deleted: 0, total: 0, error: null },
    quotes: { tableId: TABLES.quotes, inserted: 0, updated: 0, deleted: 0, total: 0, error: null },
    contacts: { tableId: TABLES.contacts, inserted: 0, updated: 0, deleted: 0, total: 0, error: null },
  },
};

export function getSyncStatus(): SyncStatus {
  return JSON.parse(JSON.stringify(status));
}

function mapPriority(p: any): "Critical" | "High" | "Medium" | "Low" {
  if (!p) return "Medium";
  const s = String(p).toLowerCase();
  if (s.includes("critical") || s.includes("urgent")) return "Critical";
  if (s.includes("high")) return "High";
  if (s.includes("low")) return "Low";
  return "Medium";
}

function mapJobStatus(s: any): "Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done" {
  if (!s) return "Open";
  const v = String(s).toLowerCase();
  if (v.includes("done") || v.includes("complete")) return "Done";
  if (v.includes("progress")) return "In Progress";
  if (v.includes("book")) return "Booked";
  if (v.includes("block")) return "Blocked";
  if (v.includes("wait") || v.includes("hold")) return "Waiting";
  return "Open";
}

function mapQuoteStatus(s: any): "Draft" | "Sent" | "Accepted" | "Declined" | "Expired" | "Revised" {
  if (!s) return "Draft";
  const v = String(s).toLowerCase();
  if (v.includes("accept")) return "Accepted";
  if (v.includes("declin") || v.includes("reject")) return "Declined";
  if (v.includes("expir")) return "Expired";
  if (v.includes("revis")) return "Revised";
  if (v.includes("sent")) return "Sent";
  return "Draft";
}

async function fetchAllAirtableRecords(tableId: string): Promise<AirtableRecord[]> {
  if (!AIRTABLE_PAT) throw new Error("AIRTABLE_PAT not set");
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`);
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

async function syncTodos(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  for (const rec of records) {
    const f = rec.fields;
    const name: string = (f["Name"] || f["Task"] || "").toString().trim();
    if (!name) continue;
    const completed = String(f["Status"] || "").toLowerCase().includes("done");
    const priority = mapPriority(f["Priority"]);
    const notes: string | null = f["Notes"] ? String(f["Notes"]).trim() : null;
    const assignee: string | null = f["Assignee"]?.name || (typeof f["Assignee"] === "string" ? f["Assignee"] : null);
    const dueDate: string | null = f["Scheduled Date"] || f["Due"] || null;

    const [existing] = await db.select().from(todos).where(eq(todos.airtableRecordId, rec.id));
    if (existing) {
      await db.update(todos).set({
        text: name, completed, priority, notes,
        assignee, dueDate: typeof dueDate === "string" ? dueDate : null,
        updatedAt: now,
      }).where(eq(todos.id, existing.id));
      updated++;
    } else {
      await db.insert(todos).values({
        id: randomUUID(), text: name, completed, priority, category: "Work",
        notes, assignee, dueDate: typeof dueDate === "string" ? dueDate : null,
        dependencies: [], airtableRecordId: rec.id, createdAt: now, updatedAt: now,
      });
      inserted++;
    }
  }

  const existingSynced = await db.select().from(todos).where(isNotNull(todos.airtableRecordId));
  const toDelete = existingSynced.filter((t) => t.airtableRecordId && !airtableIds.has(t.airtableRecordId)).map((t) => t.id);
  let deleted = 0;
  if (toDelete.length > 0) {
    await db.delete(todos).where(inArray(todos.id, toDelete));
    deleted = toDelete.length;
  }
  return { inserted, updated, deleted, total: records.length, error: null };
}

async function syncJobs(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  for (const rec of records) {
    const f = rec.fields;
    const site: string = (f["Site Address"] || f["Site"] || f["Name"] || "").toString().trim();
    const client: string = (f["Client"] || "Unknown").toString().trim();
    const action: string = (f["Scope"] || f["Notes"] || f["Name"] || "").toString().trim();
    if (!site || !action) continue;

    const values = {
      taskNumber: f["Task Number"] || null,
      site,
      address: f["Site Address"] || null,
      client,
      contactName: f["Contact Name"] || null,
      contactNumber: f["Contact Phone"] || null,
      contactEmail: f["Contact Email"] || null,
      actionRequired: action,
      priority: mapPriority(f["Priority"]),
      status: mapJobStatus(f["Status"]),
      assignedTech: f["Tech Assigned"] || f["Assignee"]?.name || null,
      dueDate: f["Scheduled Date"] || null,
      notes: f["Notes"] || null,
      updatedAt: now,
    };

    let [existing] = await db.select().from(jobs).where(eq(jobs.airtableRecordId, rec.id));
    if (!existing && values.taskNumber) {
      // Link to pre-existing record imported from CSV (same task_number)
      const [byTaskNum] = await db.select().from(jobs).where(eq(jobs.taskNumber, values.taskNumber));
      if (byTaskNum) existing = byTaskNum;
    }
    if (existing) {
      await db.update(jobs).set({ ...values, airtableRecordId: rec.id }).where(eq(jobs.id, existing.id));
      updated++;
    } else {
      await db.insert(jobs).values({
        id: randomUUID(),
        ...values,
        uptickNotes: [],
        airtableRecordId: rec.id,
        createdAt: now,
      });
      inserted++;
    }
  }

  const existingSynced = await db.select().from(jobs).where(isNotNull(jobs.airtableRecordId));
  const toDelete = existingSynced.filter((j) => j.airtableRecordId && !airtableIds.has(j.airtableRecordId)).map((j) => j.id);
  let deleted = 0;
  if (toDelete.length > 0) {
    await db.delete(jobs).where(inArray(jobs.id, toDelete));
    deleted = toDelete.length;
  }
  return { inserted, updated, deleted, total: records.length, error: null };
}

async function syncQuotes(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  for (const rec of records) {
    const f = rec.fields;
    const site: string = (f["Site"] || "").toString().trim();
    const client: string = (f["Client"] || "Unknown").toString().trim();
    if (!site) continue;

    const values = {
      quoteNumber: f["Quote Reference"] || null,
      site,
      client,
      description: f["Scope"] || null,
      status: mapQuoteStatus(f["Status"]),
      validUntil: f["Deadline"] || null,
      contactName: f["Contact"] || null,
      contactEmail: f["Contact Email"] || null,
      notes: f["Notes"] || null,
      updatedAt: now,
    };

    const [existing] = await db.select().from(quotes).where(eq(quotes.airtableRecordId, rec.id));
    if (existing) {
      await db.update(quotes).set(values).where(eq(quotes.id, existing.id));
      updated++;
    } else {
      await db.insert(quotes).values({
        id: randomUUID(),
        ...values,
        airtableRecordId: rec.id,
        createdAt: now,
      });
      inserted++;
    }
  }

  const existingSynced = await db.select().from(quotes).where(isNotNull(quotes.airtableRecordId));
  const toDelete = existingSynced.filter((q) => q.airtableRecordId && !airtableIds.has(q.airtableRecordId)).map((q) => q.id);
  let deleted = 0;
  if (toDelete.length > 0) {
    await db.delete(quotes).where(inArray(quotes.id, toDelete));
    deleted = toDelete.length;
  }
  return { inserted, updated, deleted, total: records.length, error: null };
}

async function syncContacts(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  for (const rec of records) {
    const f = rec.fields;
    const name: string = (f["Name"] || "").toString().trim();
    if (!name) continue;

    const values = {
      name,
      company: f["Company"] || null,
      role: f["Role"] || null,
      email: f["Email"] || null,
      mobile: f["Mobile"] || null,
      type: f["Type"] || null,
      notes: f["Notes"] || null,
      updatedAt: now,
    };

    const [existing] = await db.select().from(contacts).where(eq(contacts.airtableRecordId, rec.id));
    if (existing) {
      await db.update(contacts).set(values).where(eq(contacts.id, existing.id));
      updated++;
    } else {
      await db.insert(contacts).values({
        id: randomUUID(),
        ...values,
        airtableRecordId: rec.id,
        createdAt: now,
      });
      inserted++;
    }
  }

  const existingSynced = await db.select().from(contacts).where(isNotNull(contacts.airtableRecordId));
  const toDelete = existingSynced.filter((c) => c.airtableRecordId && !airtableIds.has(c.airtableRecordId)).map((c) => c.id);
  let deleted = 0;
  if (toDelete.length > 0) {
    await db.delete(contacts).where(inArray(contacts.id, toDelete));
    deleted = toDelete.length;
  }
  return { inserted, updated, deleted, total: records.length, error: null };
}

export async function syncAirtableAll(): Promise<SyncStatus["tables"]> {
  const startedAt = Date.now();
  const results = status.tables;

  for (const [key, tableId] of Object.entries(TABLES)) {
    try {
      const records = await fetchAllAirtableRecords(tableId);
      let r: TableSyncResult;
      if (key === "jobs") {
        // Jobs table acts as both `jobs` (rich) and `todos` (lightweight tasks)
        await syncTodos(records);
        r = await syncJobs(records);
      } else if (key === "quotes") {
        r = await syncQuotes(records);
      } else {
        r = await syncContacts(records);
      }
      results[key] = { tableId, ...r };
    } catch (err: any) {
      console.error(`[airtable-sync] ${key} ERROR:`, err);
      console.error(`[airtable-sync] ${key} cause:`, err?.cause);
      results[key] = { ...results[key], tableId, error: `${err?.code || ""} ${err?.detail || err?.message || String(err)}`.trim() };
    }
  }

  status.lastSyncAt = new Date().toISOString();
  status.lastSyncDurationMs = Date.now() - startedAt;
  status.nextSyncAt = new Date(Date.now() + POLL_INTERVAL_MS).toISOString();
  const errs = Object.values(results).filter((r) => r.error).map((r) => r.error);
  status.lastError = errs.length ? errs.join("; ") : null;
  return results;
}

let pollTimer: NodeJS.Timeout | null = null;

export function startAirtableSync() {
  if (!AIRTABLE_PAT) {
    console.log("[airtable-sync] AIRTABLE_PAT not set, sync disabled");
    return;
  }
  if (pollTimer) return;
  console.log(`[airtable-sync] Starting poll every ${POLL_INTERVAL_MS}ms for base ${AIRTABLE_BASE_ID} (jobs+quotes+contacts)`);

  const runSync = async () => {
    try {
      const r = await syncAirtableAll();
      const summary = Object.entries(r).map(([k, v]) => `${k}:+${v.inserted}/~${v.updated}/-${v.deleted}`).join(" ");
      const total = Object.values(r).reduce((s, v) => s + v.inserted + v.updated + v.deleted, 0);
      if (total > 0) console.log(`[airtable-sync] ${summary}`);
    } catch (err: any) {
      status.lastError = err?.message || String(err);
      console.error("[airtable-sync] Error:", status.lastError);
    }
  };

  setTimeout(runSync, 5000);
  pollTimer = setInterval(runSync, POLL_INTERVAL_MS);
}

export function stopAirtableSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

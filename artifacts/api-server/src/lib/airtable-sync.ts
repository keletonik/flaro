import { db } from "@workspace/db";
import { todos, jobs, quotes, contacts, meetings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { broadcastEvent } from "./events";

// Accept either env name. AIRTABLE_PAT is the canonical; AIRTABLE_API_KEY is
// the alias used by the sibling Python email-ingest service on the same
// Replit deployment, so only one secret needs to be set.
const AIRTABLE_PAT = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appuKqojpI3bmO79D";
const POLL_INTERVAL_MS = parseInt(process.env.AIRTABLE_POLL_MS || "30000", 10);

const TABLES = {
  jobs: "tblfX6SQYVJJmkdeK",
  quotes: "tbl6k5nXbDVGE4Pnd",
  contacts: "tblzyaBUUZTF8fn6J",
  meetings: "tblyqxK2iKXtWxYY1",
};

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

interface TableSyncResult {
  inserted: number;
  updated: number;
  orphaned: number;
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
    jobs: { tableId: TABLES.jobs, inserted: 0, updated: 0, orphaned: 0, total: 0, error: null },
    quotes: { tableId: TABLES.quotes, inserted: 0, updated: 0, orphaned: 0, total: 0, error: null },
    contacts: { tableId: TABLES.contacts, inserted: 0, updated: 0, orphaned: 0, total: 0, error: null },
    meetings: { tableId: TABLES.meetings, inserted: 0, updated: 0, orphaned: 0, total: 0, error: null },
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
  if (v.includes("accept") || v.includes("approv")) return "Accepted";
  if (v.includes("declin") || v.includes("reject")) return "Declined";
  if (v.includes("expir")) return "Expired";
  if (v.includes("revis")) return "Revised";
  if (v.includes("sent")) return "Sent";
  return "Draft";
}

// Inverse mappers used by the write-back path — DB status → Airtable choice name.
// The Airtable singleSelect options were discovered at schema-inspection time
// and must match exactly or the REST PATCH will 422.
function jobStatusToAirtable(s: string): string {
  switch (s) {
    case "Done":        return "Completed";
    case "In Progress": return "In Progress";
    case "Booked":      return "Booked";
    case "Blocked":     return "Todo";       // no direct match; keep visible on the board
    case "Waiting":     return "Todo";
    case "Open":        return "Open";
    default:            return "Todo";
  }
}
function quoteStatusToAirtable(s: string): string {
  switch (s) {
    case "Accepted": return "Approved";
    case "Declined": return "Not Started";   // Airtable base has no "Declined"; park it
    case "Sent":     return "Sent";
    case "Expired":  return "Not Started";
    case "Revised":  return "In Progress";
    default:         return "Not Started";
  }
}
function priorityToAirtable(p: string | null | undefined): string {
  const v = (p || "").toLowerCase();
  if (v === "critical") return "Critical";
  if (v === "high")     return "High";
  if (v === "low")      return "Low";
  return "Medium";
}

async function airtableFetch(path: string, init?: RequestInit): Promise<any> {
  if (!AIRTABLE_PAT) throw new Error("AIRTABLE_PAT not set");
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!resp.ok) {
    const body = await resp.text();
    // Surface the Airtable error verbatim. Never swallow.
    throw new Error(`Airtable ${resp.status} on ${init?.method || "GET"} ${path}: ${body}`);
  }
  return resp.json();
}

async function fetchAllAirtableRecords(tableId: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (offset) qs.set("offset", offset);
    const data = await airtableFetch(`${tableId}?${qs}`);
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

/**
 * Shallow field-equality check used by every sync to skip no-op updates.
 * The previous loop UPDATE'd every matched row on every poll, generating
 * ~350 sequential queries and 100+ seconds of DB time per cycle. With
 * this helper the sync only writes rows whose mapped values actually
 * changed since last poll — typically zero in steady state.
 */
function shallowEqual(a: Record<string, any>, b: Record<string, any>, keys: string[]): boolean {
  for (const k of keys) {
    const av = a[k] === undefined || a[k] === "" ? null : a[k];
    const bv = b[k] === undefined || b[k] === "" ? null : b[k];
    if (av instanceof Date) {
      if (!(bv instanceof Date) || av.getTime() !== bv.getTime()) return false;
      continue;
    }
    if (typeof av === "object" && av !== null) {
      if (JSON.stringify(av) !== JSON.stringify(bv)) return false;
      continue;
    }
    if (av !== bv) return false;
  }
  return true;
}

const TODO_DIFF_KEYS = ["text", "completed", "priority", "notes", "assignee", "dueDate"];

async function syncTodos(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  // Batch-load once instead of per-record SELECT — the previous pattern
  // issued 2 queries per Airtable record, which dominated the sync duration.
  const all = await db.select().from(todos);
  const byAirtable = new Map<string, typeof all[number]>();
  for (const t of all) if (t.airtableRecordId) byAirtable.set(t.airtableRecordId, t);

  for (const rec of records) {
    const f = rec.fields;
    const name: string = (f["Name"] || f["Task"] || "").toString().trim();
    if (!name) continue;
    const completed = String(f["Status"] || "").toLowerCase().includes("done")
      || String(f["Status"] || "").toLowerCase().includes("complete");
    const priority = mapPriority(f["Priority"]);
    const notes: string | null = f["Notes"] ? String(f["Notes"]).trim() : null;
    const assignee: string | null = f["Tech Assigned"] || f["Assignee"]?.name
      || (typeof f["Assignee"] === "string" ? f["Assignee"] : null);
    const dueDate: string | null = typeof (f["Scheduled Date"] || f["Due"]) === "string"
      ? (f["Scheduled Date"] || f["Due"]) : null;

    const values = { text: name, completed, priority, notes, assignee, dueDate };
    const existing = byAirtable.get(rec.id);
    if (existing) {
      if (shallowEqual(existing as any, values, TODO_DIFF_KEYS)) continue; // no-op
      await db.update(todos).set({ ...values, updatedAt: now }).where(eq(todos.id, existing.id));
      updated++;
    } else {
      await db.insert(todos).values({
        id: randomUUID(), ...values, category: "Work",
        dependencies: [], airtableRecordId: rec.id, createdAt: now, updatedAt: now,
      });
      inserted++;
    }
  }

  // Non-destructive: count orphans but never delete. Replit data-safety rule.
  const orphans = all.filter((t: typeof all[number]) => t.airtableRecordId && !airtableIds.has(t.airtableRecordId));
  if (orphans.length > 0) {
    console.warn(`[airtable-sync] ${orphans.length} todos no longer in Airtable (kept in DB): ${orphans.slice(0, 5).map((o: typeof all[number]) => o.airtableRecordId).join(", ")}`);
  }
  return { inserted, updated, orphaned: orphans.length, total: records.length, error: null };
}

const JOB_DIFF_KEYS = [
  "taskNumber", "site", "address", "client", "contactName", "contactNumber", "contactEmail",
  "actionRequired", "priority", "status", "assignedTech", "dueDate", "notes",
];

async function syncJobs(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  // Batch-load all existing jobs once. Index by airtable_record_id and by
  // task_number (for the first-time-linking case where an Airtable row
  // matches a historical Uptick-imported row with the same task number).
  const all = await db.select().from(jobs);
  const byAirtable = new Map<string, typeof all[number]>();
  const byTaskNumber = new Map<string, typeof all[number]>();
  for (const j of all) {
    if (j.airtableRecordId) byAirtable.set(j.airtableRecordId, j);
    if (j.taskNumber) byTaskNumber.set(j.taskNumber, j);
  }

  for (const rec of records) {
    const f = rec.fields;
    const site: string = (f["Site Address"] || f["Site"] || f["Name"] || "").toString().trim();
    const client: string = (f["Client"] || "Unknown").toString().trim();
    const action: string = (f["Scope"] || f["Notes"] || f["Name"] || "").toString().trim();
    if (!site || !action) continue;

    const values: Record<string, any> = {
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
    };

    const existing = byAirtable.get(rec.id)
      || (values.taskNumber ? byTaskNumber.get(values.taskNumber) : undefined);

    if (existing) {
      // Change detection: skip the UPDATE if every mapped field already matches.
      // The existing airtableRecordId may be null on a freshly-linked historical
      // row — treat that as a change so the first sync attaches the id.
      const sameIdLinked = existing.airtableRecordId === rec.id;
      if (sameIdLinked && shallowEqual(existing as any, values, JOB_DIFF_KEYS)) continue;
      await db.update(jobs)
        .set({ ...values, airtableRecordId: rec.id, updatedAt: now })
        .where(eq(jobs.id, existing.id));
      updated++;
    } else {
      await db.insert(jobs).values({
        id: randomUUID(),
        ...values,
        uptickNotes: [],
        airtableRecordId: rec.id,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
  }

  const orphans = all.filter((j: typeof all[number]) => j.airtableRecordId && !airtableIds.has(j.airtableRecordId));
  if (orphans.length > 0) {
    console.warn(`[airtable-sync] ${orphans.length} jobs no longer in Airtable (kept in DB): ${orphans.slice(0, 5).map((o: typeof all[number]) => o.airtableRecordId).join(", ")}`);
  }
  return { inserted, updated, orphaned: orphans.length, total: records.length, error: null };
}

const QUOTE_DIFF_KEYS = [
  "quoteNumber", "site", "client", "description", "status", "validUntil",
  "contactName", "contactEmail", "notes",
];

async function syncQuotes(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  const all = await db.select().from(quotes);
  const byAirtable = new Map<string, typeof all[number]>();
  for (const q of all) if (q.airtableRecordId) byAirtable.set(q.airtableRecordId, q);

  for (const rec of records) {
    const f = rec.fields;
    const site: string = (f["Site"] || "").toString().trim();
    const client: string = (f["Client"] || "Unknown").toString().trim();
    if (!site) continue;

    const values: Record<string, any> = {
      quoteNumber: f["Quote Reference"] || null,
      site,
      client,
      description: f["Scope"] || null,
      status: mapQuoteStatus(f["Status"]),
      validUntil: f["Deadline"] || null,
      contactName: f["Contact"] || null,
      contactEmail: f["Contact Email"] || null,
      notes: f["Notes"] || null,
    };

    const existing = byAirtable.get(rec.id);
    if (existing) {
      if (shallowEqual(existing as any, values, QUOTE_DIFF_KEYS)) continue;
      await db.update(quotes).set({ ...values, updatedAt: now }).where(eq(quotes.id, existing.id));
      updated++;
    } else {
      await db.insert(quotes).values({
        id: randomUUID(),
        ...values,
        airtableRecordId: rec.id,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
  }

  const orphans = all.filter((q: typeof all[number]) => q.airtableRecordId && !airtableIds.has(q.airtableRecordId));
  if (orphans.length > 0) {
    console.warn(`[airtable-sync] ${orphans.length} quotes no longer in Airtable (kept in DB): ${orphans.slice(0, 5).map((o: typeof all[number]) => o.airtableRecordId).join(", ")}`);
  }
  return { inserted, updated, orphaned: orphans.length, total: records.length, error: null };
}

const CONTACT_DIFF_KEYS = ["name", "company", "role", "email", "mobile", "type", "notes"];

async function syncContacts(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  const all = await db.select().from(contacts);
  const byAirtable = new Map<string, typeof all[number]>();
  for (const c of all) if (c.airtableRecordId) byAirtable.set(c.airtableRecordId, c);

  for (const rec of records) {
    const f = rec.fields;
    const name: string = (f["Name"] || "").toString().trim();
    if (!name) continue;

    const values: Record<string, any> = {
      name,
      company: f["Company"] || null,
      role: f["Role"] || null,
      email: f["Email"] || null,
      mobile: f["Mobile"] || null,
      type: f["Type"] || null,
      notes: f["Notes"] || null,
    };

    const existing = byAirtable.get(rec.id);
    if (existing) {
      if (shallowEqual(existing as any, values, CONTACT_DIFF_KEYS)) continue;
      await db.update(contacts).set({ ...values, updatedAt: now }).where(eq(contacts.id, existing.id));
      updated++;
    } else {
      await db.insert(contacts).values({
        id: randomUUID(),
        ...values,
        airtableRecordId: rec.id,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
  }

  const orphans = all.filter((c: typeof all[number]) => c.airtableRecordId && !airtableIds.has(c.airtableRecordId));
  if (orphans.length > 0) {
    console.warn(`[airtable-sync] ${orphans.length} contacts no longer in Airtable (kept in DB): ${orphans.slice(0, 5).map((o: typeof all[number]) => o.airtableRecordId).join(", ")}`);
  }
  return { inserted, updated, orphaned: orphans.length, total: records.length, error: null };
}

const MEETING_DIFF_KEYS = ["title", "startAt", "endAt", "location", "attendees", "notes"];

async function syncMeetings(records: AirtableRecord[]): Promise<TableSyncResult> {
  const airtableIds = new Set(records.map((r) => r.id));
  let inserted = 0;
  let updated = 0;
  const now = new Date();

  const all = await db.select().from(meetings);
  const byAirtable = new Map<string, typeof all[number]>();
  for (const m of all) if (m.airtableRecordId) byAirtable.set(m.airtableRecordId, m);

  for (const rec of records) {
    const f = rec.fields;
    const title: string = (f["Meeting Title"] || f["Name"] || f["Title"] || f["Meeting"] || f["Subject"] || "").toString().trim();
    if (!title) continue;
    const startAt = (f["Date"] || f["Start"] || f["Start Date"] || f["When"] || null) as any;
    const endAt = (f["End"] || f["End Date"] || null) as any;
    const location = (f["Site"] || f["Location"] || f["Where"] || null) as any;
    const attendees = Array.isArray(f["Attendees"]) ? f["Attendees"].join(", ") : (f["Attendees"] || f["Contact"] || null);
    const notes = (f["Purpose"] || f["Notes"] || f["Agenda"] || null) as any;

    const values: Record<string, any> = {
      title,
      startAt: startAt ? String(startAt) : null,
      endAt: endAt ? String(endAt) : null,
      location: location ? String(location) : null,
      attendees: attendees ? String(attendees) : null,
      notes: notes ? String(notes) : null,
    };

    const existing = byAirtable.get(rec.id);
    if (existing) {
      if (shallowEqual(existing as any, values, MEETING_DIFF_KEYS)) continue;
      await db.update(meetings).set({ ...values, rawData: f, updatedAt: now }).where(eq(meetings.id, existing.id));
      updated++;
    } else {
      await db.insert(meetings).values({
        id: randomUUID(),
        ...values,
        rawData: f,
        airtableRecordId: rec.id,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
  }

  const orphans = all.filter((m: typeof all[number]) => m.airtableRecordId && !airtableIds.has(m.airtableRecordId));
  if (orphans.length > 0) {
    console.warn(`[airtable-sync] ${orphans.length} meetings no longer in Airtable (kept in DB): ${orphans.slice(0, 5).map((o: typeof all[number]) => o.airtableRecordId).join(", ")}`);
  }
  return { inserted, updated, orphaned: orphans.length, total: records.length, error: null };
}

// Mutex guard. If a poll is still running when the next interval fires
// the new one exits immediately instead of piling on the DB. Belt-and-
// braces for future regressions: the sync should normally finish in
// <30s with the batched-read refactor, but load spikes can happen.
let syncInFlight = false;

export async function syncAirtableAll(): Promise<SyncStatus["tables"]> {
  if (syncInFlight) {
    console.warn("[airtable-sync] skipped: previous poll still running");
    return status.tables;
  }
  syncInFlight = true;
  try {
    return await _doSyncAirtableAll();
  } finally {
    syncInFlight = false;
  }
}

async function _doSyncAirtableAll(): Promise<SyncStatus["tables"]> {
  const startedAt = Date.now();
  const results = status.tables;
  let mutations = 0;

  // Run all four tables concurrently. The previous sequential loop took
  // ~106s for 118 rows because every row round-tripped the DB twice.
  // With in-memory matching + change-detection + concurrency the whole
  // sync drops to well under the 30s poll interval.
  await Promise.all(Object.entries(TABLES).map(async ([key, tableId]) => {
    try {
      const records = await fetchAllAirtableRecords(tableId);
      let r: TableSyncResult;
      if (key === "jobs") {
        // Jobs table acts as both `jobs` (rich) and `todos` (lightweight tasks)
        await syncTodos(records);
        r = await syncJobs(records);
      } else if (key === "quotes") {
        r = await syncQuotes(records);
      } else if (key === "meetings") {
        r = await syncMeetings(records);
      } else {
        r = await syncContacts(records);
      }
      results[key] = { tableId, ...r };
      mutations += r.inserted + r.updated;
    } catch (err: any) {
      console.error(`[airtable-sync] ${key} ERROR:`, err);
      results[key] = { ...results[key], tableId, error: `${err?.code || ""} ${err?.detail || err?.message || String(err)}`.trim() };
    }
  }));

  status.lastSyncAt = new Date().toISOString();
  status.lastSyncDurationMs = Date.now() - startedAt;
  status.nextSyncAt = new Date(Date.now() + POLL_INTERVAL_MS).toISOString();
  const errs = Object.values(results).filter((r) => r.error).map((r) => r.error);
  status.lastError = errs.length ? errs.join("; ") : null;

  // Fan-out via SSE so every connected tab refetches. Only fires when rows
  // actually changed — avoids hammering clients on idle polls.
  if (mutations > 0) {
    broadcastEvent("data_change", { source: "airtable-sync", mutations });
  }
  return results;
}

// ═══ WRITE-BACK ══════════════════════════════════════════════════════════════
// Site mutations push to Airtable so Airtable stays the source of truth.
// Fire-and-forget from the route handlers; errors log but don't break the API.

// Known Airtable Tech Assigned choices. Anything else falls back to TBC so
// the write-back never 422s on an unknown singleSelect value.
const AIRTABLE_TECHS = new Set([
  "Gordon Jenkins",
  "Darren Brailey",
  "Haider Al-Heyoury",
  "John Minai",
  "Nu Unasa",
  "TBC",
]);
function techToAirtable(tech: string | null | undefined): string {
  if (!tech) return "TBC";
  return AIRTABLE_TECHS.has(tech) ? tech : "TBC";
}

// Normalise any date-ish input into YYYY-MM-DD. Airtable's date field rejects
// malformed values unless typecast=true does something sensible.
function toAirtableDate(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    // Already ISO? Return the date part.
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
    if (m) return m[1];
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

/** Map a DB job row → Airtable field payload. */
function jobToAirtableFields(job: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (job.taskNumber) out["Task Number"] = job.taskNumber;
  if (job.site) out["Site Address"] = job.site;
  if (job.client) out["Client"] = job.client;
  if (job.contactName) out["Contact Name"] = job.contactName;
  if (job.contactEmail) out["Contact Email"] = job.contactEmail;
  if (job.contactNumber) out["Contact Phone"] = job.contactNumber;
  if (job.actionRequired) out["Scope"] = job.actionRequired;
  if (job.priority) out["Priority"] = priorityToAirtable(job.priority);
  if (job.status) out["Status"] = jobStatusToAirtable(job.status);
  // Tech Assigned is a singleSelect — only send a known value or TBC.
  out["Tech Assigned"] = techToAirtable(job.assignedTech);
  const scheduled = toAirtableDate(job.dueDate);
  if (scheduled) out["Scheduled Date"] = scheduled;
  if (job.notes) out["Notes"] = job.notes;
  // Name is the primary field — always send something, truncated to 100 chars.
  // Prefer site; fall back to task number, then action, then a sentinel.
  const nameSource = job.site || job.taskNumber || job.actionRequired || `Job ${job.id}`;
  out["Name"] = String(nameSource).slice(0, 100);
  return out;
}

function quoteToAirtableFields(q: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (q.site) out["Site"] = q.site;
  if (q.client) out["Client"] = q.client;
  if (q.contactName) out["Contact"] = q.contactName;
  if (q.contactEmail) out["Contact Email"] = q.contactEmail;
  if (q.description) out["Scope"] = q.description;
  if (q.validUntil) out["Deadline"] = String(q.validUntil);
  if (q.status) out["Status"] = quoteStatusToAirtable(q.status);
  if (q.notes) out["Notes"] = q.notes;
  // Quote Reference is the primary field — always populate it.
  const refSource = q.quoteNumber || q.site || `Quote ${q.id}`;
  out["Quote Reference"] = String(refSource).slice(0, 100);
  return out;
}

/** Push the given job to Airtable. Creates the record if airtable_record_id is null. */
export async function pushJobToAirtable(jobId: string): Promise<void> {
  if (!AIRTABLE_PAT) return;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return;
  const fields = jobToAirtableFields(job);

  try {
    if (job.airtableRecordId) {
      await airtableFetch(`${TABLES.jobs}/${job.airtableRecordId}`, {
        method: "PATCH",
        body: JSON.stringify({ fields, typecast: true }),
      });
    } else {
      const created = await airtableFetch(`${TABLES.jobs}`, {
        method: "POST",
        body: JSON.stringify({ fields, typecast: true }),
      });
      if (created?.id) {
        await db.update(jobs).set({ airtableRecordId: created.id }).where(eq(jobs.id, jobId));
      }
    }
  } catch (err: any) {
    console.error(`[airtable-sync] pushJobToAirtable(${jobId}) failed:`, err?.message || err);
  }
}

export async function pushQuoteToAirtable(quoteId: string): Promise<void> {
  if (!AIRTABLE_PAT) return;
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!q) return;
  const fields = quoteToAirtableFields(q);

  try {
    if (q.airtableRecordId) {
      await airtableFetch(`${TABLES.quotes}/${q.airtableRecordId}`, {
        method: "PATCH",
        body: JSON.stringify({ fields, typecast: true }),
      });
    } else {
      const created = await airtableFetch(`${TABLES.quotes}`, {
        method: "POST",
        body: JSON.stringify({ fields, typecast: true }),
      });
      if (created?.id) {
        await db.update(quotes).set({ airtableRecordId: created.id }).where(eq(quotes.id, quoteId));
      }
    }
  } catch (err: any) {
    console.error(`[airtable-sync] pushQuoteToAirtable(${quoteId}) failed:`, err?.message || err);
  }
}

let pollTimer: NodeJS.Timeout | null = null;

/**
 * Liveness probe. Hits /meta/bases which is the cheapest authenticated
 * endpoint Airtable exposes — 200 means the PAT is valid and can see at
 * least one base. The /status route calls this to tell apart "code never
 * ran" from "credentials are wrong".
 */
export async function probeAirtable(): Promise<{ ok: boolean; status: number; detail?: string }> {
  if (!AIRTABLE_PAT) return { ok: false, status: 0, detail: "AIRTABLE_PAT not set" };
  try {
    const resp = await fetch("https://api.airtable.com/v0/meta/bases", {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });
    const detail = resp.ok ? undefined : await resp.text().catch(() => undefined);
    return { ok: resp.ok, status: resp.status, detail };
  } catch (err: any) {
    return { ok: false, status: 0, detail: err?.message || String(err) };
  }
}

export function startAirtableSync() {
  if (!AIRTABLE_PAT) {
    console.log("[airtable-sync] AIRTABLE_PAT (or AIRTABLE_API_KEY) is not set; sync is DISABLED. Add it in Replit Deployments → Secrets to enable.");
    return;
  }
  if (pollTimer) return;
  console.log(`[airtable-sync] STARTED · base=${AIRTABLE_BASE_ID} · interval=${POLL_INTERVAL_MS}ms · tables=${Object.keys(TABLES).join(",")}`);

  const runSync = async () => {
    const startedAt = Date.now();
    try {
      const r = await syncAirtableAll();
      const summary = Object.entries(r).map(([k, v]) => `${k}:+${v.inserted}/~${v.updated}/?${v.orphaned}`).join(" ");
      const total = Object.values(r).reduce((s, v) => s + v.inserted + v.updated, 0);
      const errs = Object.values(r).filter(v => v.error).length;
      const durMs = Date.now() - startedAt;
      // Always log every poll so "is it running?" is one glance in the
      // Replit Logs, not a silence that could mean either running-idle
      // or crashed.
      if (total > 0 || errs > 0) {
        console.log(`[airtable-sync] poll · ${summary} · ${durMs}ms${errs > 0 ? ` · ${errs} table error(s)` : ""}`);
      } else {
        console.log(`[airtable-sync] poll · no changes · ${durMs}ms`);
      }
    } catch (err: any) {
      status.lastError = err?.message || String(err);
      console.error("[airtable-sync] POLL FAILED:", status.lastError);
    }
  };

  // Run the first sync immediately on startup (no 5s delay) so /status
  // has real data available for the first user that hits it after boot.
  void runSync();
  pollTimer = setInterval(runSync, POLL_INTERVAL_MS);
}

export function stopAirtableSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

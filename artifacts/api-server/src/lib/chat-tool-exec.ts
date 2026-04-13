/**
 * Execution layer for the agent tool schemas declared in chat-tools.ts.
 *
 * Each tool returns a short JSON-serialisable value that is fed back to
 * Claude as the tool_result content. Errors are thrown so the caller can
 * wrap them in is_error tool results.
 *
 * Every write passes through Drizzle so the existing event broadcaster
 * middleware (see app.ts) fires the same `data_change` SSE event it
 * would for a normal REST write — every open browser tab refreshes
 * automatically.
 */

import { randomUUID } from "crypto";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  jobs,
  wipRecords,
  quotes,
  defects,
  invoices,
  suppliers,
  supplierProducts,
  todos,
  notes,
  toolbox,
  scheduleEvents,
  projects,
  projectTasks,
  fipManufacturers,
  fipProductFamilies,
  fipModels,
  fipDocuments,
  fipStandards,
  fipFaultSignatures,
  fipTroubleshootingSessions,
} from "@workspace/db";
import { TABLE_ALLOWLIST, type AgentTable } from "./chat-tools";
import { broadcastEvent } from "./events";

// ─────────────────────────────────────────────────────────────────────────────
// Table registry — one entry per allowlisted table
// ─────────────────────────────────────────────────────────────────────────────

type TableEntry = {
  table: any;
  textCols: string[]; // columns used for free-text search
  softDelete: boolean; // honours deleted_at
};

const REGISTRY: Record<AgentTable, TableEntry> = {
  jobs: { table: jobs, textCols: ["site", "client", "task_number", "action_required", "notes"], softDelete: true },
  wip_records: { table: wipRecords, textCols: ["site", "client", "task_number", "description", "notes"], softDelete: true },
  quotes: { table: quotes, textCols: ["site", "client", "task_number", "quote_number", "description"], softDelete: true },
  defects: { table: defects, textCols: ["site", "client", "task_number", "description", "notes", "location"], softDelete: true },
  invoices: { table: invoices, textCols: ["site", "client", "invoice_number", "task_number", "description"], softDelete: true },
  suppliers: { table: suppliers, textCols: ["name", "category", "contact_name", "suburb", "notes"], softDelete: false },
  supplier_products: { table: supplierProducts, textCols: ["product_name", "product_code", "brand", "description"], softDelete: false },
  todos: { table: todos, textCols: ["text", "category", "notes", "assignee", "urgency_tag"], softDelete: false },
  notes: { table: notes, textCols: ["text", "category", "owner"], softDelete: false },
  toolbox: { table: toolbox, textCols: ["ref", "text"], softDelete: false },
  schedule_events: { table: scheduleEvents, textCols: ["title", "location", "notes"], softDelete: false },
  projects: { table: projects, textCols: ["name", "description", "status"], softDelete: false },
  project_tasks: { table: projectTasks, textCols: ["title", "description", "assignee"], softDelete: false },
  fip_manufacturers: { table: fipManufacturers, textCols: ["name", "country", "notes"], softDelete: true },
  fip_product_families: { table: fipProductFamilies, textCols: ["name", "category", "description"], softDelete: true },
  fip_models: { table: fipModels, textCols: ["name", "model_number", "description", "years_active"], softDelete: true },
  fip_documents: { table: fipDocuments, textCols: ["title", "notes"], softDelete: true },
  fip_standards: { table: fipStandards, textCols: ["code", "title", "notes"], softDelete: true },
  fip_fault_signatures: { table: fipFaultSignatures, textCols: ["code", "display_text", "symptom"], softDelete: true },
  fip_troubleshooting_sessions: { table: fipTroubleshootingSessions, textCols: ["site_name", "entered_fault_code", "entered_display_text", "entered_symptom", "summary"], softDelete: true },
};

function entry(table: string): TableEntry {
  if (!TABLE_ALLOWLIST.includes(table as AgentTable)) {
    throw new Error(`Unsupported table "${table}". Allowed: ${TABLE_ALLOWLIST.join(", ")}`);
  }
  return REGISTRY[table as AgentTable];
}

// ─────────────────────────────────────────────────────────────────────────────
// Result shaping — keep payloads small so they don't blow the context window
// ─────────────────────────────────────────────────────────────────────────────

function summariseRow(table: string, row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { id: row.id };
  const keep: Record<string, string[]> = {
    jobs: ["task_number", "site", "client", "action_required", "priority", "status", "assigned_tech", "due_date"],
    wip_records: ["task_number", "site", "client", "description", "status", "priority", "assigned_tech", "quote_amount", "invoice_amount", "due_date"],
    quotes: ["quote_number", "task_number", "site", "client", "quote_amount", "status", "date_created"],
    defects: ["task_number", "site", "client", "description", "severity", "status", "asset_type", "location"],
    invoices: ["invoice_number", "task_number", "site", "client", "amount", "total_amount", "status", "date_due"],
    suppliers: ["name", "category", "contact_name", "phone", "email", "suburb", "rating"],
    supplier_products: ["product_name", "product_code", "brand", "unit_price", "unit", "supplier_id", "category"],
    todos: ["text", "completed", "priority", "category", "due_date", "assignee", "urgency_tag"],
    notes: ["text", "category", "owner", "status"],
    toolbox: ["ref", "text", "status"],
    schedule_events: ["title", "date", "startHour", "endHour", "location"],
    projects: ["name", "description", "status", "priority", "colour", "due_date"],
    project_tasks: ["title", "description", "status", "priority", "assignee", "due_date"],
    fip_manufacturers: ["name", "slug", "country", "website", "notes"],
    fip_product_families: ["name", "slug", "category", "description", "manufacturer_id"],
    fip_models: ["name", "slug", "model_number", "description", "status", "years_active", "family_id", "manufacturer_id"],
    fip_documents: ["title", "kind", "manufacturer_id", "family_id", "model_id", "publication_date", "tags", "notes"],
    fip_standards: ["code", "title", "jurisdiction", "year", "current_version", "notes"],
    fip_fault_signatures: ["code", "display_text", "symptom", "severity", "likely_causes", "first_checks", "next_actions"],
    fip_troubleshooting_sessions: ["site_name", "entered_fault_code", "entered_display_text", "entered_symptom", "escalation_status", "summary", "started_at", "closed_at"],
  };
  const cols = keep[table] ?? Object.keys(row);
  for (const c of cols) {
    // drizzle returns camelCase, source keep lists snake_case — check both
    const camel = c.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (row[camel] !== undefined) out[camel] = row[camel];
    else if (row[c] !== undefined) out[c] = row[c];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// db_search
// ─────────────────────────────────────────────────────────────────────────────

export async function dbSearch(input: any): Promise<any> {
  const { table: tableName, query, status, priority, client, assigned_tech, limit } = input;
  const e = entry(tableName);
  const t = e.table;

  const conds: any[] = [];
  if (e.softDelete && t.deletedAt) conds.push(isNull(t.deletedAt));

  if (status && t.status) conds.push(eq(t.status, status));
  if (priority && t.priority) conds.push(eq(t.priority, priority));
  if (client && t.client) conds.push(ilike(t.client, `%${client}%`));
  if (assigned_tech && t.assignedTech) conds.push(ilike(t.assignedTech, `%${assigned_tech}%`));

  if (query) {
    const s = `%${String(query).replace(/[%_\\]/g, "\\$&")}%`;
    const textConds = e.textCols
      .map((c) => {
        const camel = c.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        const col = (t as any)[camel];
        return col ? ilike(col, s) : null;
      })
      .filter(Boolean);
    if (textConds.length) conds.push(or(...(textConds as any[])));
  }

  const cap = Math.max(1, Math.min(100, Number(limit) || 20));
  let q = db.select().from(t).$dynamic();
  if (conds.length) q = q.where(and(...conds));
  const orderCol = (t as any).createdAt ?? (t as any).id;
  if (orderCol) q = q.orderBy(desc(orderCol));
  const rows = await q.limit(cap);

  const totalQ = db.select({ c: sql<number>`count(*)` }).from(t).$dynamic();
  if (conds.length) totalQ.where(and(...conds));
  const [{ c: total }] = await totalQ;

  return {
    table: tableName,
    total: Number(total),
    returned: rows.length,
    rows: rows.map((r) => summariseRow(tableName, r)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// db_get / db_create / db_update / db_delete
// ─────────────────────────────────────────────────────────────────────────────

export async function dbGet(input: any): Promise<any> {
  const { table: tableName, id } = input;
  const e = entry(tableName);
  const t = e.table;
  const rows = await db.select().from(t).where(eq((t as any).id, id)).limit(1);
  if (!rows.length) throw new Error(`No ${tableName} row with id=${id}`);
  return summariseRow(tableName, rows[0]);
}

export async function dbCreate(input: any): Promise<any> {
  const { table: tableName, data } = input;
  const e = entry(tableName);
  const t = e.table;

  const values: Record<string, any> = { ...data };
  if (!values.id) values.id = randomUUID();
  const now = new Date();
  if ((t as any).createdAt && !values.createdAt) values.createdAt = now;
  if ((t as any).updatedAt && !values.updatedAt) values.updatedAt = now;

  // Cast common camelCase / snake_case issues
  const mapped: Record<string, any> = {};
  for (const [k, v] of Object.entries(values)) {
    const camel = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    mapped[camel] = v;
  }

  const inserted = (await db.insert(t).values(mapped as any).returning()) as any[];
  const row = inserted[0];
  broadcastEvent("data_change", { path: `/${tableName}`, method: "POST" });
  return { ok: true, id: row?.id, row: summariseRow(tableName, row ?? {}) };
}

export async function dbUpdate(input: any): Promise<any> {
  const { table: tableName, id, data } = input;
  const e = entry(tableName);
  const t = e.table;

  const mapped: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    const camel = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    mapped[camel] = v;
  }
  if ((t as any).updatedAt) mapped.updatedAt = new Date();

  const updated = (await db.update(t).set(mapped as any).where(eq((t as any).id, id)).returning()) as any[];
  const row = updated[0];
  if (!row) throw new Error(`No ${tableName} row with id=${id}`);
  broadcastEvent("data_change", { path: `/${tableName}/${id}`, method: "PATCH" });
  return { ok: true, id: row.id, row: summariseRow(tableName, row) };
}

export async function dbDelete(input: any): Promise<any> {
  const { table: tableName, id } = input;
  const e = entry(tableName);
  const t = e.table;

  if (e.softDelete && (t as any).deletedAt && process.env["SOFT_DELETE"] === "1") {
    await db.update(t).set({ deletedAt: new Date() } as any).where(eq((t as any).id, id));
  } else {
    await db.delete(t).where(eq((t as any).id, id));
  }
  broadcastEvent("data_change", { path: `/${tableName}/${id}`, method: "DELETE" });
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────────────────
// get_kpi_summary
// ─────────────────────────────────────────────────────────────────────────────

export async function getKpiSummary(): Promise<any> {
  const [allJobs, allWip, allQuotes, allDefects, allInvoices, allTodos] = await Promise.all([
    db.select().from(jobs),
    db.select().from(wipRecords),
    db.select().from(quotes),
    db.select().from(defects),
    db.select().from(invoices),
    db.select().from(todos),
  ]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeJobs = allJobs.filter((j) => j.status !== "Done").length;
  const criticalJobs = allJobs.filter((j) => j.priority === "Critical" && j.status !== "Done").length;
  const wipRevenue = allWip.reduce((sum, w) => sum + (w.quoteAmount ? Number(w.quoteAmount) : 0), 0);
  const openQuotes = allQuotes.filter((q) => q.status === "Sent" || q.status === "Draft").length;
  const pendingValue = allQuotes
    .filter((q) => q.status === "Sent" || q.status === "Draft")
    .reduce((sum, q) => sum + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0);
  const openDefects = allDefects.filter((d) => d.status === "Open" || d.status === "Quoted").length;
  const criticalDefects = allDefects.filter((d) => d.severity === "Critical" && d.status !== "Resolved").length;
  const outstandingInvoices = allInvoices.filter((i) => i.status === "Sent" || i.status === "Overdue").length;
  const outstandingValue = allInvoices
    .filter((i) => i.status === "Sent" || i.status === "Overdue")
    .reduce((sum, i) => sum + (i.totalAmount ? Number(i.totalAmount) : i.amount ? Number(i.amount) : 0), 0);
  const overdueTodos = allTodos.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < today,
  ).length;

  return {
    jobs: { total: allJobs.length, active: activeJobs, critical: criticalJobs },
    wip: { total: allWip.length, revenueAud: wipRevenue },
    quotes: { total: allQuotes.length, open: openQuotes, pendingValueAud: pendingValue },
    defects: { total: allDefects.length, open: openDefects, critical: criticalDefects },
    invoices: { total: allInvoices.length, outstanding: outstandingInvoices, outstandingValueAud: outstandingValue },
    todos: { total: allTodos.length, overdue: overdueTodos },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export async function executeAgentTool(
  name: string,
  input: any,
): Promise<{ result: any; uiAction?: { type: string; [k: string]: any } }> {
  switch (name) {
    case "db_search":
      return { result: await dbSearch(input) };
    case "db_get":
      return { result: await dbGet(input) };
    case "db_create":
      return { result: await dbCreate(input), uiAction: { type: "refresh" } };
    case "db_update":
      return { result: await dbUpdate(input), uiAction: { type: "refresh" } };
    case "db_delete":
      return { result: await dbDelete(input), uiAction: { type: "refresh" } };
    case "get_kpi_summary":
      return { result: await getKpiSummary() };
    case "ui_navigate":
      return { result: { ok: true, path: input?.path }, uiAction: { type: "navigate", path: input?.path } };
    case "ui_refresh":
      return { result: { ok: true }, uiAction: { type: "refresh" } };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

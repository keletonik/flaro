import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseOrders, changeLogs } from "@workspace/db";
import { eq, and, or, ilike, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { deleteRow, softDeleteEnabled } from "../lib/soft-delete";

type PurchaseOrderChecklistItem = { id: string; label: string; done: boolean; doneAt: string | null };

const router = Router();

// Default checklist applied when a PO is created without an explicit checklist.
// These are the actions the user typically needs to complete after a PO lands.
const DEFAULT_CHECKLIST: PurchaseOrderChecklistItem[] = [
  { id: "matched", label: "Matched to defect / service quote", done: false, doneAt: null },
  { id: "uptick", label: "Updated in Uptick", done: false, doneAt: null },
  { id: "scheduled", label: "Scheduled crew / booked date", done: false, doneAt: null },
  { id: "client_ack", label: "Acknowledged to client", done: false, doneAt: null },
  { id: "invoiced", label: "Invoice raised", done: false, doneAt: null },
];

const serializePO = (p: typeof purchaseOrders.$inferSelect) => ({
  ...p,
  checklist: (p.checklist as PurchaseOrderChecklistItem[] | null) ?? [],
  site: p.site ?? null,
  amount: p.amount ?? null,
  defectId: p.defectId ?? null,
  quoteId: p.quoteId ?? null,
  quoteNumber: p.quoteNumber ?? null,
  taskNumber: p.taskNumber ?? null,
  emailSubject: p.emailSubject ?? null,
  emailFrom: p.emailFrom ?? null,
  emailReceivedAt: p.emailReceivedAt?.toISOString() ?? null,
  emailBody: p.emailBody ?? null,
  approvedAt: p.approvedAt?.toISOString() ?? null,
  approvedBy: p.approvedBy ?? null,
  notes: p.notes ?? null,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

router.get("/purchase-orders", async (req, res, next) => {
  try {
    const { status, client, search } = req.query as Record<string, string | undefined>;
    const conditions = [];

    if (softDeleteEnabled()) conditions.push(isNull(purchaseOrders.deletedAt));
    if (status) conditions.push(eq(purchaseOrders.status, status as any));
    if (client) conditions.push(ilike(purchaseOrders.client, `%${client.replace(/[%_\\]/g, "\\$&")}%`));
    if (search) {
      const safe = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(
        ilike(purchaseOrders.poNumber, `%${safe}%`),
        ilike(purchaseOrders.client, `%${safe}%`),
        ilike(purchaseOrders.site!, `%${safe}%`),
        ilike(purchaseOrders.taskNumber!, `%${safe}%`),
        ilike(purchaseOrders.quoteNumber!, `%${safe}%`),
        ilike(purchaseOrders.defectId!, `%${safe}%`),
        ilike(purchaseOrders.emailSubject!, `%${safe}%`),
        ilike(purchaseOrders.emailFrom!, `%${safe}%`),
        ilike(purchaseOrders.notes!, `%${safe}%`),
      ));
    }

    let query = db.select().from(purchaseOrders).$dynamic();
    if (conditions.length > 0) query = query.where(and(...conditions));
    const result = await query.orderBy(sql`${purchaseOrders.createdAt} DESC`);
    res.json(result.map(serializePO));
  } catch (err) { next(err); }
});

// POST /purchase-orders/import — bulk CSV import
const MAX_PO_IMPORT = 5000;
router.post("/purchase-orders/import", async (req, res, next) => {
  try {
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!Array.isArray(rows) || rows.length === 0) { res.status(400).json({ error: "No rows" }); return; }
    if (rows.length > MAX_PO_IMPORT) { res.status(400).json({ error: `Max ${MAX_PO_IMPORT} rows` }); return; }

    const map = (r: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) { const v = r[k] || r[columnMap?.[k] ?? ""]; if (v?.trim()) return v.trim(); }
      return undefined;
    };

    const VALID_STATUSES = ["Received", "Matched", "Approved", "Actioned", "Completed", "Cancelled"];
    const now = new Date();
    const records: any[] = [];

    for (const row of rows) {
      const poNumber = map(row, "poNumber", "po_number", "po", "PO Number", "PO") || `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const client = map(row, "client", "Client", "customer", "Customer") || "Unknown";
      const site = map(row, "site", "Site", "location", "Location") || null;
      const amountStr = map(row, "amount", "Amount", "value", "Value", "total", "Total");
      const amount = amountStr ? parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || null : null;
      let status = map(row, "status", "Status") || "Received";
      if (!VALID_STATUSES.includes(status)) status = "Received";
      const notes_val = map(row, "notes", "Notes", "description", "Description") || null;
      const quoteNumber = map(row, "quoteNumber", "quote_number", "Quote Number", "Quote") || null;
      const taskNumber = map(row, "taskNumber", "task_number", "Task Number", "Task") || null;

      const id = randomUUID();
      records.push({
        id, poNumber, client, site, amount: amount?.toString() ?? null, status, notes: notes_val,
        quoteNumber, taskNumber, checklist: DEFAULT_CHECKLIST, createdAt: now, updatedAt: now,
      });
    }

    if (records.length > 0) {
      for (let i = 0; i < records.length; i += 500) {
        await db.insert(purchaseOrders).values(records.slice(i, i + 500));
      }
    }

    try {
      const batchId = randomUUID();
      await db.insert(changeLogs).values({
        id: randomUUID(), action: "import", table: "purchase_orders", batchId,
        rowCount: records.length, summary: `Imported ${records.length} purchase orders from CSV`, createdAt: now,
      });
    } catch { /* change_logs table may not exist yet */ }
    res.json({ imported: records.length });
  } catch (err) { next(err); }
});

router.post("/purchase-orders", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (!body.poNumber || !body.client) { res.status(400).json({ error: "poNumber and client required" }); return; }

    const id = randomUUID();
    const now = new Date();
    const { checklist, emailReceivedAt, approvedAt, ...rest } = body;

    const [po] = await db.insert(purchaseOrders).values({
      id,
      ...rest,
      checklist: checklist ?? DEFAULT_CHECKLIST,
      emailReceivedAt: emailReceivedAt ? new Date(emailReceivedAt) : null,
      approvedAt: approvedAt ? new Date(approvedAt) : null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    res.status(201).json(serializePO(po));
  } catch (err) { next(err); }
});

router.get("/purchase-orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: "Invalid params" }); return; }

    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

    res.json(serializePO(po));
  } catch (err) { next(err); }
});

router.patch("/purchase-orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: "Invalid params" }); return; }

    const body = req.body ?? {};

    const [existing] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!existing) { res.status(404).json({ error: "Purchase order not found" }); return; }

    const { checklistToggle, checklist, emailReceivedAt, approvedAt, ...rest } = body;

    // Allow toggling a single checklist item without having to resend the whole array
    let nextChecklist = (existing.checklist as PurchaseOrderChecklistItem[] | null) ?? [];
    if (checklist) {
      nextChecklist = checklist;
    } else if (checklistToggle && typeof checklistToggle.id === "string") {
      nextChecklist = nextChecklist.map((item) =>
        item.id === checklistToggle.id
          ? { ...item, done: !!checklistToggle.done, doneAt: checklistToggle.done ? new Date().toISOString() : null }
          : item,
      );
    }

    const updates: Record<string, any> = { ...rest, checklist: nextChecklist, updatedAt: new Date() };
    if (emailReceivedAt !== undefined) updates.emailReceivedAt = emailReceivedAt ? new Date(emailReceivedAt) : null;
    if (approvedAt !== undefined) updates.approvedAt = approvedAt ? new Date(approvedAt) : null;

    // Auto-stamp approvedAt when status flips to Approved and it's not already set
    if (rest.status === "Approved" && !existing.approvedAt && updates.approvedAt === undefined) {
      updates.approvedAt = new Date();
    }

    const [updated] = await db.update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, id))
      .returning();

    res.json(serializePO(updated));
  } catch (err) { next(err); }
});

router.delete("/purchase-orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) { res.status(400).json({ error: "Invalid params" }); return; }

    const [existing] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!existing) { res.status(404).json({ error: "Purchase order not found" }); return; }

    await deleteRow(purchaseOrders, id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

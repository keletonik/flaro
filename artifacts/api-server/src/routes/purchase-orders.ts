import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseOrders } from "@workspace/db";
import type { PurchaseOrderChecklistItem } from "@workspace/db";
import { eq, and, or, ilike, sql, isNull } from "drizzle-orm";
import {
  CreatePurchaseOrderBody,
  UpdatePurchaseOrderBody,
  ListPurchaseOrdersQueryParams,
  GetPurchaseOrderParams,
  UpdatePurchaseOrderParams,
  DeletePurchaseOrderParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { deleteRow, softDeleteEnabled } from "../lib/soft-delete";

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
    const parsed = ListPurchaseOrdersQueryParams.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

    const { status, client, search } = parsed.data;
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

router.post("/purchase-orders", async (req, res, next) => {
  try {
    const parsed = CreatePurchaseOrderBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const id = randomUUID();
    const now = new Date();
    const { checklist, emailReceivedAt, approvedAt, ...rest } = parsed.data as any;

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
    const parsed = GetPurchaseOrderParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, parsed.data.id));
    if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

    res.json(serializePO(po));
  } catch (err) { next(err); }
});

router.patch("/purchase-orders/:id", async (req, res, next) => {
  try {
    const paramsParsed = UpdatePurchaseOrderParams.safeParse(req.params);
    if (!paramsParsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const bodyParsed = UpdatePurchaseOrderBody.safeParse(req.body);
    if (!bodyParsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const [existing] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, paramsParsed.data.id));
    if (!existing) { res.status(404).json({ error: "Purchase order not found" }); return; }

    const { checklistToggle, checklist, emailReceivedAt, approvedAt, ...rest } = bodyParsed.data as any;

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
      .where(eq(purchaseOrders.id, paramsParsed.data.id))
      .returning();

    res.json(serializePO(updated));
  } catch (err) { next(err); }
});

router.delete("/purchase-orders/:id", async (req, res, next) => {
  try {
    const parsed = DeletePurchaseOrderParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [existing] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, parsed.data.id));
    if (!existing) { res.status(404).json({ error: "Purchase order not found" }); return; }

    await deleteRow(purchaseOrders, parsed.data.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

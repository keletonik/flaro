import { Router } from "express";
import { db } from "@workspace/db";
import { invoices } from "@workspace/db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const serialize = (r: typeof invoices.$inferSelect) => ({
  ...r,
  amount: r.amount ? Number(r.amount) : null,
  gstAmount: r.gstAmount ? Number(r.gstAmount) : null,
  totalAmount: r.totalAmount ? Number(r.totalAmount) : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

router.get("/invoices", async (req, res, next) => {
  try {
    const { status, search, client } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(invoices.status, status));
    if (client) conditions.push(ilike(invoices.client, `%${client.replace(/[%_\\]/g, "\\$&")}%`));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(invoices.site, `%${s}%`), ilike(invoices.client, `%${s}%`), ilike(invoices.invoiceNumber!, `%${s}%`), ilike(invoices.taskNumber!, `%${s}%`)));
    }
    let query = db.select().from(invoices).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(desc(invoices.createdAt));
    res.json(result.map(serialize));
  } catch (err) { next(err); }
});

router.post("/invoices", async (req, res, next) => {
  try {
    const { invoiceNumber, taskNumber, site, address, client, description, amount, gstAmount, totalAmount, status, dateIssued, dateDue, datePaid, paymentTerms, notes } = req.body;
    if (!site || !client) { res.status(400).json({ error: "site and client are required" }); return; }
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(invoices).values({
      id, invoiceNumber: invoiceNumber || null, taskNumber: taskNumber || null, site,
      address: address || null, client, description: description || null,
      amount: amount || null, gstAmount: gstAmount || null, totalAmount: totalAmount || null,
      status: status || "Draft", dateIssued: dateIssued || null, dateDue: dateDue || null,
      datePaid: datePaid || null, paymentTerms: paymentTerms || null, notes: notes || null,
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json(serialize(record));
  } catch (err) { next(err); }
});

router.post("/invoices/import", async (req, res, next) => {
  try {
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!rows?.length) { res.status(400).json({ error: "No data rows provided" }); return; }
    const batchId = randomUUID();
    const now = new Date();
    const records = rows.map(row => {
      const mapped: Record<string, any> = {};
      for (const [csvCol, dbField] of Object.entries(columnMap)) {
        if (row[csvCol] !== undefined && row[csvCol] !== "") mapped[dbField] = row[csvCol];
      }
      return {
        id: randomUUID(), site: mapped.site || "Unknown", client: mapped.client || "Unknown",
        invoiceNumber: mapped.invoiceNumber || null, taskNumber: mapped.taskNumber || null,
        address: mapped.address || null, description: mapped.description || null,
        amount: mapped.amount || null, gstAmount: mapped.gstAmount || null,
        totalAmount: mapped.totalAmount || null, status: mapped.status || "Sent",
        dateIssued: mapped.dateIssued || null, dateDue: mapped.dateDue || null,
        datePaid: mapped.datePaid || null, paymentTerms: mapped.paymentTerms || null,
        notes: mapped.notes || null, rawData: row, importBatchId: batchId,
        createdAt: now, updatedAt: now,
      };
    });
    const inserted = await db.insert(invoices).values(records).returning();
    res.status(201).json({ imported: inserted.length, batchId, records: inserted.map(serialize) });
  } catch (err) { next(err); }
});

router.patch("/invoices/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(invoices).where(eq(invoices.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
    const { invoiceNumber, taskNumber, site, address, client, description, amount, gstAmount, totalAmount, status, dateIssued, dateDue, datePaid, paymentTerms, notes } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (invoiceNumber !== undefined) updates.invoiceNumber = invoiceNumber || null;
    if (taskNumber !== undefined) updates.taskNumber = taskNumber || null;
    if (site !== undefined) updates.site = site;
    if (address !== undefined) updates.address = address || null;
    if (client !== undefined) updates.client = client;
    if (description !== undefined) updates.description = description || null;
    if (amount !== undefined) updates.amount = amount || null;
    if (gstAmount !== undefined) updates.gstAmount = gstAmount || null;
    if (totalAmount !== undefined) updates.totalAmount = totalAmount || null;
    if (status !== undefined) updates.status = status;
    if (dateIssued !== undefined) updates.dateIssued = dateIssued || null;
    if (dateDue !== undefined) updates.dateDue = dateDue || null;
    if (datePaid !== undefined) updates.datePaid = datePaid || null;
    if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms || null;
    if (notes !== undefined) updates.notes = notes || null;
    const [updated] = await db.update(invoices).set(updates).where(eq(invoices.id, req.params.id)).returning();
    res.json(serialize(updated));
  } catch (err) { next(err); }
});

router.delete("/invoices/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(invoices).where(eq(invoices.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
    await db.delete(invoices).where(eq(invoices.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

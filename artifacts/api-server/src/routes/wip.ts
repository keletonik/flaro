import { Router } from "express";
import { db } from "@workspace/db";
import { wipRecords } from "@workspace/db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const serialize = (r: typeof wipRecords.$inferSelect) => ({
  ...r,
  quoteAmount: r.quoteAmount ? Number(r.quoteAmount) : null,
  invoiceAmount: r.invoiceAmount ? Number(r.invoiceAmount) : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

router.get("/wip", async (req, res, next) => {
  try {
    const { status, priority, search, client, assignedTech, jobType } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(wipRecords.status, status));
    if (priority) conditions.push(eq(wipRecords.priority, priority));
    if (client) conditions.push(ilike(wipRecords.client, `%${client.replace(/[%_\\]/g, "\\$&")}%`));
    if (assignedTech) conditions.push(eq(wipRecords.assignedTech, assignedTech));
    if (jobType) conditions.push(eq(wipRecords.jobType, jobType));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(wipRecords.site, `%${s}%`), ilike(wipRecords.client, `%${s}%`), ilike(wipRecords.taskNumber!, `%${s}%`), ilike(wipRecords.description!, `%${s}%`)));
    }
    let query = db.select().from(wipRecords).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(desc(wipRecords.createdAt));
    res.json(result.map(serialize));
  } catch (err) { next(err); }
});

router.post("/wip", async (req, res, next) => {
  try {
    const { taskNumber, site, address, client, jobType, description, status, priority, assignedTech, dueDate, dateCreated, quoteAmount, invoiceAmount, poNumber, notes } = req.body;
    if (!site || !client) { res.status(400).json({ error: "site and client are required" }); return; }
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(wipRecords).values({
      id, taskNumber: taskNumber || null, site, address: address || null, client,
      jobType: jobType || null, description: description || null, status: status || "Open",
      priority: priority || "Medium", assignedTech: assignedTech || null, dueDate: dueDate || null,
      dateCreated: dateCreated || null, quoteAmount: quoteAmount || null, invoiceAmount: invoiceAmount || null,
      poNumber: poNumber || null, notes: notes || null, createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json(serialize(record));
  } catch (err) { next(err); }
});

router.post("/wip/import", async (req, res, next) => {
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
        id: randomUUID(),
        site: mapped.site || "Unknown",
        client: mapped.client || "Unknown",
        taskNumber: mapped.taskNumber || null,
        address: mapped.address || null,
        jobType: mapped.jobType || null,
        description: mapped.description || null,
        status: mapped.status || "Open",
        priority: mapped.priority || "Medium",
        assignedTech: mapped.assignedTech || null,
        dueDate: mapped.dueDate || null,
        dateCreated: mapped.dateCreated || null,
        quoteAmount: mapped.quoteAmount || null,
        invoiceAmount: mapped.invoiceAmount || null,
        poNumber: mapped.poNumber || null,
        notes: mapped.notes || null,
        rawData: row,
        importBatchId: batchId,
        createdAt: now,
        updatedAt: now,
      };
    });
    const inserted = await db.insert(wipRecords).values(records).returning();
    res.status(201).json({ imported: inserted.length, batchId, records: inserted.map(serialize) });
  } catch (err) { next(err); }
});

router.patch("/wip/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(wipRecords).where(eq(wipRecords.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Record not found" }); return; }
    const { taskNumber, site, address, client, jobType, description, status, priority, assignedTech, dueDate, dateCreated, quoteAmount, invoiceAmount, poNumber, notes } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (taskNumber !== undefined) updates.taskNumber = taskNumber || null;
    if (site !== undefined) updates.site = site;
    if (address !== undefined) updates.address = address || null;
    if (client !== undefined) updates.client = client;
    if (jobType !== undefined) updates.jobType = jobType || null;
    if (description !== undefined) updates.description = description || null;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assignedTech !== undefined) updates.assignedTech = assignedTech || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (dateCreated !== undefined) updates.dateCreated = dateCreated || null;
    if (quoteAmount !== undefined) updates.quoteAmount = quoteAmount || null;
    if (invoiceAmount !== undefined) updates.invoiceAmount = invoiceAmount || null;
    if (poNumber !== undefined) updates.poNumber = poNumber || null;
    if (notes !== undefined) updates.notes = notes || null;
    const [updated] = await db.update(wipRecords).set(updates).where(eq(wipRecords.id, req.params.id)).returning();
    res.json(serialize(updated));
  } catch (err) { next(err); }
});

router.delete("/wip/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(wipRecords).where(eq(wipRecords.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Record not found" }); return; }
    await db.delete(wipRecords).where(eq(wipRecords.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

router.delete("/wip/batch/:batchId", async (req, res, next) => {
  try {
    await db.delete(wipRecords).where(eq(wipRecords.importBatchId, req.params.batchId));
    res.status(204).end();
  } catch (err) { next(err); }
});

// Bulk status update
router.patch("/wip/bulk", async (req, res, next) => {
  try {
    const { ids, status, assignedTech } = req.body as { ids: string[]; status?: string; assignedTech?: string };
    if (!ids?.length) { res.status(400).json({ error: "ids array required" }); return; }
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (assignedTech !== undefined) updates.assignedTech = assignedTech || null;
    for (const id of ids) {
      await db.update(wipRecords).set(updates).where(eq(wipRecords.id, id));
    }
    res.json({ updated: ids.length });
  } catch (err) { next(err); }
});

// Bulk delete
router.delete("/wip/bulk", async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) { res.status(400).json({ error: "ids array required" }); return; }
    for (const id of ids) { await db.delete(wipRecords).where(eq(wipRecords.id, id)); }
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

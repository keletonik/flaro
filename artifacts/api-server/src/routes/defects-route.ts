import { Router } from "express";
import { db } from "@workspace/db";
import { defects } from "@workspace/db";
import { eq, and, or, ilike, desc, sql, isNull } from "drizzle-orm";
import { parsePagination, paginatedResponse } from "../lib/pagination";
import { randomUUID } from "crypto";
import { deleteRow, softDeleteEnabled } from "../lib/soft-delete";

const MAX_IMPORT_ROWS = Number(process.env["MAX_IMPORT_ROWS"]) || 10000;

const router = Router();

const serialize = (r: typeof defects.$inferSelect) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

router.get("/defects", async (req, res, next) => {
  try {
    const { status, severity, search, client } = req.query as Record<string, string>;
    const conditions = [];
    if (softDeleteEnabled()) conditions.push(isNull(defects.deletedAt));
    if (status) conditions.push(eq(defects.status, status));
    if (severity) conditions.push(eq(defects.severity, severity));
    if (client) conditions.push(ilike(defects.client, `%${client.replace(/[%_\\]/g, "\\$&")}%`));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(defects.site, `%${s}%`), ilike(defects.client, `%${s}%`), ilike(defects.description, `%${s}%`), ilike(defects.taskNumber!, `%${s}%`)));
    }
    let query = db.select().from(defects).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(desc(defects.createdAt));
    res.json(result.map(serialize));
  } catch (err) { next(err); }
});

router.post("/defects", async (req, res, next) => {
  try {
    const { taskNumber, site, address, client, description, severity, status, buildingClass, assetType, location, recommendation, dueDate, dateIdentified, notes } = req.body;
    if (!site || !client || !description) { res.status(400).json({ error: "site, client, and description are required" }); return; }
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(defects).values({
      id, taskNumber: taskNumber || null, site, address: address || null, client, description,
      severity: severity || "Medium", status: status || "Open", buildingClass: buildingClass || null,
      assetType: assetType || null, location: location || null, recommendation: recommendation || null,
      dueDate: dueDate || null, dateIdentified: dateIdentified || null, notes: notes || null,
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json(serialize(record));
  } catch (err) { next(err); }
});

router.post("/defects/import", async (req, res, next) => {
  try {
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!rows?.length) { res.status(400).json({ error: "No data rows provided" }); return; }
    if (rows.length > MAX_IMPORT_ROWS) {
      res.status(413).json({ error: `Too many rows (${rows.length}). Limit is ${MAX_IMPORT_ROWS}.` });
      return;
    }
    const batchId = randomUUID();
    const now = new Date();
    const records = rows.map(row => {
      const mapped: Record<string, any> = {};
      for (const [csvCol, dbField] of Object.entries(columnMap)) {
        if (row[csvCol] !== undefined && row[csvCol] !== "") mapped[dbField] = row[csvCol];
      }
      return {
        id: randomUUID(), site: mapped.site || "Unknown", client: mapped.client || "Unknown",
        taskNumber: mapped.taskNumber || null, description: mapped.description || "No description",
        severity: mapped.severity || "Medium", status: mapped.status || "Open",
        buildingClass: mapped.buildingClass || null, assetType: mapped.assetType || null,
        location: mapped.location || null, recommendation: mapped.recommendation || null,
        address: mapped.address || null, dueDate: mapped.dueDate || null,
        dateIdentified: mapped.dateIdentified || null, notes: mapped.notes || null,
        rawData: row, importBatchId: batchId, createdAt: now, updatedAt: now,
      };
    });
    const inserted = await db.insert(defects).values(records).returning();
    res.status(201).json({ imported: inserted.length, batchId, records: inserted.map(serialize) });
  } catch (err) { next(err); }
});

// Bulk handler must precede /defects/:id so Express doesn't match id="bulk".
router.patch("/defects/bulk", async (req, res, next) => {
  try {
    const { ids, status, severity } = req.body as { ids: string[]; status?: string; severity?: string };
    if (!ids?.length) { res.status(400).json({ error: "ids array required" }); return; }
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (severity) updates.severity = severity;
    for (const id of ids) { await db.update(defects).set(updates).where(eq(defects.id, id)); }
    res.json({ updated: ids.length });
  } catch (err) { next(err); }
});

router.patch("/defects/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(defects).where(eq(defects.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Defect not found" }); return; }
    const { taskNumber, site, address, client, description, severity, status, buildingClass, assetType, location, recommendation, dueDate, dateIdentified, notes } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (taskNumber !== undefined) updates.taskNumber = taskNumber || null;
    if (site !== undefined) updates.site = site;
    if (address !== undefined) updates.address = address || null;
    if (client !== undefined) updates.client = client;
    if (description !== undefined) updates.description = description;
    if (severity !== undefined) updates.severity = severity;
    if (status !== undefined) updates.status = status;
    if (buildingClass !== undefined) updates.buildingClass = buildingClass || null;
    if (assetType !== undefined) updates.assetType = assetType || null;
    if (location !== undefined) updates.location = location || null;
    if (recommendation !== undefined) updates.recommendation = recommendation || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (dateIdentified !== undefined) updates.dateIdentified = dateIdentified || null;
    if (notes !== undefined) updates.notes = notes || null;
    const [updated] = await db.update(defects).set(updates).where(eq(defects.id, req.params.id)).returning();
    res.json(serialize(updated));
  } catch (err) { next(err); }
});

router.delete("/defects/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(defects).where(eq(defects.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Defect not found" }); return; }
    await deleteRow(defects, req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

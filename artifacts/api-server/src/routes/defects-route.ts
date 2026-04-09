import { Router } from "express";
import { db } from "@workspace/db";
import { defects } from "@workspace/db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(defects).values({ id, ...req.body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(record));
  } catch (err) { next(err); }
});

router.post("/defects/import", async (req, res, next) => {
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

router.patch("/defects/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(defects).where(eq(defects.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Defect not found" }); return; }
    const [updated] = await db.update(defects).set({ ...req.body, updatedAt: new Date() }).where(eq(defects.id, req.params.id)).returning();
    res.json(serialize(updated));
  } catch (err) { next(err); }
});

router.delete("/defects/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(defects).where(eq(defects.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Defect not found" }); return; }
    await db.delete(defects).where(eq(defects.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

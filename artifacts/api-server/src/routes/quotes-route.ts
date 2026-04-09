import { Router } from "express";
import { db } from "@workspace/db";
import { quotes } from "@workspace/db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const serialize = (r: typeof quotes.$inferSelect) => ({
  ...r,
  quoteAmount: r.quoteAmount ? Number(r.quoteAmount) : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

router.get("/quotes", async (req, res, next) => {
  try {
    const { status, search, client } = req.query as Record<string, string>;
    const conditions = [];
    if (status) conditions.push(eq(quotes.status, status));
    if (client) conditions.push(ilike(quotes.client, `%${client.replace(/[%_\\]/g, "\\$&")}%`));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(quotes.site, `%${s}%`), ilike(quotes.client, `%${s}%`), ilike(quotes.taskNumber!, `%${s}%`), ilike(quotes.description!, `%${s}%`)));
    }
    let query = db.select().from(quotes).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(desc(quotes.createdAt));
    res.json(result.map(serialize));
  } catch (err) { next(err); }
});

router.post("/quotes", async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(quotes).values({ id, ...req.body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(record));
  } catch (err) { next(err); }
});

router.post("/quotes/import", async (req, res, next) => {
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
        taskNumber: mapped.taskNumber || null, quoteNumber: mapped.quoteNumber || null,
        address: mapped.address || null, description: mapped.description || null,
        quoteAmount: mapped.quoteAmount || null, status: mapped.status || "Draft",
        dateCreated: mapped.dateCreated || null, dateSent: mapped.dateSent || null,
        dateAccepted: mapped.dateAccepted || null, validUntil: mapped.validUntil || null,
        assignedTech: mapped.assignedTech || null, contactName: mapped.contactName || null,
        contactEmail: mapped.contactEmail || null, notes: mapped.notes || null,
        rawData: row, importBatchId: batchId, createdAt: now, updatedAt: now,
      };
    });
    const inserted = await db.insert(quotes).values(records).returning();
    res.status(201).json({ imported: inserted.length, batchId, records: inserted.map(serialize) });
  } catch (err) { next(err); }
});

router.patch("/quotes/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Quote not found" }); return; }
    const [updated] = await db.update(quotes).set({ ...req.body, updatedAt: new Date() }).where(eq(quotes.id, req.params.id)).returning();
    res.json(serialize(updated));
  } catch (err) { next(err); }
});

router.delete("/quotes/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Quote not found" }); return; }
    await db.delete(quotes).where(eq(quotes.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

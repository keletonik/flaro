import { Router } from "express";
import { db } from "@workspace/db";
import { clients, sites } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/pty\s*ltd?\.?/gi, "").replace(/\s*\(.*?\)\s*/g, "").trim();

// --- Clients ---
router.get("/clients", async (req, res, next) => {
  try {
    const { search } = req.query as Record<string, string>;
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      const result = await db.select().from(clients).where(or(ilike(clients.name, `%${s}%`), ilike(clients.contactName!, `%${s}%`))).orderBy(clients.name);
      res.json(result.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
    } else {
      const result = await db.select().from(clients).orderBy(clients.name);
      res.json(result.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
    }
  } catch (err) { next(err); }
});

router.post("/clients", async (req, res, next) => {
  try {
    const { name, contactName, contactPhone, contactEmail, address, notes } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
    const [record] = await db.insert(clients).values({
      id: randomUUID(), name: name.trim(), normalizedName: normalize(name),
      contactName: contactName || null, contactPhone: contactPhone || null,
      contactEmail: contactEmail || null, address: address || null, notes: notes || null,
    }).returning();
    res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
  } catch (err) { next(err); }
});

// --- Sites ---
router.get("/sites", async (req, res, next) => {
  try {
    const { search, clientId } = req.query as Record<string, string>;
    const conditions = [];
    if (search) { const s = search.replace(/[%_\\]/g, "\\$&"); conditions.push(or(ilike(sites.name, `%${s}%`), ilike(sites.address!, `%${s}%`))); }
    if (clientId) conditions.push(eq(sites.clientId, clientId));
    let query = db.select().from(sites).$dynamic();
    if (conditions.length) {
      const { and } = await import("drizzle-orm");
      query = query.where(and(...conditions));
    }
    const result = await query.orderBy(sites.name);
    res.json(result.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) { next(err); }
});

router.post("/sites", async (req, res, next) => {
  try {
    const { name, address, suburb, clientId, buildingClass, notes } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
    const [record] = await db.insert(sites).values({
      id: randomUUID(), name: name.trim(), normalizedName: normalize(name),
      address: address || null, suburb: suburb || null, clientId: clientId || null,
      buildingClass: buildingClass || null, notes: notes || null,
    }).returning();
    res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
  } catch (err) { next(err); }
});

export default router;

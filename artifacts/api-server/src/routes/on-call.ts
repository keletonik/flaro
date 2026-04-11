import { Router } from "express";
import { db } from "@workspace/db";
import { onCallRoster } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/on-call", async (req, res, next) => {
  try {
    const result = await db.select().from(onCallRoster).orderBy(onCallRoster.date);
    res.json(result.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) { next(err); }
});

router.get("/on-call/today", async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [entry] = await db.select().from(onCallRoster).where(eq(onCallRoster.date, today));
    res.json(entry ? { ...entry, createdAt: entry.createdAt.toISOString() } : { date: today, techName: null });
  } catch (err) { next(err); }
});

router.post("/on-call", async (req, res, next) => {
  try {
    const { date, techName, notes } = req.body;
    if (!date || !techName) { res.status(400).json({ error: "date and techName required" }); return; }
    // Upsert — delete existing entry for this date, then insert
    await db.delete(onCallRoster).where(eq(onCallRoster.date, date));
    const [entry] = await db.insert(onCallRoster).values({ id: randomUUID(), date, techName, notes: notes || null }).returning();
    res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
  } catch (err) { next(err); }
});

router.post("/on-call/bulk", async (req, res, next) => {
  try {
    const { entries } = req.body as { entries: { date: string; techName: string }[] };
    if (!entries?.length) { res.status(400).json({ error: "entries array required" }); return; }
    for (const e of entries) {
      await db.delete(onCallRoster).where(eq(onCallRoster.date, e.date));
      await db.insert(onCallRoster).values({ id: randomUUID(), date: e.date, techName: e.techName });
    }
    res.json({ updated: entries.length });
  } catch (err) { next(err); }
});

router.delete("/on-call/:date", async (req, res, next) => {
  try {
    await db.delete(onCallRoster).where(eq(onCallRoster.date, req.params.date));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

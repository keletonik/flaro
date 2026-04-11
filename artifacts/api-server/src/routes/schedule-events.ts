import { Router } from "express";
import { db } from "@workspace/db";
import { scheduleEvents } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const serialize = (r: typeof scheduleEvents.$inferSelect) => ({
  ...r, createdAt: r.createdAt.toISOString(),
});

router.get("/schedule-events", async (req, res, next) => {
  try {
    const result = await db.select().from(scheduleEvents).orderBy(scheduleEvents.date);
    res.json(result.map(serialize));
  } catch (err) { next(err); }
});

router.post("/schedule-events", async (req, res, next) => {
  try {
    const { title, date, startHour, endHour, location, assignedTo, color, notes } = req.body;
    if (!title || !date) { res.status(400).json({ error: "title and date required" }); return; }
    const [record] = await db.insert(scheduleEvents).values({
      id: randomUUID(), title, date, startHour: startHour || 9, endHour: endHour || 10,
      location: location || null, assignedTo: assignedTo || null, color: color || "#3B82F6",
      notes: notes || null,
    }).returning();
    res.status(201).json(serialize(record));
  } catch (err) { next(err); }
});

router.delete("/schedule-events/:id", async (req, res, next) => {
  try {
    await db.delete(scheduleEvents).where(eq(scheduleEvents.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

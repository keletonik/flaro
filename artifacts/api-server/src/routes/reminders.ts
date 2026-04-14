/**
 * /api/reminders — CRUD for the PA reminder surface.
 *
 * Routes:
 *   GET    /api/reminders             list (optional ?status=, ?due=, ?limit=)
 *   POST   /api/reminders              create { title, remindAt, body?, sourceMessageId?, sourceToolCallId? }
 *   PATCH  /api/reminders/:id         update { title?, body?, remindAt?, status? }
 *   POST   /api/reminders/:id/complete mark completed
 *   POST   /api/reminders/:id/snooze  { untilIso }
 *   DELETE /api/reminders/:id          soft delete
 *
 * Soft-deletable like every other fact table on the site.
 * No destructive row removal — we set deleted_at.
 *
 * Broadcasts `data_change` via the existing app.ts wrapper so the
 * PA page refreshes reminders live.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { paReminders } from "@workspace/db";
import { and, desc, eq, isNull, lte } from "drizzle-orm";

const router = Router();

function serialize(r: typeof paReminders.$inferSelect) {
  return {
    ...r,
    remindAt: r.remindAt.toISOString(),
    firedAt: r.firedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    snoozedUntil: r.snoozedUntil?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt?.toISOString() ?? null,
  };
}

// GET /api/reminders
router.get("/reminders", async (req, res, next) => {
  try {
    const { status, due, limit } = req.query as Record<string, string | undefined>;
    const conds: any[] = [isNull(paReminders.deletedAt)];
    if (status) conds.push(eq(paReminders.status, status as any));
    if (due === "true") {
      conds.push(eq(paReminders.status, "pending"));
      conds.push(lte(paReminders.remindAt, new Date()));
    }
    const cap = Math.min(Number(limit) || 100, 500);
    const rows = await db
      .select()
      .from(paReminders)
      .where(and(...conds))
      .orderBy(desc(paReminders.remindAt))
      .limit(cap);
    res.json({ reminders: rows.map(serialize), count: rows.length });
  } catch (err) { next(err); }
});

// POST /api/reminders
router.post("/reminders", async (req, res, next) => {
  try {
    const { title, body, remindAt, sourceMessageId, sourceToolCallId } = req.body ?? {};
    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "title required" });
      return;
    }
    if (!remindAt) {
      res.status(400).json({ error: "remindAt required (ISO 8601 string)" });
      return;
    }
    const when = new Date(remindAt);
    if (Number.isNaN(when.getTime())) {
      res.status(400).json({ error: "remindAt is not a valid date" });
      return;
    }
    const [row] = await db
      .insert(paReminders)
      .values({
        id: randomUUID(),
        title: title.slice(0, 500),
        body: body ? String(body).slice(0, 5000) : null,
        remindAt: when,
        status: "pending",
        sourceMessageId: sourceMessageId ?? null,
        sourceToolCallId: sourceToolCallId ?? null,
      })
      .returning();
    res.status(201).json(serialize(row));
  } catch (err) { next(err); }
});

// PATCH /api/reminders/:id
router.patch("/reminders/:id", async (req, res, next) => {
  try {
    const { title, body, remindAt, status } = req.body ?? {};
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = String(title).slice(0, 500);
    if (body !== undefined) updates.body = body ? String(body).slice(0, 5000) : null;
    if (remindAt !== undefined) {
      const d = new Date(remindAt);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: "remindAt is not a valid date" });
        return;
      }
      updates.remindAt = d;
    }
    if (status !== undefined) updates.status = status;
    const [row] = await db
      .update(paReminders)
      .set(updates)
      .where(and(eq(paReminders.id, req.params.id), isNull(paReminders.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "reminder not found" }); return; }
    res.json(serialize(row));
  } catch (err) { next(err); }
});

// POST /api/reminders/:id/complete
router.post("/reminders/:id/complete", async (req, res, next) => {
  try {
    const now = new Date();
    const [row] = await db
      .update(paReminders)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(and(eq(paReminders.id, req.params.id), isNull(paReminders.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "reminder not found" }); return; }
    res.json(serialize(row));
  } catch (err) { next(err); }
});

// POST /api/reminders/:id/snooze
router.post("/reminders/:id/snooze", async (req, res, next) => {
  try {
    const { untilIso } = req.body ?? {};
    if (!untilIso) { res.status(400).json({ error: "untilIso required" }); return; }
    const until = new Date(untilIso);
    if (Number.isNaN(until.getTime())) {
      res.status(400).json({ error: "untilIso is not a valid date" });
      return;
    }
    const now = new Date();
    const [row] = await db
      .update(paReminders)
      .set({ status: "snoozed", snoozedUntil: until, remindAt: until, updatedAt: now })
      .where(and(eq(paReminders.id, req.params.id), isNull(paReminders.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "reminder not found" }); return; }
    res.json(serialize(row));
  } catch (err) { next(err); }
});

// DELETE /api/reminders/:id — soft delete
router.delete("/reminders/:id", async (req, res, next) => {
  try {
    const [row] = await db
      .update(paReminders)
      .set({ deletedAt: new Date(), status: "cancelled" })
      .where(and(eq(paReminders.id, req.params.id), isNull(paReminders.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "reminder not found" }); return; }
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

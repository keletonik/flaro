import { Router } from "express";
import { db } from "@workspace/db";
import { chatHistory } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/chat-history", async (req, res, next) => {
  try {
    const { section } = req.query as Record<string, string>;
    const conditions = section ? [eq(chatHistory.section, section)] : [];
    let query = db.select().from(chatHistory).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(desc(chatHistory.updatedAt)).limit(50);
    res.json(result.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) { next(err); }
});

router.post("/chat-history", async (req, res, next) => {
  try {
    const { section, title, messages } = req.body;
    if (!section || !title) { res.status(400).json({ error: "section and title required" }); return; }
    const [record] = await db.insert(chatHistory).values({
      id: randomUUID(), section, title, messages: messages || [],
    }).returning();
    res.status(201).json({ ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
  } catch (err) { next(err); }
});

router.patch("/chat-history/:id", async (req, res, next) => {
  try {
    const { title, messages } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (messages !== undefined) updates.messages = messages;
    const [updated] = await db.update(chatHistory).set(updates).where(eq(chatHistory.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) { next(err); }
});

router.delete("/chat-history/:id", async (req, res, next) => {
  try {
    await db.delete(chatHistory).where(eq(chatHistory.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

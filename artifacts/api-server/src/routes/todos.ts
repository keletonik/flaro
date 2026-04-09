import { Router } from "express";
import { db } from "@workspace/db";
import { todos } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const serializeTodo = (t: typeof todos.$inferSelect) => ({
  ...t,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});

router.get("/todos", async (req, res) => {
  const result = await db.select().from(todos).orderBy(todos.createdAt);
  res.json(result.map(serializeTodo));
});

router.post("/todos", async (req, res) => {
  const { text, priority, category, dueDate } = req.body;
  if (!text?.trim()) {
    res.status(400).json({ error: "Text is required" });
    return;
  }
  const [todo] = await db.insert(todos).values({
    id: randomUUID(),
    text: text.trim(),
    completed: false,
    priority: priority || "Medium",
    category: category || "Work",
    dueDate: dueDate || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  res.status(201).json(serializeTodo(todo));
});

router.patch("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const [existing] = await db.select().from(todos).where(eq(todos.id, id));
  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  const { text, completed, priority, category, dueDate } = req.body;
  const [updated] = await db.update(todos).set({
    ...(text !== undefined && { text: text.trim() }),
    ...(completed !== undefined && { completed }),
    ...(priority !== undefined && { priority }),
    ...(category !== undefined && { category }),
    ...(dueDate !== undefined && { dueDate }),
    updatedAt: new Date(),
  }).where(eq(todos.id, id)).returning();
  res.json(serializeTodo(updated));
});

router.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const [existing] = await db.select().from(todos).where(eq(todos.id, id));
  if (!existing) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  await db.delete(todos).where(eq(todos.id, id));
  res.status(204).end();
});

export default router;

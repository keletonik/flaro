import { Router } from "express";
import { db } from "@workspace/db";
import { todos, changeLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const VALID_CATEGORIES = ["Work", "Personal", "Follow-up", "Compliance", "Admin"] as const;

type Priority = typeof VALID_PRIORITIES[number];
type Category = typeof VALID_CATEGORIES[number];

const serializeTodo = (t: typeof todos.$inferSelect) => ({
  ...t,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});

router.get("/todos", async (req, res, next) => {
  try {
    const result = await db.select().from(todos).orderBy(todos.createdAt);
    res.json(result.map(serializeTodo));
  } catch (err) { next(err); }
});

const MAX_IMPORT_ROWS = parseInt(process.env.MAX_IMPORT_ROWS || "10000", 10);

router.post("/todos/import", async (req, res, next) => {
  try {
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!rows?.length) { res.status(400).json({ error: "No data rows provided" }); return; }
    if (rows.length > MAX_IMPORT_ROWS) { res.status(413).json({ error: `Too many rows (${rows.length}). Limit is ${MAX_IMPORT_ROWS}.` }); return; }
    const now = new Date();
    const records = rows.map(row => {
      const mapped: Record<string, any> = {};
      for (const [csvCol, dbField] of Object.entries(columnMap)) {
        if (row[csvCol] !== undefined && row[csvCol] !== "") mapped[dbField] = row[csvCol];
      }
      const safePriority: Priority = VALID_PRIORITIES.includes(mapped.priority as Priority) ? mapped.priority : "Medium";
      const safeCategory: Category = VALID_CATEGORIES.includes(mapped.category as Category) ? mapped.category : "Work";
      return {
        id: randomUUID(),
        text: mapped.text || mapped.description || mapped.task || "Imported task",
        completed: mapped.completed === "true" || mapped.completed === "1" || false,
        priority: safePriority,
        category: safeCategory,
        dueDate: mapped.dueDate || null,
        assignee: mapped.assignee || null,
        urgencyTag: mapped.urgencyTag || null,
        colorCode: mapped.colorCode || null,
        notes: mapped.notes || null,
        nextSteps: mapped.nextSteps || null,
        dependencies: [],
        createdAt: now,
        updatedAt: now,
      };
    });
    const batchId = randomUUID();
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      await db.insert(todos).values(chunk);
      totalInserted += chunk.length;
    }
    try {
      await db.insert(changeLogs).values({
        id: randomUUID(), action: "import", table: "todos", batchId,
        rowCount: totalInserted, summary: `Imported ${totalInserted} todos from CSV`, createdAt: now,
      });
    } catch { /* change_logs table may not exist yet */ }
    res.status(201).json({ imported: totalInserted, batchId });
  } catch (err) { next(err); }
});

router.post("/todos", async (req, res, next) => {
  try {
    const { text, priority, category, dueDate } = req.body;

    if (!text?.trim()) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const safePriority: Priority = VALID_PRIORITIES.includes(priority) ? priority : "Medium";
    const safeCategory: Category = VALID_CATEGORIES.includes(category) ? category : "Work";

    const { assignee, urgencyTag, colorCode, notes: todoNotes, nextSteps } = req.body;

    const [todo] = await db.insert(todos).values({
      id: randomUUID(),
      text: String(text).trim(),
      completed: false,
      priority: safePriority,
      category: safeCategory,
      dueDate: typeof dueDate === "string" && dueDate ? dueDate : null,
      assignee: typeof assignee === "string" && assignee ? assignee : null,
      urgencyTag: typeof urgencyTag === "string" && urgencyTag ? urgencyTag : null,
      colorCode: typeof colorCode === "string" && colorCode ? colorCode : null,
      notes: typeof todoNotes === "string" && todoNotes ? todoNotes : null,
      nextSteps: typeof nextSteps === "string" && nextSteps ? nextSteps : null,
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json(serializeTodo(todo));
  } catch (err) { next(err); }
});

router.patch("/todos/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(todos).where(eq(todos.id, id));
    if (!existing) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    const { text, completed, priority, category, dueDate, assignee, urgencyTag, colorCode, notes: todoNotes, nextSteps } = req.body;

    const updates: Partial<typeof todos.$inferInsert> = { updatedAt: new Date() };
    if (text !== undefined) updates.text = String(text).trim();
    if (completed !== undefined) updates.completed = Boolean(completed);
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updates.priority = priority;
    if (category !== undefined && VALID_CATEGORIES.includes(category)) updates.category = category;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (assignee !== undefined) updates.assignee = assignee || null;
    if (urgencyTag !== undefined) updates.urgencyTag = urgencyTag || null;
    if (colorCode !== undefined) updates.colorCode = colorCode || null;
    if (todoNotes !== undefined) updates.notes = todoNotes || null;
    if (nextSteps !== undefined) updates.nextSteps = nextSteps || null;

    const [updated] = await db.update(todos)
      .set(updates)
      .where(eq(todos.id, id))
      .returning();

    res.json(serializeTodo(updated));
  } catch (err) { next(err); }
});

router.delete("/todos/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(todos).where(eq(todos.id, id));
    if (!existing) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    await db.delete(todos).where(eq(todos.id, id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

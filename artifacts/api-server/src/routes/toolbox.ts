import { Router } from "express";
import { db } from "@workspace/db";
import { toolbox } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateToolboxNoteBody, UpdateToolboxNoteBody, ListToolboxNotesQueryParams, UpdateToolboxNoteParams, DeleteToolboxNoteParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

const serializeToolbox = (t: typeof toolbox.$inferSelect) => ({
  ...t,
  createdAt: t.createdAt.toISOString(),
});

// Generate a unique ref using max existing ref + 1 (avoids race condition vs count)
async function generateRef(): Promise<string> {
  const result = await db.execute(
    sql`SELECT COALESCE(MAX(CAST(REPLACE(ref, 'TB-', '') AS INTEGER)), 0) + 1 AS next_num FROM ${toolbox}`
  );
  const rows = result.rows as Array<{ next_num: number }>;
  const nextNum = rows[0]?.next_num ?? 1;
  return `TB-${String(nextNum).padStart(3, "0")}`;
}

router.get("/toolbox", async (req, res, next) => {
  try {
    const parsed = ListToolboxNotesQueryParams.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

    let query = db.select().from(toolbox).$dynamic();
    if (parsed.data.status) query = query.where(eq(toolbox.status, parsed.data.status));

    const result = await query.orderBy(toolbox.createdAt);
    res.json(result.map(serializeToolbox));
  } catch (err) { next(err); }
});

router.post("/toolbox", async (req, res, next) => {
  try {
    const parsed = CreateToolboxNoteBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const ref = await generateRef();
    const [note] = await db.insert(toolbox).values({
      id: randomUUID(), ref, text: parsed.data.text, status: "Active", createdAt: new Date(),
    }).returning();

    res.status(201).json(serializeToolbox(note));
  } catch (err) { next(err); }
});

router.patch("/toolbox/:id", async (req, res, next) => {
  try {
    const paramsParsed = UpdateToolboxNoteParams.safeParse(req.params);
    if (!paramsParsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const bodyParsed = UpdateToolboxNoteBody.safeParse(req.body);
    if (!bodyParsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const [existing] = await db.select().from(toolbox).where(eq(toolbox.id, paramsParsed.data.id));
    if (!existing) { res.status(404).json({ error: "Toolbox note not found" }); return; }

    const [updated] = await db.update(toolbox)
      .set(bodyParsed.data)
      .where(eq(toolbox.id, paramsParsed.data.id))
      .returning();

    res.json(serializeToolbox(updated));
  } catch (err) { next(err); }
});

router.delete("/toolbox/:id", async (req, res, next) => {
  try {
    const parsed = DeleteToolboxNoteParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [existing] = await db.select().from(toolbox).where(eq(toolbox.id, parsed.data.id));
    if (!existing) { res.status(404).json({ error: "Toolbox note not found" }); return; }

    await db.delete(toolbox).where(eq(toolbox.id, parsed.data.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { toolbox } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateToolboxNoteBody, UpdateToolboxNoteBody, ListToolboxNotesQueryParams, UpdateToolboxNoteParams, DeleteToolboxNoteParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

router.get("/toolbox", async (req, res) => {
  const parsed = ListToolboxNotesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  let query = db.select().from(toolbox).$dynamic();
  if (parsed.data.status) {
    query = query.where(eq(toolbox.status, parsed.data.status));
  }

  const result = await query.orderBy(toolbox.createdAt);
  res.json(result.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  })));
});

router.post("/toolbox", async (req, res) => {
  const parsed = CreateToolboxNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const count = await db.select().from(toolbox);
  const ref = `TB-${String(count.length + 1).padStart(3, "0")}`;

  const [note] = await db.insert(toolbox).values({
    id: randomUUID(),
    ref,
    text: parsed.data.text,
    status: "Active",
    createdAt: new Date(),
  }).returning();

  res.status(201).json({ ...note, createdAt: note.createdAt.toISOString() });
});

router.patch("/toolbox/:id", async (req, res) => {
  const paramsParsed = UpdateToolboxNoteParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const bodyParsed = UpdateToolboxNoteBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db.select().from(toolbox).where(eq(toolbox.id, paramsParsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Toolbox note not found" });
    return;
  }

  const [updated] = await db.update(toolbox)
    .set(bodyParsed.data)
    .where(eq(toolbox.id, paramsParsed.data.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/toolbox/:id", async (req, res) => {
  const parsed = DeleteToolboxNoteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [existing] = await db.select().from(toolbox).where(eq(toolbox.id, parsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Toolbox note not found" });
    return;
  }

  await db.delete(toolbox).where(eq(toolbox.id, parsed.data.id));
  res.status(204).end();
});

export default router;

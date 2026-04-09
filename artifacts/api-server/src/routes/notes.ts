import { Router } from "express";
import { db } from "@workspace/db";
import { notes } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateNoteBody, UpdateNoteBody, ListNotesQueryParams, GetNoteParams, UpdateNoteParams, DeleteNoteParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

router.get("/notes", async (req, res) => {
  const parsed = ListNotesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { category, status } = parsed.data;
  const conditions = [];

  if (category) conditions.push(eq(notes.category, category));
  if (status) conditions.push(eq(notes.status, status));

  let query = db.select().from(notes).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query.orderBy(notes.createdAt);
  res.json(result.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/notes", async (req, res) => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [note] = await db.insert(notes).values({
    id: randomUUID(),
    ...parsed.data,
    status: "Open",
    createdAt: new Date(),
  }).returning();

  res.status(201).json({ ...note, createdAt: note.createdAt.toISOString() });
});

router.get("/notes/:id", async (req, res) => {
  const parsed = GetNoteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [note] = await db.select().from(notes).where(eq(notes.id, parsed.data.id));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json({ ...note, createdAt: note.createdAt.toISOString() });
});

router.patch("/notes/:id", async (req, res) => {
  const paramsParsed = UpdateNoteParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const bodyParsed = UpdateNoteBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db.select().from(notes).where(eq(notes.id, paramsParsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const [updated] = await db.update(notes)
    .set(bodyParsed.data)
    .where(eq(notes.id, paramsParsed.data.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/notes/:id", async (req, res) => {
  const parsed = DeleteNoteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [existing] = await db.select().from(notes).where(eq(notes.id, parsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  await db.delete(notes).where(eq(notes.id, parsed.data.id));
  res.status(204).end();
});

export default router;

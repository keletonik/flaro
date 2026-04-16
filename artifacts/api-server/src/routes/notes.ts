import { Router } from "express";
import { db } from "@workspace/db";
import { notes, changeLogs } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateNoteBody, UpdateNoteBody, ListNotesQueryParams, GetNoteParams, UpdateNoteParams, DeleteNoteParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

const serializeNote = (n: typeof notes.$inferSelect) => ({
  ...n,
  createdAt: n.createdAt.toISOString(),
});

router.get("/notes", async (req, res, next) => {
  try {
    const parsed = ListNotesQueryParams.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

    const { category, status } = parsed.data;
    const conditions = [];
    if (category) conditions.push(eq(notes.category, category as any));
    if (status) conditions.push(eq(notes.status, status as any));

    let query = db.select().from(notes).$dynamic();
    if (conditions.length > 0) query = query.where(and(...conditions));

    const result = await query.orderBy(notes.createdAt);
    res.json(result.map(serializeNote));
  } catch (err) { next(err); }
});

// POST /notes/import — bulk CSV import
const MAX_NOTE_IMPORT = 5000;
const VALID_CATEGORIES = ["Urgent", "To Do", "To Ask", "Schedule", "Quote", "Follow Up", "Investigate", "Done"];
router.post("/notes/import", async (req, res, next) => {
  try {
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!Array.isArray(rows) || rows.length === 0) { res.status(400).json({ error: "No rows" }); return; }
    if (rows.length > MAX_NOTE_IMPORT) { res.status(400).json({ error: `Max ${MAX_NOTE_IMPORT} rows` }); return; }

    const map = (r: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) { const v = r[k] || r[columnMap?.[k] ?? ""]; if (v?.trim()) return v.trim(); }
      return undefined;
    };

    const now = new Date();
    const records: any[] = [];

    for (const row of rows) {
      const text = map(row, "text", "Text", "note", "Note", "description", "Description", "content", "Content") || "Imported note";
      let category = map(row, "category", "Category", "type", "Type") || "To Do";
      if (!VALID_CATEGORIES.includes(category)) category = "To Do";
      const owner = map(row, "owner", "Owner", "assignee", "Assignee") || "Casper";
      const statusRaw = map(row, "status", "Status") || "Open";
      const status = statusRaw === "Done" ? "Done" : "Open";

      records.push({ id: randomUUID(), text, category, owner, status, createdAt: now });
    }

    if (records.length > 0) {
      for (let i = 0; i < records.length; i += 500) {
        await db.insert(notes).values(records.slice(i, i + 500));
      }
    }

    try {
      const batchId = randomUUID();
      await db.insert(changeLogs).values({
        id: randomUUID(), action: "import", table: "notes", batchId,
        rowCount: records.length, summary: `Imported ${records.length} notes from CSV`, createdAt: now,
      });
    } catch { /* change_logs table may not exist yet */ }
    res.json({ imported: records.length });
  } catch (err) { next(err); }
});

router.post("/notes", async (req, res, next) => {
  try {
    const parsed = CreateNoteBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const [note] = await db.insert(notes).values({
      id: randomUUID(), ...parsed.data, status: "Open", createdAt: new Date(),
    }).returning();

    res.status(201).json(serializeNote(note));
  } catch (err) { next(err); }
});

router.get("/notes/:id", async (req, res, next) => {
  try {
    const parsed = GetNoteParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [note] = await db.select().from(notes).where(eq(notes.id, parsed.data.id));
    if (!note) { res.status(404).json({ error: "Note not found" }); return; }

    res.json(serializeNote(note));
  } catch (err) { next(err); }
});

router.patch("/notes/:id", async (req, res, next) => {
  try {
    const paramsParsed = UpdateNoteParams.safeParse(req.params);
    if (!paramsParsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const bodyParsed = UpdateNoteBody.safeParse(req.body);
    if (!bodyParsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const [existing] = await db.select().from(notes).where(eq(notes.id, paramsParsed.data.id));
    if (!existing) { res.status(404).json({ error: "Note not found" }); return; }

    const [updated] = await db.update(notes)
      .set(bodyParsed.data)
      .where(eq(notes.id, paramsParsed.data.id))
      .returning();

    res.json(serializeNote(updated));
  } catch (err) { next(err); }
});

router.delete("/notes/:id", async (req, res, next) => {
  try {
    const parsed = DeleteNoteParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [existing] = await db.select().from(notes).where(eq(notes.id, parsed.data.id));
    if (!existing) { res.status(404).json({ error: "Note not found" }); return; }

    await db.delete(notes).where(eq(notes.id, parsed.data.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

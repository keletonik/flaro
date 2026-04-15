/**
 * /api/pa/instructions — CRUD for user training rules.
 *
 *   GET    /api/pa/instructions           list non-deleted rows
 *   POST   /api/pa/instructions           create
 *   PATCH  /api/pa/instructions/:id       update (any field)
 *   DELETE /api/pa/instructions/:id       soft delete
 *
 * Read + write are both needed at runtime — the memory builder reads
 * on every PA turn, the settings panel writes via these routes.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { paInstructions } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";

const router = Router();

function serialize(r: typeof paInstructions.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt?.toISOString() ?? null,
  };
}

router.get("/pa/instructions", async (req, res, next) => {
  try {
    const { scope, enabled } = req.query as Record<string, string | undefined>;
    const conds: any[] = [isNull(paInstructions.deletedAt)];
    if (scope) conds.push(eq(paInstructions.scope, scope as any));
    if (enabled === "true") conds.push(eq(paInstructions.enabled, true));
    if (enabled === "false") conds.push(eq(paInstructions.enabled, false));
    const rows = await db
      .select()
      .from(paInstructions)
      .where(and(...conds))
      .orderBy(paInstructions.priority, desc(paInstructions.updatedAt));
    res.json({ instructions: rows.map(serialize), count: rows.length });
  } catch (err) { next(err); }
});

router.post("/pa/instructions", async (req, res, next) => {
  try {
    const { title, content, scope, priority, enabled, source } = req.body ?? {};
    if (!title || !content) {
      res.status(400).json({ error: "title and content required" });
      return;
    }
    const [row] = await db
      .insert(paInstructions)
      .values({
        id: randomUUID(),
        title: String(title).slice(0, 200),
        content: String(content).slice(0, 2000),
        scope: (scope ?? "global") as any,
        priority: Math.min(5, Math.max(1, Number(priority) || 3)),
        enabled: enabled !== false,
        source: (source ?? "user") as any,
      })
      .returning();
    res.status(201).json(serialize(row));
  } catch (err) { next(err); }
});

router.patch("/pa/instructions/:id", async (req, res, next) => {
  try {
    const { title, content, scope, priority, enabled } = req.body ?? {};
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = String(title).slice(0, 200);
    if (content !== undefined) updates.content = String(content).slice(0, 2000);
    if (scope !== undefined) updates.scope = scope;
    if (priority !== undefined) updates.priority = Math.min(5, Math.max(1, Number(priority)));
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    const [row] = await db
      .update(paInstructions)
      .set(updates)
      .where(and(eq(paInstructions.id, req.params.id), isNull(paInstructions.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "instruction not found" }); return; }
    res.json(serialize(row));
  } catch (err) { next(err); }
});

router.delete("/pa/instructions/:id", async (req, res, next) => {
  try {
    const [row] = await db
      .update(paInstructions)
      .set({ deletedAt: new Date() })
      .where(and(eq(paInstructions.id, req.params.id), isNull(paInstructions.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "instruction not found" }); return; }
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

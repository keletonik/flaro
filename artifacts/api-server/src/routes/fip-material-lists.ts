/**
 * /api/fip/material-lists — operator-authored material lists.
 *
 *   GET    /fip/material-lists                     list all (owner filter optional)
 *   POST   /fip/material-lists                     create a new list
 *   GET    /fip/material-lists/:id                 read one + items
 *   PATCH  /fip/material-lists/:id                 update name/panel/task/notes/status
 *   DELETE /fip/material-lists/:id                 soft delete
 *   POST   /fip/material-lists/:id/items           add an item (product ref or custom)
 *   PATCH  /fip/material-lists/:id/items/:itemId   update an item
 *   DELETE /fip/material-lists/:id/items/:itemId   soft delete an item
 *   POST   /fip/material-lists/:id/save-as-note    write the list into notes
 *
 * Every route is read-write but strictly additive — delete is soft.
 * The save-as-note path renders the list to plain text and inserts
 * into the existing notes table with category='Follow Up' and
 * raw_data.kind='fip-material-list' so it shows up on /notes without
 * needing a bespoke renderer.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { db, fipMaterialLists, fipMaterialListItems, notes } from "@workspace/db";
import { and, eq, isNull, desc, asc } from "drizzle-orm";

const router = Router();

function serializeList(r: typeof fipMaterialLists.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    owner: r.owner,
    panelSlug: r.panelSlug,
    siteRef: r.siteRef,
    taskRef: r.taskRef,
    notes: r.notes,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function serializeItem(r: typeof fipMaterialListItems.$inferSelect) {
  return {
    id: r.id,
    listId: r.listId,
    productId: r.productId,
    custom: r.custom,
    name: r.name,
    manufacturer: r.manufacturer,
    partCode: r.partCode,
    category: r.category,
    description: r.description,
    quantity: r.quantity ? Number(r.quantity) : 0,
    unit: r.unit,
    unitPriceAud: r.unitPriceAud ? Number(r.unitPriceAud) : null,
    totalAud: r.totalAud ? Number(r.totalAud) : null,
    supplierName: r.supplierName,
    supplierProductCode: r.supplierProductCode,
    sortOrder: r.sortOrder,
    notes: r.notes,
  };
}

function computeTotal(qty: number, unitPrice: number | null | undefined): number | null {
  if (unitPrice == null || !Number.isFinite(unitPrice)) return null;
  return Math.round(qty * unitPrice * 100) / 100;
}

router.get("/fip/material-lists", async (req, res, next) => {
  try {
    const { owner, status } = req.query as Record<string, string | undefined>;
    const conds: any[] = [isNull(fipMaterialLists.deletedAt)];
    if (owner) conds.push(eq(fipMaterialLists.owner, owner));
    if (status) conds.push(eq(fipMaterialLists.status, status as any));
    const rows = await db
      .select()
      .from(fipMaterialLists)
      .where(and(...conds))
      .orderBy(desc(fipMaterialLists.updatedAt));
    res.json({ lists: rows.map(serializeList), count: rows.length });
  } catch (err) { next(err); }
});

router.post("/fip/material-lists", async (req, res, next) => {
  try {
    const { name, owner, panelSlug, siteRef, taskRef, notes: note } = req.body ?? {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name required" });
      return;
    }
    const [row] = await db.insert(fipMaterialLists).values({
      id: randomUUID(),
      name: String(name).slice(0, 200),
      owner: (owner ?? "casper") as string,
      panelSlug: panelSlug ?? null,
      siteRef: siteRef ?? null,
      taskRef: taskRef ?? null,
      notes: note ?? null,
      status: "open",
    }).returning();
    res.status(201).json(serializeList(row));
  } catch (err) { next(err); }
});

router.get("/fip/material-lists/:id", async (req, res, next) => {
  try {
    const [list] = await db
      .select()
      .from(fipMaterialLists)
      .where(and(eq(fipMaterialLists.id, req.params.id), isNull(fipMaterialLists.deletedAt)));
    if (!list) { res.status(404).json({ error: "list not found" }); return; }
    const items = await db
      .select()
      .from(fipMaterialListItems)
      .where(and(eq(fipMaterialListItems.listId, list.id), isNull(fipMaterialListItems.deletedAt)))
      .orderBy(asc(fipMaterialListItems.sortOrder), asc(fipMaterialListItems.createdAt));
    res.json({ list: serializeList(list), items: items.map(serializeItem) });
  } catch (err) { next(err); }
});

router.patch("/fip/material-lists/:id", async (req, res, next) => {
  try {
    const { name, panelSlug, siteRef, taskRef, notes: note, status } = req.body ?? {};
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = String(name).slice(0, 200);
    if (panelSlug !== undefined) updates.panelSlug = panelSlug;
    if (siteRef !== undefined) updates.siteRef = siteRef;
    if (taskRef !== undefined) updates.taskRef = taskRef;
    if (note !== undefined) updates.notes = note;
    if (status !== undefined) updates.status = status;
    const [row] = await db
      .update(fipMaterialLists)
      .set(updates)
      .where(and(eq(fipMaterialLists.id, req.params.id), isNull(fipMaterialLists.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "list not found" }); return; }
    res.json(serializeList(row));
  } catch (err) { next(err); }
});

router.delete("/fip/material-lists/:id", async (req, res, next) => {
  try {
    const [row] = await db
      .update(fipMaterialLists)
      .set({ deletedAt: new Date() })
      .where(and(eq(fipMaterialLists.id, req.params.id), isNull(fipMaterialLists.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "list not found" }); return; }
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post("/fip/material-lists/:id/items", async (req, res, next) => {
  try {
    const listId = req.params.id;
    const {
      productId, custom, name, manufacturer, partCode, category, description,
      quantity, unit, unitPriceAud, supplierName, supplierProductCode, notes: note,
    } = req.body ?? {};
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const qty = Number(quantity) || 1;
    const unitPrice = unitPriceAud != null ? Number(unitPriceAud) : null;
    const [row] = await db.insert(fipMaterialListItems).values({
      id: randomUUID(),
      listId,
      productId: productId ?? null,
      custom: !!custom,
      name: String(name).slice(0, 300),
      manufacturer: manufacturer ?? null,
      partCode: partCode ?? null,
      category: category ?? null,
      description: description ?? null,
      quantity: String(qty),
      unit: unit ?? "each",
      unitPriceAud: unitPrice != null ? String(unitPrice) : null,
      totalAud: computeTotal(qty, unitPrice) != null ? String(computeTotal(qty, unitPrice)) : null,
      supplierName: supplierName ?? null,
      supplierProductCode: supplierProductCode ?? null,
      sortOrder: Number(req.body?.sortOrder) || 0,
      notes: note ?? null,
    }).returning();
    // Touch the parent list's updated_at
    await db
      .update(fipMaterialLists)
      .set({ updatedAt: new Date() })
      .where(eq(fipMaterialLists.id, listId));
    res.status(201).json(serializeItem(row));
  } catch (err) { next(err); }
});

router.patch("/fip/material-lists/:id/items/:itemId", async (req, res, next) => {
  try {
    const { quantity, unitPriceAud, notes: note, sortOrder } = req.body ?? {};
    const updates: Record<string, any> = {};
    let newQty: number | null = null;
    let newUnitPrice: number | null | undefined;
    if (quantity !== undefined) {
      newQty = Number(quantity) || 0;
      updates.quantity = String(newQty);
    }
    if (unitPriceAud !== undefined) {
      newUnitPrice = unitPriceAud == null ? null : Number(unitPriceAud);
      updates.unitPriceAud = newUnitPrice == null ? null : String(newUnitPrice);
    }
    if (note !== undefined) updates.notes = note;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;

    // Recompute total if either qty or price changed
    if (newQty != null || newUnitPrice !== undefined) {
      const [existing] = await db
        .select()
        .from(fipMaterialListItems)
        .where(eq(fipMaterialListItems.id, req.params.itemId));
      if (existing) {
        const finalQty = newQty ?? Number(existing.quantity ?? 1);
        const finalUnit =
          newUnitPrice !== undefined
            ? newUnitPrice
            : existing.unitPriceAud != null ? Number(existing.unitPriceAud) : null;
        const total = computeTotal(finalQty, finalUnit);
        updates.totalAud = total == null ? null : String(total);
      }
    }

    const [row] = await db
      .update(fipMaterialListItems)
      .set(updates)
      .where(and(eq(fipMaterialListItems.id, req.params.itemId), isNull(fipMaterialListItems.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "item not found" }); return; }
    await db
      .update(fipMaterialLists)
      .set({ updatedAt: new Date() })
      .where(eq(fipMaterialLists.id, req.params.id));
    res.json(serializeItem(row));
  } catch (err) { next(err); }
});

router.delete("/fip/material-lists/:id/items/:itemId", async (req, res, next) => {
  try {
    const [row] = await db
      .update(fipMaterialListItems)
      .set({ deletedAt: new Date() })
      .where(and(eq(fipMaterialListItems.id, req.params.itemId), isNull(fipMaterialListItems.deletedAt)))
      .returning();
    if (!row) { res.status(404).json({ error: "item not found" }); return; }
    res.status(204).end();
  } catch (err) { next(err); }
});

// Save the list as a plain-text note in the existing `notes` table.
// The raw_data carries `kind: 'fip-material-list'` so the notes page
// can identify + filter these specifically later if needed.
router.post("/fip/material-lists/:id/save-as-note", async (req, res, next) => {
  try {
    const listId = req.params.id;
    const [list] = await db
      .select()
      .from(fipMaterialLists)
      .where(and(eq(fipMaterialLists.id, listId), isNull(fipMaterialLists.deletedAt)));
    if (!list) { res.status(404).json({ error: "list not found" }); return; }

    const items = await db
      .select()
      .from(fipMaterialListItems)
      .where(and(eq(fipMaterialListItems.listId, listId), isNull(fipMaterialListItems.deletedAt)))
      .orderBy(asc(fipMaterialListItems.sortOrder), asc(fipMaterialListItems.createdAt));

    // Render the list to plain text
    const lines: string[] = [];
    lines.push(`Material list — ${list.name}`);
    if (list.panelSlug) lines.push(`Panel: ${list.panelSlug}`);
    if (list.siteRef) lines.push(`Site: ${list.siteRef}`);
    if (list.taskRef) lines.push(`Task: ${list.taskRef}`);
    lines.push("");
    let grandTotal = 0;
    for (const item of items) {
      const qty = item.quantity ? Number(item.quantity) : 0;
      const unit = item.unitPriceAud ? Number(item.unitPriceAud) : 0;
      const total = qty * unit;
      grandTotal += total;
      const parts = [
        `- ${qty} × ${item.name}`,
        item.manufacturer ? `(${item.manufacturer})` : "",
        item.partCode ? `[${item.partCode}]` : "",
        unit > 0 ? `@ $${unit.toFixed(2)} = $${total.toFixed(2)}` : "",
      ].filter(Boolean);
      lines.push(parts.join(" "));
      if (item.notes) lines.push(`    note: ${item.notes}`);
    }
    lines.push("");
    lines.push(`TOTAL: $${grandTotal.toFixed(2)}`);
    if (list.notes) {
      lines.push("");
      lines.push(`Notes: ${list.notes}`);
    }

    // The notes table has no rawData/jsonb column, so the metadata
    // is embedded in the text as a tagged header. Downstream readers
    // can regex it out if needed; the human-readable body follows.
    const header = `[fip-material-list list=${list.id} items=${items.length} total=$${grandTotal.toFixed(2)}]`;
    const noteText = [header, ...lines].join("\n").slice(0, 5000);

    const [noteRow] = await db.insert(notes).values({
      id: randomUUID(),
      text: noteText,
      category: "Follow Up",
      owner: list.owner,
      status: "Open",
    }).returning();

    // Mark the list as saved
    await db
      .update(fipMaterialLists)
      .set({ status: "saved", updatedAt: new Date() })
      .where(eq(fipMaterialLists.id, listId));

    res.status(201).json({
      ok: true,
      noteId: noteRow.id,
      listId: list.id,
      itemCount: items.length,
      totalAud: Math.round(grandTotal * 100) / 100,
    });
  } catch (err) { next(err); }
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { suppliers, supplierProducts } from "@workspace/db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const serializeSupplier = (r: typeof suppliers.$inferSelect) => ({
  ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
});
const serializeProduct = (r: typeof supplierProducts.$inferSelect) => ({
  ...r, unitPrice: r.unitPrice ? Number(r.unitPrice) : null,
  createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
});

// --- Suppliers ---
router.get("/suppliers", async (req, res, next) => {
  try {
    const { category, search, rating } = req.query as Record<string, string>;
    const conditions = [];
    if (category) conditions.push(eq(suppliers.category, category));
    if (rating) conditions.push(eq(suppliers.rating, rating));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(suppliers.name, `%${s}%`), ilike(suppliers.contactName!, `%${s}%`), ilike(suppliers.suburb!, `%${s}%`)));
    }
    let query = db.select().from(suppliers).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(suppliers.name);
    res.json(result.map(serializeSupplier));
  } catch (err) { next(err); }
});

router.post("/suppliers", async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(suppliers).values({ id, ...req.body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serializeSupplier(record));
  } catch (err) { next(err); }
});

router.patch("/suppliers/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }
    const [updated] = await db.update(suppliers).set({ ...req.body, updatedAt: new Date() }).where(eq(suppliers.id, req.params.id)).returning();
    res.json(serializeSupplier(updated));
  } catch (err) { next(err); }
});

router.delete("/suppliers/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }
    await db.delete(suppliers).where(eq(suppliers.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

// --- Supplier Products ---
router.get("/suppliers/:supplierId/products", async (req, res, next) => {
  try {
    const { search, category } = req.query as Record<string, string>;
    const conditions = [eq(supplierProducts.supplierId, req.params.supplierId)];
    if (category) conditions.push(eq(supplierProducts.category, category));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(supplierProducts.productName, `%${s}%`), ilike(supplierProducts.productCode!, `%${s}%`), ilike(supplierProducts.brand!, `%${s}%`)));
    }
    const result = await db.select().from(supplierProducts).where(and(...conditions)).orderBy(supplierProducts.productName);
    res.json(result.map(serializeProduct));
  } catch (err) { next(err); }
});

router.get("/suppliers/products/all", async (req, res, next) => {
  try {
    const { search, category } = req.query as Record<string, string>;
    const conditions = [];
    if (category) conditions.push(eq(supplierProducts.category, category));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(supplierProducts.productName, `%${s}%`), ilike(supplierProducts.productCode!, `%${s}%`), ilike(supplierProducts.brand!, `%${s}%`)));
    }
    let query = db.select().from(supplierProducts).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(supplierProducts.productName);
    res.json(result.map(serializeProduct));
  } catch (err) { next(err); }
});

router.post("/suppliers/:supplierId/products", async (req, res, next) => {
  try {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.supplierId));
    if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(supplierProducts).values({ id, supplierId: req.params.supplierId, ...req.body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serializeProduct(record));
  } catch (err) { next(err); }
});

router.post("/suppliers/:supplierId/products/import", async (req, res, next) => {
  try {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.supplierId));
    if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!rows?.length) { res.status(400).json({ error: "No data rows provided" }); return; }
    const batchId = randomUUID();
    const now = new Date();
    const records = rows.map(row => {
      const mapped: Record<string, any> = {};
      for (const [csvCol, dbField] of Object.entries(columnMap)) {
        if (row[csvCol] !== undefined && row[csvCol] !== "") mapped[dbField] = row[csvCol];
      }
      return {
        id: randomUUID(), supplierId: req.params.supplierId,
        productName: mapped.productName || "Unknown Product",
        productCode: mapped.productCode || null, category: mapped.category || null,
        brand: mapped.brand || null, unitPrice: mapped.unitPrice || null,
        unit: mapped.unit || "each", description: mapped.description || null,
        notes: mapped.notes || null, rawData: row, importBatchId: batchId,
        createdAt: now, updatedAt: now,
      };
    });
    const inserted = await db.insert(supplierProducts).values(records).returning();
    res.status(201).json({ imported: inserted.length, batchId, records: inserted.map(serializeProduct) });
  } catch (err) { next(err); }
});

router.patch("/suppliers/products/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(supplierProducts).where(eq(supplierProducts.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
    const [updated] = await db.update(supplierProducts).set({ ...req.body, updatedAt: new Date() }).where(eq(supplierProducts.id, req.params.id)).returning();
    res.json(serializeProduct(updated));
  } catch (err) { next(err); }
});

router.delete("/suppliers/products/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(supplierProducts).where(eq(supplierProducts.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
    await db.delete(supplierProducts).where(eq(supplierProducts.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

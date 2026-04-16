import { Router } from "express";
import { db } from "@workspace/db";
import { suppliers, supplierProducts, changeLogs } from "@workspace/db";
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
    if (category) conditions.push(eq(suppliers.category, category as any));
    if (rating) conditions.push(eq(suppliers.rating, rating as any));
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
    const { name, category, contactName, phone, email, website, address, suburb, accountNumber, paymentTerms, notes, rating } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(suppliers).values({
      id, name: name.trim(), category: category || "General", contactName: contactName || null,
      phone: phone || null, email: email || null, website: website || null,
      address: address || null, suburb: suburb || null, accountNumber: accountNumber || null,
      paymentTerms: paymentTerms || null, notes: notes || null, rating: rating || "Approved",
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json(serializeSupplier(record));
  } catch (err) { next(err); }
});

router.patch("/suppliers/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Supplier not found" }); return; }
    const { name, category, contactName, phone, email, website, address, suburb, accountNumber, paymentTerms, notes, rating } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category;
    if (contactName !== undefined) updates.contactName = contactName || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (website !== undefined) updates.website = website || null;
    if (address !== undefined) updates.address = address || null;
    if (suburb !== undefined) updates.suburb = suburb || null;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber || null;
    if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (rating !== undefined) updates.rating = rating;
    const [updated] = await db.update(suppliers).set(updates).where(eq(suppliers.id, req.params.id)).returning();
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

// --- All Products (MUST be registered BEFORE /:supplierId/products) ---
router.get("/suppliers/products/all", async (req, res, next) => {
  try {
    const { search, category } = req.query as Record<string, string>;
    const conditions = [];
    if (category) conditions.push(eq(supplierProducts.category, category as any));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(supplierProducts.productName, `%${s}%`), ilike(supplierProducts.productCode!, `%${s}%`), ilike(supplierProducts.brand!, `%${s}%`))!);
    }
    let query = db.select().from(supplierProducts).$dynamic();
    if (conditions.length) query = query.where(and(...conditions));
    const result = await query.orderBy(supplierProducts.productName);
    res.json(result.map(serializeProduct));
  } catch (err) { next(err); }
});

// --- Product CRUD (must use /suppliers/products/:id to avoid param conflicts) ---
router.patch("/suppliers/products/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(supplierProducts).where(eq(supplierProducts.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Product not found" }); return; }
    const { productName, productCode, category, brand, unitPrice, unit, description, notes } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (productName !== undefined) updates.productName = productName;
    if (productCode !== undefined) updates.productCode = productCode || null;
    if (category !== undefined) updates.category = category || null;
    if (brand !== undefined) updates.brand = brand || null;
    if (unitPrice !== undefined) updates.unitPrice = unitPrice || null;
    if (unit !== undefined) updates.unit = unit || "each";
    if (description !== undefined) updates.description = description || null;
    if (notes !== undefined) updates.notes = notes || null;
    const [updated] = await db.update(supplierProducts).set(updates).where(eq(supplierProducts.id, req.params.id)).returning();
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

// --- Per-Supplier Products ---
router.get("/suppliers/:supplierId/products", async (req, res, next) => {
  try {
    const { search, category } = req.query as Record<string, string>;
    const conditions = [eq(supplierProducts.supplierId, req.params.supplierId)];
    if (category) conditions.push(eq(supplierProducts.category, category as any));
    if (search) {
      const s = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(ilike(supplierProducts.productName, `%${s}%`), ilike(supplierProducts.productCode!, `%${s}%`), ilike(supplierProducts.brand!, `%${s}%`))!);
    }
    const result = await db.select().from(supplierProducts).where(and(...conditions)).orderBy(supplierProducts.productName);
    res.json(result.map(serializeProduct));
  } catch (err) { next(err); }
});

router.post("/suppliers/:supplierId/products", async (req, res, next) => {
  try {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.supplierId));
    if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
    const { productName, productCode, category, brand, unitPrice, unit, description, notes } = req.body;
    if (!productName?.trim()) { res.status(400).json({ error: "productName is required" }); return; }
    const id = randomUUID();
    const now = new Date();
    const [record] = await db.insert(supplierProducts).values({
      id, supplierId: req.params.supplierId, productName: productName.trim(),
      productCode: productCode || null, category: category || null, brand: brand || null,
      unitPrice: unitPrice || null, unit: unit || "each", description: description || null,
      notes: notes || null, createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json(serializeProduct(record));
  } catch (err) { next(err); }
});

const MAX_IMPORT_ROWS = Number(process.env["MAX_IMPORT_ROWS"]) || 10000;

router.post("/suppliers/:supplierId/products/import", async (req, res, next) => {
  try {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, req.params.supplierId));
    if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!rows?.length) { res.status(400).json({ error: "No data rows provided" }); return; }
    if (rows.length > MAX_IMPORT_ROWS) {
      res.status(413).json({ error: `Too many rows (${rows.length}). Limit is ${MAX_IMPORT_ROWS}.` });
      return;
    }
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
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      await db.insert(supplierProducts).values(chunk);
      totalInserted += chunk.length;
    }
    try {
      await db.insert(changeLogs).values({
        id: randomUUID(), action: "import", table: "supplier_products", batchId,
        rowCount: totalInserted, summary: `Imported ${totalInserted} supplier products from CSV`, createdAt: now,
      });
    } catch { /* change_logs table may not exist yet */ }
    res.status(201).json({ imported: totalInserted, batchId });
  } catch (err) { next(err); }
});

export default router;

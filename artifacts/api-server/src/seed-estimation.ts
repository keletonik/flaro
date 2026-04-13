import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { ESTIMATION_DDL_STATEMENTS } from "./seed-estimation-ddl";
import catalogue from "./seed-products-catalogue.json";

/**
 * Estimation workbench bootstrap.
 *
 * On every startup:
 *   1. Runs the additive DDL (extends supplier_products with cost_price,
 *      sku and active; creates estimates + estimate_lines tables).
 *   2. Imports the 76-supplier / 1 730-product Uptick/FireMate catalogue
 *      from seed-products-catalogue.json. Dedup by:
 *        suppliers         — case-insensitive name
 *        supplier_products — (supplier_id, product_name) when product_code
 *                            is empty, else (supplier_id, product_code)
 *   3. Leaves estimates and estimate_lines untouched (the user builds
 *      those through the UI).
 *
 * Strictly additive. Every existing row is preserved. Never drops or
 * truncates anything.
 */

type Row = Record<string, any>;
interface CatalogueJson {
  suppliers: Row[];
  products: Row[];
}

const data = catalogue as CatalogueJson;
const BATCH_ID = "firemate-products-2026-04-13";

export async function seedEstimationWorkbench(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. DDL — additive, idempotent
    for (const stmt of ESTIMATION_DDL_STATEMENTS) {
      await client.query(stmt);
    }
    logger.info("estimation schema ensured");

    // 2. Batch-level short-circuit: if the FireMate batch is already loaded
    // in full, skip the per-row check below.
    const existingBatch = await client.query(
      "SELECT COUNT(*)::int AS cnt FROM supplier_products WHERE import_batch_id = $1",
      [BATCH_ID],
    );
    if (existingBatch.rows[0].cnt >= data.products.length) {
      logger.info({ batch: BATCH_ID, cnt: existingBatch.rows[0].cnt }, "firemate catalogue already loaded");
      return;
    }

    // 3. Suppliers — dedup by case-insensitive name. Preserve existing
    //    supplier rows (maybe manually-edited) by reusing their id.
    const supplierIdMap = new Map<string, string>(); // seed id -> live id
    let supInserted = 0;
    for (const s of data.suppliers) {
      const existing = await client.query(
        "SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [s.name],
      );
      if (existing.rows.length > 0) {
        supplierIdMap.set(s.id, existing.rows[0].id);
        continue;
      }
      await client.query(
        `INSERT INTO suppliers
         (id, name, category, contact_name, phone, email, website, address, suburb,
          account_number, payment_terms, notes, rating, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT DO NOTHING`,
        [
          s.id, s.name, s.category, s.contact_name, s.phone, s.email, s.website,
          s.address, s.suburb, s.account_number, s.payment_terms, s.notes, s.rating,
          s.created_at, s.updated_at,
        ],
      );
      supplierIdMap.set(s.id, s.id);
      supInserted++;
    }
    logger.info({ inserted: supInserted, total: data.suppliers.length }, "firemate suppliers seeded");

    // 4. Products — dedup by (supplier_id, product_name or product_code)
    let prodInserted = 0;
    let prodSkipped = 0;
    for (const p of data.products) {
      const liveSupplierId = supplierIdMap.get(p.supplier_id) ?? p.supplier_id;
      const existing = p.product_code
        ? await client.query(
            "SELECT 1 FROM supplier_products WHERE supplier_id = $1 AND product_code = $2 LIMIT 1",
            [liveSupplierId, p.product_code],
          )
        : await client.query(
            "SELECT 1 FROM supplier_products WHERE supplier_id = $1 AND product_name = $2 LIMIT 1",
            [liveSupplierId, p.product_name],
          );
      if (existing.rows.length > 0) {
        prodSkipped++;
        continue;
      }
      await client.query(
        `INSERT INTO supplier_products
         (id, supplier_id, product_name, product_code, sku, category, brand,
          cost_price, unit_price, unit, description, notes, active, raw_data,
          import_batch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT DO NOTHING`,
        [
          p.id, liveSupplierId, p.product_name, p.product_code, p.sku, p.category,
          p.brand, p.cost_price, p.unit_price, p.unit, p.description, p.notes,
          p.active, p.raw_data ? JSON.stringify(p.raw_data) : null,
          p.import_batch_id, p.created_at, p.updated_at,
        ],
      );
      prodInserted++;
    }
    logger.info(
      { inserted: prodInserted, skipped: prodSkipped, total: data.products.length },
      "firemate products seeded",
    );
  } catch (err) {
    logger.error({ err }, "estimation seed failed (non-fatal)");
  } finally {
    client.release();
  }
}

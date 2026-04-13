import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import additional from "./seed-additional.json";

/**
 * Additive seed — runs on every startup but NEVER touches existing rows.
 *
 * Data source: seed-additional.json, generated from the Uptick CSV exports
 * and Supplier_Price_List_Master_Updated.xlsx checked into the repo root.
 *
 * Dedup strategy: per-row existence check against a natural key.
 *   - wip_records:      task_number
 *   - quotes:           quote_number
 *   - defects:          raw_data->>'uptick_id' (falls back to skip if null)
 *   - suppliers:        case-insensitive prefix match on name
 *   - supplier_products: (supplier_id, product_code)
 *
 * Each section is wrapped in a batch-level short-circuit so a steady-state
 * restart does at most one count query per table.
 */

type Row = Record<string, any>;

interface SeedData {
  wip_records: Row[];
  quotes: Row[];
  defects: Row[];
  suppliers: Row[];
  supplier_products: Row[];
}

const WIP_BATCH_ID = "uptick-csv-2026-04-13";
const QUOTES_BATCH_ID = "uptick-quotes-2026-04-02";
const DEFECTS_BATCH_ID = "uptick-remarks-2026-04-13";
const PRODUCTS_BATCH_ID = "supplier-xlsx-2026-04-13";

const data = additional as SeedData;

export async function seedAdditionalData(): Promise<void> {
  const client = await pool.connect();
  try {
    await seedWip(client);
    await seedQuotes(client);
    await seedDefects(client);
    const supplierIdMap = await seedSuppliers(client);
    await seedSupplierProducts(client, supplierIdMap);
    logger.info("Additive seed complete");
  } catch (err) {
    logger.error({ err }, "Additive seed failed (non-fatal)");
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WIP
// ─────────────────────────────────────────────────────────────────────────────
async function seedWip(client: any): Promise<void> {
  const rows = data.wip_records;
  if (!rows?.length) return;

  const existingBatch = await client.query(
    "SELECT COUNT(*)::int AS cnt FROM wip_records WHERE import_batch_id = $1",
    [WIP_BATCH_ID],
  );
  if (existingBatch.rows[0].cnt >= rows.length) {
    logger.info({ batch: WIP_BATCH_ID, cnt: existingBatch.rows[0].cnt }, "wip batch already loaded");
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const existing = await client.query(
      "SELECT 1 FROM wip_records WHERE task_number = $1 LIMIT 1",
      [r.task_number],
    );
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }
    await client.query(
      `INSERT INTO wip_records
       (id, task_number, site, address, client, job_type, description, status, priority,
        assigned_tech, due_date, date_created, quote_amount, invoice_amount, po_number,
        notes, raw_data, import_batch_id, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT DO NOTHING`,
      [
        r.id, r.task_number, r.site, r.address, r.client, r.job_type, r.description,
        r.status ?? "Open", r.priority ?? "Medium", r.assigned_tech, r.due_date,
        r.date_created, r.quote_amount, r.invoice_amount, r.po_number, r.notes,
        r.raw_data ? JSON.stringify(r.raw_data) : null, r.import_batch_id,
        r.created_at, r.updated_at, r.deleted_at,
      ],
    );
    inserted++;
  }
  logger.info({ table: "wip_records", inserted, skipped }, "additive seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Quotes
// ─────────────────────────────────────────────────────────────────────────────
async function seedQuotes(client: any): Promise<void> {
  const rows = data.quotes;
  if (!rows?.length) return;

  const existingBatch = await client.query(
    "SELECT COUNT(*)::int AS cnt FROM quotes WHERE import_batch_id = $1",
    [QUOTES_BATCH_ID],
  );
  if (existingBatch.rows[0].cnt >= rows.length) {
    logger.info({ batch: QUOTES_BATCH_ID, cnt: existingBatch.rows[0].cnt }, "quotes batch already loaded");
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const existing = await client.query(
      "SELECT 1 FROM quotes WHERE quote_number = $1 LIMIT 1",
      [r.quote_number],
    );
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }
    await client.query(
      `INSERT INTO quotes
       (id, task_number, quote_number, site, address, client, description, quote_amount,
        status, date_created, date_sent, date_accepted, valid_until, assigned_tech,
        contact_name, contact_email, notes, raw_data, import_batch_id,
        created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT DO NOTHING`,
      [
        r.id, r.task_number, r.quote_number, r.site, r.address, r.client, r.description,
        r.quote_amount, r.status ?? "Draft", r.date_created, r.date_sent, r.date_accepted,
        r.valid_until, r.assigned_tech, r.contact_name, r.contact_email, r.notes,
        r.raw_data ? JSON.stringify(r.raw_data) : null, r.import_batch_id,
        r.created_at, r.updated_at, r.deleted_at,
      ],
    );
    inserted++;
  }
  logger.info({ table: "quotes", inserted, skipped }, "additive seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Defects
// ─────────────────────────────────────────────────────────────────────────────
async function seedDefects(client: any): Promise<void> {
  const rows = data.defects;
  if (!rows?.length) return;

  const existingBatch = await client.query(
    "SELECT COUNT(*)::int AS cnt FROM defects WHERE import_batch_id = $1",
    [DEFECTS_BATCH_ID],
  );
  if (existingBatch.rows[0].cnt >= rows.length) {
    logger.info({ batch: DEFECTS_BATCH_ID, cnt: existingBatch.rows[0].cnt }, "defects batch already loaded");
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const upId = r.raw_data?.uptick_id ?? null;
    // Dedup on uptick remark id stored inside raw_data. Falls back to a
    // task_number + description check when the id isn't available.
    let existing;
    if (upId) {
      existing = await client.query(
        "SELECT 1 FROM defects WHERE raw_data->>'uptick_id' = $1 LIMIT 1",
        [upId],
      );
    } else {
      existing = await client.query(
        "SELECT 1 FROM defects WHERE task_number IS NOT DISTINCT FROM $1 AND description = $2 LIMIT 1",
        [r.task_number, r.description],
      );
    }
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }
    await client.query(
      `INSERT INTO defects
       (id, task_number, site, address, client, description, severity, status,
        building_class, asset_type, location, recommendation, due_date, date_identified,
        notes, raw_data, import_batch_id, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT DO NOTHING`,
      [
        r.id, r.task_number, r.site, r.address, r.client, r.description,
        r.severity ?? "Medium", r.status ?? "Open", r.building_class, r.asset_type,
        r.location, r.recommendation, r.due_date, r.date_identified, r.notes,
        r.raw_data ? JSON.stringify(r.raw_data) : null, r.import_batch_id,
        r.created_at, r.updated_at, r.deleted_at,
      ],
    );
    inserted++;
  }
  logger.info({ table: "defects", inserted, skipped }, "additive seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Suppliers — returns a map of canonical_name → id for use by products step
// ─────────────────────────────────────────────────────────────────────────────
async function seedSuppliers(client: any): Promise<Map<string, string>> {
  const rows = data.suppliers;
  const idMap = new Map<string, string>();
  if (!rows?.length) return idMap;

  for (const r of rows) {
    // Case-insensitive prefix match against existing suppliers.
    const prefix = r.name.toLowerCase().split(/[\s(]/).slice(0, 2).join(" ").trim();
    const existing = await client.query(
      "SELECT id FROM suppliers WHERE LOWER(name) LIKE $1 LIMIT 1",
      [`${prefix}%`],
    );
    if (existing.rows.length > 0) {
      idMap.set(r.id, existing.rows[0].id);
      continue;
    }
    await client.query(
      `INSERT INTO suppliers
       (id, name, category, contact_name, phone, email, website, address, suburb,
        account_number, payment_terms, notes, rating, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT DO NOTHING`,
      [
        r.id, r.name, r.category, r.contact_name, r.phone, r.email, r.website,
        r.address, r.suburb, r.account_number, r.payment_terms, r.notes, r.rating,
        r.created_at, r.updated_at,
      ],
    );
    idMap.set(r.id, r.id);
    logger.info({ supplier: r.name }, "additive seed: supplier inserted");
  }
  return idMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supplier products
// ─────────────────────────────────────────────────────────────────────────────
async function seedSupplierProducts(client: any, supplierIdMap: Map<string, string>): Promise<void> {
  const rows = data.supplier_products;
  if (!rows?.length) return;

  const existingBatch = await client.query(
    "SELECT COUNT(*)::int AS cnt FROM supplier_products WHERE import_batch_id = $1",
    [PRODUCTS_BATCH_ID],
  );
  if (existingBatch.rows[0].cnt >= rows.length) {
    logger.info({ batch: PRODUCTS_BATCH_ID, cnt: existingBatch.rows[0].cnt }, "supplier products batch already loaded");
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const supplierId = supplierIdMap.get(r.supplier_id) ?? r.supplier_id;
    // Dedup on (supplier_id, product_code) when code is present, else by
    // (supplier_id, product_name).
    const existing = r.product_code
      ? await client.query(
          "SELECT 1 FROM supplier_products WHERE supplier_id = $1 AND product_code = $2 LIMIT 1",
          [supplierId, r.product_code],
        )
      : await client.query(
          "SELECT 1 FROM supplier_products WHERE supplier_id = $1 AND product_name = $2 LIMIT 1",
          [supplierId, r.product_name],
        );
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }
    await client.query(
      `INSERT INTO supplier_products
       (id, supplier_id, product_name, product_code, category, brand, unit_price, unit,
        description, notes, raw_data, import_batch_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT DO NOTHING`,
      [
        r.id, supplierId, r.product_name, r.product_code, r.category, r.brand,
        r.unit_price, r.unit ?? "ea", r.description, r.notes,
        r.raw_data ? JSON.stringify(r.raw_data) : null, r.import_batch_id,
        r.created_at, r.updated_at,
      ],
    );
    inserted++;
  }
  logger.info({ table: "supplier_products", inserted, skipped }, "additive seed");
}

import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { FIP_DDL_STATEMENTS } from "./seed-fip-ddl";
import { FIP_V2_DDL_STATEMENTS } from "./seed-fip-v2-ddl";
import fipData from "./seed-fip-data.json";
import { DETECTOR_TYPE_SEED } from "./lib/fip/detector-types-seed";
import { STANDARD_CLAUSE_SEED } from "./lib/fip/standard-clauses-seed";
import { PANEL_DEEP_SPEC_SEED } from "./lib/fip/panels-deep-spec-seed";
import { COMMON_PRODUCT_SEED } from "./lib/fip/common-products-seed";

/**
 * FIP / VESDA technical knowledge bootstrap.
 *
 * Runs on every startup. Strictly additive:
 *   1. CREATE TABLE IF NOT EXISTS for all 22 fip_* tables and their indices.
 *   2. INSERT ... WHERE NOT EXISTS for the V2 Master Pack seed data.
 *
 * Data source: artifacts/api-server/src/seed-fip-data.json, pre-parsed from
 * FIP_MASTER_PACK_V2.zip (checked in at repo root).
 *
 * Dedup keys:
 *   fip_manufacturers        — slug
 *   fip_product_families     — (manufacturer_id, slug)
 *   fip_models               — slug
 *   fip_source_locations     — uri
 *   fip_documents            — title
 *   fip_document_versions    — document_id (one per document)
 *   fip_standards            — code
 *   fip_audit_runs           — audit_name
 *
 * Errors are logged and swallowed so a bootstrap failure never crashes the
 * server. The FIP routes remain gated by FIP_ENABLED=1 — this function only
 * prepares the storage and data so the toggle has something to serve.
 */

type Row = Record<string, any>;
interface FipSeedData {
  manufacturers: Row[];
  product_families: Row[];
  models: Row[];
  source_locations: Row[];
  documents: Row[];
  document_versions: Row[];
  standards: Row[];
  audit_runs: Row[];
}

const data = fipData as FipSeedData;

export async function seedFipKnowledgeBase(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Schema bootstrap — additive, idempotent.
    for (const stmt of FIP_DDL_STATEMENTS) {
      await client.query(stmt);
    }
    // FIP v2.0 command-centre additions: deep spec columns on
    // fip_models + new fip_common_products table.
    for (const stmt of FIP_V2_DDL_STATEMENTS) {
      await client.query(stmt);
    }
    logger.info({ tables: "fip_*" }, "FIP schema ensured (v2.0)");

    // 2. Per-table seed with natural-key dedup.
    await seedManufacturers(client);
    const familyIdMap = await seedFamilies(client);
    const modelIdMap = await seedModels(client, familyIdMap);
    const locationIdMap = await seedSourceLocations(client);
    const documentIdMap = await seedDocuments(client, familyIdMap, modelIdMap);
    await seedDocumentVersions(client, documentIdMap, locationIdMap);
    await seedStandards(client);
    await seedAuditRuns(client);
    await seedDetectorTypes(client);
    await seedStandardClauses(client);
    await seedPanelDeepSpecs(client);
    await seedCommonProducts(client);

    logger.info("FIP knowledge base seed complete");
  } catch (err) {
    logger.error({ err }, "FIP seed failed (non-fatal)");
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manufacturers — dedup by slug
// ─────────────────────────────────────────────────────────────────────────────
async function seedManufacturers(client: any): Promise<void> {
  let inserted = 0;
  for (const r of data.manufacturers) {
    const existing = await client.query(
      "SELECT 1 FROM fip_manufacturers WHERE slug = $1 LIMIT 1",
      [r.slug],
    );
    if (existing.rows.length > 0) continue;
    await client.query(
      `INSERT INTO fip_manufacturers
       (id, name, slug, country, website, notes, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (slug) DO NOTHING`,
      [r.id, r.name, r.slug, r.country, r.website, r.notes, r.created_at, r.updated_at, r.deleted_at],
    );
    inserted++;
  }
  logger.info({ table: "fip_manufacturers", inserted }, "fip seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Families — dedup by (manufacturer_slug, family_slug).
// Returns a map from the JSON's manufacturer_id → the live DB manufacturer id,
// plus a map from the JSON's family id → the live DB family id.
// ─────────────────────────────────────────────────────────────────────────────
async function seedFamilies(client: any): Promise<Map<string, string>> {
  const familyIdMap = new Map<string, string>();

  // Build a (mfr slug → live id) lookup for the canonical manufacturer ids.
  const mfrLookup = new Map<string, string>();
  for (const r of data.manufacturers) {
    const live = await client.query(
      "SELECT id FROM fip_manufacturers WHERE slug = $1 LIMIT 1",
      [r.slug],
    );
    if (live.rows.length > 0) mfrLookup.set(r.id, live.rows[0].id);
  }

  let inserted = 0;
  for (const r of data.product_families) {
    const liveMfrId = mfrLookup.get(r.manufacturer_id);
    if (!liveMfrId) continue;
    const existing = await client.query(
      "SELECT id FROM fip_product_families WHERE manufacturer_id = $1 AND slug = $2 LIMIT 1",
      [liveMfrId, r.slug],
    );
    if (existing.rows.length > 0) {
      familyIdMap.set(r.id, existing.rows[0].id);
      continue;
    }
    await client.query(
      `INSERT INTO fip_product_families
       (id, manufacturer_id, name, slug, category, description, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.id, liveMfrId, r.name, r.slug, r.category, r.description, r.created_at, r.updated_at, r.deleted_at],
    );
    familyIdMap.set(r.id, r.id);
    inserted++;
  }
  logger.info({ table: "fip_product_families", inserted }, "fip seed");
  return familyIdMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Models — dedup by slug
// ─────────────────────────────────────────────────────────────────────────────
async function seedModels(client: any, familyIdMap: Map<string, string>): Promise<Map<string, string>> {
  const modelIdMap = new Map<string, string>();

  // Manufacturer lookup for the models' mfr_id column.
  const mfrLookup = new Map<string, string>();
  for (const r of data.manufacturers) {
    const live = await client.query(
      "SELECT id FROM fip_manufacturers WHERE slug = $1 LIMIT 1",
      [r.slug],
    );
    if (live.rows.length > 0) mfrLookup.set(r.id, live.rows[0].id);
  }

  let inserted = 0;
  for (const r of data.models) {
    const existing = await client.query(
      "SELECT id FROM fip_models WHERE slug = $1 LIMIT 1",
      [r.slug],
    );
    if (existing.rows.length > 0) {
      modelIdMap.set(r.id, existing.rows[0].id);
      continue;
    }
    const liveFamily = familyIdMap.get(r.family_id) ?? r.family_id;
    const liveMfr = mfrLookup.get(r.manufacturer_id) ?? r.manufacturer_id;
    await client.query(
      `INSERT INTO fip_models
       (id, family_id, manufacturer_id, name, model_number, slug, description, years_active,
        status, image_checksum, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        r.id, liveFamily, liveMfr, r.name, r.model_number, r.slug, r.description, r.years_active,
        r.status ?? "current", r.image_checksum, r.created_at, r.updated_at, r.deleted_at,
      ],
    );
    modelIdMap.set(r.id, r.id);
    inserted++;
  }
  logger.info({ table: "fip_models", inserted }, "fip seed");
  return modelIdMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source locations — dedup by uri
// ─────────────────────────────────────────────────────────────────────────────
async function seedSourceLocations(client: any): Promise<Map<string, string>> {
  const locationIdMap = new Map<string, string>();
  let inserted = 0;
  for (const r of data.source_locations) {
    if (r.uri) {
      const existing = await client.query(
        "SELECT id FROM fip_source_locations WHERE uri = $1 LIMIT 1",
        [r.uri],
      );
      if (existing.rows.length > 0) {
        locationIdMap.set(r.id, existing.rows[0].id);
        continue;
      }
    }
    await client.query(
      `INSERT INTO fip_source_locations
       (id, kind, uri, bucket, key, checksum, size, content_type, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.id, r.kind, r.uri, r.bucket, r.key, r.checksum, r.size, r.content_type, r.created_at],
    );
    locationIdMap.set(r.id, r.id);
    inserted++;
  }
  logger.info({ table: "fip_source_locations", inserted }, "fip seed");
  return locationIdMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents — dedup by title
// ─────────────────────────────────────────────────────────────────────────────
async function seedDocuments(
  client: any,
  familyIdMap: Map<string, string>,
  modelIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  const documentIdMap = new Map<string, string>();

  const mfrLookup = new Map<string, string>();
  for (const r of data.manufacturers) {
    const live = await client.query(
      "SELECT id FROM fip_manufacturers WHERE slug = $1 LIMIT 1",
      [r.slug],
    );
    if (live.rows.length > 0) mfrLookup.set(r.id, live.rows[0].id);
  }

  let inserted = 0;
  for (const r of data.documents) {
    const existing = await client.query(
      "SELECT id FROM fip_documents WHERE title = $1 LIMIT 1",
      [r.title],
    );
    if (existing.rows.length > 0) {
      documentIdMap.set(r.id, existing.rows[0].id);
      continue;
    }
    const liveMfr = r.manufacturer_id ? (mfrLookup.get(r.manufacturer_id) ?? r.manufacturer_id) : null;
    const liveFam = r.family_id ? (familyIdMap.get(r.family_id) ?? r.family_id) : null;
    const liveModel = r.model_id ? (modelIdMap.get(r.model_id) ?? r.model_id) : null;
    await client.query(
      `INSERT INTO fip_documents
       (id, title, kind, manufacturer_id, family_id, model_id, component_id, language,
        publication_date, latest_version_id, tags, notes, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        r.id, r.title, r.kind, liveMfr, liveFam, liveModel, r.component_id, r.language ?? "en",
        r.publication_date, r.latest_version_id, r.tags ?? [], r.notes,
        r.created_at, r.updated_at, r.deleted_at,
      ],
    );
    documentIdMap.set(r.id, r.id);
    inserted++;
  }
  logger.info({ table: "fip_documents", inserted }, "fip seed");
  return documentIdMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document versions — dedup by document_id (one canonical version per doc)
// ─────────────────────────────────────────────────────────────────────────────
async function seedDocumentVersions(
  client: any,
  documentIdMap: Map<string, string>,
  locationIdMap: Map<string, string>,
): Promise<void> {
  let inserted = 0;
  for (const r of data.document_versions) {
    const liveDocId = documentIdMap.get(r.document_id) ?? r.document_id;
    const existing = await client.query(
      "SELECT 1 FROM fip_document_versions WHERE document_id = $1 LIMIT 1",
      [liveDocId],
    );
    if (existing.rows.length > 0) continue;
    const liveLocId = locationIdMap.get(r.source_location_id) ?? r.source_location_id;
    await client.query(
      `INSERT INTO fip_document_versions
       (id, document_id, version_label, source_location_id, page_count,
        ingested_at, ingest_status, ingest_error, blob, created_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        r.id, liveDocId, r.version_label, liveLocId, r.page_count,
        r.ingested_at, r.ingest_status ?? "pending", r.ingest_error, null,
        r.created_at, r.deleted_at,
      ],
    );
    inserted++;
  }
  logger.info({ table: "fip_document_versions", inserted }, "fip seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Standards — dedup by code (unique in schema)
// ─────────────────────────────────────────────────────────────────────────────
async function seedStandards(client: any): Promise<void> {
  let inserted = 0;
  for (const r of data.standards) {
    const existing = await client.query(
      "SELECT 1 FROM fip_standards WHERE code = $1 LIMIT 1",
      [r.code],
    );
    if (existing.rows.length > 0) continue;
    await client.query(
      `INSERT INTO fip_standards
       (id, code, title, jurisdiction, year, current_version, superseded_by, notes,
        created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (code) DO NOTHING`,
      [
        r.id, r.code, r.title, r.jurisdiction, r.year, r.current_version,
        r.superseded_by, r.notes, r.created_at, r.updated_at, r.deleted_at,
      ],
    );
    inserted++;
  }
  logger.info({ table: "fip_standards", inserted }, "fip seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit runs — dedup by audit_name
// ─────────────────────────────────────────────────────────────────────────────
async function seedAuditRuns(client: any): Promise<void> {
  let inserted = 0;
  for (const r of data.audit_runs) {
    const existing = await client.query(
      "SELECT 1 FROM fip_audit_runs WHERE audit_name = $1 LIMIT 1",
      [r.audit_name],
    );
    if (existing.rows.length > 0) continue;
    await client.query(
      `INSERT INTO fip_audit_runs
       (id, audit_name, scope, passed, failed_checks, warnings, blockers,
        metrics, next_actions, started_at, finished_at, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        r.id, r.audit_name, r.scope, r.passed,
        JSON.stringify(r.failed_checks ?? []),
        JSON.stringify(r.warnings ?? []),
        JSON.stringify(r.blockers ?? []),
        JSON.stringify(r.metrics ?? {}),
        JSON.stringify(r.next_actions ?? []),
        r.started_at, r.finished_at, r.duration_ms,
      ],
    );
    inserted++;
  }
  logger.info({ table: "fip_audit_runs", inserted }, "fip seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector type reference library — dedup by slug.
// ─────────────────────────────────────────────────────────────────────────────
async function seedDetectorTypes(client: any): Promise<void> {
  let inserted = 0;
  let updated = 0;
  for (const d of DETECTOR_TYPE_SEED) {
    const existing = await client.query(
      "SELECT id FROM fip_detector_types WHERE slug = $1 LIMIT 1",
      [d.slug],
    );
    if (existing.rows.length > 0) {
      // Re-write technical content on every boot so edits to the TS seed
      // land without a destructive migration. Never touches created_at.
      await client.query(
        `UPDATE fip_detector_types SET
           name = $1, category = $2, summary = $3,
           operating_principle = $4, sensing_technology = $5,
           typical_applications = $6, unsuitable_applications = $7,
           installation_requirements = $8, failure_modes = $9,
           test_procedure = $10, maintenance = $11,
           standards_refs = $12, example_models = $13,
           life_span_years = $14, cost_band = $15, addressable = $16,
           updated_at = now()
         WHERE slug = $17`,
        [
          d.name, d.category, d.summary,
          d.operatingPrinciple, d.sensingTechnology,
          JSON.stringify(d.typicalApplications),
          JSON.stringify(d.unsuitableApplications),
          d.installationRequirements,
          JSON.stringify(d.failureModes),
          d.testProcedure, d.maintenance,
          JSON.stringify(d.standardsRefs),
          JSON.stringify(d.exampleModels),
          d.lifeSpanYears, d.costBand, d.addressable,
          d.slug,
        ],
      );
      updated++;
      continue;
    }
    await client.query(
      `INSERT INTO fip_detector_types
       (id, slug, name, category, summary, operating_principle, sensing_technology,
        typical_applications, unsuitable_applications, installation_requirements,
        failure_modes, test_procedure, maintenance, standards_refs, example_models,
        life_span_years, cost_band, addressable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        randomUUID(), d.slug, d.name, d.category, d.summary,
        d.operatingPrinciple, d.sensingTechnology,
        JSON.stringify(d.typicalApplications),
        JSON.stringify(d.unsuitableApplications),
        d.installationRequirements,
        JSON.stringify(d.failureModes),
        d.testProcedure, d.maintenance,
        JSON.stringify(d.standardsRefs),
        JSON.stringify(d.exampleModels),
        d.lifeSpanYears, d.costBand, d.addressable,
      ],
    );
    inserted++;
  }
  logger.info({ table: "fip_detector_types", inserted, updated }, "fip seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard clauses — dedup by (standardCode, clauseNumber).
// ─────────────────────────────────────────────────────────────────────────────
async function seedStandardClauses(client: any): Promise<void> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const c of STANDARD_CLAUSE_SEED) {
    const stdRow = await client.query(
      "SELECT id FROM fip_standards WHERE code = $1 LIMIT 1",
      [c.standardCode],
    );
    if (stdRow.rows.length === 0) {
      skipped++;
      continue;
    }
    const standardId = stdRow.rows[0].id;
    const existing = await client.query(
      "SELECT id FROM fip_standard_clauses WHERE standard_id = $1 AND clause_number = $2 LIMIT 1",
      [standardId, c.clauseNumber],
    );
    if (existing.rows.length > 0) {
      await client.query(
        "UPDATE fip_standard_clauses SET title = $1, content = $2, keywords = $3 WHERE id = $4",
        [c.title, c.summary, c.keywords, existing.rows[0].id],
      );
      updated++;
      continue;
    }
    await client.query(
      `INSERT INTO fip_standard_clauses
       (id, standard_id, clause_number, title, content, keywords)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), standardId, c.clauseNumber, c.title, c.summary, c.keywords],
    );
    inserted++;
  }
  logger.info({ table: "fip_standard_clauses", inserted, updated, skipped }, "fip seed");
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel deep specs — upsert rich technical detail onto fip_models.
//
// Natural key: slug. If the slug already exists (e.g. the base FIP seed
// pack created the row), we UPDATE the deep-spec columns in place. If
// the slug doesn't exist, we CREATE the fip_models row from scratch —
// that also means finding/creating the fip_manufacturers row and a
// placeholder fip_product_families row, because fip_models has
// NOT NULL foreign keys on both.
//
// This is the fix for the silent-skip bug where deep specs were keyed
// on clean slugs (pertronic-f220) but the base seed pack used ugly
// slugs (pertronic-f220-f220-fire-system), causing every row to be
// skipped and every datasheet field to render as "N/A" in the UI.
// ─────────────────────────────────────────────────────────────────────────────
async function seedPanelDeepSpecs(client: any): Promise<void> {
  let updatedExisting = 0;
  let insertedNew = 0;
  const mfrCache = new Map<string, string>();   // name-lower → mfr id
  const famCache = new Map<string, string>();   // mfr id → family id

  async function findOrCreateManufacturer(name: string): Promise<string> {
    const key = name.toLowerCase();
    const cached = mfrCache.get(key);
    if (cached) return cached;
    // Case-insensitive name lookup — matches "Pertronic" to an existing
    // "pertronic" / "Pertronic Fire Systems" row from the base pack.
    const live = await client.query(
      "SELECT id FROM fip_manufacturers WHERE LOWER(name) = $1 OR slug = $2 LIMIT 1",
      [key, slugify(name)],
    );
    if (live.rows.length > 0) {
      mfrCache.set(key, live.rows[0].id);
      return live.rows[0].id;
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO fip_manufacturers (id, name, slug, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now())`,
      [id, name, slugify(name)],
    );
    mfrCache.set(key, id);
    return id;
  }

  async function findOrCreatePlaceholderFamily(mfrId: string, mfrName: string): Promise<string> {
    const cached = famCache.get(mfrId);
    if (cached) return cached;
    const familySlug = `${slugify(mfrName)}-panels`;
    const live = await client.query(
      `SELECT id FROM fip_product_families
       WHERE manufacturer_id = $1 AND slug = $2 LIMIT 1`,
      [mfrId, familySlug],
    );
    if (live.rows.length > 0) {
      famCache.set(mfrId, live.rows[0].id);
      return live.rows[0].id;
    }
    // No placeholder family yet — reuse any existing family for this
    // manufacturer so we don't fragment the family list.
    const existingAny = await client.query(
      `SELECT id FROM fip_product_families
       WHERE manufacturer_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
      [mfrId],
    );
    if (existingAny.rows.length > 0) {
      famCache.set(mfrId, existingAny.rows[0].id);
      return existingAny.rows[0].id;
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO fip_product_families
       (id, manufacturer_id, name, slug, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())`,
      [id, mfrId, `${mfrName} Fire Panels`, familySlug, "fire-panel"],
    );
    famCache.set(mfrId, id);
    return id;
  }

  for (const spec of PANEL_DEEP_SPEC_SEED) {
    let modelRow = await client.query(
      "SELECT id FROM fip_models WHERE slug = $1 LIMIT 1",
      [spec.slug],
    );
    let modelId: string;
    if (modelRow.rows.length === 0) {
      // Model row doesn't exist — create it along with any missing
      // manufacturer / family rows it depends on.
      const mfrId = await findOrCreateManufacturer(spec.manufacturerName);
      const familyId = await findOrCreatePlaceholderFamily(mfrId, spec.manufacturerName);
      modelId = randomUUID();
      await client.query(
        `INSERT INTO fip_models
         (id, family_id, manufacturer_id, name, slug, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'current', now(), now())`,
        [modelId, familyId, mfrId, spec.displayName, spec.slug],
      );
      insertedNew++;
    } else {
      modelId = modelRow.rows[0].id;
      updatedExisting++;
    }

    await client.query(
      `UPDATE fip_models SET
         max_loops = $1,
         devices_per_loop = $2,
         loop_protocol = $3,
         network_capable = $4,
         max_networked_panels = $5,
         battery_standby_ah = $6,
         battery_alarm_ah = $7,
         recommended_battery_size = $8,
         config_options = $9,
         approvals = $10,
         commissioning_notes = $11,
         typical_price_band = $12,
         dimensions_mm = $13,
         weight_kg = $14,
         ip_rating = $15,
         operating_temp_c = $16,
         operating_humidity_pct = $17,
         mains_supply = $18,
         psu_output_a = $19,
         aux_current_budget_ma = $20,
         max_zones = $21,
         relay_outputs = $22,
         supervised_nacs = $23,
         led_mimic_channels = $24,
         lcd_lines = $25,
         event_log_capacity = $26,
         cause_effect_support = $27,
         warranty_years = $28,
         remote_access = $29,
         loop_cable_spec = $30,
         datasheet_url = $31,
         source_notes = $32,
         updated_at = now()
       WHERE id = $33`,
      [
        spec.maxLoops,
        spec.devicesPerLoop,
        spec.loopProtocol,
        spec.networkCapable,
        spec.maxNetworkedPanels,
        spec.batteryStandbyAh,
        spec.batteryAlarmAh,
        spec.recommendedBatterySize,
        JSON.stringify(spec.configOptions),
        JSON.stringify(spec.approvals),
        spec.commissioningNotes,
        spec.typicalPriceBand,
        spec.dimensionsMm ?? null,
        spec.weightKg ?? null,
        spec.ipRating ?? null,
        spec.operatingTempC ?? null,
        spec.operatingHumidityPct ?? null,
        spec.mainsSupply ?? null,
        spec.psuOutputA ?? null,
        spec.auxCurrentBudgetMa ?? null,
        spec.maxZones ?? null,
        spec.relayOutputs ?? null,
        spec.supervisedNacs ?? null,
        spec.ledMimicChannels ?? null,
        spec.lcdLines ?? null,
        spec.eventLogCapacity ?? null,
        spec.causeEffectSupport ?? null,
        spec.warrantyYears ?? null,
        spec.remoteAccess ?? null,
        spec.loopCableSpec ?? null,
        spec.datasheetUrl ?? null,
        spec.sourceNotes ?? null,
        modelId,
      ],
    );
  }
  logger.info(
    { table: "fip_models", updatedExisting, insertedNew, feature: "deep_spec" },
    "fip seed",
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Common fire-protection products — curated everyday items catalogue.
// Dedup by (part_code, manufacturer). Falls back to (name, manufacturer)
// when part_code is null.
// ─────────────────────────────────────────────────────────────────────────────
async function seedCommonProducts(client: any): Promise<void> {
  let inserted = 0;
  let updated = 0;
  for (const p of COMMON_PRODUCT_SEED) {
    const byCode = p.partCode
      ? await client.query(
          "SELECT id FROM fip_common_products WHERE part_code = $1 AND manufacturer = $2 AND deleted_at IS NULL LIMIT 1",
          [p.partCode, p.manufacturer],
        )
      : await client.query(
          "SELECT id FROM fip_common_products WHERE name = $1 AND manufacturer = $2 AND deleted_at IS NULL LIMIT 1",
          [p.name, p.manufacturer],
        );
    if (byCode.rows.length > 0) {
      await client.query(
        `UPDATE fip_common_products SET
           name = $1, description = $2, unit = $3, price_band = $4,
           indicative_price_aud = $5, notes = $6,
           compatible_panel_slugs = $7, updated_at = now()
         WHERE id = $8`,
        [
          p.name, p.description, p.unit, p.priceBand,
          p.indicativePriceAud, p.notes,
          p.compatiblePanelSlugs ? JSON.stringify(p.compatiblePanelSlugs) : null,
          byCode.rows[0].id,
        ],
      );
      updated++;
      continue;
    }
    await client.query(
      `INSERT INTO fip_common_products
       (id, category, name, manufacturer, part_code, description, unit,
        price_band, indicative_price_aud, notes, compatible_panel_slugs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        randomUUID(),
        p.category,
        p.name,
        p.manufacturer,
        p.partCode,
        p.description,
        p.unit,
        p.priceBand,
        p.indicativePriceAud,
        p.notes,
        p.compatiblePanelSlugs ? JSON.stringify(p.compatiblePanelSlugs) : null,
      ],
    );
    inserted++;
  }
  logger.info({ table: "fip_common_products", inserted, updated }, "fip seed");
}

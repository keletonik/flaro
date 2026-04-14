/**
 * FIP v2.0 additive DDL — Command Centre rebuild.
 *
 * Extends fip_models with deep technical spec columns and adds a
 * new fip_common_products curated-items table. Runs on every boot
 * alongside the existing FIP DDL. Strictly additive, idempotent.
 *
 * Order matters here — the ALTER statements need fip_models to
 * exist (which is guaranteed by FIP_DDL_STATEMENTS running first
 * in the boot sequence).
 */

export const FIP_V2_DDL_STATEMENTS: string[] = [
  // ── Deep spec columns on fip_models ─────────────────────────────
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS max_loops integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS devices_per_loop integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS loop_protocol text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS network_capable boolean`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS max_networked_panels integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS battery_standby_ah numeric(6,2)`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS battery_alarm_ah numeric(6,2)`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS recommended_battery_size text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS config_options jsonb`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS approvals jsonb`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS commissioning_notes text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS typical_price_band text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS hero_image text`,

  // ── fip_common_products table ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS fip_common_products (
     id text PRIMARY KEY,
     category text NOT NULL,
     name text NOT NULL,
     manufacturer text,
     part_code text,
     description text,
     unit text DEFAULT 'each',
     price_band text DEFAULT 'N/A',
     indicative_price_aud numeric(10,2),
     notes text,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS fip_common_products_category_idx ON fip_common_products (category)`,
  `CREATE INDEX IF NOT EXISTS fip_common_products_manufacturer_idx ON fip_common_products (manufacturer)`,
  `CREATE INDEX IF NOT EXISTS fip_common_products_deleted_idx ON fip_common_products (deleted_at)`,
];

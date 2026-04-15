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

  // FIP v2.1 deep spec expansion — dimensions, power, environmental,
  // approvals, datasheet sourcing.
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS dimensions_mm text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS weight_kg numeric(6,2)`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS ip_rating text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS operating_temp_c text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS operating_humidity_pct text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS mains_supply text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS psu_output_a numeric(6,2)`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS aux_current_budget_ma integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS max_zones integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS relay_outputs integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS supervised_nacs integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS led_mimic_channels integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS lcd_lines integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS event_log_capacity integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS cause_effect_support boolean`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS warranty_years integer`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS remote_access text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS loop_cable_spec text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS spare_drafting_text text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS datasheet_url text`,
  `ALTER TABLE fip_models ADD COLUMN IF NOT EXISTS source_notes text`,

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

  // v2.1 — panel compatibility filter on common products
  `ALTER TABLE fip_common_products ADD COLUMN IF NOT EXISTS compatible_panel_slugs jsonb`,

  // v2.1 — operator saved material lists
  `CREATE TABLE IF NOT EXISTS fip_material_lists (
     id text PRIMARY KEY,
     name text NOT NULL,
     owner text NOT NULL DEFAULT 'casper',
     panel_slug text,
     site_ref text,
     task_ref text,
     notes text,
     status text NOT NULL DEFAULT 'open',
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS fip_material_lists_owner_idx ON fip_material_lists (owner)`,
  `CREATE INDEX IF NOT EXISTS fip_material_lists_panel_idx ON fip_material_lists (panel_slug)`,
  `CREATE INDEX IF NOT EXISTS fip_material_lists_status_idx ON fip_material_lists (status)`,
  `CREATE INDEX IF NOT EXISTS fip_material_lists_deleted_idx ON fip_material_lists (deleted_at)`,

  `CREATE TABLE IF NOT EXISTS fip_material_list_items (
     id text PRIMARY KEY,
     list_id text NOT NULL,
     product_id text,
     custom boolean NOT NULL DEFAULT false,
     name text NOT NULL,
     manufacturer text,
     part_code text,
     category text,
     description text,
     quantity numeric(10,2) NOT NULL DEFAULT 1,
     unit text DEFAULT 'each',
     unit_price_aud numeric(10,2),
     total_aud numeric(12,2),
     supplier_name text,
     supplier_product_code text,
     sort_order integer NOT NULL DEFAULT 0,
     notes text,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS fip_material_list_items_list_idx ON fip_material_list_items (list_id)`,
  `CREATE INDEX IF NOT EXISTS fip_material_list_items_product_idx ON fip_material_list_items (product_id)`,
  `CREATE INDEX IF NOT EXISTS fip_material_list_items_deleted_idx ON fip_material_list_items (deleted_at)`,
];

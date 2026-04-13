/**
 * Additive DDL for the estimation workbench.
 *
 * Extends supplier_products with a cost_price column (the raw cost from
 * the supplier, separate from unit_price which is the sell price), and
 * creates two new tables for the estimate builder:
 *
 *   estimates       — the header row: client, site, project, markup
 *                     strategy, totals
 *   estimate_lines  — one row per line item on an estimate, referencing
 *                     either a supplier_products row or a free-form
 *                     description for labour / misc
 *
 * Everything is additive — every statement is CREATE TABLE IF NOT
 * EXISTS / CREATE INDEX IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF
 * NOT EXISTS, so running this on a database that already has the
 * columns/tables is a no-op.
 */

export const ESTIMATION_DDL_STATEMENTS: string[] = [
  // ── extend supplier_products ─────────────────────────────────────────────
  `ALTER TABLE supplier_products
     ADD COLUMN IF NOT EXISTS cost_price numeric(12,2)`,
  `ALTER TABLE supplier_products
     ADD COLUMN IF NOT EXISTS sku text`,
  `ALTER TABLE supplier_products
     ADD COLUMN IF NOT EXISTS active boolean DEFAULT true NOT NULL`,
  `CREATE INDEX IF NOT EXISTS supplier_products_active_idx
     ON supplier_products (active)`,

  // ── estimates ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS estimates (
    id text PRIMARY KEY,
    number text NOT NULL,
    title text NOT NULL,
    client text,
    site text,
    project text,
    contact_name text,
    contact_email text,
    status text DEFAULT 'Draft' NOT NULL,
    default_markup_pct numeric(6,2) DEFAULT 40.00 NOT NULL,
    labour_rate numeric(10,2) DEFAULT 120.00 NOT NULL,
    gst_rate numeric(5,2) DEFAULT 10.00 NOT NULL,
    subtotal_cost numeric(14,2) DEFAULT 0 NOT NULL,
    subtotal_sell numeric(14,2) DEFAULT 0 NOT NULL,
    margin_total numeric(14,2) DEFAULT 0 NOT NULL,
    gst_total numeric(14,2) DEFAULT 0 NOT NULL,
    grand_total numeric(14,2) DEFAULT 0 NOT NULL,
    notes text,
    valid_until text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS estimates_status_idx ON estimates (status)`,
  `CREATE INDEX IF NOT EXISTS estimates_client_idx ON estimates (client)`,
  `CREATE INDEX IF NOT EXISTS estimates_created_at_idx ON estimates (created_at)`,
  `CREATE INDEX IF NOT EXISTS estimates_deleted_idx ON estimates (deleted_at)`,

  // ── estimate_lines ───────────────────────────────────────────────────────
  // kind='product' | 'labour' | 'misc'. product_id is nullable so you can
  // add labour or free-form lines without needing a catalogue row.
  `CREATE TABLE IF NOT EXISTS estimate_lines (
    id text PRIMARY KEY,
    estimate_id text NOT NULL,
    kind text DEFAULT 'product' NOT NULL,
    product_id text,
    product_code text,
    description text NOT NULL,
    supplier_name text,
    category text,
    quantity numeric(12,3) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'each' NOT NULL,
    cost_price numeric(12,2) DEFAULT 0 NOT NULL,
    markup_pct numeric(6,2) DEFAULT 40.00 NOT NULL,
    sell_price numeric(12,2) DEFAULT 0 NOT NULL,
    line_cost numeric(14,2) DEFAULT 0 NOT NULL,
    line_sell numeric(14,2) DEFAULT 0 NOT NULL,
    line_margin numeric(14,2) DEFAULT 0 NOT NULL,
    position integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS estimate_lines_estimate_idx ON estimate_lines (estimate_id)`,
  `CREATE INDEX IF NOT EXISTS estimate_lines_product_idx ON estimate_lines (product_id)`,
  `CREATE INDEX IF NOT EXISTS estimate_lines_deleted_idx ON estimate_lines (deleted_at)`,
];

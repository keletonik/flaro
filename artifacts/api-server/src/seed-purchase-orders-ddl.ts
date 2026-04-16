/**
 * Additive DDL for the purchase_orders table.
 *
 * Runs on every startup. Strictly additive — CREATE TABLE IF NOT EXISTS
 * and CREATE INDEX IF NOT EXISTS so re-running is a no-op.
 *
 * Mirrors lib/db/src/schema/purchase-orders.ts.
 */

export const PURCHASE_ORDERS_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS purchase_orders (
     id text PRIMARY KEY,
     po_number text NOT NULL,
     client text NOT NULL,
     site text,
     amount numeric(12, 2),
     status text NOT NULL DEFAULT 'Received',
     defect_id text,
     quote_id text,
     quote_number text,
     task_number text,
     email_subject text,
     email_from text,
     email_received_at timestamp with time zone,
     email_body text,
     approved_at timestamp with time zone,
     approved_by text,
     checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
     notes text,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON purchase_orders (status)`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_client_idx ON purchase_orders (client)`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_po_number_idx ON purchase_orders (po_number)`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_defect_id_idx ON purchase_orders (defect_id)`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_quote_id_idx ON purchase_orders (quote_id)`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_task_number_idx ON purchase_orders (task_number)`,
  `CREATE INDEX IF NOT EXISTS purchase_orders_created_at_idx ON purchase_orders (created_at)`,
];

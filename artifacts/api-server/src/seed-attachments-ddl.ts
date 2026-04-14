/**
 * Additive DDL for the attachments table.
 *
 * Runs on boot alongside seed-pa-ddl. Strictly additive: CREATE TABLE
 * IF NOT EXISTS + CREATE INDEX IF NOT EXISTS. Never drops.
 */

export const ATTACHMENTS_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS attachments (
     id text PRIMARY KEY,
     kind text NOT NULL,
     filename text,
     content_type text NOT NULL,
     size integer NOT NULL,
     checksum text NOT NULL,
     blob bytea NOT NULL,
     source text,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     deleted_at timestamp with time zone
   )`,
  `CREATE INDEX IF NOT EXISTS attachments_kind_idx ON attachments (kind)`,
  `CREATE INDEX IF NOT EXISTS attachments_checksum_idx ON attachments (checksum)`,
  `CREATE INDEX IF NOT EXISTS attachments_deleted_idx ON attachments (deleted_at)`,
];

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Postgres connection pool.
 *
 * Tuned per docs/audit/PASS_5_perf.md §3.2. Before this tuning the
 * pool ran on pg-driver defaults (no max, no idle timeout, no
 * statement_timeout, no application_name) which was the root cause
 * of the "connection terminated unexpectedly" errors the site
 * surfaced under light cold-start load.
 *
 *   max                 20   enough headroom for bursty dashboard loads
 *   idleTimeoutMillis   30s  shed idle slots before Neon kills them
 *   connectionTimeoutMillis 10s  fail fast during cold starts
 *   statement_timeout   30s  runaway queries can't hold slots
 *   application_name    aide-api   identifies us in pg_stat_activity
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: "aide-api",
  statement_timeout: 30_000,
} as any);

// Log pool errors so an unreachable DB surfaces in the logs
// instead of silently failing a request much later.
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[pg pool] idle client error:", err?.message ?? err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";

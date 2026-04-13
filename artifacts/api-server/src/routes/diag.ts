import { Router } from "express";
import { pool } from "@workspace/db";
import { getRecentToolCalls, getToolCallStats } from "../lib/agent-observability";

const router = Router();

/**
 * GET /api/diag/agent — agent observability dump.
 *
 * Returns the last 50 tool calls plus per-tool 24h stats (call count,
 * success/error, avg/max duration). Added in Pass 3 fix #3. No auth —
 * whitelisted in require-auth.ts alongside /api/diag.
 */
router.get("/diag/agent", async (_req, res, next) => {
  try {
    const [recent, stats] = await Promise.all([
      getRecentToolCalls(50),
      getToolCallStats(),
    ]);
    res.json({
      ok: true,
      now: new Date().toISOString(),
      stats24h: stats,
      recent,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/diag — read-only health and data-presence probe.
 *
 * Does NOT require auth (whitelisted in require-auth.ts). Hit this endpoint
 * in a browser or curl on the deployed Replit/Vercel URL to see exactly
 * what's in the database right now:
 *
 *   https://<your-host>/api/diag
 *
 * The response includes:
 *   - dbOk                     connection test result
 *   - tables                   row counts for every table the UI reads
 *   - wipSample / quoteSample  three example rows so you can confirm the
 *                              data actually round-trips serialisation
 *   - env                      masked flags that affect runtime behaviour
 *
 * If any `tables.*` entry reads 0, the seed never ran (check server logs
 * for `[seed]` lines). If `dbOk` is false, the DB URL is wrong or the
 * database is unreachable. If counts look right but the UI is empty, the
 * problem is downstream in the frontend (CORS, auth, wrong origin).
 */
router.get("/diag", async (_req, res) => {
  const started = Date.now();
  const out: Record<string, any> = {
    ok: false,
    now: new Date().toISOString(),
    dbOk: false,
    tables: {},
    wipSample: [],
    quoteSample: [],
    supplierSample: [],
    fipSample: {},
    env: {
      NODE_ENV: process.env["NODE_ENV"] ?? null,
      DATABASE_URL: process.env["DATABASE_URL"] ? "set" : "missing",
      AUTH_ENFORCE: process.env["AUTH_ENFORCE"] === "true",
      SOFT_DELETE: process.env["SOFT_DELETE"] === "1",
      FIP_ENABLED: process.env["FIP_ENABLED"] === "1",
      UPTICK_IMPORTS_ENABLED: process.env["UPTICK_IMPORTS_ENABLED"] === "1",
      MONTHLY_REVENUE_TARGET: process.env["MONTHLY_REVENUE_TARGET"] ?? null,
    },
    errors: [] as string[],
  };

  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    out.dbOk = true;
  } catch (err) {
    out.errors.push(`pool.connect failed: ${err instanceof Error ? err.message : String(err)}`);
    res.json({ ...out, durationMs: Date.now() - started });
    return;
  }

  const tableNames = [
    "users",
    "sessions",
    "jobs",
    "wip_records",
    "quotes",
    "defects",
    "invoices",
    "suppliers",
    "supplier_products",
    "notes",
    "todos",
    "toolbox",
    "conversations",
    "messages",
    "on_call_roster",
    "schedule_events",
    "projects",
    "project_tasks",
    "clients",
    "chat_history",
    "fip_manufacturers",
    "fip_product_families",
    "fip_models",
    "fip_documents",
    "fip_document_versions",
    "fip_source_locations",
    "fip_standards",
    "fip_audit_runs",
  ];

  for (const t of tableNames) {
    try {
      const r = await client.query(`SELECT count(*)::int AS cnt FROM "${t}"`);
      out.tables[t] = r.rows[0].cnt;
    } catch (err) {
      out.tables[t] = `error: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`;
    }
  }

  try {
    const r = await client.query(
      `SELECT task_number, site, client, status, priority, quote_amount, assigned_tech
       FROM wip_records
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 3`,
    );
    out.wipSample = r.rows;
  } catch (err) {
    out.errors.push(`wipSample: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`);
  }

  try {
    const r = await client.query(
      `SELECT quote_number, site, client, status, quote_amount
       FROM quotes
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 3`,
    );
    out.quoteSample = r.rows;
  } catch (err) {
    out.errors.push(`quoteSample: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`);
  }

  try {
    const r = await client.query(
      `SELECT s.name, s.category, COUNT(p.id)::int AS product_count
       FROM suppliers s
       LEFT JOIN supplier_products p ON p.supplier_id = s.id
       GROUP BY s.id, s.name, s.category
       ORDER BY product_count DESC`,
    );
    out.supplierSample = r.rows;
  } catch (err) {
    out.errors.push(`supplierSample: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`);
  }

  try {
    const mfrs = await client.query(`SELECT count(*)::int AS cnt FROM fip_manufacturers`);
    const models = await client.query(`SELECT count(*)::int AS cnt FROM fip_models`);
    const docs = await client.query(`SELECT count(*)::int AS cnt FROM fip_documents`);
    const stds = await client.query(`SELECT count(*)::int AS cnt FROM fip_standards`);
    out.fipSample = {
      manufacturers: mfrs.rows[0].cnt,
      models: models.rows[0].cnt,
      documents: docs.rows[0].cnt,
      standards: stds.rows[0].cnt,
    };
  } catch (err) {
    out.fipSample = { note: "fip_* tables not created yet — check seedFipKnowledgeBase logs" };
  }

  client.release();
  out.ok = true;
  out.durationMs = Date.now() - started;
  res.json(out);
});

export default router;

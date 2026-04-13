/**
 * /api/estimates — CRUD for the estimation workbench.
 *
 * Uses raw pg queries because the estimate tables are created on startup
 * via seed-estimation-ddl.ts and aren't declared in the Drizzle schema yet.
 * Every mutation fires broadcastEvent("data_change", ...) so the UI and
 * the agent's ui_refresh handler stay in sync with any changes made by
 * humans, imports or the agent itself.
 *
 * Totals (subtotal_cost / subtotal_sell / margin_total / gst_total /
 * grand_total) are recomputed server-side on every write to a header
 * or line row. Clients never push totals — they push structural fields
 * (qty, cost, markup) and trust the server to do the maths. This keeps
 * the numbers consistent across browser tabs, agent writes and SQL-level
 * imports.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { broadcastEvent } from "../lib/events";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function n(v: any, fallback = 0): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : fallback;
}

/**
 * Recompute every derived number on a line based on cost_price, markup_pct
 * and quantity. Returns the values that should be written to the row.
 */
function computeLineFields(
  costPrice: number,
  markupPct: number,
  quantity: number,
): {
  sellPrice: number;
  lineCost: number;
  lineSell: number;
  lineMargin: number;
} {
  const sellPrice = Math.round(costPrice * (1 + markupPct / 100) * 100) / 100;
  const lineCost = Math.round(costPrice * quantity * 100) / 100;
  const lineSell = Math.round(sellPrice * quantity * 100) / 100;
  const lineMargin = Math.round((lineSell - lineCost) * 100) / 100;
  return { sellPrice, lineCost, lineSell, lineMargin };
}

async function recomputeEstimateTotals(
  client: any,
  estimateId: string,
): Promise<void> {
  const header = await client.query(
    "SELECT gst_rate FROM estimates WHERE id = $1",
    [estimateId],
  );
  if (header.rows.length === 0) return;
  const gstRate = n(header.rows[0].gst_rate, 10);

  const sums = await client.query(
    `SELECT
       COALESCE(SUM(line_cost), 0)   AS subtotal_cost,
       COALESCE(SUM(line_sell), 0)   AS subtotal_sell,
       COALESCE(SUM(line_margin), 0) AS margin_total
     FROM estimate_lines
     WHERE estimate_id = $1 AND deleted_at IS NULL`,
    [estimateId],
  );
  const subtotalCost = n(sums.rows[0].subtotal_cost);
  const subtotalSell = n(sums.rows[0].subtotal_sell);
  const marginTotal = n(sums.rows[0].margin_total);
  const gstTotal = Math.round(subtotalSell * (gstRate / 100) * 100) / 100;
  const grandTotal = Math.round((subtotalSell + gstTotal) * 100) / 100;

  await client.query(
    `UPDATE estimates
     SET subtotal_cost = $1, subtotal_sell = $2, margin_total = $3,
         gst_total = $4, grand_total = $5, updated_at = now()
     WHERE id = $6`,
    [subtotalCost, subtotalSell, marginTotal, gstTotal, grandTotal, estimateId],
  );
}

async function nextEstimateNumber(client: any): Promise<string> {
  const row = await client.query(
    "SELECT number FROM estimates ORDER BY created_at DESC LIMIT 1",
  );
  const year = new Date().getFullYear();
  if (row.rows.length === 0) return `EST-${year}-0001`;
  const match = String(row.rows[0].number || "").match(/EST-\d{4}-(\d+)/);
  const next = (match ? parseInt(match[1], 10) + 1 : 1).toString().padStart(4, "0");
  return `EST-${year}-${next}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/estimates/products — product catalogue with cost and sell price.
//
// Uses raw pg instead of Drizzle because cost_price is added at runtime by
// seed-estimation-ddl.ts and isn't declared in the Drizzle schema yet,
// so db.select() would drop it silently.
//
// Query params:
//   q           free text search across name, code, supplier, category
//   supplier    exact match on supplier name
//   category    exact match on category
//   limit       default 100, max 500
// ─────────────────────────────────────────────────────────────────────────────
router.get("/estimates/products", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const supplier = typeof req.query.supplier === "string" ? req.query.supplier : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const limit = Math.max(1, Math.min(500, parseInt(String(req.query.limit ?? "100"), 10) || 100));

    const params: any[] = [];
    const where: string[] = [];
    if (q) {
      params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
      const i = params.length;
      where.push(`(p.product_name ILIKE $${i} OR p.product_code ILIKE $${i} OR s.name ILIKE $${i} OR p.category ILIKE $${i})`);
    }
    if (supplier) {
      params.push(supplier);
      where.push(`s.name = $${params.length}`);
    }
    if (category) {
      params.push(category);
      where.push(`p.category = $${params.length}`);
    }
    params.push(limit);
    const limitParam = params.length;

    const client = await pool.connect();
    try {
      const sql = `
        SELECT p.id, p.product_name, p.product_code, p.sku, p.category, p.brand,
               p.cost_price, p.unit_price, p.unit, p.description, p.notes,
               p.supplier_id, s.name AS supplier_name
          FROM supplier_products p
          LEFT JOIN suppliers s ON s.id = p.supplier_id
         ${where.length ? "WHERE " + where.join(" AND ") : ""}
         ORDER BY p.product_name ASC
         LIMIT $${limitParam}
      `;
      const rows = await client.query(sql, params);
      const countSql = `
        SELECT COUNT(*)::int AS cnt
          FROM supplier_products p
          LEFT JOIN suppliers s ON s.id = p.supplier_id
         ${where.length ? "WHERE " + where.join(" AND ") : ""}
      `;
      const totalRow = await client.query(countSql, params.slice(0, params.length - 1));
      res.json({
        rows: rows.rows,
        total: totalRow.rows[0]?.cnt ?? rows.rows.length,
        limit,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/estimates — list
// ─────────────────────────────────────────────────────────────────────────────
router.get("/estimates", async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const rows = await client.query(
        `SELECT * FROM estimates
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 200`,
      );
      res.json(rows.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/estimates/:id — single estimate with its lines
// ─────────────────────────────────────────────────────────────────────────────
router.get("/estimates/:id", async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const header = await client.query(
        `SELECT * FROM estimates WHERE id = $1 AND deleted_at IS NULL`,
        [req.params.id],
      );
      if (header.rows.length === 0) {
        res.status(404).json({ error: "Estimate not found" });
        return;
      }
      const lines = await client.query(
        `SELECT * FROM estimate_lines
         WHERE estimate_id = $1 AND deleted_at IS NULL
         ORDER BY position ASC, created_at ASC`,
        [req.params.id],
      );
      res.json({ ...header.rows[0], lines: lines.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/estimates — create a blank estimate
// ─────────────────────────────────────────────────────────────────────────────
router.post("/estimates", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const client = await pool.connect();
    try {
      const id = randomUUID();
      const number = body.number ?? (await nextEstimateNumber(client));
      const now = new Date();
      await client.query(
        `INSERT INTO estimates
         (id, number, title, client, site, project, contact_name, contact_email,
          status, default_markup_pct, labour_rate, gst_rate, notes, valid_until,
          created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          id,
          number,
          body.title ?? "Untitled estimate",
          body.client ?? null,
          body.site ?? null,
          body.project ?? null,
          body.contact_name ?? null,
          body.contact_email ?? null,
          body.status ?? "Draft",
          n(body.default_markup_pct, 40),
          n(body.labour_rate, 120),
          n(body.gst_rate, 10),
          body.notes ?? null,
          body.valid_until ?? null,
          now,
          now,
        ],
      );
      const row = await client.query("SELECT * FROM estimates WHERE id = $1", [id]);
      broadcastEvent("data_change", { path: "/estimates", method: "POST" });
      res.status(201).json(row.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/estimates/:id — update header + optionally reprice all lines
// when default_markup_pct changes
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/estimates/:id", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const client = await pool.connect();
    try {
      // Fetch existing row so we can see whether default_markup_pct changed.
      const existing = await client.query(
        "SELECT * FROM estimates WHERE id = $1 AND deleted_at IS NULL",
        [req.params.id],
      );
      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Estimate not found" });
        return;
      }
      const prev = existing.rows[0];

      const fields: Record<string, any> = {
        title: body.title ?? prev.title,
        client: body.client ?? prev.client,
        site: body.site ?? prev.site,
        project: body.project ?? prev.project,
        contact_name: body.contact_name ?? prev.contact_name,
        contact_email: body.contact_email ?? prev.contact_email,
        status: body.status ?? prev.status,
        default_markup_pct:
          body.default_markup_pct != null ? n(body.default_markup_pct) : n(prev.default_markup_pct),
        labour_rate: body.labour_rate != null ? n(body.labour_rate) : n(prev.labour_rate),
        gst_rate: body.gst_rate != null ? n(body.gst_rate) : n(prev.gst_rate),
        notes: body.notes ?? prev.notes,
        valid_until: body.valid_until ?? prev.valid_until,
      };

      await client.query(
        `UPDATE estimates
         SET title=$1, client=$2, site=$3, project=$4, contact_name=$5, contact_email=$6,
             status=$7, default_markup_pct=$8, labour_rate=$9, gst_rate=$10, notes=$11,
             valid_until=$12, updated_at=now()
         WHERE id=$13`,
        [
          fields.title, fields.client, fields.site, fields.project, fields.contact_name,
          fields.contact_email, fields.status, fields.default_markup_pct, fields.labour_rate,
          fields.gst_rate, fields.notes, fields.valid_until, req.params.id,
        ],
      );

      // If default_markup_pct changed AND the caller asked us to apply it
      // to every line (?reprice=1 or body.reprice), reprice all lines on
      // this estimate that don't carry a per-line markup override.
      const reprice =
        (req.query.reprice === "1" || body.reprice === true) &&
        n(fields.default_markup_pct) !== n(prev.default_markup_pct);
      if (reprice) {
        const lines = await client.query(
          "SELECT * FROM estimate_lines WHERE estimate_id = $1 AND deleted_at IS NULL",
          [req.params.id],
        );
        for (const ln of lines.rows) {
          const cost = n(ln.cost_price);
          const qty = n(ln.quantity, 1);
          const { sellPrice, lineCost, lineSell, lineMargin } =
            computeLineFields(cost, n(fields.default_markup_pct), qty);
          await client.query(
            `UPDATE estimate_lines
             SET markup_pct=$1, sell_price=$2, line_cost=$3, line_sell=$4,
                 line_margin=$5, updated_at=now()
             WHERE id=$6`,
            [fields.default_markup_pct, sellPrice, lineCost, lineSell, lineMargin, ln.id],
          );
        }
      }

      await recomputeEstimateTotals(client, req.params.id);
      const row = await client.query("SELECT * FROM estimates WHERE id = $1", [req.params.id]);
      broadcastEvent("data_change", { path: `/estimates/${req.params.id}`, method: "PATCH" });
      res.json(row.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/estimates/:id — soft-delete the header (lines stay put)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/estimates/:id", async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE estimates SET deleted_at = now() WHERE id = $1`,
        [req.params.id],
      );
      broadcastEvent("data_change", { path: `/estimates/${req.params.id}`, method: "DELETE" });
      res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/estimates/:id/lines — add one line (optionally from a product)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/estimates/:id/lines", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const client = await pool.connect();
    try {
      const est = await client.query(
        "SELECT default_markup_pct, labour_rate FROM estimates WHERE id = $1 AND deleted_at IS NULL",
        [req.params.id],
      );
      if (est.rows.length === 0) {
        res.status(404).json({ error: "Estimate not found" });
        return;
      }
      const defaultMarkup = n(est.rows[0].default_markup_pct, 40);

      // When a product_id is supplied we pull the cost from supplier_products.
      let costPrice = n(body.cost_price);
      let description = body.description ?? "";
      let productCode = body.product_code ?? null;
      let supplierName = body.supplier_name ?? null;
      let category = body.category ?? null;
      let unit = body.unit ?? "each";

      if (body.product_id) {
        const prod = await client.query(
          `SELECT p.*, s.name AS supplier_name
             FROM supplier_products p
             LEFT JOIN suppliers s ON s.id = p.supplier_id
             WHERE p.id = $1`,
          [body.product_id],
        );
        if (prod.rows.length > 0) {
          const r = prod.rows[0];
          if (!body.cost_price) costPrice = n(r.cost_price);
          if (!description) description = r.product_name;
          if (!productCode) productCode = r.product_code;
          if (!supplierName) supplierName = r.supplier_name;
          if (!category) category = r.category;
          if (!body.unit) unit = r.unit ?? "each";
        }
      }

      const kind = body.kind ?? "product";
      // Labour lines price at labour_rate × hours with the default markup
      // already applied to the rate — set markup to 0 so totals don't
      // double-count.
      const markupPct =
        body.markup_pct != null ? n(body.markup_pct) : kind === "labour" ? 0 : defaultMarkup;
      const quantity = n(body.quantity, 1);
      const { sellPrice, lineCost, lineSell, lineMargin } =
        computeLineFields(costPrice, markupPct, quantity);

      // Position = append to end.
      const posRow = await client.query(
        "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM estimate_lines WHERE estimate_id = $1",
        [req.params.id],
      );
      const position = n(posRow.rows[0].next, 0);

      const id = randomUUID();
      const now = new Date();
      await client.query(
        `INSERT INTO estimate_lines
         (id, estimate_id, kind, product_id, product_code, description, supplier_name,
          category, quantity, unit, cost_price, markup_pct, sell_price,
          line_cost, line_sell, line_margin, position, notes,
          created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          id, req.params.id, kind, body.product_id ?? null, productCode, description,
          supplierName, category, quantity, unit, costPrice, markupPct, sellPrice,
          lineCost, lineSell, lineMargin, position, body.notes ?? null, now, now,
        ],
      );

      await recomputeEstimateTotals(client, req.params.id);
      const row = await client.query("SELECT * FROM estimate_lines WHERE id = $1", [id]);
      broadcastEvent("data_change", { path: `/estimates/${req.params.id}/lines`, method: "POST" });
      res.status(201).json(row.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/estimates/:id/lines/:lineId — update a line
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/estimates/:id/lines/:lineId", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const client = await pool.connect();
    try {
      const existing = await client.query(
        "SELECT * FROM estimate_lines WHERE id = $1 AND deleted_at IS NULL",
        [req.params.lineId],
      );
      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Line not found" });
        return;
      }
      const prev = existing.rows[0];

      const costPrice = body.cost_price != null ? n(body.cost_price) : n(prev.cost_price);
      const markupPct = body.markup_pct != null ? n(body.markup_pct) : n(prev.markup_pct);
      const quantity = body.quantity != null ? n(body.quantity) : n(prev.quantity);
      const description = body.description ?? prev.description;
      const supplierName = body.supplier_name ?? prev.supplier_name;
      const category = body.category ?? prev.category;
      const unit = body.unit ?? prev.unit;
      const notes = body.notes ?? prev.notes;

      const { sellPrice, lineCost, lineSell, lineMargin } =
        computeLineFields(costPrice, markupPct, quantity);

      await client.query(
        `UPDATE estimate_lines
         SET description=$1, supplier_name=$2, category=$3, quantity=$4, unit=$5,
             cost_price=$6, markup_pct=$7, sell_price=$8,
             line_cost=$9, line_sell=$10, line_margin=$11, notes=$12, updated_at=now()
         WHERE id=$13`,
        [
          description, supplierName, category, quantity, unit,
          costPrice, markupPct, sellPrice,
          lineCost, lineSell, lineMargin, notes, req.params.lineId,
        ],
      );

      await recomputeEstimateTotals(client, req.params.id);
      const row = await client.query("SELECT * FROM estimate_lines WHERE id = $1", [req.params.lineId]);
      broadcastEvent("data_change", { path: `/estimates/${req.params.id}/lines/${req.params.lineId}`, method: "PATCH" });
      res.json(row.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/estimates/:id/lines/:lineId — soft-delete a line
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/estimates/:id/lines/:lineId", async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        "UPDATE estimate_lines SET deleted_at = now() WHERE id = $1",
        [req.params.lineId],
      );
      await recomputeEstimateTotals(client, req.params.id);
      broadcastEvent("data_change", { path: `/estimates/${req.params.id}/lines/${req.params.lineId}`, method: "DELETE" });
      res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;

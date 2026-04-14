/**
 * Single source of truth for estimate line math and header rollups.
 *
 * Before this module existed, the same two functions (`computeLineFields`
 * and `recomputeEstimateTotals`) were copy-pasted into
 * `routes/estimates.ts` and `lib/chat-tool-exec.ts`. Identical today,
 * guaranteed to drift once anyone changes markup handling, GST
 * behaviour or the rounding policy.
 *
 * Both callsites now import from here. The agent tool path and the
 * REST path can never disagree on what a total is.
 *
 * All rounding is to 2 decimal places (cents) via Math.round(x*100)/100.
 * Percentages stored in the DB are whole numbers (40 = 40%, not 0.40).
 * Quantities are stored as numeric(12,3) and may be fractional.
 */

export function toNumber(v: unknown, fallback = 0): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : fallback;
}

export interface ComputedLine {
  sellPrice: number;
  lineCost: number;
  lineSell: number;
  lineMargin: number;
}

/**
 * Given a cost price, markup percentage (as whole-number percent) and
 * quantity, return the derived sell price, line totals and line margin.
 *
 * Formula:
 *   sell_price   = round(cost * (1 + markup/100), 2)
 *   line_cost    = round(cost * quantity, 2)
 *   line_sell    = round(sell_price * quantity, 2)
 *   line_margin  = round(line_sell - line_cost, 2)
 */
export function computeLineFields(
  costPrice: number,
  markupPct: number,
  quantity: number,
): ComputedLine {
  const sellPrice = Math.round(costPrice * (1 + markupPct / 100) * 100) / 100;
  const lineCost = Math.round(costPrice * quantity * 100) / 100;
  const lineSell = Math.round(sellPrice * quantity * 100) / 100;
  const lineMargin = Math.round((lineSell - lineCost) * 100) / 100;
  return { sellPrice, lineCost, lineSell, lineMargin };
}

/**
 * Recompute every derived number on an estimate header by SUM'ing its
 * surviving (non-soft-deleted) lines and applying the header's GST rate.
 *
 * Takes any pg-compatible client (the shared pool, a dedicated connection
 * or a transaction) so callers can compose this into their own tx.
 *
 * Pure side effect — updates the `estimates` row for `estimateId`. No
 * return value. If the header doesn't exist this silently no-ops; the
 * caller should check first.
 */
export async function recomputeEstimateTotals(
  client: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> },
  estimateId: string,
): Promise<void> {
  const header = await client.query(
    "SELECT gst_rate FROM estimates WHERE id = $1",
    [estimateId],
  );
  if (header.rows.length === 0) return;
  const gstRate = toNumber(header.rows[0].gst_rate, 10);

  const sums = await client.query(
    `SELECT
       COALESCE(SUM(line_cost), 0)   AS subtotal_cost,
       COALESCE(SUM(line_sell), 0)   AS subtotal_sell,
       COALESCE(SUM(line_margin), 0) AS margin_total
     FROM estimate_lines
     WHERE estimate_id = $1 AND deleted_at IS NULL`,
    [estimateId],
  );
  const subtotalCost = toNumber(sums.rows[0].subtotal_cost);
  const subtotalSell = toNumber(sums.rows[0].subtotal_sell);
  const marginTotal = toNumber(sums.rows[0].margin_total);
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

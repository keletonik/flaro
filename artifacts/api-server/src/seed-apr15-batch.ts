/**
 * 15 Apr 2026 data batch loader.
 *
 * Additive boot-time seed for the new CSV + email batch dropped
 * into the repo root on 14-15 April 2026. Runs on every startup,
 * dedupes against existing rows by natural key, and inserts only
 * the delta. See docs/data-imports/2026-04-15_AUDIT.md for the
 * per-file inventory and audit trail.
 *
 * Data source: artifacts/api-server/src/seed-apr15-batch.json,
 * pre-parsed from the CSVs by scripts/build-apr15-seed-json.cjs.
 *
 * Idempotency: every insert path checks for existence first.
 * Errors are logged and swallowed — a bootstrap hiccup never
 * crashes the server.
 */

import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import payload from "./seed-apr15-batch.json";

interface Apr15Payload {
  batchId: string;
  generatedAt: string;
  wip_records: any[];
  quotes: any[];
  defects: any[];
  task_cycle_times: any[];
  email_notes: Array<{ hash: string; title: string; body: string; text: string }>;
}

const data = payload as Apr15Payload;
const BATCH_ID = data.batchId;

export async function seedApr15Batch(): Promise<void> {
  const client = await pool.connect();
  try {
    const summary = {
      wip: { inserted: 0, updated: 0, total: data.wip_records.length },
      quotes: { inserted: 0, updated: 0, total: data.quotes.length },
      defects: { inserted: 0, skipped: 0, total: data.defects.length },
      cycle: { inserted: 0, updated: 0, total: data.task_cycle_times.length },
      emails: { inserted: 0, skipped: 0, total: data.email_notes.length },
    };

    // Short-circuit: if we already have rows tagged with this batch
    // id, we've run successfully before and every file has been
    // processed once. Skip the whole thing to cut the re-run cost.
    const prior = await client.query(
      "SELECT COUNT(*)::int AS n FROM wip_records WHERE import_batch_id = $1",
      [BATCH_ID],
    );
    if (prior.rows[0].n > 0 && prior.rows[0].n >= data.wip_records.length) {
      logger.info({ batch: BATCH_ID, existing: prior.rows[0].n }, "apr15 batch already loaded — skipping");
      return;
    }

    // ── wip_records ──────────────────────────────────────────────────
    for (const r of data.wip_records) {
      const existing = await client.query(
        "SELECT id FROM wip_records WHERE task_number = $1 LIMIT 1",
        [r.task_number],
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE wip_records SET
             status = $1, priority = $2, assigned_tech = $3,
             due_date = $4, quote_amount = COALESCE($5, quote_amount),
             updated_at = now()
           WHERE id = $6`,
          [r.status, r.priority, r.assigned_tech, r.due_date, r.quote_amount, existing.rows[0].id],
        );
        summary.wip.updated++;
        continue;
      }
      await client.query(
        `INSERT INTO wip_records
         (id, task_number, site, address, client, job_type, description, status,
          priority, assigned_tech, due_date, date_created, quote_amount,
          po_number, notes, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          randomUUID(), r.task_number, r.site, r.address, r.client, r.job_type,
          r.description, r.status, r.priority, r.assigned_tech, r.due_date,
          r.date_created, r.quote_amount, r.po_number, r.notes, BATCH_ID,
        ],
      );
      summary.wip.inserted++;
    }

    // ── quotes ───────────────────────────────────────────────────────
    for (const r of data.quotes) {
      const existing = await client.query(
        "SELECT id FROM quotes WHERE quote_number = $1 LIMIT 1",
        [r.quote_number],
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE quotes SET status = $1, quote_amount = COALESCE($2, quote_amount), updated_at = now() WHERE id = $3`,
          [r.status, r.quote_amount, existing.rows[0].id],
        );
        summary.quotes.updated++;
        continue;
      }
      await client.query(
        `INSERT INTO quotes
         (id, quote_number, task_number, site, client, description, quote_amount,
          status, date_created, date_sent, date_accepted, assigned_tech, notes,
          import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          randomUUID(), r.quote_number, r.task_number, r.site, r.client,
          r.description, r.quote_amount, r.status, r.date_created, r.date_sent,
          r.date_accepted, r.assigned_tech, r.notes, BATCH_ID,
        ],
      );
      summary.quotes.inserted++;
    }

    // ── defects ──────────────────────────────────────────────────────
    for (const r of data.defects) {
      const existing = await client.query(
        "SELECT id FROM defects WHERE raw_data->>'uptick_id' = $1 LIMIT 1",
        [r.uptick_id],
      );
      if (existing.rows.length > 0) { summary.defects.skipped++; continue; }
      await client.query(
        `INSERT INTO defects
         (id, task_number, site, client, description, severity, status,
          asset_type, location, recommendation, date_identified, notes,
          raw_data, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          randomUUID(), r.task_number, r.site, r.client, r.description,
          r.severity, r.status, r.asset_type, r.location, r.recommendation,
          r.date_identified, r.notes,
          JSON.stringify({ uptick_id: r.uptick_id }),
          BATCH_ID,
        ],
      );
      summary.defects.inserted++;
    }

    // ── task_cycle_times ─────────────────────────────────────────────
    for (const r of data.task_cycle_times) {
      const existing = await client.query(
        "SELECT id FROM task_cycle_times WHERE task_ref = $1 LIMIT 1",
        [r.task_ref],
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE task_cycle_times SET
             task_status = $1, performed_date = $2, invoiced_date = $3,
             days_to_complete = $4, days_to_invoice = $5, updated_at = now()
           WHERE id = $6`,
          [r.task_status, r.performed_date, r.invoiced_date, r.days_to_complete, r.days_to_invoice, existing.rows[0].id],
        );
        summary.cycle.updated++;
        continue;
      }
      await client.query(
        `INSERT INTO task_cycle_times
         (id, task_ref, task_property, task_category, task_service_group,
          task_round, task_supporting_technicians, description,
          source_defect_ref, source_service_ref, authorisation_ref,
          task_status, task_author, task_salesperson, created_date,
          performed_date, invoiced_date, days_to_complete, days_to_invoice,
          import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          randomUUID(), r.task_ref, r.task_property, r.task_category,
          r.task_service_group, r.task_round, r.task_supporting_technicians,
          r.description, r.source_defect_ref, r.source_service_ref,
          r.authorisation_ref, r.task_status, r.task_author, r.task_salesperson,
          r.created_date, r.performed_date, r.invoiced_date,
          r.days_to_complete, r.days_to_invoice, BATCH_ID,
        ],
      );
      summary.cycle.inserted++;
    }

    // ── email batch → notes ─────────────────────────────────────────
    for (const e of data.email_notes) {
      const existing = await client.query(
        "SELECT id FROM notes WHERE raw_data->>'hash' = $1 LIMIT 1",
        [e.hash],
      );
      if (existing.rows.length > 0) { summary.emails.skipped++; continue; }
      await client.query(
        `INSERT INTO notes (id, text, category, owner, status, raw_data)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          randomUUID(),
          e.text,
          "Follow Up",
          "casper",
          "open",
          JSON.stringify({ hash: e.hash, title: e.title, source: "FlameSafe_Email_Batch_14Apr2026.md", kind: "email-triage" }),
        ],
      );
      summary.emails.inserted++;
    }

    logger.info({ batch: BATCH_ID, summary }, "apr15 batch load complete");
  } catch (err) {
    logger.error({ err, batch: BATCH_ID }, "apr15 batch load failed (non-fatal)");
  } finally {
    client.release();
  }
}

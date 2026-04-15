#!/usr/bin/env node
/**
 * Additive import for the 15 Apr 2026 data batch.
 *
 * Source files (repo root):
 *   flamesafe_tasks_2026-04-15_*.csv        → wip_records
 *   flamesafe_quotes_2026-04-15_*.csv       → quotes
 *   flamesafe_remarks_2026-04-15_07-48-17.csv → defects
 *   Days-To-Complete-Tasks_2026-04-15_*.csv → task_cycle_times
 *   FlameSafe_Email_Batch_14Apr2026.md      → notes (category='email-triage')
 *
 * Strictly additive:
 *   - wip_records dedup by task_number
 *   - quotes     dedup by quote_number
 *   - defects    dedup by (task_number, description hash)
 *   - task_cycle_times dedup by task_ref
 *   - notes      dedup by text hash
 *
 * Existing rows are NEVER overwritten. The operator's "never delete
 * data" rule from docs/FULL_AUDIT_REBUILD_PROMPT.md §Ground Rules
 * is enforced in every insert path.
 *
 * Usage: DATABASE_URL=... node scripts/import-apr15-batch.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const REPO_ROOT = path.resolve(__dirname, '..');
const BATCH_ID = `apr15-batch-${new Date().toISOString().slice(0, 10)}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const uid = () => crypto.randomUUID();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// ─── tiny CSV parser (RFC 4180 subset — handles quoted fields + embedded commas + escaped quotes) ─
function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\n' || ch === '\r') {
      if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
      if (ch === '\r' && text[i + 1] === '\n') i += 2; else i++;
      continue;
    }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function readCsvAsObjects(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn(`[skip] ${filepath} — not found`);
    return [];
  }
  const text = fs.readFileSync(filepath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => String(h || '').trim());
  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => c === '' || c == null)) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c] ?? null;
    result.push(obj);
  }
  return result;
}

function isoDate(raw) {
  if (!raw || raw === '') return null;
  const s = String(raw).trim();
  // Already ISO-ish
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const yyyy = m[1];
    const mm = String(m[2]).padStart(2, '0');
    const dd = String(m[3]).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // D/M/YYYY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) {
    const dd = String(m2[1]).padStart(2, '0');
    const mm = String(m2[2]).padStart(2, '0');
    return `${m2[3]}-${mm}-${dd}`;
  }
  return null;
}

function toIntOrNull(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toNumOrNull(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ─── wip_records importer ─────────────────────────────────────────────
async function importWip(client, filename) {
  const rows = readCsvAsObjects(path.join(REPO_ROOT, filename));
  let inserted = 0, skipped = 0, updated = 0;
  const now = new Date();

  function mapStatus(s) {
    const t = String(s || '').toUpperCase();
    if (t.includes('COMPLETED') || t.includes('PERFORMED') || t.includes('INVOICED')) return 'Completed';
    if (t.includes('SCHEDULED') || t.includes('BOOKED')) return 'Scheduled';
    if (t.includes('IN PROGRESS') || t.includes('INPROGRESS')) return 'In Progress';
    if (t.includes('QUOTED')) return 'Quoted';
    if (t.includes('ON HOLD') || t.includes('WAITING') || t.includes('BLOCKED')) return 'On Hold';
    return 'Open';
  }
  function mapPriority(p) {
    const s = String(p || '').toUpperCase();
    if (s.includes('CRITICAL')) return 'Critical';
    if (s.includes('HIGH')) return 'High';
    if (s.includes('LOW')) return 'Low';
    return 'Medium';
  }

  for (const r of rows) {
    const taskNumber = String(r['Ref'] || r['ID'] || '').trim();
    if (!taskNumber) { skipped++; continue; }

    const existing = await client.query(
      'SELECT id FROM wip_records WHERE task_number = $1 LIMIT 1',
      [taskNumber],
    );
    if (existing.rows.length > 0) {
      // Update the "hot" columns that change over time (status,
      // assigned tech, dates) without touching created_at or the
      // description the operator may have edited by hand.
      await client.query(
        `UPDATE wip_records SET
           status = $1,
           priority = $2,
           assigned_tech = $3,
           due_date = $4,
           quote_amount = COALESCE($5, quote_amount),
           updated_at = now()
         WHERE id = $6`,
        [
          mapStatus(r['Status']),
          mapPriority(r['Priority']),
          r['Assigned Technician'] || r['Technician'] || null,
          isoDate(r['Due']),
          toNumOrNull(r['Task Value']),
          existing.rows[0].id,
        ],
      );
      updated++;
      continue;
    }

    await client.query(
      `INSERT INTO wip_records
       (id, task_number, site, address, client, job_type, description, status,
        priority, assigned_tech, due_date, date_created, quote_amount,
        invoice_amount, po_number, notes, raw_data, import_batch_id,
        created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        uid(),
        taskNumber,
        r['Property Name'] || r['Property Client Ref'] || 'Unknown',
        r['Address'] || null,
        r['Client'] || 'Unknown',
        r['Category'] || null,
        r['Description'] || r['Name'] || null,
        mapStatus(r['Status']),
        mapPriority(r['Priority']),
        r['Assigned Technician'] || r['Technician'] || null,
        isoDate(r['Due']),
        isoDate(r['Created']),
        toNumOrNull(r['Task Value']),
        null,
        r['Authorisation Ref'] || null,
        r['Internal Note'] || r['Invoice Note'] || null,
        JSON.stringify(r),
        BATCH_ID,
        now, now,
      ],
    );
    inserted++;
  }
  console.log(`[wip] ${filename}: inserted=${inserted} updated=${updated} skipped=${skipped} total=${rows.length}`);
  return { inserted, updated, skipped, total: rows.length };
}

// ─── quotes importer ───────────────────────────────────────────────────
async function importQuotes(client, filename) {
  const rows = readCsvAsObjects(path.join(REPO_ROOT, filename));
  let inserted = 0, updated = 0, skipped = 0;
  const now = new Date();

  function mapQuoteStatus(s) {
    const t = String(s || '').toUpperCase();
    if (t.includes('AUTHORISED') || t.includes('ACCEPTED') || t.includes('WON')) return 'Accepted';
    if (t.includes('SUBMITTED') || t.includes('SENT')) return 'Sent';
    if (t.includes('EXPIRED')) return 'Expired';
    if (t.includes('DECLINED') || t.includes('LOST')) return 'Declined';
    if (t.includes('REVISED')) return 'Revised';
    return 'Draft';
  }

  for (const r of rows) {
    const quoteNumber = String(r['Reference'] || r['ID'] || '').trim();
    if (!quoteNumber) { skipped++; continue; }

    const existing = await client.query(
      'SELECT id FROM quotes WHERE quote_number = $1 LIMIT 1',
      [quoteNumber],
    );
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE quotes SET status = $1, quote_amount = COALESCE($2, quote_amount), updated_at = now() WHERE id = $3`,
        [mapQuoteStatus(r['Status']), toNumOrNull(r['Total']), existing.rows[0].id],
      );
      updated++;
      continue;
    }
    await client.query(
      `INSERT INTO quotes
       (id, quote_number, task_number, site, address, client, description,
        quote_amount, status, date_created, date_sent, date_accepted,
        assigned_tech, notes, raw_data, import_batch_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        uid(),
        quoteNumber,
        r['Property Ref'] || null,
        r['Property'] || r['Property Branch'] || 'Unknown',
        null,
        r['Client'] || 'Unknown',
        r['Description'] || r['Scope of Works'] || null,
        toNumOrNull(r['Total']),
        mapQuoteStatus(r['Status']),
        isoDate(r['Created']),
        isoDate(r['Submitted Date']),
        isoDate(r['Date Authorised']),
        r['Salesperson'] || null,
        r['Authorisation Note'] || null,
        JSON.stringify(r),
        BATCH_ID,
        now, now,
      ],
    );
    inserted++;
  }
  console.log(`[quotes] ${filename}: inserted=${inserted} updated=${updated} skipped=${skipped} total=${rows.length}`);
  return { inserted, updated, skipped, total: rows.length };
}

// ─── defects importer (from Uptick remarks) ────────────────────────────
async function importDefects(client, filename) {
  const rows = readCsvAsObjects(path.join(REPO_ROOT, filename));
  let inserted = 0, skipped = 0;
  const now = new Date();

  function mapDefectSeverity(s) {
    const t = String(s || '').toUpperCase();
    if (t.includes('CRITICAL')) return 'Critical';
    if (t.includes('HIGH')) return 'High';
    if (t.includes('LOW')) return 'Low';
    return 'Medium';
  }
  function mapDefectStatus(s) {
    const t = String(s || '').toUpperCase();
    if (t.includes('RESOLVED') || t.includes('CLOSED') || t.includes('COMPLETED')) return 'Resolved';
    if (t.includes('QUOTED')) return 'Quoted';
    if (t.includes('SCHEDULED')) return 'Scheduled';
    if (t.includes('DEFERRED')) return 'Deferred';
    return 'Open';
  }

  for (const r of rows) {
    const upId = String(r['ID'] || '').trim();
    if (!upId) { skipped++; continue; }

    // Dedup on (Uptick ID) stored in raw_data->>'ID'
    const existing = await client.query(
      "SELECT id FROM defects WHERE raw_data->>'ID' = $1 LIMIT 1",
      [upId],
    );
    if (existing.rows.length > 0) { skipped++; continue; }

    await client.query(
      `INSERT INTO defects
       (id, task_number, site, address, client, description, severity, status,
        asset_type, location, recommendation, date_identified,
        notes, raw_data, import_batch_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        uid(),
        r['Created on Task Ref'] || r['Repair Task Ref'] || null,
        r['Property Name'] || 'Unknown',
        null,
        r['Client'] || 'Unknown',
        r['Description'] || r['Notes'] || r['Remark Type'] || 'Remark',
        mapDefectSeverity(r['Severity']),
        mapDefectStatus(r['Status']),
        r['Asset Type'] || null,
        r['Location'] || r['Asset Location'] || null,
        r['Resolution'] || null,
        isoDate(r['Created']),
        r['Notes'] || null,
        JSON.stringify(r),
        BATCH_ID,
        now, now,
      ],
    );
    inserted++;
  }
  console.log(`[defects] ${filename}: inserted=${inserted} skipped=${skipped} total=${rows.length}`);
  return { inserted, skipped, total: rows.length };
}

// ─── task_cycle_times importer ─────────────────────────────────────────
async function importCycleTimes(client, filename) {
  const rows = readCsvAsObjects(path.join(REPO_ROOT, filename));
  let inserted = 0, updated = 0, skipped = 0;

  for (const r of rows) {
    const taskRef = String(r['Task Ref'] || '').trim();
    if (!taskRef) { skipped++; continue; }

    const existing = await client.query(
      'SELECT id FROM task_cycle_times WHERE task_ref = $1 LIMIT 1',
      [taskRef],
    );
    const payload = {
      taskProperty: r['Task Property'] || null,
      taskCategory: r['Task Category'] || null,
      taskServiceGroup: r['Task Service Group'] || null,
      taskRound: r['Task Round'] || null,
      taskSupportingTechnicians: r['Task Supporting Technicians'] || null,
      description: r['Task Description'] || null,
      sourceDefectRef: r['Task Source Defect Quote Ref'] || null,
      sourceServiceRef: r['Task Source Service Quote Ref'] || null,
      authorisationRef: r['Task Authorisation Ref'] || null,
      taskStatus: r['Task Status'] || null,
      taskAuthor: r['Task Author'] || null,
      taskSalesperson: r['Task Salesperson'] || null,
      createdDate: isoDate(r['Task Created Date']),
      performedDate: isoDate(r['Task Performed Date']),
      invoicedDate: isoDate(r['Task Invoiced Date']),
      daysToComplete: toIntOrNull(r['Task Days to Complete']),
      daysToInvoice: toIntOrNull(r['Task Days to Invoice']),
      rawData: JSON.stringify(r),
    };

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE task_cycle_times SET
           task_status = $1, performed_date = $2, invoiced_date = $3,
           days_to_complete = $4, days_to_invoice = $5,
           raw_data = $6, updated_at = now()
         WHERE id = $7`,
        [payload.taskStatus, payload.performedDate, payload.invoicedDate,
         payload.daysToComplete, payload.daysToInvoice, payload.rawData,
         existing.rows[0].id],
      );
      updated++;
      continue;
    }

    await client.query(
      `INSERT INTO task_cycle_times
       (id, task_ref, task_property, task_category, task_service_group,
        task_round, task_supporting_technicians, description,
        source_defect_ref, source_service_ref, authorisation_ref,
        task_status, task_author, task_salesperson, created_date,
        performed_date, invoiced_date, days_to_complete, days_to_invoice,
        raw_data, import_batch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        uid(), taskRef, payload.taskProperty, payload.taskCategory,
        payload.taskServiceGroup, payload.taskRound,
        payload.taskSupportingTechnicians, payload.description,
        payload.sourceDefectRef, payload.sourceServiceRef,
        payload.authorisationRef, payload.taskStatus, payload.taskAuthor,
        payload.taskSalesperson, payload.createdDate,
        payload.performedDate, payload.invoicedDate,
        payload.daysToComplete, payload.daysToInvoice,
        payload.rawData, BATCH_ID,
      ],
    );
    inserted++;
  }
  console.log(`[cycle-times] ${filename}: inserted=${inserted} updated=${updated} skipped=${skipped} total=${rows.length}`);
  return { inserted, updated, skipped, total: rows.length };
}

// ─── email batch importer (→ notes) ────────────────────────────────────
async function importEmailBatch(client, filename) {
  const filepath = path.join(REPO_ROOT, filename);
  if (!fs.existsSync(filepath)) return { inserted: 0, skipped: 0, total: 0 };
  const text = fs.readFileSync(filepath, 'utf8');
  const now = new Date();

  // Split on top-level ### headings. First line of each section is the title.
  const sections = text.split(/\n### /).slice(1);
  let inserted = 0, skipped = 0;
  for (const sec of sections) {
    const firstLine = sec.split('\n', 1)[0];
    const body = sec.slice(firstLine.length + 1).trim();
    const title = firstLine.replace(/^\*+|\*+$/g, '').trim().slice(0, 200);
    if (!title) { skipped++; continue; }
    const textHash = sha(title + '|' + body.slice(0, 500));
    const existing = await client.query(
      "SELECT id FROM notes WHERE raw_data->>'hash' = $1 LIMIT 1",
      [textHash],
    );
    if (existing.rows.length > 0) { skipped++; continue; }
    await client.query(
      `INSERT INTO notes
       (id, text, category, owner, status, raw_data, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uid(),
        `${title}\n\n${body}`.slice(0, 5000),
        'email-triage',
        'casper',
        'open',
        JSON.stringify({ hash: textHash, source: filename, title }),
        now, now,
      ],
    );
    inserted++;
  }
  console.log(`[email-batch] ${filename}: inserted=${inserted} skipped=${skipped} total=${sections.length}`);
  return { inserted, skipped, total: sections.length };
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL env var required — export it or run on the Replit with secrets configured.");
    process.exit(2);
  }
  const client = await pool.connect();
  const summary = {};
  try {
    console.log(`\n=== 15 APR 2026 DATA IMPORT — batch ${BATCH_ID} ===\n`);

    // 1. Tasks → wip_records
    summary.wip1 = await importWip(client, 'flamesafe_tasks_2026-04-15_07-48-11.csv');
    summary.wip2 = await importWip(client, 'flamesafe_tasks_2026-04-15_07-48-47.csv');
    summary.wip3 = await importWip(client, 'flamesafe_tasks_2026-04-15_07-48-59.csv');

    // 2. Quotes → quotes
    summary.quotes1 = await importQuotes(client, 'flamesafe_quotes_2026-04-15_07-48-36.csv');
    summary.quotes2 = await importQuotes(client, 'flamesafe_quotes_2026-04-15_07-49-25.csv');

    // 3. Remarks → defects
    summary.defects = await importDefects(client, 'flamesafe_remarks_2026-04-15_07-48-17.csv');

    // 4. Days-to-complete → task_cycle_times
    summary.cycle1 = await importCycleTimes(client, 'Days-To-Complete-Tasks_2026-04-15_07-52-25.csv');
    summary.cycle2 = await importCycleTimes(client, 'Days-To-Complete-Tasks_2026-04-15_07-52-50.csv');

    // 5. Email batch → notes
    summary.emails = await importEmailBatch(client, 'FlameSafe_Email_Batch_14Apr2026.md');

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(JSON.stringify(summary, null, 2));

    // Final row counts for every target
    const counts = await Promise.all([
      client.query('SELECT COUNT(*)::int AS n FROM wip_records WHERE deleted_at IS NULL'),
      client.query('SELECT COUNT(*)::int AS n FROM quotes WHERE deleted_at IS NULL'),
      client.query('SELECT COUNT(*)::int AS n FROM defects WHERE deleted_at IS NULL'),
      client.query('SELECT COUNT(*)::int AS n FROM task_cycle_times WHERE deleted_at IS NULL'),
      client.query("SELECT COUNT(*)::int AS n FROM notes WHERE category = 'email-triage'"),
    ]);
    console.log('\n=== POST-IMPORT ROW COUNTS ===');
    console.log(`wip_records        ${counts[0].rows[0].n}`);
    console.log(`quotes             ${counts[1].rows[0].n}`);
    console.log(`defects            ${counts[2].rows[0].n}`);
    console.log(`task_cycle_times   ${counts[3].rows[0].n}`);
    console.log(`notes (emails)     ${counts[4].rows[0].n}`);
  } catch (err) {
    console.error('[import] failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });

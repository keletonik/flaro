#!/usr/bin/env node
/**
 * Offline CSV → JSON transformer for the 15 Apr 2026 data batch.
 *
 * Reads every source CSV + the email markdown, shapes each row into
 * the target table's column names, and writes a single JSON blob at
 * artifacts/api-server/src/seed-apr15-batch.json. That file is then
 * consumed at boot by seed-apr15-batch.ts so Replit never has to
 * re-parse CSVs on startup.
 *
 * Zero side effects. Run once locally after the CSVs land, commit
 * the JSON, and the Replit sync picks it up.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT = path.join(REPO_ROOT, 'artifacts/api-server/src/seed-apr15-batch.json');

function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
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

function readCsv(filename) {
  const filepath = path.join(REPO_ROOT, filename);
  if (!fs.existsSync(filepath)) { console.warn(`[skip] ${filename}`); return []; }
  const text = fs.readFileSync(filepath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => String(h || '').trim());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c] ?? null;
    out.push(obj);
  }
  return out;
}

function isoDate(raw) {
  if (!raw || raw === '') return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m2) {
    return `${m2[3]}-${String(m2[2]).padStart(2, '0')}-${String(m2[1]).padStart(2, '0')}`;
  }
  return null;
}

function toNum(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function toInt(raw) { const n = toNum(raw); return n == null ? null : Math.round(n); }

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
function mapQuoteStatus(s) {
  const t = String(s || '').toUpperCase();
  if (t.includes('AUTHORISED') || t.includes('ACCEPTED') || t.includes('WON')) return 'Accepted';
  if (t.includes('SUBMITTED') || t.includes('SENT')) return 'Sent';
  if (t.includes('EXPIRED')) return 'Expired';
  if (t.includes('DECLINED') || t.includes('LOST')) return 'Declined';
  if (t.includes('REVISED')) return 'Revised';
  return 'Draft';
}
function mapDefectSeverity(s) {
  const t = String(s || '').toUpperCase();
  if (t.includes('CRITICAL')) return 'Critical';
  if (t.includes('HIGH')) return 'High';
  if (t.includes('LOW')) return 'Low';
  return 'Medium';
}
function mapDefectStatus(s) {
  const t = String(s || '').toUpperCase();
  if (t.includes('RESOLVED') || t.includes('CLOSED')) return 'Resolved';
  if (t.includes('QUOTED')) return 'Quoted';
  if (t.includes('SCHEDULED')) return 'Scheduled';
  if (t.includes('DEFERRED')) return 'Deferred';
  return 'Open';
}

// ─── build each collection ────────────────────────────────────────────
function buildWip() {
  const files = [
    'flamesafe_tasks_2026-04-15_07-48-11.csv',
    'flamesafe_tasks_2026-04-15_07-48-47.csv',
    'flamesafe_tasks_2026-04-15_07-48-59.csv',
  ];
  const out = [];
  const seen = new Set();
  for (const f of files) {
    const rows = readCsv(f);
    console.log(`[wip] ${f}: ${rows.length} rows`);
    for (const r of rows) {
      const taskNumber = String(r['Ref'] || r['ID'] || '').trim();
      if (!taskNumber || seen.has(taskNumber)) continue;
      seen.add(taskNumber);
      out.push({
        task_number: taskNumber,
        site: r['Property Name'] || r['Property Client Ref'] || 'Unknown',
        address: r['Address'] || null,
        client: r['Client'] || 'Unknown',
        job_type: r['Category'] || null,
        description: r['Description'] || r['Name'] || null,
        status: mapStatus(r['Status']),
        priority: mapPriority(r['Priority']),
        assigned_tech: r['Assigned Technician'] || r['Technician'] || null,
        due_date: isoDate(r['Due']),
        date_created: isoDate(r['Created']),
        quote_amount: toNum(r['Task Value']),
        po_number: r['Authorisation Ref'] || null,
        notes: r['Internal Note'] || r['Invoice Note'] || null,
      });
    }
  }
  return out;
}

function buildQuotes() {
  const files = [
    'flamesafe_quotes_2026-04-15_07-48-36.csv',
    'flamesafe_quotes_2026-04-15_07-49-25.csv',
  ];
  const out = [];
  const seen = new Set();
  for (const f of files) {
    const rows = readCsv(f);
    console.log(`[quotes] ${f}: ${rows.length} rows`);
    for (const r of rows) {
      const quoteNumber = String(r['Reference'] || r['ID'] || '').trim();
      if (!quoteNumber || seen.has(quoteNumber)) continue;
      seen.add(quoteNumber);
      out.push({
        quote_number: quoteNumber,
        task_number: r['Property Ref'] || null,
        site: r['Property'] || r['Property Branch'] || 'Unknown',
        client: r['Client'] || 'Unknown',
        description: r['Description'] || r['Scope of Works'] || null,
        quote_amount: toNum(r['Total']),
        status: mapQuoteStatus(r['Status']),
        date_created: isoDate(r['Created']),
        date_sent: isoDate(r['Submitted Date']),
        date_accepted: isoDate(r['Date Authorised']),
        assigned_tech: r['Salesperson'] || null,
        notes: r['Authorisation Note'] || null,
      });
    }
  }
  return out;
}

function buildDefects() {
  const rows = readCsv('flamesafe_remarks_2026-04-15_07-48-17.csv');
  console.log(`[defects] ${rows.length} rows`);
  const out = [];
  const seen = new Set();
  for (const r of rows) {
    const upId = String(r['ID'] || '').trim();
    if (!upId || seen.has(upId)) continue;
    seen.add(upId);
    out.push({
      uptick_id: upId,
      task_number: r['Created on Task Ref'] || r['Repair Task Ref'] || null,
      site: r['Property Name'] || 'Unknown',
      client: r['Client'] || 'Unknown',
      description: r['Description'] || r['Notes'] || r['Remark Type'] || 'Remark',
      severity: mapDefectSeverity(r['Severity']),
      status: mapDefectStatus(r['Status']),
      asset_type: r['Asset Type'] || null,
      location: r['Location'] || r['Asset Location'] || null,
      recommendation: r['Resolution'] || null,
      date_identified: isoDate(r['Created']),
      notes: r['Notes'] || null,
    });
  }
  return out;
}

function buildCycleTimes() {
  const files = [
    'Days-To-Complete-Tasks_2026-04-15_07-52-25.csv',
    'Days-To-Complete-Tasks_2026-04-15_07-52-50.csv',
  ];
  const out = [];
  const seen = new Set();
  for (const f of files) {
    const rows = readCsv(f);
    console.log(`[cycle] ${f}: ${rows.length} rows`);
    for (const r of rows) {
      const taskRef = String(r['Task Ref'] || '').trim();
      if (!taskRef || seen.has(taskRef)) continue;
      seen.add(taskRef);
      out.push({
        task_ref: taskRef,
        task_property: r['Task Property'] || null,
        task_category: r['Task Category'] || null,
        task_service_group: r['Task Service Group'] || null,
        task_round: r['Task Round'] || null,
        task_supporting_technicians: r['Task Supporting Technicians'] || null,
        description: (r['Task Description'] || '').slice(0, 2000),
        source_defect_ref: r['Task Source Defect Quote Ref'] || null,
        source_service_ref: r['Task Source Service Quote Ref'] || null,
        authorisation_ref: r['Task Authorisation Ref'] || null,
        task_status: r['Task Status'] || null,
        task_author: r['Task Author'] || null,
        task_salesperson: r['Task Salesperson'] || null,
        created_date: isoDate(r['Task Created Date']),
        performed_date: isoDate(r['Task Performed Date']),
        invoiced_date: isoDate(r['Task Invoiced Date']),
        days_to_complete: toInt(r['Task Days to Complete']),
        days_to_invoice: toInt(r['Task Days to Invoice']),
      });
    }
  }
  return out;
}

function buildEmailNotes() {
  const filepath = path.join(REPO_ROOT, 'FlameSafe_Email_Batch_14Apr2026.md');
  if (!fs.existsSync(filepath)) { console.warn('[email] file missing'); return []; }
  const text = fs.readFileSync(filepath, 'utf8');
  const sections = text.split(/\n### /).slice(1);
  const out = [];
  for (const sec of sections) {
    const firstLine = sec.split('\n', 1)[0];
    const body = sec.slice(firstLine.length + 1).trim();
    const title = firstLine.replace(/^\*+|\*+$/g, '').trim().slice(0, 200);
    if (!title) continue;
    const hash = crypto.createHash('sha256').update(title + '|' + body.slice(0, 500)).digest('hex').slice(0, 16);
    out.push({
      hash,
      title,
      body: body.slice(0, 4500),
      text: `${title}\n\n${body}`.slice(0, 5000),
    });
  }
  console.log(`[emails] parsed ${out.length} emails`);
  return out;
}

const payload = {
  batchId: 'apr15-batch-2026-04-15',
  generatedAt: new Date().toISOString(),
  wip_records: buildWip(),
  quotes: buildQuotes(),
  defects: buildDefects(),
  task_cycle_times: buildCycleTimes(),
  email_notes: buildEmailNotes(),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload));
console.log(`\n→ wrote ${OUT}`);
console.log(`   wip_records       ${payload.wip_records.length}`);
console.log(`   quotes            ${payload.quotes.length}`);
console.log(`   defects           ${payload.defects.length}`);
console.log(`   task_cycle_times  ${payload.task_cycle_times.length}`);
console.log(`   email_notes       ${payload.email_notes.length}`);

#!/usr/bin/env node
/**
 * Apr 21 2026 Uptick CSV batch importer.
 * Idempotent upsert against jobs / quotes / defects / invoices.
 * Dedupes inputs by Uptick ID (first column), then matches existing rows
 * by natural key (task_number / quote_number / invoice_number / uptick_id).
 */
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { Client } = require("pg");

const BATCH_ID = "apr21-batch-2026-04-21";
const ASSETS = path.join(__dirname, "..", "attached_assets");

// --- minimal CSV parser (RFC-4180 quoted) ---
function parseCSV(text) {
  const rows = [];
  let cur = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function load(file) {
  const text = fs.readFileSync(path.join(ASSETS, file), "utf8");
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

function dedupeById(records) {
  const seen = new Map();
  for (const r of records) {
    const id = r["ID"] || r["Id"] || r["id"];
    if (!id) continue;
    seen.set(id, r); // keep last occurrence
  }
  return [...seen.values()];
}

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function nz(v) { return v == null || v === "" ? null : String(v); }

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ------------------------------------------------------------------ TASKS → jobs
  const taskFiles = [
    "flamesafe_tasks_2026-04-21_13-55-27_1776744736616.csv",
    "flamesafe_tasks_2026-04-21_13-56-28_1776744736615.csv",
    "flamesafe_tasks_2026-04-21_13-56-51_1776744736615.csv",
  ];
  const taskRows = dedupeById(taskFiles.flatMap(load));
  let jIns = 0, jUpd = 0, jSkip = 0;
  for (const r of taskRows) {
    const taskNumber = nz(r["Ref"]);
    if (!taskNumber) { jSkip++; continue; }
    const site = nz(r["Property Name"]) || "Unknown";
    const client_ = nz(r["Client"]) || "Unknown";
    const action = nz(r["Scope of works"]) || nz(r["Description"]) || nz(r["Name"]) || "Imported";
    const priority = nz(r["Priority"]) || "Medium";
    const status = nz(r["Status"]) || "Open";
    const address = nz(r["Address"]);
    const contactName = nz(r["Primary Contact Name"]);
    const contactEmail = nz(r["Primary Contact Email"]);
    const assignedTech = nz(r["Assigned Technician"]) || nz(r["Technician"]);
    const dueDate = nz(r["Due"]);
    const notes = nz(r["Internal Note"]);

    const ex = await client.query("SELECT id FROM jobs WHERE task_number=$1 LIMIT 1", [taskNumber]);
    if (ex.rows.length) {
      await client.query(
        `UPDATE jobs SET site=$1, client=$2, action_required=$3, priority=$4, status=$5,
           address=COALESCE($6,address), contact_name=COALESCE($7,contact_name),
           contact_email=COALESCE($8,contact_email), assigned_tech=COALESCE($9,assigned_tech),
           due_date=COALESCE($10,due_date), notes=COALESCE($11,notes), updated_at=now()
         WHERE id=$12`,
        [site, client_, action, priority, status, address, contactName, contactEmail, assignedTech, dueDate, notes, ex.rows[0].id],
      );
      jUpd++;
    } else {
      await client.query(
        `INSERT INTO jobs (id, task_number, site, address, client, contact_name, contact_email,
           action_required, priority, status, assigned_tech, due_date, notes, uptick_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'{}')`,
        [randomUUID(), taskNumber, site, address, client_, contactName, contactEmail, action, priority, status, assignedTech, dueDate, notes],
      );
      jIns++;
    }
  }

  // --------------------------------------------------------------- QUOTES → quotes
  const quoteFiles = [
    "flamesafe_quotes_2026-04-21_13-53-39_1776744736617.csv",
    "flamesafe_quotes_2026-04-21_14-01-58_1776744736614.csv",
  ];
  const quoteRows = dedupeById(quoteFiles.flatMap(load));
  let qIns = 0, qUpd = 0, qSkip = 0;
  for (const r of quoteRows) {
    const quoteNumber = nz(r["Reference"]);
    if (!quoteNumber) { qSkip++; continue; }
    const site = nz(r["Property"]) || "Unknown";
    const client_ = nz(r["Client"]) || "Unknown";
    const description = nz(r["Description"]) || nz(r["Scope of Works"]);
    const amount = num(r["Total"]) ?? num(r["Subtotal"]);
    const status = nz(r["Status"]) || "Draft";
    const dateCreated = nz(r["Date"]) || nz(r["Created"]);
    const dateSent = nz(r["Submitted Date"]);
    const dateAccepted = nz(r["Date Authorised"]);
    const validUntil = nz(r["Expiry Date"]);
    const assignedTech = nz(r["Salesperson"]) || nz(r["Author"]);
    const notes = nz(r["Authorisation Note"]);

    const ex = await client.query("SELECT id FROM quotes WHERE quote_number=$1 LIMIT 1", [quoteNumber]);
    if (ex.rows.length) {
      await client.query(
        `UPDATE quotes SET site=$1, client=$2, description=COALESCE($3,description),
           quote_amount=COALESCE($4,quote_amount), status=$5,
           date_created=COALESCE($6,date_created), date_sent=COALESCE($7,date_sent),
           date_accepted=COALESCE($8,date_accepted), valid_until=COALESCE($9,valid_until),
           assigned_tech=COALESCE($10,assigned_tech), notes=COALESCE($11,notes),
           raw_data=$12, updated_at=now()
         WHERE id=$13`,
        [site, client_, description, amount, status, dateCreated, dateSent, dateAccepted, validUntil, assignedTech, notes, JSON.stringify(r), ex.rows[0].id],
      );
      qUpd++;
    } else {
      await client.query(
        `INSERT INTO quotes (id, quote_number, site, client, description, quote_amount, status,
           date_created, date_sent, date_accepted, valid_until, assigned_tech, notes,
           raw_data, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [randomUUID(), quoteNumber, site, client_, description, amount, status, dateCreated, dateSent, dateAccepted, validUntil, assignedTech, notes, JSON.stringify(r), BATCH_ID],
      );
      qIns++;
    }
  }

  // ------------------------------------------------- SERVICE QUOTES → quotes (sq:)
  const sqRows = dedupeById(load("flamesafe_service_quotes_2026-04-21_13-49-21_1776744736618.csv"));
  let sqIns = 0, sqUpd = 0, sqSkip = 0;
  for (const r of sqRows) {
    const ref = nz(r["Ref"]);
    if (!ref) { sqSkip++; continue; }
    const quoteNumber = `SQ-${ref}`;
    const site = nz(r["Property"]) || "Unknown";
    const client_ = nz(r["Client"]) || "Unknown";
    const description = nz(r["Description"]) || nz(r["Scope of Works"]);
    const amount = num(r["Required works subtotal sell"]) ?? num(r["Work and services subtotal"]);
    const status = nz(r["Status"]) || "Draft";
    const dateCreated = nz(r["Created"]);
    const dateSent = nz(r["Latest submitted date"]);
    const dateAccepted = nz(r["Latest approved date"]);
    const validUntil = nz(r["Expiry date"]);
    const assignedTech = nz(r["Salesperson"]) || nz(r["Author"]);

    const ex = await client.query("SELECT id FROM quotes WHERE quote_number=$1 LIMIT 1", [quoteNumber]);
    if (ex.rows.length) {
      await client.query(
        `UPDATE quotes SET site=$1, client=$2, description=COALESCE($3,description),
           quote_amount=COALESCE($4,quote_amount), status=$5,
           date_created=COALESCE($6,date_created), date_sent=COALESCE($7,date_sent),
           date_accepted=COALESCE($8,date_accepted), valid_until=COALESCE($9,valid_until),
           assigned_tech=COALESCE($10,assigned_tech), raw_data=$11, updated_at=now()
         WHERE id=$12`,
        [site, client_, description, amount, status, dateCreated, dateSent, dateAccepted, validUntil, assignedTech, JSON.stringify(r), ex.rows[0].id],
      );
      sqUpd++;
    } else {
      await client.query(
        `INSERT INTO quotes (id, quote_number, site, client, description, quote_amount, status,
           date_created, date_sent, date_accepted, valid_until, assigned_tech,
           raw_data, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [randomUUID(), quoteNumber, site, client_, description, amount, status, dateCreated, dateSent, dateAccepted, validUntil, assignedTech, JSON.stringify(r), BATCH_ID],
      );
      sqIns++;
    }
  }

  // --------------------------------------------------------- REMARKS → defects
  const remarkFiles = [
    "flamesafe_remarks_2026-04-21_13-52-58_1776744736618.csv",
    "flamesafe_remarks_2026-04-21_13-52-58_(1)_1776744736616.csv",
  ];
  const defectRows = dedupeById(remarkFiles.flatMap(load));
  let dIns = 0, dUpd = 0, dSkip = 0;
  for (const r of defectRows) {
    const upId = nz(r["ID"]);
    if (!upId) { dSkip++; continue; }
    const taskNumber = nz(r["Created on Task Ref"]) || nz(r["Repair Task Ref"]);
    const site = nz(r["Property Name"]) || "Unknown";
    const client_ = nz(r["Client"]) || "Unknown";
    const description = nz(r["Description"]) || nz(r["Notes"]) || nz(r["Remark Type"]) || "—";
    const severity = nz(r["Severity Display"]) || nz(r["Severity"]) || "Medium";
    const status = nz(r["Status"]) || "Open";
    const assetType = nz(r["Asset Type"]);
    const location = nz(r["Asset Location"]) || nz(r["Location"]);
    const recommendation = nz(r["Resolution"]);
    const dateIdentified = nz(r["Created"]);
    const notes = nz(r["Notes"]);
    const raw = JSON.stringify({ uptick_id: upId, quote_ref: nz(r["Quote Ref"]), repair_task_ref: nz(r["Repair Task Ref"]) });

    const ex = await client.query("SELECT id FROM defects WHERE raw_data->>'uptick_id'=$1 LIMIT 1", [upId]);
    if (ex.rows.length) {
      await client.query(
        `UPDATE defects SET task_number=COALESCE($1,task_number), site=$2, client=$3,
           description=$4, severity=$5, status=$6,
           asset_type=COALESCE($7,asset_type), location=COALESCE($8,location),
           recommendation=COALESCE($9,recommendation),
           date_identified=COALESCE($10,date_identified), notes=COALESCE($11,notes),
           raw_data=$12, updated_at=now()
         WHERE id=$13`,
        [taskNumber, site, client_, description, severity, status, assetType, location, recommendation, dateIdentified, notes, raw, ex.rows[0].id],
      );
      dUpd++;
    } else {
      await client.query(
        `INSERT INTO defects (id, task_number, site, client, description, severity, status,
           asset_type, location, recommendation, date_identified, notes, raw_data, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [randomUUID(), taskNumber, site, client_, description, severity, status, assetType, location, recommendation, dateIdentified, notes, raw, BATCH_ID],
      );
      dIns++;
    }
  }

  // -------------------------------------------------------- INVOICES → invoices
  const invRows = dedupeById(load("flamesafe_invoices_2026-04-21_13-50-05_1776744736618.csv"));
  let iIns = 0, iUpd = 0, iSkip = 0;
  for (const r of invRows) {
    const invoiceNumber = nz(r["Number"]) || nz(r["Invoice Ref"]);
    if (!invoiceNumber) { iSkip++; continue; }
    const taskNumber = nz(r["Task Ref"]);
    const site = nz(r["Property"]) || "Unknown";
    const client_ = nz(r["Client"]) || "Unknown";
    const description = nz(r["Description"]) || nz(r["Task Name"]);
    const amount = num(r["Subtotal"]);
    const gst = num(r["Tax"]);
    const total = num(r["Total"]);
    const status = nz(r["Status"]) || "Draft";
    const dateIssued = nz(r["Date"]);
    const dateDue = nz(r["Due Date"]);

    const ex = await client.query("SELECT id FROM invoices WHERE invoice_number=$1 LIMIT 1", [invoiceNumber]);
    if (ex.rows.length) {
      await client.query(
        `UPDATE invoices SET task_number=COALESCE($1,task_number), site=$2, client=$3,
           description=COALESCE($4,description), amount=COALESCE($5,amount),
           gst_amount=COALESCE($6,gst_amount), total_amount=COALESCE($7,total_amount),
           status=$8, date_issued=COALESCE($9,date_issued), date_due=COALESCE($10,date_due),
           raw_data=$11, updated_at=now()
         WHERE id=$12`,
        [taskNumber, site, client_, description, amount, gst, total, status, dateIssued, dateDue, JSON.stringify(r), ex.rows[0].id],
      );
      iUpd++;
    } else {
      await client.query(
        `INSERT INTO invoices (id, invoice_number, task_number, site, client, description,
           amount, gst_amount, total_amount, status, date_issued, date_due,
           raw_data, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [randomUUID(), invoiceNumber, taskNumber, site, client_, description, amount, gst, total, status, dateIssued, dateDue, JSON.stringify(r), BATCH_ID],
      );
      iIns++;
    }
  }

  console.log(JSON.stringify({
    batch: BATCH_ID,
    jobs:     { source: taskRows.length,   inserted: jIns,  updated: jUpd,  skipped: jSkip },
    quotes:   { source: quoteRows.length,  inserted: qIns,  updated: qUpd,  skipped: qSkip },
    service_quotes: { source: sqRows.length, inserted: sqIns, updated: sqUpd, skipped: sqSkip },
    defects:  { source: defectRows.length, inserted: dIns,  updated: dUpd,  skipped: dSkip },
    invoices: { source: invRows.length,    inserted: iIns,  updated: iUpd,  skipped: iSkip },
  }, null, 2));

  await client.end();
})().catch(e => { console.error(e); process.exit(1); });

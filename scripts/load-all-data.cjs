const xlsx = require('xlsx');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const uid = () => crypto.randomUUID();

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().split('T')[0];
}

function findHeaderRow(data, test) {
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (row && row.some(c => test(String(c || '').trim()))) return i;
  }
  return -1;
}

function parseSheet(wb, name, headerTest) {
  const sheet = wb.Sheets[name];
  if (!sheet) return { headers: [], rows: [] };
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headerIdx = findHeaderRow(raw, headerTest);
  if (headerIdx === -1) return { headers: [], rows: [] };
  const headers = raw[headerIdx].map(h => String(h || '').trim());
  const rows = raw.slice(headerIdx + 1).filter(r => r && r.length > 1 && r.some(c => c !== undefined && c !== null && c !== ''));
  return { headers, rows };
}

function mapRow(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : null; });
  return obj;
}

function mapPriority(p) {
  const s = String(p || '').toUpperCase();
  if (s.includes('CRITICAL')) return 'Critical';
  if (s.includes('HIGH')) return 'High';
  if (s.includes('LOW')) return 'Low';
  return 'Medium';
}

function mapJobStatus(s) {
  const st = String(s || '').toUpperCase();
  if (st.includes('REVISIT')) return 'Open';
  if (st.includes('SCHEDULED') || st.includes('BOOKED')) return 'Booked';
  if (st.includes('INPROGRESS') || st.includes('IN PROGRESS')) return 'In Progress';
  if (st.includes('READY')) return 'Open';
  if (st.includes('COMPLETED') || st.includes('DONE')) return 'Done';
  if (st.includes('WAITING') || st.includes('ON HOLD') || st.includes('BLOCKED')) return 'Waiting';
  return 'Open';
}

function mapQuoteStatus(s) {
  const st = String(s || '').toUpperCase();
  if (st.includes('FINALISED') || st.includes('WON') || st.includes('ACCEPTED')) return 'Accepted';
  if (st.includes('SUBMITTED') || st.includes('SENT')) return 'Sent';
  if (st.includes('DRAFT')) return 'Draft';
  if (st.includes('DECLINED') || st.includes('LOST')) return 'Declined';
  if (st.includes('EXPIRED')) return 'Expired';
  return 'Draft';
}

async function run() {
  const wb = xlsx.readFile('attached_assets/flamesafe_focused_09apr2026_1775773663737.xlsx');
  const client = await pool.connect();
  const now = new Date().toISOString();

  try {
    await client.query('BEGIN');

    // Clear existing imported data to reload fresh
    await client.query('DELETE FROM wip_records');
    await client.query('DELETE FROM quotes');
    await client.query('DELETE FROM jobs');
    await client.query('DELETE FROM invoices WHERE import_batch_id = $1', ['spreadsheet-import']);
    // Only delete imported notes (contain [T- or [N/A] prefix), preserve manually created ones
    await client.query(`DELETE FROM notes WHERE text LIKE '[T-%' OR text LIKE '[N/A]%'`);
    await client.query('DELETE FROM schedule_events WHERE 1=1').catch(() => {});
    console.log('Cleared existing data for fresh import');

    // 1. REPAIRS → wip_records
    const rep = parseSheet(wb, 'REPAIRS', h => h === 'PRIORITY' || h === 'REF');
    console.log(`\nREPAIRS: ${rep.rows.length} data rows`);
    let wipCount = 0;
    for (const row of rep.rows) {
      const d = mapRow(rep.headers, row);
      if (!d['REF']) continue;
      const statusMap = { 'REVISIT': 'Open', 'SCHEDULED': 'Scheduled', 'READY': 'Open', 'INPROGRESS': 'In Progress', 'COMPLETED': 'Completed' };
      await client.query(
        `INSERT INTO wip_records (id, task_number, site, client, job_type, description, status, priority, assigned_tech, due_date, quote_amount, notes, import_batch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
        [uid(), d['REF'], d['PROPERTY / SITE'] || 'Unknown', d['CLIENT'] || 'Unknown', 'Repair',
         d['NOTES / ACTION'] || 'Repair task',
         statusMap[String(d['STATUS'] || '').toUpperCase()] || 'Open',
         mapPriority(d['PRIORITY']), d['TECHNICIAN'] || null,
         excelDateToISO(d['SCHED DATE']),
         d['VALUE ($)'] ? Number(d['VALUE ($)']).toFixed(2) : null,
         `Auth: $${Number(d['AUTH ($)'] || 0).toFixed(2)} | Days open: ${d['DAYS OPEN'] || '?'} | Invoiced: ${d['INVOICED'] || 'No'}`,
         'spreadsheet-import']
      );
      wipCount++;
    }
    console.log(`  → ${wipCount} WIP records`);

    // 2. ACTION LIST → jobs
    const al = parseSheet(wb, 'ACTION LIST', h => h === '#' || h === 'REF');
    console.log(`\nACTION LIST: ${al.rows.length} data rows`);
    let jobCount = 0;
    for (const row of al.rows) {
      const d = mapRow(al.headers, row);
      if (!d['REF']) continue;
      await client.query(
        `INSERT INTO jobs (id, task_number, site, client, action_required, priority, status, assigned_tech, due_date, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [uid(), d['REF'], d['PROPERTY / SITE'] || 'Unknown', d['CLIENT'] || 'Unknown',
         `${d['CATEGORY'] || 'Task'} — $${Number(d['VALUE ($)'] || 0).toFixed(0)} value, ${d['DAYS OPEN'] || '?'} days open${d['INVOICED'] === 'Yes' ? ' (invoiced)' : ''}`,
         mapPriority(d['PRIORITY']), mapJobStatus(d['STATUS']),
         d['TECHNICIAN'] || null, excelDateToISO(d['SCHED DATE']),
         `Auth: $${Number(d['AUTH ($)'] || 0).toFixed(2)} | Category: ${d['CATEGORY'] || 'N/A'} | Invoiced: ${d['INVOICED'] || 'No'}`]
      );
      jobCount++;
    }
    console.log(`  → ${jobCount} jobs`);

    // 3. QUOTES → quotes
    const q = parseSheet(wb, 'QUOTES', h => h === 'REF' || h === 'PROPERTY');
    console.log(`\nQUOTES: ${q.rows.length} data rows`);
    let quoteCount = 0;
    for (const row of q.rows) {
      const d = mapRow(q.headers, row);
      if (!d['REF']) continue;
      await client.query(
        `INSERT INTO quotes (id, quote_number, site, client, description, quote_amount, status, date_created, valid_until, notes, import_batch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
        [uid(), d['REF'], d['PROPERTY'] || 'Unknown', d['CLIENT'] || 'Unknown',
         d['DESCRIPTION'] || null,
         d['TOTAL INC GST'] ? Number(d['TOTAL INC GST']).toFixed(2) : (d['REVENUE ($)'] ? Number(d['REVENUE ($)']).toFixed(2) : null),
         mapQuoteStatus(d['STATUS']), excelDateToISO(d['DATE']), excelDateToISO(d['DUE DATE']),
         `Revenue: $${Number(d['REVENUE ($)'] || 0).toFixed(2)} | Margin: ${((d['MARGIN %'] || 0) * 100).toFixed(1)}%`,
         'spreadsheet-import']
      );
      quoteCount++;
    }
    console.log(`  → ${quoteCount} quotes`);

    // 4. SCHEDULE REGISTER → also jobs (dedup by REF)
    const sr = parseSheet(wb, 'SCHEDULE REGISTER', h => h === '#' || h === 'REF');
    console.log(`\nSCHEDULE REGISTER: ${sr.rows.length} data rows`);
    let schedCount = 0;
    for (const row of sr.rows) {
      const d = mapRow(sr.headers, row);
      if (!d['REF']) continue;
      const existing = await client.query('SELECT id FROM jobs WHERE task_number = $1', [d['REF']]);
      if (existing.rows.length > 0) continue;
      await client.query(
        `INSERT INTO jobs (id, task_number, site, client, action_required, priority, status, assigned_tech, due_date, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [uid(), d['REF'], d['PROPERTY'] || 'Unknown', d['CLIENT'] || 'Unknown',
         `${d['CATEGORY'] || 'Scheduled'} — $${Number(d['VALUE ($)'] || 0).toFixed(0)} value`,
         'Medium', mapJobStatus(d['STATUS']), d['TECH'] || null,
         excelDateToISO(d['SCHED DATE']),
         `Days open: ${d['DAYS OPEN'] || '?'} | Overlap: ${d['OVERLAP?'] || 'No'}`]
      );
      schedCount++;
    }
    console.log(`  → ${schedCount} additional scheduled jobs`);

    // 5. NOTES LOG → notes
    const nl = parseSheet(wb, 'NOTES LOG', h => h === 'DATE / TIME' || h === 'NOTE');
    console.log(`\nNOTES LOG: ${nl.rows.length} data rows`);
    let noteCount = 0;
    for (const row of nl.rows) {
      const d = mapRow(nl.headers, row);
      if (!d['NOTE']) continue;
      const noteText = `[${d['TASK REF'] || 'N/A'}] ${d['PROPERTY / CLIENT'] || ''} — ${d['NOTE']}`;
      const statusBefore = d['STATUS — BEFORE'] || '';
      const statusAfter = d['STATUS — AFTER'] || '';
      const category = statusAfter.includes('QUOTE') ? 'To Do' : statusAfter.includes('COMPLETED') ? 'Done' : 'To Do';
      await client.query(
        `INSERT INTO notes (id, text, category, owner, status, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())`,
        [uid(), noteText, category, d['LOGGED BY'] || 'Casper', 'Open']
      );
      noteCount++;
    }
    console.log(`  → ${noteCount} notes`);

    // 6. Generate INVOICES from REPAIRS where INVOICED = Yes
    console.log(`\nGENERATING INVOICES from invoiced repairs...`);
    let invCount = 0;
    for (const row of rep.rows) {
      const d = mapRow(rep.headers, row);
      if (!d['REF'] || String(d['INVOICED'] || '').toUpperCase() !== 'YES') continue;
      const amount = d['VALUE ($)'] ? Number(d['VALUE ($)']) : 0;
      if (amount <= 0) continue;
      const gst = Math.round(amount * 0.1 * 100) / 100;
      const total = Math.round((amount + gst) * 100) / 100;
      // Use a date roughly 7 days after scheduled date, or today
      const schedDate = excelDateToISO(d['SCHED DATE']);
      const paidDate = schedDate || new Date().toISOString().split('T')[0];
      await client.query(
        `INSERT INTO invoices (id, invoice_number, task_number, site, client, description, amount, gst_amount, total_amount, status, date_issued, date_due, date_paid, import_batch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
        [uid(), `INV-${d['REF']}`, d['REF'], d['PROPERTY / SITE'] || 'Unknown', d['CLIENT'] || 'Unknown',
         d['NOTES / ACTION'] || 'Repair - invoiced', amount.toFixed(2), gst.toFixed(2), total.toFixed(2),
         'Paid', paidDate, paidDate, paidDate, 'spreadsheet-import']
      );
      invCount++;
    }
    // Also generate outstanding invoices from completed but not invoiced repairs
    for (const row of rep.rows) {
      const d = mapRow(rep.headers, row);
      if (!d['REF']) continue;
      const status = String(d['STATUS'] || '').toUpperCase();
      const invoiced = String(d['INVOICED'] || '').toUpperCase();
      if (status === 'COMPLETED' && invoiced !== 'YES') {
        const amount = d['VALUE ($)'] ? Number(d['VALUE ($)']) : 0;
        if (amount <= 0) continue;
        const gst = Math.round(amount * 0.1 * 100) / 100;
        const total = Math.round((amount + gst) * 100) / 100;
        await client.query(
          `INSERT INTO invoices (id, invoice_number, task_number, site, client, description, amount, gst_amount, total_amount, status, date_issued, date_due, import_batch_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
          [uid(), `INV-${d['REF']}`, d['REF'], d['PROPERTY / SITE'] || 'Unknown', d['CLIENT'] || 'Unknown',
           d['NOTES / ACTION'] || 'Repair - pending invoice', amount.toFixed(2), gst.toFixed(2), total.toFixed(2),
           'Sent', new Date().toISOString().split('T')[0], new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
           'spreadsheet-import']
        );
        invCount++;
      }
    }
    console.log(`  → ${invCount} invoices`);

    await client.query('COMMIT');

    // Print totals
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) as c FROM jobs'),
      client.query('SELECT COUNT(*) as c FROM wip_records'),
      client.query('SELECT COUNT(*) as c FROM quotes'),
      client.query('SELECT COUNT(*) as c FROM notes'),
      client.query('SELECT COUNT(*) as c FROM invoices'),
    ]);
    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Jobs: ${counts[0].rows[0].c}`);
    console.log(`WIP Records: ${counts[1].rows[0].c}`);
    console.log(`Quotes: ${counts[2].rows[0].c}`);
    console.log(`Notes: ${counts[3].rows[0].c}`);
    console.log(`Invoices: ${counts[4].rows[0].c}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });

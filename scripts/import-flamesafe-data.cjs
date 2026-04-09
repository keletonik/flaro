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

function parseSheet(wb, name, headerTest) {
  const sheet = wb.Sheets[name];
  if (!sheet) return { headers: [], rows: [] };
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    const row = raw[i];
    if (row && row.some(c => headerTest(String(c || '').trim()))) {
      headerIdx = i;
      break;
    }
  }
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
  if (st.includes('INPROGRESS') || st.includes('IN PROGRESS') || st.includes('IN_PROGRESS')) return 'In Progress';
  if (st.includes('READY')) return 'Open';
  if (st.includes('COMPLETED') || st.includes('DONE')) return 'Done';
  if (st.includes('WAITING') || st.includes('ON HOLD') || st.includes('BLOCKED')) return 'Waiting';
  return 'Open';
}

function mapQuoteStatus(s) {
  const st = String(s || '').toUpperCase();
  if (st.includes('FINALISED') || st.includes('FINALIZED') || st.includes('WON') || st.includes('ACCEPTED')) return 'Accepted';
  if (st.includes('SUBMITTED') || st.includes('SENT')) return 'Sent';
  if (st.includes('DRAFT')) return 'Draft';
  if (st.includes('DECLINED') || st.includes('LOST')) return 'Declined';
  if (st.includes('EXPIRED')) return 'Expired';
  if (st.includes('REVISED')) return 'Revised';
  return 'Draft';
}

async function run() {
  const wb = xlsx.readFile('attached_assets/flamesafe_focused_09apr2026_1775773663737.xlsx');
  const client = await pool.connect();
  const batchId = `flamesafe-import-${new Date().toISOString().slice(0,10)}`;
  
  try {
    await client.query('BEGIN');

    // 1. Import ACTION LIST → jobs table
    const al = parseSheet(wb, 'ACTION LIST', h => h === '#' || h === 'REF');
    console.log(`ACTION LIST: ${al.rows.length} rows`);
    
    let jobCount = 0;
    for (const row of al.rows) {
      const d = mapRow(al.headers, row);
      if (!d['REF']) continue;
      const existing = await client.query('SELECT id FROM jobs WHERE task_number = $1', [d['REF']]);
      if (existing.rows.length > 0) continue;
      
      await client.query(
        `INSERT INTO jobs (id, task_number, site, client, action_required, priority, status, assigned_tech, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uid(),
          d['REF'],
          d['PROPERTY / SITE'] || 'Unknown',
          d['CLIENT'] || 'Unknown',
          `${d['CATEGORY'] || 'Task'} — $${Number(d['VALUE ($)'] || 0).toFixed(0)} value, ${d['DAYS OPEN'] || '?'} days open${d['INVOICED'] === 'Yes' ? ' (invoiced)' : ''}`,
          mapPriority(d['PRIORITY']),
          mapJobStatus(d['STATUS']),
          d['TECHNICIAN'] || null,
          excelDateToISO(d['SCHED DATE']),
          `Auth: $${Number(d['AUTH ($)'] || 0).toFixed(2)} | Category: ${d['CATEGORY'] || 'N/A'} | Invoiced: ${d['INVOICED'] || 'No'}`
        ]
      );
      jobCount++;
    }
    console.log(`  → Inserted ${jobCount} jobs`);

    // 2. Import QUOTES → quotes table
    const q = parseSheet(wb, 'QUOTES', h => h === 'REF' || h === 'PROPERTY');
    console.log(`QUOTES: ${q.rows.length} rows`);
    
    let quoteCount = 0;
    for (const row of q.rows) {
      const d = mapRow(q.headers, row);
      if (!d['REF']) continue;
      const existing = await client.query('SELECT id FROM quotes WHERE quote_number = $1', [d['REF']]);
      if (existing.rows.length > 0) continue;

      await client.query(
        `INSERT INTO quotes (id, quote_number, site, client, description, quote_amount, status, date_created, valid_until, notes, import_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          uid(),
          d['REF'],
          d['PROPERTY'] || 'Unknown',
          d['CLIENT'] || 'Unknown',
          d['DESCRIPTION'] || null,
          d['TOTAL INC GST'] ? Number(d['TOTAL INC GST']).toFixed(2) : (d['REVENUE ($)'] ? Number(d['REVENUE ($)']).toFixed(2) : null),
          mapQuoteStatus(d['STATUS']),
          excelDateToISO(d['DATE']),
          excelDateToISO(d['DUE DATE']),
          `Revenue: $${Number(d['REVENUE ($)'] || 0).toFixed(2)} | Margin: ${((d['MARGIN %'] || 0) * 100).toFixed(1)}%`,
          batchId
        ]
      );
      quoteCount++;
    }
    console.log(`  → Inserted ${quoteCount} quotes`);

    // 3. Import WIP from REPAIRS sheet → wip_records table
    const rep = parseSheet(wb, 'REPAIRS', h => h === 'PRIORITY' || h === 'REF');
    console.log(`REPAIRS: ${rep.rows.length} rows`);
    
    let wipCount = 0;
    for (const row of rep.rows) {
      const d = mapRow(rep.headers, row);
      if (!d['REF']) continue;
      const existing = await client.query('SELECT id FROM wip_records WHERE task_number = $1', [d['REF']]);
      if (existing.rows.length > 0) continue;

      const statusMap = { 'REVISIT': 'Open', 'SCHEDULED': 'Scheduled', 'READY': 'Open', 'INPROGRESS': 'In Progress', 'COMPLETED': 'Completed' };
      const wipStatus = statusMap[String(d['STATUS'] || '').toUpperCase()] || 'Open';

      await client.query(
        `INSERT INTO wip_records (id, task_number, site, client, job_type, description, status, priority, assigned_tech, due_date, quote_amount, notes, import_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          uid(),
          d['REF'],
          d['PROPERTY / SITE'] || 'Unknown',
          d['CLIENT'] || 'Unknown',
          'Repair',
          d['NOTES / ACTION'] || 'Repair task',
          wipStatus,
          mapPriority(d['PRIORITY']),
          d['TECHNICIAN'] || null,
          excelDateToISO(d['SCHED DATE']),
          d['VALUE ($)'] ? Number(d['VALUE ($)']).toFixed(2) : null,
          `Auth: $${Number(d['AUTH ($)'] || 0).toFixed(2)} | Days open: ${d['DAYS OPEN'] || '?'} | Invoiced: ${d['INVOICED'] || 'No'}`,
          batchId
        ]
      );
      wipCount++;
    }
    console.log(`  → Inserted ${wipCount} WIP records`);

    // 4. Import SCHEDULE REGISTER → also as jobs (if not already present from action list)
    const sr = parseSheet(wb, 'SCHEDULE REGISTER', h => h === '#' || h === 'REF');
    console.log(`SCHEDULE REGISTER: ${sr.rows.length} rows`);
    
    let schedCount = 0;
    for (const row of sr.rows) {
      const d = mapRow(sr.headers, row);
      if (!d['REF']) continue;
      const existing = await client.query('SELECT id FROM jobs WHERE task_number = $1', [d['REF']]);
      if (existing.rows.length > 0) continue;

      await client.query(
        `INSERT INTO jobs (id, task_number, site, client, action_required, priority, status, assigned_tech, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uid(),
          d['REF'],
          d['PROPERTY'] || 'Unknown',
          d['CLIENT'] || 'Unknown',
          `${d['CATEGORY'] || 'Task'} — $${Number(d['VALUE ($)'] || 0).toFixed(0)} value`,
          mapPriority('Medium'),
          mapJobStatus(d['STATUS']),
          d['TECH'] || null,
          excelDateToISO(d['SCHED DATE']),
          `Days open: ${d['DAYS OPEN'] || '?'} | Overlap: ${d['OVERLAP?'] || 'No'}`
        ]
      );
      schedCount++;
    }
    console.log(`  → Inserted ${schedCount} additional scheduled jobs`);

    // 5. Import NOTES LOG → notes table
    const nlSheet = wb.Sheets['NOTES LOG'];
    const nlRaw = xlsx.utils.sheet_to_json(nlSheet, { header: 1 });
    let nlHeaderIdx = -1;
    for (let i = 0; i < 10; i++) {
      if (nlRaw[i] && nlRaw[i].some(c => String(c||'').includes('DATE'))) { nlHeaderIdx = i; break; }
    }
    
    let noteCount = 0;
    if (nlHeaderIdx >= 0) {
      const nlHeaders = nlRaw[nlHeaderIdx].map(h => String(h||'').trim());
      const nlRows = nlRaw.slice(nlHeaderIdx + 1).filter(r => r && r[0] && !String(r[0]).includes('↑'));
      
      for (const row of nlRows) {
        const d = {};
        nlHeaders.forEach((h, i) => { d[h] = row[i]; });
        if (!d['NOTE']) continue;
        
        await client.query(
          `INSERT INTO notes (id, text, category, owner, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            uid(),
            `[${d['TASK REF'] || 'N/A'}] ${d['PROPERTY / CLIENT'] || ''} — ${d['NOTE']}`,
            'To Do',
            d['LOGGED BY'] || 'Casper',
            'active'
          ]
        );
        noteCount++;
      }
    }
    console.log(`  → Inserted ${noteCount} notes`);

    await client.query('COMMIT');
    console.log('\n✅ Import complete!');

    // Summary
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM jobs'),
      client.query('SELECT COUNT(*) FROM quotes'),
      client.query('SELECT COUNT(*) FROM wip_records'),
      client.query('SELECT COUNT(*) FROM notes'),
    ]);
    console.log(`\nDatabase totals:`);
    console.log(`  Jobs: ${counts[0].rows[0].count}`);
    console.log(`  Quotes: ${counts[1].rows[0].count}`);
    console.log(`  WIP: ${counts[2].rows[0].count}`);
    console.log(`  Notes: ${counts[3].rows[0].count}`);

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

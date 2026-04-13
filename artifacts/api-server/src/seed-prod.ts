import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import seedData from "./seed-data.json";

export async function seedProductionData() {
  const client = await pool.connect();
  try {
    const wipCount = await client.query("SELECT COUNT(*) as cnt FROM wip_records");
    if (parseInt(wipCount.rows[0].cnt) > 100) {
      logger.info({ wipCount: wipCount.rows[0].cnt }, "Production DB already seeded, skipping");
      return;
    }

    logger.info("Seeding production database with dev data...");
    await client.query("BEGIN");

    const tables: Array<{ name: string; columns: string[] }> = [
      { name: "users", columns: ["id", "username", "display_name", "password_hash", "role", "email", "must_change_password", "created_at", "password_algo", "password_salt"] },
      { name: "suppliers", columns: ["id", "name", "category", "contact_name", "phone", "email", "website", "address", "suburb", "account_number", "payment_terms", "notes", "rating", "created_at", "updated_at"] },
      { name: "jobs", columns: ["id", "task_number", "site", "address", "client", "contact_name", "contact_number", "contact_email", "action_required", "priority", "status", "assigned_tech", "due_date", "notes", "uptick_notes", "created_at", "updated_at", "deleted_at"] },
      { name: "wip_records", columns: ["id", "task_number", "site", "address", "client", "job_type", "description", "status", "priority", "assigned_tech", "due_date", "date_created", "quote_amount", "invoice_amount", "po_number", "notes", "raw_data", "import_batch_id", "created_at", "updated_at", "deleted_at"] },
      { name: "todos", columns: ["id", "text", "completed", "priority", "category", "due_date", "created_at", "updated_at", "assignee", "urgency_tag", "color_code", "notes", "next_steps", "dependencies"] },
      { name: "notes", columns: ["id", "text", "category", "owner", "status", "created_at"] },
      { name: "quotes", columns: ["id", "task_number", "quote_number", "site", "address", "client", "description", "quote_amount", "status", "date_created", "date_sent", "date_accepted", "valid_until", "assigned_tech", "contact_name", "contact_email", "notes", "raw_data", "import_batch_id", "created_at", "updated_at", "deleted_at"] },
      { name: "defects", columns: ["id", "task_number", "site", "address", "client", "description", "severity", "status", "building_class", "asset_type", "location", "recommendation", "due_date", "date_identified", "notes", "raw_data", "import_batch_id", "created_at", "updated_at", "deleted_at"] },
      { name: "supplier_products", columns: ["id", "supplier_id", "product_name", "product_code", "category", "brand", "unit_price", "unit", "description", "notes", "raw_data", "import_batch_id", "created_at", "updated_at"] },
      { name: "on_call_roster", columns: ["id", "date", "tech_name", "notes", "created_at"] },
      { name: "invoices", columns: ["id", "invoice_number", "task_number", "site", "address", "client", "description", "amount", "gst_amount", "total_amount", "status", "date_issued", "date_due", "date_paid", "payment_terms", "notes", "raw_data", "import_batch_id", "created_at", "updated_at", "deleted_at"] },
      { name: "toolbox", columns: ["id", "ref", "text", "status", "created_at"] },
    ];

    for (const table of tables) {
      const rows = (seedData as Record<string, any[]>)[table.name];
      if (!rows || rows.length === 0) continue;

      const batchSize = 50;
      let inserted = 0;

      for (let b = 0; b < rows.length; b += batchSize) {
        const chunk = rows.slice(b, b + batchSize);
        const valuePlaceholders: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const row of chunk) {
          const placeholders = table.columns.map(() => `$${paramIndex++}`);
          valuePlaceholders.push(`(${placeholders.join(",")})`);
          for (const col of table.columns) {
            let val = row[col];
            if (col === "raw_data" && val !== null && typeof val === "object") {
              val = JSON.stringify(val);
            }
            params.push(val ?? null);
          }
        }

        const colList = table.columns.map(c => `"${c}"`).join(",");
        await client.query(
          `INSERT INTO ${table.name} (${colList}) VALUES ${valuePlaceholders.join(",")} ON CONFLICT DO NOTHING`,
          params
        );
        inserted += chunk.length;
      }

      logger.info({ table: table.name, rows: inserted }, "Seeded table");
    }

    const seqTables = ["users", "jobs", "todos", "notes", "quotes", "defects", "invoices", "toolbox", "suppliers", "on_call_roster", "conversations"];
    for (const t of seqTables) {
      try {
        await client.query(`SELECT setval('${t}_id_seq', GREATEST((SELECT MAX(id) FROM ${t}), 1))`);
      } catch (_e) {
      }
    }

    await client.query("COMMIT");
    logger.info("Production database seeding complete");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Failed to seed production database");
  } finally {
    client.release();
  }
}

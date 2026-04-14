import app from "./app";
import { logger } from "./lib/logger";
import { db, pool } from "@workspace/db";
import { conversations } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureCasperAdmin } from "./routes/auth";
import { seedProductionData } from "./seed-prod";
import { seedAdditionalData } from "./seed-additional";
import { seedFipKnowledgeBase } from "./seed-fip";
import { seedEstimationWorkbench } from "./seed-estimation";
import { seedPaSurface } from "./seed-pa";
import { seedApr15Batch } from "./seed-apr15-batch";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureDefaultConversation() {
  try {
    const [existing] = await db.select().from(conversations).where(eq(conversations.id, 1));
    if (!existing) {
      // Force id=1 via raw SQL to guarantee the frontend's hardcoded CONVERSATION_ID matches
      await pool.query(`INSERT INTO conversations (id, title, created_at) VALUES (1, 'Service Ops Chat', NOW()) ON CONFLICT (id) DO NOTHING`);
      // Reset sequence to avoid conflicts on next auto-generated id
      await pool.query(`SELECT setval('conversations_id_seq', GREATEST((SELECT MAX(id) FROM conversations), 1))`);
      logger.info("Created default conversation (id=1)");
    }
  } catch (err) {
    logger.warn({ err }, "Could not ensure default conversation — DB may not be ready");
  }
}

async function reportDataState() {
  // Dump the final row count for every table the UI reads from. If this line
  // is missing from the boot log, the seed pipeline crashed before it got
  // here — scroll up for the actual error. If the counts look wrong, hit
  // /api/diag on the deployed host for a richer dump.
  const labels = [
    "jobs",
    "wip_records",
    "quotes",
    "defects",
    "invoices",
    "suppliers",
    "supplier_products",
    "todos",
    "notes",
    "fip_manufacturers",
    "fip_models",
    "fip_documents",
    "fip_standards",
    "estimates",
    "estimate_lines",
  ];
  const counts: Record<string, number | string> = {};
  for (const t of labels) {
    try {
      const r = await pool.query(`SELECT count(*)::int AS cnt FROM "${t}"`);
      counts[t] = r.rows[0].cnt;
    } catch {
      counts[t] = "missing";
    }
  }
  logger.info({ counts }, "[boot] final DB row counts");
}

async function runStartupSeed() {
  // Run every seed in sequence and log between each step so a failure mid-
  // pipeline doesn't look like an outage. Every step has its own internal
  // try/catch, so the outer .catch here is a backstop for truly unexpected
  // errors. Never blocks the server from accepting requests.
  try {
    logger.info("[boot] running ensureDefaultConversation");
    await ensureDefaultConversation();
    logger.info("[boot] running ensureCasperAdmin");
    await ensureCasperAdmin();
    logger.info("[boot] running seedProductionData");
    await seedProductionData();
    logger.info("[boot] running seedAdditionalData");
    await seedAdditionalData();
    logger.info("[boot] running seedFipKnowledgeBase");
    await seedFipKnowledgeBase();
    logger.info("[boot] running seedEstimationWorkbench");
    await seedEstimationWorkbench();
    logger.info("[boot] running seedPaSurface");
    await seedPaSurface();
    logger.info("[boot] running seedApr15Batch");
    await seedApr15Batch();
    await reportDataState();
    logger.info("[boot] seed pipeline complete — site is ready");
  } catch (err) {
    logger.error({ err }, "[boot] seed pipeline failed — hit /api/diag to inspect");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening — hit /api/diag for a data health dump");
  // Fire the seed pipeline in the background so the port starts accepting
  // traffic immediately. Health checks (/api/healthz and /api/diag) both
  // respond before the seed finishes.
  runStartupSeed();
});

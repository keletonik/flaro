import app from "./app";
import { logger } from "./lib/logger";
import { db, pool } from "@workspace/db";
import { conversations } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureCasperAdmin } from "./routes/auth";
import { seedProductionData } from "./seed-prod";
import { seedAdditionalData } from "./seed-additional";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  ensureDefaultConversation();
  ensureCasperAdmin().catch((err) => {
    logger.warn({ err }, "Could not ensure casper admin on startup — DB may not be ready");
  });
  seedProductionData()
    .then(() => seedAdditionalData())
    .catch((err) => {
      logger.warn({ err }, "Could not seed production data on startup");
    });
});

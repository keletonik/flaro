import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { conversations } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      await db.insert(conversations).values({ title: "Service Ops Chat" });
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
});

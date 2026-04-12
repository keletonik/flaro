import { defineConfig } from "drizzle-kit";
import path from "path";

// `generate` runs offline from schema diffs and does not need a live DB.
// `push` / `migrate` do, so guard only when the caller needs one.
const requiresDb = !process.argv.some((arg) => arg === "generate");
if (requiresDb && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});

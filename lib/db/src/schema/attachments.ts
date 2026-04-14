/**
 * attachments — generic file attachments for any AI surface.
 *
 * Every chat input in the app (PA, embedded drawer, FIP assistant,
 * contextual chat) can upload files and attach them to a message.
 * This table is the persistence layer — one row per uploaded file,
 * bytea blob stored inline (Phase 1 — swap to S3 later).
 *
 * Kinds:
 *   image    — jpeg/png/webp/gif → vision content block for the LLM
 *   document — PDF → native PDF document block for Claude
 *   text     — .txt/.md/.csv → inline text with a filename sentinel
 *   other    — anything else (stored but not auto-injected into prompts)
 *
 * Source tag identifies which surface uploaded it — useful for the
 * /api/diag probes and for scoped cleanup jobs later.
 */
import { customType, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() { return "bytea"; },
});

export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().$type<"image" | "document" | "text" | "other">(),
    filename: text("filename"),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    checksum: text("checksum").notNull(),
    blob: bytea("blob").notNull(),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("attachments_kind_idx").on(t.kind),
    index("attachments_checksum_idx").on(t.checksum),
    index("attachments_deleted_idx").on(t.deletedAt),
  ],
);

export const insertAttachmentSchema = createInsertSchema(attachments).omit({ createdAt: true });
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

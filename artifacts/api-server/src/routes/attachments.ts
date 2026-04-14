/**
 * /api/attachments — upload and fetch for the generic AI attachment
 * layer. Every AI chat surface (PA, embedded drawer, FIP, contextual)
 * posts to this endpoint before sending a message, then passes the
 * returned id in the chat payload.
 *
 * Routes:
 *   POST   /api/attachments            multipart or base64-json upload
 *   GET    /api/attachments/:id        download the raw blob
 *   GET    /api/attachments/:id/meta   return metadata only
 *
 * Size caps:
 *   image: 20 MB
 *   document (PDF): 20 MB
 *   text: 2 MB
 *
 * Kind is inferred from content-type with a small allowlist. Files
 * outside the allowlist are rejected with 415.
 */

import { Router } from "express";
import { randomUUID, createHash } from "crypto";
import { db } from "@workspace/db";
import { attachments } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

const router = Router();

const MAX_SIZE: Record<string, number> = {
  image: 20 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  text: 2 * 1024 * 1024,
  other: 5 * 1024 * 1024,
};

function classifyKind(contentType: string): "image" | "document" | "text" | "other" {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct === "application/pdf") return "document";
  if (
    ct.startsWith("text/") ||
    ct === "application/json" ||
    ct === "application/csv" ||
    ct === "text/csv"
  ) return "text";
  return "other";
}

function parseBase64(data: string): { bytes: Buffer; contentType: string | null } {
  // Accept both "data:<type>;base64,<payload>" and bare base64.
  const m = data.match(/^data:([^;]+);base64,(.+)$/);
  if (m) {
    return { bytes: Buffer.from(m[2], "base64"), contentType: m[1] };
  }
  return { bytes: Buffer.from(data, "base64"), contentType: null };
}

// POST /api/attachments  — JSON body { filename?, contentType, data, source? }
router.post("/attachments", async (req, res, next) => {
  try {
    const { filename, contentType, data, source } = req.body ?? {};
    if (!data || typeof data !== "string") {
      res.status(400).json({ error: "data (base64 string) required" });
      return;
    }
    const parsed = parseBase64(data);
    const ct = contentType || parsed.contentType || "application/octet-stream";
    const kind = classifyKind(ct);
    const cap = MAX_SIZE[kind];
    if (parsed.bytes.length === 0) {
      res.status(400).json({ error: "empty file" });
      return;
    }
    if (parsed.bytes.length > cap) {
      res.status(413).json({
        error: `file too large (${parsed.bytes.length} bytes) — max for ${kind} is ${cap}`,
      });
      return;
    }

    const id = randomUUID();
    const checksum = createHash("sha256").update(parsed.bytes).digest("hex");
    const [row] = await db.insert(attachments).values({
      id,
      kind,
      filename: filename ? String(filename).slice(0, 255) : null,
      contentType: ct,
      size: parsed.bytes.length,
      checksum,
      blob: parsed.bytes,
      source: source ? String(source).slice(0, 50) : null,
    }).returning({
      id: attachments.id,
      kind: attachments.kind,
      filename: attachments.filename,
      contentType: attachments.contentType,
      size: attachments.size,
      createdAt: attachments.createdAt,
    });

    res.status(201).json({
      id: row.id,
      kind: row.kind,
      filename: row.filename,
      contentType: row.contentType,
      size: row.size,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// GET /api/attachments/:id — raw bytes
router.get("/attachments/:id", async (req, res, next) => {
  try {
    const [row] = await db.select().from(attachments)
      .where(and(eq(attachments.id, req.params.id), isNull(attachments.deletedAt)));
    if (!row) { res.status(404).json({ error: "attachment not found" }); return; }
    res.setHeader("Content-Type", row.contentType);
    if (row.filename) {
      res.setHeader("Content-Disposition", `inline; filename="${row.filename.replace(/"/g, "")}"`);
    }
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(row.blob);
  } catch (err) { next(err); }
});

// GET /api/attachments/:id/meta — metadata only
router.get("/attachments/:id/meta", async (req, res, next) => {
  try {
    const [row] = await db.select({
      id: attachments.id,
      kind: attachments.kind,
      filename: attachments.filename,
      contentType: attachments.contentType,
      size: attachments.size,
      source: attachments.source,
      createdAt: attachments.createdAt,
    }).from(attachments)
      .where(and(eq(attachments.id, req.params.id), isNull(attachments.deletedAt)));
    if (!row) { res.status(404).json({ error: "attachment not found" }); return; }
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (err) { next(err); }
});

export default router;

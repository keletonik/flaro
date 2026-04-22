/**
 * /api/msg/intake — accept Outlook .msg uploads, parse them, categorize,
 * and create a Job row. The existing Airtable two-way sync's pushJobToAirtable
 * is invoked so the new Job propagates to Airtable on commit.
 *
 * Body: { filename, data }  where `data` is base64 (raw or data:URL form).
 * Mirrors the upload pattern in routes/attachments.ts so the FE can reuse the
 * same encode helper.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import MsgReader from "@kenjiuno/msgreader";
import { db } from "@workspace/db";
import { jobs } from "@workspace/db";
import { pushJobToAirtable } from "../lib/airtable-sync";
import { logger } from "../lib/logger";

const router = Router();

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB; Outlook msg files with attachments can be hefty.

function parseBase64(data: string): Buffer {
  const m = data.match(/^data:[^;]+;base64,(.+)$/);
  return Buffer.from(m ? m[1] : data, "base64");
}

interface MsgData {
  subject: string;
  sender: string;
  body: string;
  date: string | null;
  attachments: number;
  source: "msg" | "eml" | "text";
}

type ParseResult = { ok: true; data: MsgData } | { ok: false; reason: string };

/**
 * The .msg compound binary format starts with the OLE2 magic header
 * D0 CF 11 E0 A1 B1 1A E1. Anything else (true MIME .eml saved as .msg,
 * dragged Outlook items that were actually .eml, etc.) we route through
 * the MIME fallback so we don't fail user uploads with a generic error.
 */
function looksLikeOleCompound(bytes: Buffer): boolean {
  if (bytes.length < 8) return false;
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return sig.every((b, i) => bytes[i] === b);
}

function tryReadMsg(bytes: Buffer): ParseResult {
  try {
    // msgreader expects an ArrayBuffer.
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const reader = new MsgReader(ab);
    const file: any = reader.getFileData();
    if (file?.error) return { ok: false, reason: `msgreader: ${file.error}` };
    return {
      ok: true,
      data: {
        subject: String(file.subject || "").trim(),
        sender: String(file.senderEmail || file.senderName || "").trim(),
        body: String(file.body || "").trim(),
        date: file.messageDeliveryTime || file.clientSubmitTime || file.creationTime || null,
        attachments: Array.isArray(file.attachments) ? file.attachments.length : 0,
        source: "msg",
      },
    };
  } catch (e: any) {
    return { ok: false, reason: `msgreader threw: ${e?.message || e}` };
  }
}

/**
 * Lightweight RFC 822-ish header parser. We don't need full MIME — just
 * enough to pull the headline fields and a usable text body for
 * categorisation. Boundary-delimited multipart bodies fall through to
 * "best effort": grab everything after the first blank line.
 */
function tryReadEml(bytes: Buffer): ParseResult {
  try {
    // Quick sanity: must look like text and contain at least one common header.
    const text = bytes.toString("utf8");
    if (!/^[\x09\x0a\x0d\x20-\x7e]/.test(text)) {
      return { ok: false, reason: "binary content, not MIME" };
    }
    const headerEnd = text.search(/\r?\n\r?\n/);
    if (headerEnd === -1) return { ok: false, reason: "no header/body boundary" };
    const rawHeaders = text.slice(0, headerEnd);
    const rawBody = text.slice(headerEnd).replace(/^\r?\n\r?\n/, "");
    // Unfold continuation lines (RFC 822: leading whitespace = continuation).
    const unfolded = rawHeaders.replace(/\r?\n[ \t]+/g, " ");
    const headers: Record<string, string> = {};
    for (const line of unfolded.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z\-]+):\s*(.*)$/);
      if (m) headers[m[1].toLowerCase()] = m[2].trim();
    }
    if (!headers["subject"] && !headers["from"] && !headers["to"]) {
      return { ok: false, reason: "no recognisable mail headers" };
    }
    // Strip a single text/plain or text/html part if it's an obvious multipart.
    let body = rawBody;
    const ctype = headers["content-type"] || "";
    const boundaryMatch = ctype.match(/boundary="?([^";]+)"?/i);
    if (boundaryMatch) {
      const parts = body.split("--" + boundaryMatch[1]);
      const textPart = parts.find(p => /content-type:\s*text\/plain/i.test(p))
        || parts.find(p => /content-type:\s*text\/html/i.test(p));
      if (textPart) {
        const inner = textPart.split(/\r?\n\r?\n/).slice(1).join("\n\n");
        body = inner || body;
      }
    }
    // Strip HTML tags if it ended up being HTML.
    const cleanBody = body.replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
    return {
      ok: true,
      data: {
        subject: headers["subject"] || "",
        sender: headers["from"] || "",
        body: cleanBody,
        date: headers["date"] || null,
        attachments: 0,
        source: "eml",
      },
    };
  } catch (e: any) {
    return { ok: false, reason: `eml parse threw: ${e?.message || e}` };
  }
}

/** Last-resort: treat the file as plain text so the upload still creates a job. */
function readAsPlainText(bytes: Buffer, filename: string | undefined): MsgData {
  const text = bytes.toString("utf8").replace(/\u0000+/g, " ").trim();
  return {
    subject: filename || "Email Intake",
    sender: "",
    body: text.slice(0, 8000),
    date: null,
    attachments: 0,
    source: "text",
  };
}

interface MsgMeta {
  priority: "Critical" | "High" | "Medium" | "Low";
  taskNumber: string | null;
  category: string;
}

function categorize(data: MsgData): MsgMeta {
  const subject = data.subject.toLowerCase();
  const body = data.body.toLowerCase();
  const blob = `${subject} ${body}`;

  let priority: MsgMeta["priority"] = "Medium";
  if (blob.includes("critical")) priority = "Critical";
  else if (/\b(urgent|asap|immediate)\b/.test(blob)) priority = "High";

  let taskNumber: string | null = null;
  for (const re of [
    /T-(\d{4,5})/i,
    /QD-(\d{4})/i,
    /AU(\d{3,4})/i,
    /#(\d{5})/,
    /\b(\d{5})\b/,
  ]) {
    const m = re.exec(data.subject) || re.exec(data.body);
    if (m) { taskNumber = m[0].replace(/^#/, ""); break; }
  }

  let category = "General";
  if (/\bquote\b/.test(blob)) category = "Quote Request";
  else if (/\b(fault|alarm|defect)\b/.test(blob)) category = "Fault/Defect";
  else if (/\b(afss|annual)\b/.test(blob)) category = "AFSS/Compliance";
  else if (/\b(testing|maintenance)\b/.test(blob)) category = "Testing/Maintenance";

  return { priority, taskNumber, category };
}

router.post("/msg/intake", async (req, res, next) => {
  try {
    const { filename, data } = req.body ?? {};
    if (!data || typeof data !== "string") {
      res.status(400).json({ error: "data (base64 string) required" }); return;
    }
    const bytes = parseBase64(data);
    if (bytes.length === 0) { res.status(400).json({ error: "empty file" }); return; }
    if (bytes.length > MAX_BYTES) {
      res.status(413).json({ error: `file too large (${bytes.length} bytes) — max ${MAX_BYTES}` });
      return;
    }
    // Layered parsing: real .msg → MIME .eml → plain-text. We never want a
    // user upload to bounce with a generic error if any signal is recoverable.
    const reasons: string[] = [];
    let parsed: MsgData | null = null;

    if (looksLikeOleCompound(bytes)) {
      const r = tryReadMsg(bytes);
      if (r.ok) parsed = r.data; else reasons.push(r.reason);
    } else {
      reasons.push("not OLE2 compound — skipping msgreader");
    }
    if (!parsed) {
      const r = tryReadEml(bytes);
      if (r.ok) parsed = r.data; else reasons.push(r.reason);
    }
    if (!parsed) {
      // Last resort: log loudly so we can collect bad samples, but still
      // create a job from whatever text we can salvage.
      logger.warn({ filename, size: bytes.length, reasons }, "[msg-intake] both parsers failed, falling back to plain text");
      parsed = readAsPlainText(bytes, filename);
    } else {
      logger.info({ filename, source: parsed.source, size: bytes.length }, "[msg-intake] parsed");
    }

    const meta = categorize(parsed);
    const id = randomUUID();
    const now = new Date();

    // Title mirrors the Python categoriser: "<Category> - <Subject>".
    const title = `${meta.category} - ${parsed.subject || filename || "Email"}`.slice(0, 120);
    const noteHeader = `Auto-imported from ${filename || "msg"} on ${now.toISOString().slice(0, 16).replace("T", " ")}`;
    const detailsBody = parsed.body.slice(0, 4000) + (parsed.body.length > 4000 ? "…" : "");
    const notes = [
      noteHeader,
      `Sender: ${parsed.sender || "unknown"}`,
      parsed.date ? `Sent: ${parsed.date}` : null,
      `Attachments: ${parsed.attachments}`,
      "",
      detailsBody,
    ].filter(Boolean).join("\n");

    await db.insert(jobs).values({
      id,
      taskNumber: meta.taskNumber,
      site: parsed.subject?.slice(0, 80) || "Email Intake",
      client: parsed.sender || "Email Intake",
      contactEmail: parsed.sender || null,
      actionRequired: title,
      priority: meta.priority,
      status: "Open",
      uptickNotes: [],
      notes,
      createdAt: now,
      updatedAt: now,
    });

    // Fire-and-forget write-back so the new Job lands in Airtable too.
    void pushJobToAirtable(id);

    res.status(201).json({
      id,
      title,
      priority: meta.priority,
      category: meta.category,
      taskNumber: meta.taskNumber,
      attachments: parsed.attachments,
    });
  } catch (err) { next(err); }
});

export default router;

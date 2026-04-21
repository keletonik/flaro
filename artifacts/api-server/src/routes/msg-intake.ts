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
}

function readMsg(bytes: Buffer): MsgData | null {
  try {
    // msgreader expects an ArrayBuffer.
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const reader = new MsgReader(ab);
    const file: any = reader.getFileData();
    if (file?.error) return null;
    return {
      subject: String(file.subject || "").trim(),
      sender: String(file.senderEmail || file.senderName || "").trim(),
      body: String(file.body || "").trim(),
      date: file.messageDeliveryTime || file.clientSubmitTime || file.creationTime || null,
      attachments: Array.isArray(file.attachments) ? file.attachments.length : 0,
    };
  } catch {
    return null;
  }
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
    const parsed = readMsg(bytes);
    if (!parsed) { res.status(415).json({ error: "could not parse .msg file" }); return; }

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

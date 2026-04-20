/**
 * POST /api/fip/defect-analysis
 *
 * Vision-backed defect triage + device identification. Takes an attachment
 * id (uploaded via /api/attachments) and an optional free-text context note,
 * runs a vision model with a forced tool-use output so the JSON shape is
 * guaranteed, and returns a structured result.
 *
 * Dual-mode — the system prompt + tool description covers both
 *   1. defect diagnosis (what's wrong, how to fix it)
 *   2. device identification (what panel / detector is pictured)
 *
 * Gating: honours the FIP_ENABLED flag in line with the rest of the FIP
 * surface, enforces an image-only attachment kind with a media-type
 * whitelist and magic-byte sniff, and verifies the attachment was
 * uploaded for this feature (source = "fip-defect") so callers can't
 * hand another feature's upload id to this endpoint.
 */

import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { attachments } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logAgentError } from "../lib/agent-error-log";

const router = Router();

const MODEL = "claude-sonnet-4-6";
const MAX_CONTEXT_CHARS = 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function fipEnabled(): boolean {
  return process.env["FIP_ENABLED"] !== "0";
}

/**
 * Peek at the first bytes of the blob to confirm it matches the declared
 * media type. Stops an attacker swapping a text payload behind an
 * `image/jpeg` content-type.
 */
function sniffMediaType(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // JPEG — FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // GIF — 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  // WEBP — RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

const DEFECT_SYSTEM_PROMPT = `You are a master Australian fire-protection service engineer analysing a single photograph for a technician on site. You operate in two modes and choose between them based on the operator's context note:

MODE A — DEFECT DIAGNOSIS. The operator wants to know what's wrong with the pictured device and how to fix it. Return a ranked set of fix options.

MODE B — DEVICE IDENTIFICATION. The operator wants to know what panel / detector / module / component is pictured. Return the identification in the summary and category fields, leave fixOptions empty, and set severity to "low" (or "unknown" if you're genuinely not sure).

If the context note is empty or ambiguous, default to MODE A for a device that looks obviously faulty (burnt, broken, corroded, displaying a fault LED, glass broken) and to MODE B for a device that looks normal.

HARD RULES:
- Call the emit_defect_analysis tool. This is the ONLY way to produce your answer. Never write prose outside the tool call.
- Never fabricate part numbers or model numbers. If you can't read a label clearly, say so in warnings and leave modelName-ish fields unspecified.
- MODE A fix options are ranked by priority (1 = try first). Each must carry a realistic estimatedTimeMin (integer), skillLevel (tech1 / tech2 / senior), tools array, and a safetyNote. If nothing specific applies write "standard PPE + lockout".
- MODE B: summary = one-line identification ("Notifier NFS-320 main control panel" or "Apollo XP95 photoelectric smoke head"), category = the device class ("FIP main panel", "photoelectric smoke detector", etc.).
- Cite AS standards inline in complianceNotes when relevant (e.g. "AS 1670.1 §3.34 loop isolator spacing").
- Favour Australian-market brands: Apollo, Hochiki, Notifier, System Sensor, Pertronic, Ampac, Bosch, Honeywell, Xtralis, Fike, Wormald, Gent, Siemens.
- Flag obvious safety concerns in warnings: exposed conductors, damaged housing, corroded terminals, broken MCP glass, missing tamper cover.
- warnings is also where you say what you CANNOT determine from the image — blurred labels, cropped views, unfamiliar brand, etc.`;

// Forced-output tool schema. Anthropic's recommended way to get
// guaranteed JSON from a vision model. Every field is required so
// the model can't omit anything — enum constraints are enforced
// client-side but documented here for the reader.
const EMIT_TOOL: any = {
  name: "emit_defect_analysis",
  description:
    "Emit the structured defect-analysis or device-identification result. Always call this. Never write prose outside this tool call.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description:
          "One-line answer. For MODE A: the diagnosis. For MODE B: the identification, e.g. 'Notifier NFS-320 main control panel'.",
      },
      severity: {
        type: "string",
        enum: ["critical", "high", "medium", "low", "unknown"],
        description:
          "Severity of the defect. For MODE B (identification only, device looks normal) use 'low' or 'unknown'.",
      },
      category: {
        type: "string",
        description:
          "Short category string. Examples: 'wiring fault', 'LED indicator', 'photoelectric smoke detector', 'FIP main panel'.",
      },
      mode: {
        type: "string",
        enum: ["diagnosis", "identification"],
        description: "Which mode the model actually ran in for this request.",
      },
      observations: {
        type: "array",
        items: { type: "string" },
        description:
          "Literal visual evidence the model sees in the image. One observation per array entry. Min 1, max 8.",
      },
      likelyCauses: {
        type: "array",
        items: { type: "string" },
        description:
          "MODE A only — ranked candidate causes. MODE B can return an empty array.",
      },
      fixOptions: {
        type: "array",
        description:
          "MODE A only — ranked fix options. MODE B can return an empty array. Each option has priority, action, skillLevel, tools, estimatedTimeMin, safetyNotes.",
        items: {
          type: "object",
          properties: {
            priority: { type: "number" },
            action: { type: "string" },
            skillLevel: { type: "string", enum: ["tech1", "tech2", "senior"] },
            tools: { type: "array", items: { type: "string" } },
            estimatedTimeMin: { type: "number" },
            safetyNotes: { type: "string" },
          },
          required: ["priority", "action", "skillLevel", "tools", "estimatedTimeMin", "safetyNotes"],
        },
      },
      complianceNotes: {
        type: "array",
        items: { type: "string" },
        description: "AS standards references relevant to the device or the fix.",
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description:
          "What the model CANNOT determine from the image — blurred labels, cropped views, uncertain brand — plus any safety concerns.",
      },
    },
    required: [
      "summary",
      "severity",
      "category",
      "mode",
      "observations",
      "likelyCauses",
      "fixOptions",
      "complianceNotes",
      "warnings",
    ],
  },
};

router.post("/fip/defect-analysis", async (req, res, next) => {
  try {
    if (!fipEnabled()) {
      res.status(503).json({ error: "FIP disabled. Set FIP_ENABLED=1 in Replit Secrets to enable." });
      return;
    }

    const { attachmentId, context } = req.body ?? {};
    if (!attachmentId) {
      res.status(400).json({ error: "attachmentId required" });
      return;
    }
    if (typeof attachmentId !== "string") {
      res.status(400).json({ error: "attachmentId must be a string" });
      return;
    }

    const [row] = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, attachmentId), isNull(attachments.deletedAt)));
    if (!row) {
      res.status(404).json({ error: "attachment not found" });
      return;
    }
    if (row.kind !== "image") {
      res.status(400).json({ error: `attachment kind is ${row.kind}, must be image` });
      return;
    }
    // Only accept uploads that were created for this feature. Anything
    // else could be a chat attachment or another page's upload id.
    if (row.source !== "fip-defect") {
      res.status(403).json({ error: "attachment was not uploaded for defect analysis" });
      return;
    }

    const blob = row.blob as Buffer | null;
    if (!blob || blob.length === 0) {
      res.status(400).json({ error: "attachment has no data" });
      return;
    }
    if (blob.length > MAX_IMAGE_BYTES) {
      res.status(413).json({ error: `image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)} MB limit` });
      return;
    }

    const sniffed = sniffMediaType(blob);
    if (!sniffed || !ALLOWED_MEDIA_TYPES.has(sniffed)) {
      res.status(400).json({ error: "image bytes do not match an allowed format (jpeg, png, webp, gif)" });
      return;
    }
    // Trust the sniffed type over the declared content-type — stops the
    // client lying about what the payload is.
    const mediaType = sniffed;
    const base64 = blob.toString("base64");

    const userPromptText = context
      ? `Operator context: ${String(context).slice(0, MAX_CONTEXT_CHARS)}\n\nAnalyse the image and call emit_defect_analysis with the structured result.`
      : "Analyse the image and call emit_defect_analysis with the structured result.";

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: DEFECT_SYSTEM_PROMPT,
      tools: [EMIT_TOOL],
      // Force the tool so the model cannot respond with free-form text.
      tool_choice: { type: "tool", name: "emit_defect_analysis" } as any,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as any, data: base64 },
            },
            { type: "text", text: userPromptText },
          ],
        },
      ],
    });

    // Find the tool_use block. With tool_choice forced it's always
    // there, but we handle the error case defensively so the
    // operator sees a useful message instead of a crash.
    const blocks = response.content as any[];
    const toolUse = blocks.find((b) => b?.type === "tool_use" && b?.name === "emit_defect_analysis");

    if (!toolUse || !toolUse.input) {
      // Surface the raw content to the operator + server logs so we
      // can see what the model emitted in the rare case it refused
      // to call the tool.
      const rawText = blocks
        .filter((b) => b?.type === "text")
        .map((b) => b.text ?? "")
        .join("");
      logger.warn({ rawTextLen: rawText.length }, "fip-defect: model did not emit tool_use block");
      res.json({
        summary: "Unable to produce a structured analysis for this image",
        severity: "unknown",
        category: "unknown",
        mode: "unknown",
        observations: [],
        likelyCauses: [],
        fixOptions: [],
        complianceNotes: [],
        warnings: [
          "Vision model declined to emit a structured result. Try a different image, add more context in the text box, or describe what you want to know (e.g. 'identify this panel' or 'what's wrong with this wiring').",
          ...(rawText ? [`Model text: ${rawText.slice(0, 300)}`] : []),
        ],
        attachmentId,
      });
      return;
    }

    const input = toolUse.input as any;

    // Normalise the shape so the frontend always gets every field
    // even if the model occasionally omits one.
    res.json({
      summary: input.summary ?? "No summary",
      severity: input.severity ?? "unknown",
      category: input.category ?? "unknown",
      mode: input.mode ?? "diagnosis",
      observations: Array.isArray(input.observations) ? input.observations : [],
      likelyCauses: Array.isArray(input.likelyCauses) ? input.likelyCauses : [],
      fixOptions: Array.isArray(input.fixOptions) ? input.fixOptions : [],
      complianceNotes: Array.isArray(input.complianceNotes) ? input.complianceNotes : [],
      warnings: Array.isArray(input.warnings) ? input.warnings : [],
      attachmentId,
    });
  } catch (err) {
    logger.error({ err }, "fip-defect: unhandled error");
    void logAgentError({
      surface: "fip-defect",
      route: "POST /api/fip/defect-analysis",
      err,
      context: {
        attachmentId: (req.body as any)?.attachmentId ?? null,
        mode: (req.body as any)?.mode ?? null,
      },
    });
    next(err);
  }
});

export default router;

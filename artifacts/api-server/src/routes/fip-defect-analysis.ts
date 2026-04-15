/**
 * POST /api/fip/defect-analysis
 *
 * Dedicated defect-triage + device-identification endpoint for the FIP
 * Command Centre. Takes an attachment id (uploaded via /api/attachments)
 * and an optional free-text context note. Runs Claude vision with a
 * forced tool-use output so the JSON shape is guaranteed.
 *
 * Design (fip-v2.1 — structured tool-use fix, April 2026):
 *
 * The earlier version asked Claude to emit a JSON object as plain text
 * in the system prompt. That was unreliable: Claude sometimes wrapped
 * the JSON in a code fence, sometimes prefixed with prose, sometimes
 * emitted valid-looking text that wasn't quite parseable. Result: the
 * "Unable to parse model response" screen the operator reported.
 *
 * The fix is Anthropic's recommended pattern for forced JSON output:
 * define a tool with an input_schema matching the desired shape, then
 * pass `tool_choice: { type: "tool", name: "emit_defect_analysis" }`.
 * The model is forced to emit the result as a tool_use block with an
 * input object conforming to the schema — no text parsing, no fences,
 * no prose. We read `block.input` directly.
 *
 * Dual-mode. The system prompt + tool description covers BOTH:
 *   1. "Diagnose this defect" (original purpose)
 *   2. "What is this device / panel / model?" (identification)
 *
 * When the operator types a question like "what panel is this", the
 * model treats the summary as the identification answer and leaves
 * fixOptions empty — severity becomes "low" or "unknown" depending
 * on whether anything visibly abnormal is present.
 */

import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { attachments } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

const router = Router();

const MODEL = "claude-sonnet-4-6";

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

function normaliseMediaType(ct: string): string {
  const lower = (ct || "").toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "image/jpeg";
  if (lower.includes("png")) return "image/png";
  if (lower.includes("webp")) return "image/webp";
  if (lower.includes("gif")) return "image/gif";
  return "image/jpeg";
}

router.post("/fip/defect-analysis", async (req, res, next) => {
  try {
    const { attachmentId, context } = req.body ?? {};
    if (!attachmentId) {
      res.status(400).json({ error: "attachmentId required" });
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

    const base64 = (row.blob as Buffer).toString("base64");
    const mediaType = normaliseMediaType(row.contentType);

    const userPromptText = context
      ? `Operator context: ${String(context).slice(0, 1000)}\n\nAnalyse the image and call emit_defect_analysis with the structured result.`
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
      // eslint-disable-next-line no-console
      console.warn("[fip-defect] model did not emit tool_use block", { rawTextLen: rawText.length });
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
    // eslint-disable-next-line no-console
    console.error("[fip-defect] error", err);
    next(err);
  }
});

export default router;

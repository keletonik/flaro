/**
 * POST /api/fip/config-analysis
 *
 * Panel configuration analyser. Takes an attachment id (uploaded via
 * /api/attachments with source="fip-config") containing a panel config
 * export — text, CSV, JSON, XML, PDF — and returns a structured
 * analysis from Claude using a forced tool-use output.
 *
 * Accepted attachment kinds: text, document (PDF), image (for
 * screenshots of panel screens / printed reports).
 *
 * The model is asked to:
 *   - Identify the panel make/model and config-tool fingerprint
 *   - Summarise loop / zone / device counts
 *   - List devices by type
 *   - Surface cause-and-effect / output programming highlights
 *   - Flag anomalies, non-compliance risks, optimisation opportunities
 *   - Recommend next actions for the technician
 *
 * Output shape is locked by an Anthropic tool schema so the frontend
 * can render every field without defensive checks.
 */

import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { attachments } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const MODEL = "claude-sonnet-4-6";
const MAX_TEXT_CHARS = 180_000; // ~45k tokens — leaves headroom for system + tool
const MAX_CONTEXT_CHARS = 1500;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function fipEnabled(): boolean {
  return process.env["FIP_ENABLED"] !== "0";
}

function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

function isPdf(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
}

const CONFIG_SYSTEM_PROMPT = `You are a master Australian fire-protection technician auditing a Fire Indicator Panel (FIP) configuration export for a colleague on site. Your job is to read the configuration data and produce a structured technical analysis.

You may be given:
- A panel-tool export (Pertronic LCT/Lifecycle, Notifier VeriFire/CAMWorks/PSP, Simplex SDU/ES Tools, Ampac LoopSense/FireFinder PC tool, Vigilant MX1 Programmer, Bosch FPA Programmer, Hochiki Latitude/FireNET Designer, Honeywell ESSER tools, Tyco MZX Connect, Inertia/Inim Studio, etc.)
- Plain text (.txt / .csv / .log / .json / .xml / .ini)
- A printed config report (PDF or screenshot)
- A site survey or commissioning sheet

Your output is consumed by a UI, so you MUST call the emit_config_analysis tool. Never write prose outside the tool call.

ANALYSIS PRINCIPLES:
- Identify the panel by reading any header / banner / file format markers (e.g. "Pertronic F220", "NFS-320", "4010ES", "FireFinder Plus", "MX1", "FPA-1200"). State your confidence.
- Loop / zone / device counts are gold. Always extract these. Sum across loops.
- Group devices by type using Australian terminology: photoelectric smoke, ionisation smoke, multi-criteria, heat (rate-of-rise / fixed temp), MCP (manual call point), AV (audio-visual), sounder, beacon, monitor module, control/relay module, isolator, aspirating (VESDA/FAAST), beam, linear heat, gas, valve monitor, flow switch, tamper.
- Cause-and-effect / output programming is critical — surface the rules that show how detection drives outputs (sounders, AV, brigade signal, fan shutdown, door release, lift recall, MIMIC).
- Anomalies = anything a senior tech would raise an eyebrow at: detector counts > AS 1670.1 limits, missing isolators (>40 devices on a loop without one), zero brigade output mapped, devices in "disabled" / "isolated" state, custom labels missing / generic, MCPs without dedicated zone, mismatched soft addresses vs physical addresses, EOL resistors not configured, ASE/CIE address conflicts, panel firmware out of date if visible.
- Compliance flags reference AS 1670.1 (system design), AS 1670.4 (occupant warning), AS 1851 (maintenance), AS 4428 (control & indicating equipment), AS 7240 series (system components).
- Recommendations = what the tech should DO next, ranked, each with effort estimate (minutes) and skill (tech1 / tech2 / senior).

HARD RULES:
- Never fabricate device counts. If you cannot read them, say so in warnings and put 0 in the count fields.
- If the data isn't actually a panel config (e.g. an invoice PDF), set panelMake to "unknown", confidence to "low", and put a clear warning explaining what you saw.
- Keep summary to one sentence. Keep observation/recommendation entries to one line each.
- Australian English spellings ("analyse", "summarise", "colour").`;

const EMIT_TOOL: any = {
  name: "emit_config_analysis",
  description:
    "Emit the structured panel-configuration analysis. ALWAYS call this. Never produce prose outside this tool call.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "One-line headline. e.g. 'Pertronic F220 with 2 loops, 187 devices, 24 zones — generally well-configured but missing isolators on Loop 1.'",
      },
      panelMake: {
        type: "string",
        description: "Manufacturer best-guess. e.g. 'Pertronic', 'Notifier', 'Simplex', 'Ampac', 'Vigilant', 'Bosch', 'Hochiki', 'Honeywell ESSER', 'Tyco MX', 'Inertia/Inim'. Use 'unknown' if not determinable.",
      },
      panelModel: {
        type: "string",
        description: "Model best-guess. e.g. 'F220', 'NFS-320', '4010ES', 'FireFinder Plus', 'MX1', 'FPA-1200'. Empty string if not determinable.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence in the panel identification.",
      },
      configTool: {
        type: "string",
        description: "The programming tool / file format detected, if any. e.g. 'Lifecycle Tool export', 'VeriFire job file', 'SDU print-out', 'manual CSV'. Empty string if unknown.",
      },
      counts: {
        type: "object",
        description: "Top-line numbers. Put 0 if not extractable.",
        properties: {
          loops: { type: "number", description: "Number of detection loops / SLCs." },
          zones: { type: "number", description: "Number of zones." },
          devices: { type: "number", description: "Total addressable devices across all loops." },
          mcps: { type: "number", description: "Number of manual call points." },
          sounders: { type: "number", description: "Number of sounders / AV / beacons combined." },
          modules: { type: "number", description: "Number of input + output / monitor + control modules." },
          isolators: { type: "number", description: "Number of loop isolators." },
        },
        required: ["loops", "zones", "devices", "mcps", "sounders", "modules", "isolators"],
      },
      deviceBreakdown: {
        type: "array",
        description: "Devices grouped by type. Empty array if not extractable.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "Device type, Australian terminology." },
            count: { type: "number" },
            notes: { type: "string", description: "Optional clarifier. Empty string if none." },
          },
          required: ["type", "count", "notes"],
        },
      },
      loopSummary: {
        type: "array",
        description: "Per-loop summary. Empty array if loop-level data isn't present.",
        items: {
          type: "object",
          properties: {
            loop: { type: "string", description: "Loop name/number, e.g. 'Loop 1' or 'SLC-A'." },
            deviceCount: { type: "number" },
            isolators: { type: "number" },
            highestAddress: { type: "number", description: "Highest address used. 0 if unknown." },
            note: { type: "string", description: "One-line observation about this loop. Empty string if none." },
          },
          required: ["loop", "deviceCount", "isolators", "highestAddress", "note"],
        },
      },
      causeAndEffect: {
        type: "array",
        description: "Notable output-programming rules. Empty array if not present.",
        items: {
          type: "object",
          properties: {
            trigger: { type: "string", description: "What initiates. e.g. 'Any zone in Smoke alarm'." },
            action: { type: "string", description: "What happens. e.g. 'Activate all sounders + brigade signal + lift recall'." },
            note: { type: "string", description: "Optional clarifier. Empty string if none." },
          },
          required: ["trigger", "action", "note"],
        },
      },
      anomalies: {
        type: "array",
        description: "Things a senior tech would raise. Each anomaly has a severity.",
        items: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            issue: { type: "string", description: "One-line problem statement." },
            evidence: { type: "string", description: "Where in the config this was seen. Empty string if general." },
          },
          required: ["severity", "issue", "evidence"],
        },
      },
      complianceFlags: {
        type: "array",
        description: "AS standards considerations. Empty array if none.",
        items: {
          type: "object",
          properties: {
            standard: { type: "string", description: "e.g. 'AS 1670.1 §3.34', 'AS 1851 Table 6.4.1.2'." },
            note: { type: "string", description: "What about this standard applies here." },
          },
          required: ["standard", "note"],
        },
      },
      recommendations: {
        type: "array",
        description: "Ranked next actions for the technician.",
        items: {
          type: "object",
          properties: {
            priority: { type: "number", description: "1 = do first." },
            action: { type: "string", description: "One-line directive." },
            estimatedTimeMin: { type: "number" },
            skillLevel: { type: "string", enum: ["tech1", "tech2", "senior"] },
          },
          required: ["priority", "action", "estimatedTimeMin", "skillLevel"],
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description: "What you CANNOT determine from the file plus any safety / data-quality concerns.",
      },
    },
    required: [
      "summary",
      "panelMake",
      "panelModel",
      "confidence",
      "configTool",
      "counts",
      "deviceBreakdown",
      "loopSummary",
      "causeAndEffect",
      "anomalies",
      "complianceFlags",
      "recommendations",
      "warnings",
    ],
  },
};

router.post("/fip/config-analysis", async (req, res, next) => {
  try {
    if (!fipEnabled()) {
      res.status(503).json({ error: "FIP disabled. Set FIP_ENABLED=1 in Replit Secrets to enable." });
      return;
    }

    const { attachmentId, context, panelHint } = req.body ?? {};
    if (!attachmentId || typeof attachmentId !== "string") {
      res.status(400).json({ error: "attachmentId (string) required" });
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
    if (row.source !== "fip-config") {
      res.status(403).json({ error: "attachment was not uploaded for config analysis" });
      return;
    }

    const blob = row.blob as Buffer | null;
    if (!blob || blob.length === 0) {
      res.status(400).json({ error: "attachment has no data" });
      return;
    }

    const kind = row.kind;
    let userContent: any[];

    if (kind === "text") {
      const text = blob.toString("utf-8");
      const truncated = text.length > MAX_TEXT_CHARS;
      const payload = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;
      const intro = truncated
        ? `Panel configuration export (TRUNCATED to first ${MAX_TEXT_CHARS} chars of ${text.length}). Filename: ${row.filename ?? "unknown"}.\n\n`
        : `Panel configuration export. Filename: ${row.filename ?? "unknown"}.\n\n`;
      const ctxNote = context
        ? `\n\nOperator context: ${String(context).slice(0, MAX_CONTEXT_CHARS)}`
        : "";
      const hintNote = panelHint
        ? `\n\nPanel hint from operator: ${String(panelHint).slice(0, 100)}`
        : "";
      userContent = [
        {
          type: "text",
          text: `${intro}\`\`\`\n${payload}\n\`\`\`${hintNote}${ctxNote}\n\nAnalyse the configuration and call emit_config_analysis with the structured result.`,
        },
      ];
    } else if (kind === "document") {
      if (!isPdf(blob)) {
        res.status(400).json({ error: "document attachment is not a valid PDF" });
        return;
      }
      if (blob.length > MAX_PDF_BYTES) {
        res.status(413).json({ error: `PDF exceeds ${MAX_PDF_BYTES / (1024 * 1024)} MB limit` });
        return;
      }
      const ctxNote = context ? `\n\nOperator context: ${String(context).slice(0, MAX_CONTEXT_CHARS)}` : "";
      const hintNote = panelHint ? `\n\nPanel hint: ${String(panelHint).slice(0, 100)}` : "";
      userContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: blob.toString("base64") },
        },
        {
          type: "text",
          text: `Panel configuration PDF. Filename: ${row.filename ?? "unknown"}.${hintNote}${ctxNote}\n\nAnalyse the configuration and call emit_config_analysis.`,
        },
      ];
    } else if (kind === "image") {
      if (blob.length > MAX_IMAGE_BYTES) {
        res.status(413).json({ error: `image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)} MB limit` });
        return;
      }
      const sniffed = sniffImageType(blob);
      if (!sniffed || !ALLOWED_IMAGE_TYPES.has(sniffed)) {
        res.status(400).json({ error: "image bytes do not match an allowed format (jpeg, png, webp, gif)" });
        return;
      }
      const ctxNote = context ? `\n\nOperator context: ${String(context).slice(0, MAX_CONTEXT_CHARS)}` : "";
      const hintNote = panelHint ? `\n\nPanel hint: ${String(panelHint).slice(0, 100)}` : "";
      userContent = [
        {
          type: "image",
          source: { type: "base64", media_type: sniffed as any, data: blob.toString("base64") },
        },
        {
          type: "text",
          text: `Panel screenshot / printed config. Filename: ${row.filename ?? "unknown"}.${hintNote}${ctxNote}\n\nRead the visible configuration and call emit_config_analysis.`,
        },
      ];
    } else {
      res.status(400).json({ error: `attachment kind '${kind}' not supported. Use text, PDF, or image.` });
      return;
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: CONFIG_SYSTEM_PROMPT,
      tools: [EMIT_TOOL],
      tool_choice: { type: "tool", name: "emit_config_analysis" } as any,
      messages: [{ role: "user", content: userContent }],
    });

    const blocks = response.content as any[];
    const toolUse = blocks.find((b) => b?.type === "tool_use" && b?.name === "emit_config_analysis");

    if (!toolUse || !toolUse.input) {
      const rawText = blocks
        .filter((b) => b?.type === "text")
        .map((b) => b.text ?? "")
        .join("");
      logger.warn({ rawTextLen: rawText.length }, "fip-config: model did not emit tool_use block");
      res.json({
        summary: "Unable to produce a structured analysis for this file",
        panelMake: "unknown",
        panelModel: "",
        confidence: "low",
        configTool: "",
        counts: { loops: 0, zones: 0, devices: 0, mcps: 0, sounders: 0, modules: 0, isolators: 0 },
        deviceBreakdown: [],
        loopSummary: [],
        causeAndEffect: [],
        anomalies: [],
        complianceFlags: [],
        recommendations: [],
        warnings: [
          "Model declined to emit a structured result. Try a different file or add panel context.",
          ...(rawText ? [`Model text: ${rawText.slice(0, 300)}`] : []),
        ],
        attachmentId,
      });
      return;
    }

    const input = toolUse.input as any;

    const safeCounts = input.counts ?? {};
    res.json({
      summary: input.summary ?? "No summary",
      panelMake: input.panelMake ?? "unknown",
      panelModel: input.panelModel ?? "",
      confidence: input.confidence ?? "low",
      configTool: input.configTool ?? "",
      counts: {
        loops: Number(safeCounts.loops ?? 0),
        zones: Number(safeCounts.zones ?? 0),
        devices: Number(safeCounts.devices ?? 0),
        mcps: Number(safeCounts.mcps ?? 0),
        sounders: Number(safeCounts.sounders ?? 0),
        modules: Number(safeCounts.modules ?? 0),
        isolators: Number(safeCounts.isolators ?? 0),
      },
      deviceBreakdown: Array.isArray(input.deviceBreakdown) ? input.deviceBreakdown : [],
      loopSummary: Array.isArray(input.loopSummary) ? input.loopSummary : [],
      causeAndEffect: Array.isArray(input.causeAndEffect) ? input.causeAndEffect : [],
      anomalies: Array.isArray(input.anomalies) ? input.anomalies : [],
      complianceFlags: Array.isArray(input.complianceFlags) ? input.complianceFlags : [],
      recommendations: Array.isArray(input.recommendations) ? input.recommendations : [],
      warnings: Array.isArray(input.warnings) ? input.warnings : [],
      attachmentId,
    });
  } catch (err) {
    logger.error({ err }, "fip-config: unhandled error");
    next(err);
  }
});

export default router;

/**
 * POST /api/fip/defect-analysis
 *
 * Dedicated defect-triage endpoint for the FIP Command Centre. Takes
 * an attachment id (uploaded via /api/attachments) and optionally a
 * free-text context note. Runs Claude vision with a defect-specific
 * system prompt that returns a structured diagnosis + ranked fix options.
 *
 * Shape of response:
 *   {
 *     summary: string,              // one-line diagnosis
 *     severity: "critical" | "high" | "medium" | "low" | "unknown",
 *     category: string,             // e.g. "wiring fault", "LED indicator", etc.
 *     observations: string[],       // what the model literally saw
 *     likelyCauses: string[],       // ranked candidate causes
 *     fixOptions: Array<{
 *       priority: number,           // 1 = try first
 *       action: string,             // what to do
 *       skillLevel: "tech1" | "tech2" | "senior",
 *       tools: string[],
 *       estimatedTimeMin: number,
 *       safetyNotes: string,
 *     }>,
 *     complianceNotes: string[],    // AS clause references if relevant
 *     warnings: string[],           // things the model cannot determine from the image
 *   }
 *
 * Uses the same Claude-vision wiring as the identifier but with a
 * different system prompt and a stricter JSON schema.
 */

import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { attachments } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

const router = Router();

const MODEL = "claude-sonnet-4-6";

const DEFECT_SYSTEM_PROMPT = `You are a master Australian fire-protection service engineer diagnosing a defect from a single photograph. The technician on site has sent you an image and expects a structured diagnosis plus a ranked set of fix options.

OUTPUT FORMAT: respond with a JSON object exactly matching this shape, and nothing else. No markdown, no code fence.

{
  "summary": string,
  "severity": "critical" | "high" | "medium" | "low" | "unknown",
  "category": string,
  "observations": string[],
  "likelyCauses": string[],
  "fixOptions": [
    {
      "priority": number,
      "action": string,
      "skillLevel": "tech1" | "tech2" | "senior",
      "tools": string[],
      "estimatedTimeMin": number,
      "safetyNotes": string
    }
  ],
  "complianceNotes": string[],
  "warnings": string[]
}

HARD RULES:
- If the image is not a fire-protection device or you cannot identify any defect, set severity="unknown", leave fixOptions as an empty array, and write the reason in warnings.
- Never fabricate part numbers. If you can't read a label, say so in warnings.
- Rank fixOptions by priority: 1 is the first thing to try, higher numbers are fallbacks.
- Every fixOption must carry a realistic estimatedTimeMin (integer), not a range.
- Skill level: tech1 = basic service tech, tech2 = experienced service tech, senior = senior engineer or commissioner.
- Always include at least one safetyNote per fixOption. If nothing specific applies write "standard PPE + lockout".
- Cite AS standards in complianceNotes when relevant, e.g. "AS 1670.1 §3.34 requires loop isolators every 32 devices".
- Favour Australian-market brands (Apollo, Hochiki, Notifier, System Sensor, Pertronic, Ampac, Bosch, Honeywell, Xtralis).
- Flag obvious safety concerns in warnings: exposed conductors, damaged housing, corroded terminals, broken MCP glass, missing tamper cover.`;

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
    const mediaType = row.contentType || "image/jpeg";

    const userContentBlocks: any[] = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      },
      {
        type: "text",
        text: context
          ? `Technician context: ${String(context).slice(0, 1000)}\n\nDiagnose the defect and return ONLY the JSON object defined in the system prompt.`
          : "Diagnose the defect in this image and return ONLY the JSON object defined in the system prompt.",
      },
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: DEFECT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContentBlocks }],
    });

    const text = (response.content as any[])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text as string)
      .join("")
      .trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
      }
    }

    if (!parsed) {
      res.json({
        summary: "Unable to parse model response",
        severity: "unknown",
        category: "unknown",
        observations: [],
        likelyCauses: [],
        fixOptions: [],
        complianceNotes: [],
        warnings: ["Model returned unparsable JSON — try again with a clearer image."],
        _rawText: text.slice(0, 500),
      });
      return;
    }

    // Normalise the shape so the frontend always gets every field.
    res.json({
      summary: parsed.summary ?? "No summary",
      severity: parsed.severity ?? "unknown",
      category: parsed.category ?? "unknown",
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      likelyCauses: Array.isArray(parsed.likelyCauses) ? parsed.likelyCauses : [],
      fixOptions: Array.isArray(parsed.fixOptions) ? parsed.fixOptions : [],
      complianceNotes: Array.isArray(parsed.complianceNotes) ? parsed.complianceNotes : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      attachmentId,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

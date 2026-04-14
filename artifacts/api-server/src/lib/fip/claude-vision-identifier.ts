/**
 * Claude-vision image identifier.
 *
 * Replaces the StubIdentifier with a real vision model. Takes the
 * uploaded image bytes, feeds them to claude-sonnet-4-6 via the
 * Replit AI gateway, and asks for a structured JSON response
 * identifying the manufacturer / product family / model / component
 * of a fire indicator panel, detector, or module.
 *
 * The model is instructed to cap confidence conservatively and to
 * return multiple alternatives so the operator can pick from a short
 * list when the model isn't certain.
 *
 * Activated only when ANTHROPIC_API_KEY (or Replit equivalent) is
 * set AND FIP_VISION_ENABLED is not "0". Otherwise the codebase
 * falls back to the existing StubIdentifier so the pipeline still
 * runs in dev / test.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import type {
  Identifier,
  IdentificationInput,
  IdentificationResult,
  IdentificationProvider,
  IdentificationCandidate,
} from "./identification";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a specialist identifier for Australian fire-protection equipment. A technician sends you a single photograph of a fire indicator panel (FIP), a detector head, a notification appliance, a module, or wiring — and you must identify what you are looking at.

OUTPUT FORMAT: respond with a JSON object exactly matching this shape, and nothing else:
{
  "best": {
    "manufacturerName": string | null,
    "familyName": string | null,
    "modelName": string | null,
    "componentName": string | null,
    "confidence": number,          // 0.0 to 1.0 — cap at 0.85 unless brand+model are clearly legible
    "reasoning": string             // 1-3 sentences citing specific visual evidence
  },
  "alternatives": [
    { "manufacturerName": ..., "modelName": ..., "confidence": ..., "reasoning": ... }
  ],
  "visibleMarkings": string[],      // any label text visible in the image
  "detectorKind": "panel_fascia" | "photoelectric_smoke" | "ionisation_smoke" | "multi_criteria" | "heat" | "flame" | "aspirating" | "beam" | "duct" | "manual_call_point" | "sounder" | "isolator" | "io_module" | "other" | "unknown",
  "observations": string[],         // independent visual observations — status LEDs, tamper state, damage, labels, age indicators
  "warnings": string[]              // what you CAN'T tell from the photo
}

HARD RULES:
- If the image is not a fire protection device, return best.confidence = 0 and warnings = ["Image does not appear to contain a fire protection device"].
- Never invent a model number. If you can't read it, leave modelName null.
- Always include at least two alternatives unless confidence > 0.8.
- Favour manufacturers commonly installed in Australia: Apollo, Hochiki, Notifier, System Sensor, Pertronic, Ampac, Simplex, Tyco, Bosch, Honeywell, Xtralis, Fike, Wormald.
- Visible model labels on Australian panels often read FP-series (Ampac), F-series (Pertronic), XP95 (Apollo), ALN/ALG/ACC (Hochiki). Use those as identification hints.
- Flag obvious safety concerns in observations: damaged housing, exposed wiring, missing dust cover, broken glass elements.`;

export class ClaudeVisionIdentifier implements Identifier {
  readonly provider: IdentificationProvider = "claude-vision";

  async identify(input: IdentificationInput): Promise<IdentificationResult> {
    try {
      const base64 = input.bytes.toString("base64");
      const mediaType = normaliseMediaType(input.contentType);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as any,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `The technician flagged this image kind as "${input.kind}". Identify the device and return ONLY the JSON object specified in the system prompt. Do not wrap it in markdown fences.`,
              },
            ],
          },
        ],
      });

      const text = response.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text as string)
        .join("")
        .trim();

      const parsed = safeJsonParse(text);
      if (!parsed) {
        return {
          provider: this.provider,
          best: null,
          alternatives: [],
          raw: { model: MODEL, rawText: text.slice(0, 500) },
          warnings: ["Model returned unparsable JSON"],
        };
      }

      const best: IdentificationCandidate | null = parsed.best?.manufacturerName
        ? {
            manufacturerName: parsed.best.manufacturerName ?? undefined,
            familyName: parsed.best.familyName ?? undefined,
            modelName: parsed.best.modelName ?? undefined,
            componentName: parsed.best.componentName ?? undefined,
            confidence: clamp(parsed.best.confidence, 0, 0.95),
            reasoning: parsed.best.reasoning ?? undefined,
          }
        : null;

      const alternatives: IdentificationCandidate[] = Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map((a: any) => ({
            manufacturerName: a?.manufacturerName ?? undefined,
            familyName: a?.familyName ?? undefined,
            modelName: a?.modelName ?? undefined,
            componentName: a?.componentName ?? undefined,
            confidence: clamp(a?.confidence, 0, 0.95),
            reasoning: a?.reasoning ?? undefined,
          }))
        : [];

      return {
        provider: this.provider,
        best,
        alternatives,
        raw: {
          model: MODEL,
          visibleMarkings: parsed.visibleMarkings ?? [],
          detectorKind: parsed.detectorKind ?? "unknown",
          observations: parsed.observations ?? [],
        },
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      };
    } catch (err) {
      return {
        provider: this.provider,
        best: null,
        alternatives: [],
        raw: { model: MODEL, error: (err as Error)?.message ?? String(err) },
        warnings: [
          `Claude vision call failed: ${(err as Error)?.message ?? String(err)}`,
        ],
      };
    }
  }
}

function normaliseMediaType(ct: string): string {
  const lower = (ct || "").toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "image/jpeg";
  if (lower.includes("png")) return "image/png";
  if (lower.includes("webp")) return "image/webp";
  if (lower.includes("gif")) return "image/gif";
  return "image/jpeg";
}

function safeJsonParse(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* noop */ }
  }
  return null;
}

function clamp(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

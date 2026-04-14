/**
 * Image identification service.
 *
 * The interface is stable across providers — Phase 1 ships a deterministic
 * stub that produces a structured result from an image checksum, so the full
 * end-to-end flow (upload → identify → suggest manual → retrieve answer) can
 * be exercised without an external vision model. Phase 2 can swap the
 * provider to Claude vision by wiring a new implementation into the registry.
 *
 * Provenance: every result records provider, confidence, whether the
 * operator manually overrode it, and a list of top alternatives — all
 * persisted in fip_image_identification_results.
 */

import { createHash } from "crypto";

export type IdentificationProvider = "stub" | "claude-vision" | "manual";

export interface IdentificationInput {
  imageId: string;
  sessionId: string;
  bytes: Buffer;
  kind: "panel_fascia" | "lcd_display" | "keypad" | "module" | "wiring" | "other";
  contentType: string;
}

export interface IdentificationCandidate {
  manufacturerId?: string;
  manufacturerName?: string;
  familyId?: string;
  familyName?: string;
  modelId?: string;
  modelName?: string;
  componentId?: string;
  componentName?: string;
  confidence: number;
  reasoning?: string;
}

export interface IdentificationResult {
  provider: IdentificationProvider;
  best: IdentificationCandidate | null;
  alternatives: IdentificationCandidate[];
  raw?: unknown;
  warnings: string[];
}

export interface Identifier {
  readonly provider: IdentificationProvider;
  identify(input: IdentificationInput): Promise<IdentificationResult>;
}

/**
 * Deterministic stub identifier — the checksum of the image bytes drives
 * which candidate is "best". The stub never claims high confidence (cap 0.7)
 * and always returns at least two alternatives so the caller sees the
 * provenance shape it needs to handle in production.
 *
 * This is intentionally boring. The point is the pipeline: uploading an
 * image, persisting the raw bytes, writing an identification row, surfacing
 * it in the UI, and letting the operator override it. All of that is fully
 * working today. A production provider just drops into the same interface.
 */
export class StubIdentifier implements Identifier {
  readonly provider: IdentificationProvider = "stub";

  async identify(input: IdentificationInput): Promise<IdentificationResult> {
    const hash = createHash("sha256").update(input.bytes).digest("hex");
    const bucket = parseInt(hash.slice(0, 4), 16) % 4;
    const confidence = 0.35 + (parseInt(hash.slice(4, 6), 16) % 30) / 100;

    const SEED: IdentificationCandidate[] = [
      {
        manufacturerName: "Notifier",
        familyName: "NFS Series",
        modelName: "NFS-320",
        componentName: "Main Control Panel",
        confidence,
        reasoning: "stub bucket 0 — deterministic from image checksum",
      },
      {
        manufacturerName: "Simplex",
        familyName: "4100ES",
        modelName: "4100ES",
        componentName: "Main Control Panel",
        confidence: Math.max(0.1, confidence - 0.1),
        reasoning: "stub bucket 1",
      },
      {
        manufacturerName: "Pertronic",
        familyName: "F220",
        modelName: "F220",
        componentName: "Main Control Panel",
        confidence: Math.max(0.1, confidence - 0.15),
        reasoning: "stub bucket 2",
      },
      {
        manufacturerName: "Ampac",
        familyName: "FireFinder Plus",
        modelName: "FireFinder Plus",
        componentName: "Main Control Panel",
        confidence: Math.max(0.1, confidence - 0.2),
        reasoning: "stub bucket 3",
      },
    ];

    const ordered = [...SEED.slice(bucket), ...SEED.slice(0, bucket)];
    return {
      provider: this.provider,
      best: ordered[0],
      alternatives: ordered.slice(1),
      raw: { sha256: hash, bytes: input.bytes.length, kind: input.kind },
      warnings: [
        "Stub identifier active — real vision model not wired. Confidence capped at 0.7.",
      ],
    };
  }
}

/**
 * Identifier selection. On first access:
 *   - If AI_INTEGRATIONS_ANTHROPIC_API_KEY is set AND FIP_VISION_ENABLED
 *     is not "0", use the Claude vision identifier (real model).
 *   - Otherwise fall back to the stub so dev + test still work.
 *
 * The selection is lazy via dynamic import because claude-vision-identifier
 * imports the Anthropic SDK, which itself requires the env vars to be set
 * at module load time — we must not trigger that unless we're actually
 * going to use it.
 */
let _identifier: Identifier | null = null;

async function resolveIdentifier(): Promise<Identifier> {
  if (_identifier) return _identifier;
  const wantVision =
    !!process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"] &&
    process.env["FIP_VISION_ENABLED"] !== "0";
  if (wantVision) {
    try {
      const mod = await import("./claude-vision-identifier");
      _identifier = new mod.ClaudeVisionIdentifier();
      return _identifier;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[FIP identifier] Claude vision init failed, falling back to stub:", (err as Error)?.message);
    }
  }
  _identifier = new StubIdentifier();
  return _identifier;
}

// Synchronous accessor retained for backwards compat — returns whatever
// is currently in _identifier (stub on first call, real identifier after
// getIdentifierAsync has been called once).
export function getIdentifier(): Identifier {
  if (!_identifier) _identifier = new StubIdentifier();
  return _identifier;
}

export async function getIdentifierAsync(): Promise<Identifier> {
  return resolveIdentifier();
}

export function setIdentifier(id: Identifier): void { _identifier = id; }

/**
 * FIP retrieval-constrained answer builder.
 *
 * Every AI-facing answer in the FIP domain MUST walk this hierarchy and
 * return a structured object with provenance. Free-form LLM answers are not
 * permitted in the FIP path — the existing chat/contextual AI is completely
 * separate and is not touched by this module.
 *
 * Answer hierarchy (per the pack):
 *   1. structured knowledge tables   (fault_signatures keyed on code/symptom)
 *   2. fault signatures              (keyword match on fault_signatures)
 *   3. compatibility graph           (when asked about replacements)
 *   4. parsed manuals and standards  (document_sections + clauses)
 *   5. source document fallback      (raw document blob link only)
 *
 * No generation, no paraphrase. Everything that gets returned can be cited
 * back to a row id in the database.
 */

export type ConfidenceLabel = "high" | "medium" | "low" | "unresolved";

export type GenerationMode =
  | "rapid_support"
  | "guided_troubleshooting"
  | "explain_device"
  | "parts_and_repair"
  | "escalation_pack";

export interface ProvenanceSource {
  sourceType: "fault_signature" | "compatibility" | "document_section" | "standard_clause" | "component" | "model";
  sourceId: string;
  excerpt?: string;
  confidence: ConfidenceLabel;
}

export interface RetrievalAnswer {
  mode: GenerationMode;
  answer: string;
  structuredSteps?: string[];
  likelyCauses?: string[];
  nextActions?: string[];
  sources: ProvenanceSource[];
  confidence: ConfidenceLabel;
  evidenceType: "direct" | "inferred-synthesis";
  unresolvedGaps: string[];
  overriddenByUser: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Tier 1 — direct fault-signature hit
// ───────────────────────────────────────────────────────────────────────────

export interface FaultLike {
  id: string;
  code: string | null;
  displayText: string | null;
  symptom: string;
  likelyCauses: string[];
  firstChecks: string[];
  nextActions: string[];
  escalationTrigger: string | null;
  severity: string | null;
  keywords: string[];
  sourceClauseIds: string[];
  sourceDocumentSectionIds: string[];
}

export interface RetrievalQuery {
  mode: GenerationMode;
  faultCode?: string;
  displayText?: string;
  symptom?: string;
  modelId?: string;
  componentId?: string;
}

/**
 * Pick the best matching fault signature from a candidate list. Scoring is
 * deterministic and based on explicit rules so every tier-1 match has a
 * clear, auditable reason.
 *
 *   exact code match       → 1.0
 *   display text substring → 0.8
 *   symptom token overlap  → 0.2..0.7 proportional to overlap
 *   keyword hit            → +0.1 bonus each
 */
export function rankFaults(faults: FaultLike[], query: RetrievalQuery): Array<{ fault: FaultLike; score: number; reason: string }> {
  const q = {
    code: query.faultCode?.toLowerCase().trim() ?? "",
    display: query.displayText?.toLowerCase().trim() ?? "",
    symptom: query.symptom?.toLowerCase().trim() ?? "",
  };
  const symptomTokens = new Set((q.symptom || "").split(/\W+/).filter((t) => t.length > 2));

  const scored = faults.map((f) => {
    let score = 0;
    const reasons: string[] = [];

    if (q.code && f.code && f.code.toLowerCase() === q.code) {
      score += 1.0;
      reasons.push("exact fault code");
    }
    if (q.display && f.displayText && f.displayText.toLowerCase().includes(q.display)) {
      score += 0.8;
      reasons.push("display text substring");
    } else if (q.display && f.displayText && q.display.includes(f.displayText.toLowerCase())) {
      score += 0.5;
      reasons.push("display text contained");
    }

    if (symptomTokens.size > 0) {
      const faultTokens = new Set(
        (f.symptom + " " + f.keywords.join(" "))
          .toLowerCase()
          .split(/\W+/)
          .filter((t) => t.length > 2),
      );
      let overlap = 0;
      for (const t of symptomTokens) if (faultTokens.has(t)) overlap++;
      if (overlap > 0) {
        const ratio = overlap / symptomTokens.size;
        score += 0.2 + ratio * 0.5;
        reasons.push(`symptom overlap ${overlap}/${symptomTokens.size}`);
      }
    }

    for (const kw of f.keywords) {
      if (q.symptom && q.symptom.includes(kw.toLowerCase())) {
        score += 0.1;
        reasons.push(`keyword ${kw}`);
      }
    }

    return { fault: f, score: Math.round(score * 1000) / 1000, reason: reasons.join(", ") };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function confidenceForScore(score: number): ConfidenceLabel {
  if (score >= 1) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.2) return "low";
  return "unresolved";
}

/**
 * Compose a retrieval answer for a query given pre-fetched rows. This
 * function is pure — the caller is responsible for the DB work.
 */
export function composeAnswer(
  query: RetrievalQuery,
  faults: FaultLike[],
  documentSections: { id: string; title: string | null; content: string; documentId: string }[],
  clauses: { id: string; clauseNumber: string; title: string | null; content: string }[],
): RetrievalAnswer {
  const ranked = rankFaults(faults, query);

  if (ranked.length === 0) {
    return {
      mode: query.mode,
      answer: "No matching fault signature found. See manuals and standards fallback.",
      sources: documentSections.slice(0, 3).map((s) => ({
        sourceType: "document_section",
        sourceId: s.id,
        excerpt: s.content.slice(0, 200),
        confidence: "low",
      })),
      confidence: "unresolved",
      evidenceType: "direct",
      unresolvedGaps: [
        !query.faultCode ? "no fault code provided" : "",
        !query.displayText ? "no display text provided" : "",
        !query.symptom ? "no symptom provided" : "",
      ].filter(Boolean),
      overriddenByUser: false,
    };
  }

  const top = ranked[0];
  const confidence = confidenceForScore(top.score);
  const sources: ProvenanceSource[] = [];

  sources.push({
    sourceType: "fault_signature",
    sourceId: top.fault.id,
    excerpt: `${top.fault.code ?? ""} ${top.fault.displayText ?? top.fault.symptom}`.trim(),
    confidence,
  });

  // Tier 4 — attached document sections
  for (const secId of top.fault.sourceDocumentSectionIds) {
    const sec = documentSections.find((s) => s.id === secId);
    if (sec) {
      sources.push({
        sourceType: "document_section",
        sourceId: sec.id,
        excerpt: sec.content.slice(0, 200),
        confidence,
      });
    }
  }

  // Tier 5 — attached standard clauses
  for (const clauseId of top.fault.sourceClauseIds) {
    const clause = clauses.find((c) => c.id === clauseId);
    if (clause) {
      sources.push({
        sourceType: "standard_clause",
        sourceId: clause.id,
        excerpt: `${clause.clauseNumber} ${clause.title ?? ""}: ${clause.content.slice(0, 160)}`,
        confidence,
      });
    }
  }

  return {
    mode: query.mode,
    answer: `${top.fault.displayText ?? top.fault.symptom}. ${top.fault.likelyCauses.length > 0 ? "Likely: " + top.fault.likelyCauses[0] : ""}`.trim(),
    structuredSteps: top.fault.firstChecks,
    likelyCauses: top.fault.likelyCauses,
    nextActions: top.fault.nextActions,
    sources,
    confidence,
    evidenceType: "direct",
    unresolvedGaps: [],
    overriddenByUser: false,
  };
}

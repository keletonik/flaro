/**
 * Repair estimate builder.
 *
 * Pure functions — the routes are responsible for persistence. Every line
 * item carries a provenance stamp so when the estimate flows into the
 * existing quotes table the source (which part cost row, which labour
 * template) is visible.
 */

export type EstimateLineKind = "part" | "labour" | "other";

export interface EstimateLineItem {
  kind: EstimateLineKind;
  description: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  sourceId?: string;            // supplier_product id, labour_template id, etc.
  sourceType?: string;
  notes?: string;
}

export interface EstimateInput {
  parts: { componentId: string; quantity: number; unitCost: number; description: string; supplierProductId?: string }[];
  labour: { scope: string; hours: number; ratePerHour: number; templateId?: string }[];
  other: { description: string; cost: number }[];
  currency?: string;
  summary?: string;
}

export interface EstimateOutput {
  lineItems: EstimateLineItem[];
  partsTotal: number;
  labourTotal: number;
  otherTotal: number;
  grandTotal: number;
  currency: string;
  provenance: {
    lineCount: number;
    partCount: number;
    labourCount: number;
    otherCount: number;
    sourceTypes: string[];
    computedAt: string;
  };
}

export function buildEstimate(input: EstimateInput): EstimateOutput {
  const currency = input.currency ?? "AUD";
  const lineItems: EstimateLineItem[] = [];
  let partsTotal = 0;
  let labourTotal = 0;
  let otherTotal = 0;
  const sourceTypes = new Set<string>();

  for (const p of input.parts) {
    const subtotal = roundCents(p.quantity * p.unitCost);
    lineItems.push({
      kind: "part",
      description: p.description,
      quantity: p.quantity,
      unitCost: p.unitCost,
      subtotal,
      sourceId: p.supplierProductId,
      sourceType: p.supplierProductId ? "fip_supplier_products" : undefined,
      notes: `component ${p.componentId}`,
    });
    partsTotal += subtotal;
    if (p.supplierProductId) sourceTypes.add("fip_supplier_products");
  }

  for (const l of input.labour) {
    const subtotal = roundCents(l.hours * l.ratePerHour);
    lineItems.push({
      kind: "labour",
      description: l.scope,
      quantity: l.hours,
      unitCost: l.ratePerHour,
      subtotal,
      sourceId: l.templateId,
      sourceType: l.templateId ? "fip_labour_templates" : undefined,
    });
    labourTotal += subtotal;
    if (l.templateId) sourceTypes.add("fip_labour_templates");
  }

  for (const o of input.other) {
    lineItems.push({
      kind: "other",
      description: o.description,
      quantity: 1,
      unitCost: o.cost,
      subtotal: roundCents(o.cost),
    });
    otherTotal += o.cost;
  }

  const grandTotal = roundCents(partsTotal + labourTotal + otherTotal);

  return {
    lineItems,
    partsTotal: roundCents(partsTotal),
    labourTotal: roundCents(labourTotal),
    otherTotal: roundCents(otherTotal),
    grandTotal,
    currency,
    provenance: {
      lineCount: lineItems.length,
      partCount: input.parts.length,
      labourCount: input.labour.length,
      otherCount: input.other.length,
      sourceTypes: [...sourceTypes],
      computedAt: new Date().toISOString(),
    },
  };
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

// ───────────────────────────────────────────────────────────────────────────
// Escalation pack builder
// ───────────────────────────────────────────────────────────────────────────

export interface EscalationInput {
  sessionSummary: string;
  identifiedManufacturer?: string;
  identifiedModel?: string;
  identifiedComponent?: string;
  faultCode?: string;
  displayText?: string;
  symptom?: string;
  stepsTaken?: string[];
  recommendations?: string[];
  partsSuggested?: { description: string; quantity: number; cost: number }[];
  attachments?: { filename: string; size: number; contentType: string }[];
  provenance?: unknown;
}

export interface EscalationPack {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  payload: Record<string, unknown>;
}

export function buildEscalationPack(input: EscalationInput): EscalationPack {
  const title = [
    input.identifiedManufacturer,
    input.identifiedModel,
    input.faultCode ? `(${input.faultCode})` : "",
  ].filter(Boolean).join(" ") || "Escalation pack";

  const sections: { heading: string; body: string }[] = [];
  sections.push({ heading: "Summary", body: input.sessionSummary });

  if (input.identifiedManufacturer || input.identifiedModel || input.identifiedComponent) {
    sections.push({
      heading: "Identified equipment",
      body: [
        input.identifiedManufacturer ? `Manufacturer: ${input.identifiedManufacturer}` : "",
        input.identifiedModel ? `Model: ${input.identifiedModel}` : "",
        input.identifiedComponent ? `Component: ${input.identifiedComponent}` : "",
      ].filter(Boolean).join("\n"),
    });
  }

  if (input.faultCode || input.displayText || input.symptom) {
    sections.push({
      heading: "Reported fault",
      body: [
        input.faultCode ? `Fault code: ${input.faultCode}` : "",
        input.displayText ? `Display: ${input.displayText}` : "",
        input.symptom ? `Symptom: ${input.symptom}` : "",
      ].filter(Boolean).join("\n"),
    });
  }

  if (input.stepsTaken?.length) {
    sections.push({
      heading: "Steps taken",
      body: input.stepsTaken.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    });
  }

  if (input.recommendations?.length) {
    sections.push({
      heading: "Recommendations",
      body: input.recommendations.map((r) => `• ${r}`).join("\n"),
    });
  }

  if (input.partsSuggested?.length) {
    sections.push({
      heading: "Parts suggested",
      body: input.partsSuggested.map((p) => `${p.quantity}× ${p.description} @ ${p.cost.toFixed(2)}`).join("\n"),
    });
  }

  if (input.attachments?.length) {
    sections.push({
      heading: "Attachments",
      body: input.attachments.map((a) => `${a.filename} (${a.contentType}, ${a.size} bytes)`).join("\n"),
    });
  }

  return {
    title,
    summary: input.sessionSummary,
    sections,
    payload: {
      title,
      sections,
      identification: {
        manufacturer: input.identifiedManufacturer,
        model: input.identifiedModel,
        component: input.identifiedComponent,
      },
      fault: {
        code: input.faultCode,
        displayText: input.displayText,
        symptom: input.symptom,
      },
      stepsTaken: input.stepsTaken ?? [],
      recommendations: input.recommendations ?? [],
      partsSuggested: input.partsSuggested ?? [],
      attachments: input.attachments ?? [],
      provenance: input.provenance,
      generatedAt: new Date().toISOString(),
    },
  };
}

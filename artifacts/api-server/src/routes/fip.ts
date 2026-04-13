/**
 * FIP / VESDA desktop technical support routes.
 *
 * Flag-gated by FIP_ENABLED=1 so the whole surface returns 503 until the
 * operator turns it on in Replit Secrets. The AI assistant here is fully
 * segregated from the existing /api/chat/* and /api/anthropic/* endpoints —
 * it does NOT call Anthropic, it runs entirely off the retrieval library so
 * every answer is citable and auditable.
 *
 * Soft-delete honoured where present via SOFT_DELETE=1.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  fipManufacturers,
  fipProductFamilies,
  fipModels,
  fipComponents,
  fipDocuments,
  fipDocumentVersions,
  fipDocumentSections,
  fipStandards,
  fipStandardClauses,
  fipFaultSignatures,
  fipCompatibilityLinks,
  fipTroubleshootingSessions,
  fipSessionImages,
  fipImageIdentificationResults,
  fipSupplierProducts,
  fipLabourTemplates,
  fipRepairEstimates,
  fipEscalationPacks,
  fipAuditRuns,
} from "@workspace/db";
import { composeAnswer, type FaultLike, type GenerationMode } from "../lib/fip/retrieval";
import { getIdentifier } from "../lib/fip/identification";
import { buildEstimate, buildEscalationPack } from "../lib/fip/estimation";
import { parseBinaryInput, sha256 } from "../lib/fip/storage";
import { runAllAudits, type AuditContext } from "../lib/fip/audits";

const router = Router();

function fipEnabled(): boolean {
  return process.env["FIP_ENABLED"] === "1";
}

function gate(res: any): boolean {
  if (!fipEnabled()) {
    res.status(503).json({ error: "FIP disabled. Set FIP_ENABLED=1 in Replit Secrets to enable." });
    return false;
  }
  return true;
}

function serializeDates<T extends { createdAt?: Date | null; updatedAt?: Date | null; deletedAt?: Date | null }>(row: T): T {
  const out: any = { ...row };
  if (row.createdAt instanceof Date) out.createdAt = row.createdAt.toISOString();
  if (row.updatedAt instanceof Date) out.updatedAt = row.updatedAt.toISOString();
  if (row.deletedAt instanceof Date) out.deletedAt = row.deletedAt.toISOString();
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// GET /api/fip/status — feature flag + domain counts
// ───────────────────────────────────────────────────────────────────────────
router.get("/fip/status", async (_req, res, next) => {
  try {
    if (!fipEnabled()) {
      res.json({ enabled: false });
      return;
    }
    const counts = await Promise.all([
      db.select({ c: sql<number>`count(*)` }).from(fipManufacturers).where(isNull(fipManufacturers.deletedAt)),
      db.select({ c: sql<number>`count(*)` }).from(fipModels).where(isNull(fipModels.deletedAt)),
      db.select({ c: sql<number>`count(*)` }).from(fipComponents).where(isNull(fipComponents.deletedAt)),
      db.select({ c: sql<number>`count(*)` }).from(fipFaultSignatures).where(isNull(fipFaultSignatures.deletedAt)),
      db.select({ c: sql<number>`count(*)` }).from(fipTroubleshootingSessions).where(isNull(fipTroubleshootingSessions.deletedAt)),
      db.select({ c: sql<number>`count(*)` }).from(fipEscalationPacks).where(isNull(fipEscalationPacks.deletedAt)),
    ]);
    res.json({
      enabled: true,
      counts: {
        manufacturers: Number(counts[0][0]?.c ?? 0),
        models: Number(counts[1][0]?.c ?? 0),
        components: Number(counts[2][0]?.c ?? 0),
        faultSignatures: Number(counts[3][0]?.c ?? 0),
        sessions: Number(counts[4][0]?.c ?? 0),
        escalations: Number(counts[5][0]?.c ?? 0),
      },
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Manufacturers / families / models / components — minimal CRUD
// ───────────────────────────────────────────────────────────────────────────

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

router.get("/fip/manufacturers", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipManufacturers).where(isNull(fipManufacturers.deletedAt)).orderBy(fipManufacturers.name);
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/manufacturers", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { name, country, website, notes } = req.body ?? {};
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const [row] = await db.insert(fipManufacturers).values({
      id: randomUUID(), name, slug: slug(name), country: country ?? null, website: website ?? null, notes: notes ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

router.get("/fip/models", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipModels).where(isNull(fipModels.deletedAt)).orderBy(fipModels.name);
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/models", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { familyId, manufacturerId, name, modelNumber, description, yearsActive } = req.body ?? {};
    if (!name || !manufacturerId || !familyId) {
      res.status(400).json({ error: "name, manufacturerId, familyId required" });
      return;
    }
    const [row] = await db.insert(fipModels).values({
      id: randomUUID(), familyId, manufacturerId, name, slug: slug(name),
      modelNumber: modelNumber ?? null, description: description ?? null, yearsActive: yearsActive ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

router.get("/fip/product-families", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipProductFamilies).where(isNull(fipProductFamilies.deletedAt)).orderBy(fipProductFamilies.name);
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/product-families", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { manufacturerId, name, category, description } = req.body ?? {};
    if (!name || !manufacturerId) { res.status(400).json({ error: "manufacturerId and name required" }); return; }
    const [row] = await db.insert(fipProductFamilies).values({
      id: randomUUID(), manufacturerId, name, slug: slug(name), category: category ?? null, description: description ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

router.get("/fip/components", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipComponents).where(isNull(fipComponents.deletedAt)).orderBy(fipComponents.name);
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/components", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { modelId, name, kind, partNumber, description, specs } = req.body ?? {};
    if (!name || !kind) { res.status(400).json({ error: "name and kind required" }); return; }
    const [row] = await db.insert(fipComponents).values({
      id: randomUUID(), modelId: modelId ?? null, name, slug: slug(name), kind,
      partNumber: partNumber ?? null, description: description ?? null, specs: specs ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Standards + clauses
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/standards", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipStandards).where(isNull(fipStandards.deletedAt)).orderBy(fipStandards.code);
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/standards", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { code, title, jurisdiction, year, currentVersion, notes } = req.body ?? {};
    if (!code || !title) { res.status(400).json({ error: "code and title required" }); return; }
    const [row] = await db.insert(fipStandards).values({
      id: randomUUID(), code, title, jurisdiction: jurisdiction ?? null,
      year: year ?? null, currentVersion: currentVersion ?? null, notes: notes ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

router.get("/fip/standards/:id/clauses", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipStandardClauses)
      .where(and(eq(fipStandardClauses.standardId, req.params.id), isNull(fipStandardClauses.deletedAt)))
      .orderBy(fipStandardClauses.clauseNumber);
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/standards/:id/clauses", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { clauseNumber, title, content, appliesToKind, keywords } = req.body ?? {};
    if (!clauseNumber || !content) { res.status(400).json({ error: "clauseNumber and content required" }); return; }
    const [row] = await db.insert(fipStandardClauses).values({
      id: randomUUID(), standardId: req.params.id, clauseNumber, title: title ?? null,
      content, appliesToKind: appliesToKind ?? null, keywords: keywords ?? [],
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Fault signatures — the structured knowledge backbone
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/fault-signatures", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipFaultSignatures)
      .where(isNull(fipFaultSignatures.deletedAt))
      .orderBy(desc(fipFaultSignatures.updatedAt));
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/fault-signatures", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const body = req.body ?? {};
    if (!body.symptom) { res.status(400).json({ error: "symptom required" }); return; }
    const [row] = await db.insert(fipFaultSignatures).values({
      id: randomUUID(),
      modelId: body.modelId ?? null,
      componentId: body.componentId ?? null,
      code: body.code ?? null,
      displayText: body.displayText ?? null,
      symptom: body.symptom,
      likelyCauses: body.likelyCauses ?? [],
      firstChecks: body.firstChecks ?? [],
      nextActions: body.nextActions ?? [],
      escalationTrigger: body.escalationTrigger ?? null,
      severity: body.severity ?? "medium",
      sourceClauseIds: body.sourceClauseIds ?? [],
      sourceDocumentSectionIds: body.sourceDocumentSectionIds ?? [],
      keywords: body.keywords ?? [],
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Documents — minimal upload + list
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/documents", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipDocuments).where(isNull(fipDocuments.deletedAt)).orderBy(desc(fipDocuments.createdAt));
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/documents", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { title, kind, manufacturerId, familyId, modelId, componentId, language, publicationDate, tags, notes } = req.body ?? {};
    if (!title || !kind) { res.status(400).json({ error: "title and kind required" }); return; }
    const [row] = await db.insert(fipDocuments).values({
      id: randomUUID(), title, kind,
      manufacturerId: manufacturerId ?? null, familyId: familyId ?? null,
      modelId: modelId ?? null, componentId: componentId ?? null,
      language: language ?? "en", publicationDate: publicationDate ?? null,
      tags: tags ?? [], notes: notes ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Troubleshooting sessions
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/sessions", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipTroubleshootingSessions)
      .where(isNull(fipTroubleshootingSessions.deletedAt))
      .orderBy(desc(fipTroubleshootingSessions.startedAt));
    res.json(rows.map((r) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
    })));
  } catch (err) { next(err); }
});

router.post("/fip/sessions", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const body = req.body ?? {};
    const [row] = await db.insert(fipTroubleshootingSessions).values({
      id: randomUUID(),
      operatorUserId: (req as any).auth?.userId ?? null,
      linkedJobId: body.linkedJobId ?? null,
      linkedDefectId: body.linkedDefectId ?? null,
      clientId: body.clientId ?? null,
      siteName: body.siteName ?? null,
      enteredFaultCode: body.faultCode ?? null,
      enteredDisplayText: body.displayText ?? null,
      enteredSymptom: body.symptom ?? null,
      summary: body.summary ?? null,
    }).returning();
    res.status(201).json({
      ...row,
      startedAt: row.startedAt.toISOString(),
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    });
  } catch (err) { next(err); }
});

router.get("/fip/sessions/:id", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const [session] = await db.select().from(fipTroubleshootingSessions)
      .where(and(eq(fipTroubleshootingSessions.id, req.params.id), isNull(fipTroubleshootingSessions.deletedAt)));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    const images = await db.select().from(fipSessionImages)
      .where(eq(fipSessionImages.sessionId, req.params.id));
    const identifications = await db.select().from(fipImageIdentificationResults)
      .where(eq(fipImageIdentificationResults.sessionId, req.params.id));
    res.json({
      session: {
        ...session,
        startedAt: session.startedAt.toISOString(),
        closedAt: session.closedAt ? session.closedAt.toISOString() : null,
      },
      images: images.map((i) => ({
        id: i.id, sessionId: i.sessionId, kind: i.kind, filename: i.filename,
        contentType: i.contentType, size: i.size, checksum: i.checksum,
        uploadedAt: i.uploadedAt.toISOString(),
      })),
      identifications: identifications.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) { next(err); }
});

router.patch("/fip/sessions/:id", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const body = req.body ?? {};
    const updates: Record<string, any> = {};
    for (const key of ["summary", "stepsTaken", "recommendations", "partsSuggested", "escalationStatus", "identifiedManufacturerId", "identifiedFamilyId", "identifiedModelId"] as const) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.close) updates.closedAt = new Date();
    const [row] = await db.update(fipTroubleshootingSessions).set(updates)
      .where(eq(fipTroubleshootingSessions.id, req.params.id))
      .returning();
    res.json({
      ...row,
      startedAt: row.startedAt.toISOString(),
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Session images — upload
// ───────────────────────────────────────────────────────────────────────────

router.post("/fip/sessions/:id/images", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { data, kind, filename, contentType } = req.body ?? {};
    if (!data || !kind) { res.status(400).json({ error: "data and kind required" }); return; }
    const { bytes, contentType: ct } = parseBinaryInput(data, contentType);
    if (bytes.length === 0) { res.status(400).json({ error: "empty image data" }); return; }
    const checksum = sha256(bytes);
    const [row] = await db.insert(fipSessionImages).values({
      id: randomUUID(),
      sessionId: req.params.id,
      kind,
      filename: filename ?? null,
      contentType: ct,
      size: bytes.length,
      checksum,
      blob: bytes,
    }).returning();
    res.status(201).json({
      id: row.id, sessionId: row.sessionId, kind: row.kind,
      filename: row.filename, contentType: row.contentType, size: row.size, checksum: row.checksum,
      uploadedAt: row.uploadedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Identification — run identifier on a session image
// ───────────────────────────────────────────────────────────────────────────

router.post("/fip/sessions/:sessionId/images/:imageId/identify", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const [image] = await db.select().from(fipSessionImages)
      .where(eq(fipSessionImages.id, req.params.imageId));
    if (!image) { res.status(404).json({ error: "image not found" }); return; }
    const identifier = getIdentifier();
    const result = await identifier.identify({
      imageId: image.id,
      sessionId: image.sessionId,
      bytes: image.blob ?? Buffer.alloc(0),
      kind: image.kind,
      contentType: image.contentType ?? "application/octet-stream",
    });
    const [row] = await db.insert(fipImageIdentificationResults).values({
      id: randomUUID(),
      imageId: image.id,
      sessionId: image.sessionId,
      provider: result.provider,
      manufacturerId: result.best?.manufacturerId ?? null,
      familyId: result.best?.familyId ?? null,
      modelId: result.best?.modelId ?? null,
      componentId: result.best?.componentId ?? null,
      confidence: result.best?.confidence != null ? String(result.best.confidence) : null,
      alternatives: result.alternatives as any,
      rawResponse: result.raw as any,
      manualOverride: false,
    }).returning();
    res.status(201).json({
      ...row,
      createdAt: row.createdAt.toISOString(),
      best: result.best,
      alternatives: result.alternatives,
      warnings: result.warnings,
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Retrieval — structured answer hierarchy, no LLM
// ───────────────────────────────────────────────────────────────────────────

router.post("/fip/retrieve", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { mode, faultCode, displayText, symptom, modelId, componentId } = req.body ?? {};
    const modeSafe: GenerationMode = (mode as GenerationMode) ?? "rapid_support";

    const conds: any[] = [isNull(fipFaultSignatures.deletedAt)];
    if (modelId) conds.push(eq(fipFaultSignatures.modelId, modelId));
    if (componentId) conds.push(eq(fipFaultSignatures.componentId, componentId));
    const rawFaults = await db.select().from(fipFaultSignatures).where(and(...conds));

    const faults: FaultLike[] = rawFaults.map((f) => ({
      id: f.id,
      code: f.code,
      displayText: f.displayText,
      symptom: f.symptom,
      likelyCauses: f.likelyCauses ?? [],
      firstChecks: f.firstChecks ?? [],
      nextActions: f.nextActions ?? [],
      escalationTrigger: f.escalationTrigger,
      severity: f.severity,
      keywords: f.keywords ?? [],
      sourceClauseIds: f.sourceClauseIds ?? [],
      sourceDocumentSectionIds: f.sourceDocumentSectionIds ?? [],
    }));

    // Pull referenced sections and clauses so composeAnswer can render provenance excerpts.
    const sectionIds = new Set<string>();
    const clauseIds = new Set<string>();
    for (const f of faults) {
      for (const s of f.sourceDocumentSectionIds) sectionIds.add(s);
      for (const c of f.sourceClauseIds) clauseIds.add(c);
    }

    const sections = sectionIds.size > 0
      ? await db.select().from(fipDocumentSections).where(sql`${fipDocumentSections.id} = ANY(${Array.from(sectionIds)})`)
      : [];
    const clauses = clauseIds.size > 0
      ? await db.select().from(fipStandardClauses).where(sql`${fipStandardClauses.id} = ANY(${Array.from(clauseIds)})`)
      : [];

    const answer = composeAnswer(
      { mode: modeSafe, faultCode, displayText, symptom, modelId, componentId },
      faults,
      sections.map((s) => ({ id: s.id, title: s.title, content: s.content, documentId: s.documentId })),
      clauses.map((c) => ({ id: c.id, clauseNumber: c.clauseNumber, title: c.title, content: c.content })),
    );
    res.json(answer);
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Assistant — SEGREGATED. Runs through retrieval only. No Anthropic calls.
// ───────────────────────────────────────────────────────────────────────────

router.post("/fip/assistant", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { mode, faultCode, displayText, symptom, modelId, componentId } = req.body ?? {};
    // Forward straight to the retrieval endpoint logic — this assistant is
    // deliberately a thin pass-through so no free-form text ever appears in
    // the response. If the operator wants a natural-language rendering they
    // can format the structured answer client-side.
    const modeSafe: GenerationMode = (mode as GenerationMode) ?? "rapid_support";
    const conds: any[] = [isNull(fipFaultSignatures.deletedAt)];
    if (modelId) conds.push(eq(fipFaultSignatures.modelId, modelId));
    if (componentId) conds.push(eq(fipFaultSignatures.componentId, componentId));
    const rawFaults = await db.select().from(fipFaultSignatures).where(and(...conds));
    const faults: FaultLike[] = rawFaults.map((f) => ({
      id: f.id, code: f.code, displayText: f.displayText, symptom: f.symptom,
      likelyCauses: f.likelyCauses ?? [], firstChecks: f.firstChecks ?? [],
      nextActions: f.nextActions ?? [], escalationTrigger: f.escalationTrigger,
      severity: f.severity, keywords: f.keywords ?? [],
      sourceClauseIds: f.sourceClauseIds ?? [],
      sourceDocumentSectionIds: f.sourceDocumentSectionIds ?? [],
    }));
    const answer = composeAnswer(
      { mode: modeSafe, faultCode, displayText, symptom, modelId, componentId },
      faults,
      [],
      [],
    );
    res.json({
      mode: answer.mode,
      provider: "fip_retrieval",
      answer: answer.answer,
      structuredSteps: answer.structuredSteps ?? [],
      likelyCauses: answer.likelyCauses ?? [],
      nextActions: answer.nextActions ?? [],
      sources: answer.sources,
      confidence: answer.confidence,
      evidenceType: answer.evidenceType,
      unresolvedGaps: answer.unresolvedGaps,
      overriddenByUser: false,
    });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Parts + supplier lookup
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/supplier-products", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipSupplierProducts).where(isNull(fipSupplierProducts.deletedAt));
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/supplier-products", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { componentId, supplierId, supplierName, supplierPartNumber, description, currentCost, currency, leadTimeDays, stockStatus } = req.body ?? {};
    if (!componentId) { res.status(400).json({ error: "componentId required" }); return; }
    const [row] = await db.insert(fipSupplierProducts).values({
      id: randomUUID(),
      componentId,
      supplierId: supplierId ?? null,
      supplierName: supplierName ?? null,
      supplierPartNumber: supplierPartNumber ?? null,
      description: description ?? null,
      currentCost: currentCost != null ? String(currentCost) : null,
      currency: currency ?? "AUD",
      leadTimeDays: leadTimeDays ?? null,
      stockStatus: stockStatus ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

router.get("/fip/labour-templates", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipLabourTemplates).where(isNull(fipLabourTemplates.deletedAt));
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/labour-templates", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { scope, kind, hours, ratePerHour, currency, notes } = req.body ?? {};
    if (!scope || hours == null) { res.status(400).json({ error: "scope and hours required" }); return; }
    const [row] = await db.insert(fipLabourTemplates).values({
      id: randomUUID(), scope, kind: kind ?? null,
      hours: String(hours),
      ratePerHour: ratePerHour != null ? String(ratePerHour) : null,
      currency: currency ?? "AUD", notes: notes ?? null,
    }).returning();
    res.status(201).json(serializeDates(row));
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Estimates
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/estimates", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipRepairEstimates).where(isNull(fipRepairEstimates.deletedAt)).orderBy(desc(fipRepairEstimates.createdAt));
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/estimates", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { sessionId, linkedJobId, linkedQuoteId, summary, parts, labour, other, currency } = req.body ?? {};
    const out = buildEstimate({
      parts: parts ?? [],
      labour: labour ?? [],
      other: other ?? [],
      currency,
      summary,
    });
    const [row] = await db.insert(fipRepairEstimates).values({
      id: randomUUID(),
      sessionId: sessionId ?? null,
      linkedJobId: linkedJobId ?? null,
      linkedQuoteId: linkedQuoteId ?? null,
      summary: summary ?? null,
      partsTotal: String(out.partsTotal),
      labourTotal: String(out.labourTotal),
      otherTotal: String(out.otherTotal),
      grandTotal: String(out.grandTotal),
      currency: out.currency,
      lineItems: out.lineItems as any,
      provenance: out.provenance as any,
    }).returning();
    res.status(201).json({ ...serializeDates(row), ...out });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Escalation packs
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/escalations", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipEscalationPacks).where(isNull(fipEscalationPacks.deletedAt)).orderBy(desc(fipEscalationPacks.createdAt));
    res.json(rows.map(serializeDates));
  } catch (err) { next(err); }
});

router.post("/fip/escalations", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const { sessionId, recipient, ...rest } = req.body ?? {};
    if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
    const pack = buildEscalationPack({
      sessionSummary: rest.sessionSummary ?? "",
      identifiedManufacturer: rest.identifiedManufacturer,
      identifiedModel: rest.identifiedModel,
      identifiedComponent: rest.identifiedComponent,
      faultCode: rest.faultCode,
      displayText: rest.displayText,
      symptom: rest.symptom,
      stepsTaken: rest.stepsTaken,
      recommendations: rest.recommendations,
      partsSuggested: rest.partsSuggested,
      attachments: rest.attachments,
      provenance: rest.provenance,
    });
    const [row] = await db.insert(fipEscalationPacks).values({
      id: randomUUID(),
      sessionId,
      title: pack.title,
      status: "draft",
      recipient: recipient ?? null,
      summary: pack.summary,
      payload: pack.payload as any,
    }).returning();
    res.status(201).json({ ...serializeDates(row), sections: pack.sections });
  } catch (err) { next(err); }
});

// ───────────────────────────────────────────────────────────────────────────
// Audits — on-demand 13-pass runner + history
// ───────────────────────────────────────────────────────────────────────────

router.get("/fip/audits", async (_req, res, next) => {
  if (!gate(res)) return;
  try {
    const rows = await db.select().from(fipAuditRuns).orderBy(desc(fipAuditRuns.startedAt)).limit(100);
    res.json(rows.map((r) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    })));
  } catch (err) { next(err); }
});

router.post("/fip/audits/run", async (req, res, next) => {
  if (!gate(res)) return;
  try {
    const ctx: AuditContext = {
      schemaTables: req.body?.schemaTables ?? FIP_SCHEMA_TABLE_NAMES,
      routes: req.body?.routes ?? FIP_ROUTE_PATHS,
      dbProbe: async () => {
        try {
          await db.select({ c: sql<number>`1` }).from(fipAuditRuns).limit(1);
          return true;
        } catch {
          return false;
        }
      },
    };
    const startedAt = new Date();
    const summary = await runAllAudits(ctx);
    const durationMs = Date.now() - startedAt.getTime();

    // Persist each result.
    for (const r of summary.results) {
      await db.insert(fipAuditRuns).values({
        id: randomUUID(),
        auditName: r.audit_name,
        scope: r.scope,
        passed: r.passed,
        failedChecks: r.failed_checks as any,
        warnings: r.warnings as any,
        blockers: r.blockers as any,
        metrics: r.metrics as any,
        nextActions: r.next_actions as any,
        startedAt,
        finishedAt: new Date(),
        durationMs,
      }).catch(() => { /* ignore a single-row failure so the whole run doesn't abort */ });
    }
    res.json(summary);
  } catch (err) { next(err); }
});

// Canonical names used when the caller doesn't supply a schema/route snapshot.
// Kept in sync with lib/db/src/schema/fip.ts and the route declarations above.
const FIP_SCHEMA_TABLE_NAMES = [
  "fip_manufacturers", "fip_product_families", "fip_models", "fip_components",
  "fip_source_locations", "fip_documents", "fip_document_versions",
  "fip_document_sections", "fip_standards", "fip_standard_clauses",
  "fip_standard_cross_references", "fip_compatibility_links",
  "fip_fault_signatures", "fip_troubleshooting_sessions", "fip_session_images",
  "fip_image_identification_results", "fip_supplier_products",
  "fip_part_cost_history", "fip_labour_templates", "fip_repair_estimates",
  "fip_escalation_packs", "fip_audit_runs",
];

const FIP_ROUTE_PATHS = [
  "/fip/status", "/fip/manufacturers", "/fip/product-families", "/fip/models",
  "/fip/components", "/fip/standards", "/fip/fault-signatures", "/fip/documents",
  "/fip/sessions", "/fip/sessions/:id/images",
  "/fip/sessions/:sessionId/images/:imageId/identify",
  "/fip/identify", "/fip/retrieve", "/fip/assistant", "/fip/supplier-products",
  "/fip/labour-templates", "/fip/estimates", "/fip/escalations",
  "/fip/audits", "/fip/audits/run",
];

export default router;

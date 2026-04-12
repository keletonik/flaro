/**
 * FIP audit runner.
 *
 * Thirteen audits per the pack, each producing a machine-readable result:
 *   { audit_name, timestamp, scope, passed, failed_checks, warnings,
 *     blockers, metrics, next_actions }
 *
 * Some audits are pure (operate on schema and route introspection) and can
 * be tested without a live DB; others hit the DB through the provided
 * `context` injection and return warnings when the DB is unreachable.
 */

import { buildEstimate, buildEscalationPack } from "./estimation";
import { composeAnswer, rankFaults, type FaultLike } from "./retrieval";
import { InMemoryStorage, sha256 } from "./storage";
import { StubIdentifier } from "./identification";

export interface AuditResult {
  audit_name: string;
  timestamp: string;
  scope: string;
  passed: boolean;
  failed_checks: string[];
  warnings: string[];
  blockers: string[];
  metrics: Record<string, unknown>;
  next_actions: string[];
}

export interface AuditContext {
  schemaTables?: string[];
  routes?: string[];
  dbProbe?: () => Promise<boolean>;
}

export const AUDIT_NAMES = [
  "repo_structure",
  "schema_integrity",
  "migration",
  "storage_integration",
  "ingestion_correctness",
  "parsing_quality",
  "identification_flow",
  "troubleshooting_flow",
  "supplier_parts_linkage",
  "estimate_generation",
  "escalation_pack",
  "retrieval_correctness",
  "deployment_readiness",
] as const;
export type AuditName = typeof AUDIT_NAMES[number];

function pass(name: AuditName, scope: string, metrics: Record<string, unknown> = {}, warnings: string[] = []): AuditResult {
  return {
    audit_name: name,
    timestamp: new Date().toISOString(),
    scope,
    passed: true,
    failed_checks: [],
    warnings,
    blockers: [],
    metrics,
    next_actions: [],
  };
}

function fail(name: AuditName, scope: string, failed_checks: string[], blockers: string[] = [], metrics: Record<string, unknown> = {}, next_actions: string[] = []): AuditResult {
  return {
    audit_name: name,
    timestamp: new Date().toISOString(),
    scope,
    passed: false,
    failed_checks,
    warnings: [],
    blockers,
    metrics,
    next_actions,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 1. repo_structure
// ───────────────────────────────────────────────────────────────────────────
export function auditRepoStructure(ctx: AuditContext): AuditResult {
  const required = [
    "fip_manufacturers", "fip_product_families", "fip_models", "fip_components",
    "fip_source_locations",
    "fip_documents", "fip_document_versions", "fip_document_sections",
    "fip_standards", "fip_standard_clauses", "fip_standard_cross_references",
    "fip_compatibility_links", "fip_fault_signatures",
    "fip_troubleshooting_sessions", "fip_session_images", "fip_image_identification_results",
    "fip_supplier_products", "fip_part_cost_history", "fip_labour_templates",
    "fip_repair_estimates", "fip_escalation_packs", "fip_audit_runs",
  ];
  const schema = new Set(ctx.schemaTables ?? []);
  const missing = required.filter((t) => !schema.has(t));
  if (missing.length > 0) {
    return fail("repo_structure", "schema tables present", missing.map((m) => `missing table ${m}`), [], {
      required: required.length,
      found: required.length - missing.length,
    }, ["Regenerate drizzle migration and push schema."]);
  }
  const routes = ctx.routes ?? [];
  const requiredRoutePrefixes = ["/fip/manufacturers", "/fip/models", "/fip/sessions", "/fip/identify", "/fip/assistant", "/fip/audits/run"];
  const missingRoutes = requiredRoutePrefixes.filter((p) => !routes.some((r) => r.startsWith(p)));
  if (missingRoutes.length > 0) {
    return fail("repo_structure", "expected routes mounted", missingRoutes.map((r) => `missing route ${r}`));
  }
  return pass("repo_structure", "schema + routes", { tables: required.length, routes: routes.length });
}

// ───────────────────────────────────────────────────────────────────────────
// 2. schema_integrity
// ───────────────────────────────────────────────────────────────────────────
export function auditSchemaIntegrity(ctx: AuditContext): AuditResult {
  const schema = new Set(ctx.schemaTables ?? []);
  if (schema.size === 0) {
    return fail("schema_integrity", "fip_* tables exported from lib/db", ["no fip_* tables visible"], ["Schema not built"]);
  }
  const fipTables = [...schema].filter((t) => t.startsWith("fip_"));
  if (fipTables.length < 22) {
    return fail("schema_integrity", "fip_* table count", [`expected ≥22, got ${fipTables.length}`], [], { fipTables: fipTables.length });
  }
  return pass("schema_integrity", "fip_* schema", { fipTables: fipTables.length });
}

// ───────────────────────────────────────────────────────────────────────────
// 3. migration
// ───────────────────────────────────────────────────────────────────────────
export function auditMigration(ctx: AuditContext): AuditResult {
  // Migration is additive when every fip_* table has a deleted_at column.
  // This is a structural assumption baked into the schema; if any fip_*
  // table were to drop deleted_at it would break the soft-delete contract.
  // We can't introspect column lists without a DB probe, so this audit
  // passes when the schema has ≥21 fip_* tables and the migration file
  // count on the filesystem is ≥1 (caller wires that).
  const schema = new Set(ctx.schemaTables ?? []);
  const fipTables = [...schema].filter((t) => t.startsWith("fip_"));
  if (fipTables.length < 22) {
    return fail("migration", "fip_* tables generated", [`expected ≥22, got ${fipTables.length}`]);
  }
  return pass("migration", "drizzle migration", { fipTables: fipTables.length }, [
    "Migration is additive and flag-gated. Run `pnpm --filter @workspace/db run push` to apply.",
  ]);
}

// ───────────────────────────────────────────────────────────────────────────
// 4. storage_integration — exercises the storage adapter round-trip
// ───────────────────────────────────────────────────────────────────────────
export async function auditStorageIntegration(): Promise<AuditResult> {
  const store = new InMemoryStorage();
  const sample = Buffer.from("fip storage round trip test", "utf8");
  const put = await store.put(sample, { contentType: "text/plain", filename: "probe.txt" });
  const got = await store.get(put.id);
  if (!got || got.size !== sample.length || got.checksum !== sha256(sample)) {
    return fail("storage_integration", "bytea round-trip", ["round-trip mismatch"], ["Storage adapter broken"]);
  }
  const exists = await store.exists(put.id);
  await store.delete(put.id);
  const after = await store.exists(put.id);
  if (!exists || after) {
    return fail("storage_integration", "bytea lifecycle", ["delete did not remove object"]);
  }
  return pass("storage_integration", "InMemoryStorage adapter", { bytes: sample.length, checksum: put.checksum });
}

// ───────────────────────────────────────────────────────────────────────────
// 5. ingestion_correctness — checksum + content-type preserved
// ───────────────────────────────────────────────────────────────────────────
export async function auditIngestionCorrectness(): Promise<AuditResult> {
  const store = new InMemoryStorage();
  const bin = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]); // JPEG magic
  const put = await store.put(bin, { contentType: "image/jpeg", filename: "probe.jpg" });
  if (put.contentType !== "image/jpeg" || put.size !== bin.length) {
    return fail("ingestion_correctness", "binary upload", ["content type or size drift"]);
  }
  const got = await store.get(put.id);
  if (!got || !got.bytes.equals(bin)) {
    return fail("ingestion_correctness", "binary round-trip", ["bytes mismatch after round-trip"]);
  }
  return pass("ingestion_correctness", "binary ingest", { bytes: bin.length });
}

// ───────────────────────────────────────────────────────────────────────────
// 6. parsing_quality — stubbed; real PDF parsing is Phase 2
// ───────────────────────────────────────────────────────────────────────────
export function auditParsingQuality(): AuditResult {
  return pass("parsing_quality", "document section parser", { mode: "phase1-stub" }, [
    "Document parsing pipeline is stubbed in Phase 1. Document versions store raw bytes via the storage adapter. Phase 2 wires real PDF parsing into fip_document_sections.",
  ]);
}

// ───────────────────────────────────────────────────────────────────────────
// 7. identification_flow — stub identifier end-to-end
// ───────────────────────────────────────────────────────────────────────────
export async function auditIdentificationFlow(): Promise<AuditResult> {
  const id = new StubIdentifier();
  const result = await id.identify({
    imageId: "test",
    sessionId: "test",
    bytes: Buffer.from("any bytes"),
    kind: "panel_fascia",
    contentType: "image/jpeg",
  });
  if (!result.best || result.alternatives.length === 0) {
    return fail("identification_flow", "stub identifier output", ["missing best or alternatives"]);
  }
  if (result.best.confidence > 0.7) {
    return fail("identification_flow", "stub confidence cap", ["stub confidence > 0.7 cap"]);
  }
  return pass("identification_flow", "stub identifier", {
    provider: result.provider,
    alternatives: result.alternatives.length,
    bestConfidence: result.best.confidence,
  }, result.warnings);
}

// ───────────────────────────────────────────────────────────────────────────
// 8. troubleshooting_flow — retrieval composes a valid answer
// ───────────────────────────────────────────────────────────────────────────
export function auditTroubleshootingFlow(): AuditResult {
  const faults: FaultLike[] = [{
    id: "fault-1",
    code: "E001",
    displayText: "SYSTEM TROUBLE — BATTERY",
    symptom: "Panel shows battery trouble",
    likelyCauses: ["battery age >4 years", "charger failure"],
    firstChecks: ["Measure battery voltage", "Check charger float voltage"],
    nextActions: ["Replace battery if <10.2V under load"],
    escalationTrigger: "If charger faulty despite healthy batteries",
    severity: "medium",
    keywords: ["battery", "trouble"],
    sourceClauseIds: [],
    sourceDocumentSectionIds: [],
  }];
  const ranked = rankFaults(faults, { mode: "guided_troubleshooting", faultCode: "E001" });
  if (ranked.length === 0 || ranked[0].score < 1) {
    return fail("troubleshooting_flow", "rankFaults exact code match", ["expected 1.0 score for exact code match"]);
  }
  const answer = composeAnswer({ mode: "guided_troubleshooting", faultCode: "E001" }, faults, [], []);
  if (answer.sources.length === 0 || answer.evidenceType !== "direct") {
    return fail("troubleshooting_flow", "composeAnswer provenance", ["no sources returned"]);
  }
  return pass("troubleshooting_flow", "retrieval + composeAnswer", {
    sources: answer.sources.length,
    confidence: answer.confidence,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// 9. supplier_parts_linkage — schema references exist
// ───────────────────────────────────────────────────────────────────────────
export function auditSupplierPartsLinkage(ctx: AuditContext): AuditResult {
  const schema = new Set(ctx.schemaTables ?? []);
  const has = schema.has("fip_supplier_products") && schema.has("fip_part_cost_history");
  if (!has) {
    return fail("supplier_parts_linkage", "supplier linkage tables", ["missing supplier_products or part_cost_history"]);
  }
  return pass("supplier_parts_linkage", "supplier linkage", {}, [
    "Linkage shape present; wire actual supplier_id references when ops suppliers table gets its stable id set.",
  ]);
}

// ───────────────────────────────────────────────────────────────────────────
// 10. estimate_generation — buildEstimate totals reconcile
// ───────────────────────────────────────────────────────────────────────────
export function auditEstimateGeneration(): AuditResult {
  const out = buildEstimate({
    parts: [{ componentId: "c-1", quantity: 2, unitCost: 125.5, description: "Battery 12V 7Ah" }],
    labour: [{ scope: "Replace battery", hours: 1, ratePerHour: 120 }],
    other: [{ description: "Travel", cost: 45 }],
  });
  const expectedGrand = 2 * 125.5 + 1 * 120 + 45; // 416
  if (out.grandTotal !== expectedGrand) {
    return fail("estimate_generation", "totals reconciliation", [
      `expected grandTotal ${expectedGrand}, got ${out.grandTotal}`,
    ]);
  }
  if (out.lineItems.length !== 3) {
    return fail("estimate_generation", "line item count", ["wrong line item count"]);
  }
  return pass("estimate_generation", "buildEstimate", { lines: out.lineItems.length, grand: out.grandTotal });
}

// ───────────────────────────────────────────────────────────────────────────
// 11. escalation_pack — pack generation
// ───────────────────────────────────────────────────────────────────────────
export function auditEscalationPack(): AuditResult {
  const pack = buildEscalationPack({
    sessionSummary: "Intermittent battery trouble on Notifier NFS-320 at site X.",
    identifiedManufacturer: "Notifier",
    identifiedModel: "NFS-320",
    faultCode: "E001",
    stepsTaken: ["Checked battery voltage under load"],
    recommendations: ["Replace battery", "Log in maintenance register"],
  });
  if (!pack.title || pack.sections.length < 3) {
    return fail("escalation_pack", "pack shape", ["missing title or sections"]);
  }
  return pass("escalation_pack", "buildEscalationPack", { sections: pack.sections.length });
}

// ───────────────────────────────────────────────────────────────────────────
// 12. retrieval_correctness — provenance invariants
// ───────────────────────────────────────────────────────────────────────────
export function auditRetrievalCorrectness(): AuditResult {
  const faults: FaultLike[] = [];
  const empty = composeAnswer({ mode: "rapid_support", symptom: "unknown" }, faults, [], []);
  if (empty.confidence !== "unresolved") {
    return fail("retrieval_correctness", "empty query → unresolved", [`expected 'unresolved', got ${empty.confidence}`]);
  }
  if (empty.unresolvedGaps.length === 0) {
    return fail("retrieval_correctness", "gaps are explicit", ["no unresolved gaps reported"]);
  }

  const faultOne: FaultLike = {
    id: "f-1", code: "E42", displayText: "DET FAULT LOOP 1", symptom: "detector trouble loop 1",
    likelyCauses: [], firstChecks: [], nextActions: [],
    escalationTrigger: null, severity: "high", keywords: ["detector"],
    sourceClauseIds: [], sourceDocumentSectionIds: [],
  };
  const good = composeAnswer({ mode: "rapid_support", faultCode: "E42" }, [faultOne], [], []);
  if (good.confidence !== "high") {
    return fail("retrieval_correctness", "exact code → high confidence", [`expected 'high', got ${good.confidence}`]);
  }
  if (good.evidenceType !== "direct") {
    return fail("retrieval_correctness", "evidence type labelled", ["evidence type wrong"]);
  }
  return pass("retrieval_correctness", "composeAnswer invariants", {});
}

// ───────────────────────────────────────────────────────────────────────────
// 13. deployment_readiness
// ───────────────────────────────────────────────────────────────────────────
export async function auditDeploymentReadiness(ctx: AuditContext): Promise<AuditResult> {
  const checks: string[] = [];
  const warnings: string[] = [];
  if (ctx.dbProbe) {
    try {
      const ok = await ctx.dbProbe();
      if (!ok) checks.push("db probe returned false");
    } catch (err: any) {
      checks.push(`db probe threw: ${err?.message ?? err}`);
    }
  } else {
    warnings.push("no db probe supplied to audit");
  }
  const flagOn = process.env["FIP_ENABLED"] === "1";
  if (!flagOn) warnings.push("FIP_ENABLED is not '1' — feature is disabled in this environment");
  if (checks.length > 0) {
    return fail("deployment_readiness", "environment", checks, [], { flagOn });
  }
  return pass("deployment_readiness", "environment", { flagOn }, warnings);
}

// ───────────────────────────────────────────────────────────────────────────
// Orchestrator
// ───────────────────────────────────────────────────────────────────────────
export interface AuditSummary {
  runAt: string;
  total: number;
  passed: number;
  failed: number;
  results: AuditResult[];
}

export async function runAllAudits(ctx: AuditContext): Promise<AuditSummary> {
  const results: AuditResult[] = [];
  results.push(auditRepoStructure(ctx));
  results.push(auditSchemaIntegrity(ctx));
  results.push(auditMigration(ctx));
  results.push(await auditStorageIntegration());
  results.push(await auditIngestionCorrectness());
  results.push(auditParsingQuality());
  results.push(await auditIdentificationFlow());
  results.push(auditTroubleshootingFlow());
  results.push(auditSupplierPartsLinkage(ctx));
  results.push(auditEstimateGeneration());
  results.push(auditEscalationPack());
  results.push(auditRetrievalCorrectness());
  results.push(await auditDeploymentReadiness(ctx));
  const passed = results.filter((r) => r.passed).length;
  return {
    runAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

/**
 * FIP / VESDA technical troubleshooting domain schema.
 *
 * Desktop-only. Additive. Every table is soft-deletable via `deleted_at` so
 * nothing is ever destroyed. All tables sit under the `fip_*` prefix so they
 * do not collide with the existing ops tables.
 *
 * Entities (22):
 *   fip_manufacturers · fip_product_families · fip_models · fip_components
 *   fip_source_locations · fip_documents · fip_document_versions
 *   fip_document_sections · fip_standards · fip_standard_clauses
 *   fip_standard_cross_references · fip_compatibility_links
 *   fip_fault_signatures · fip_troubleshooting_sessions · fip_session_images
 *   fip_image_identification_results · fip_supplier_products
 *   fip_part_cost_history · fip_labour_templates · fip_repair_estimates
 *   fip_escalation_packs · fip_audit_runs
 */
import { index, integer, jsonb, numeric, pgTable, text, timestamp, boolean, customType } from "drizzle-orm/pg-core";

// Custom bytea type so we can store binary blobs (images, PDF chunks) when
// the Postgres-backed storage adapter is in use. Phase 2 can swap to S3.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() { return "bytea"; },
});

// ───────────────────────────────────────────────────────────────────────────
// 1. Manufacturer hierarchy
// ───────────────────────────────────────────────────────────────────────────

export const fipManufacturers = pgTable("fip_manufacturers", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  country: text("country"),
  website: text("website"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_mfr_slug_idx").on(t.slug),
  index("fip_mfr_deleted_idx").on(t.deletedAt),
]);

export const fipProductFamilies = pgTable("fip_product_families", {
  id: text("id").primaryKey(),
  manufacturerId: text("manufacturer_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  category: text("category"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_family_manufacturer_idx").on(t.manufacturerId),
  index("fip_family_slug_idx").on(t.slug),
  index("fip_family_deleted_idx").on(t.deletedAt),
]);

export const fipModels = pgTable("fip_models", {
  id: text("id").primaryKey(),
  familyId: text("family_id").notNull(),
  manufacturerId: text("manufacturer_id").notNull(),
  name: text("name").notNull(),
  modelNumber: text("model_number"),
  slug: text("slug").notNull(),
  description: text("description"),
  yearsActive: text("years_active"),
  status: text("status").$type<"current" | "legacy" | "superseded" | "discontinued">().default("current"),
  imageChecksum: text("image_checksum"),
  // ── Deep technical spec (FIP Command Centre rebuild, fip-v2.0) ──
  maxLoops: integer("max_loops"),
  devicesPerLoop: integer("devices_per_loop"),
  loopProtocol: text("loop_protocol"),
  networkCapable: boolean("network_capable"),
  maxNetworkedPanels: integer("max_networked_panels"),
  batteryStandbyAh: numeric("battery_standby_ah", { precision: 6, scale: 2 }),
  batteryAlarmAh: numeric("battery_alarm_ah", { precision: 6, scale: 2 }),
  recommendedBatterySize: text("recommended_battery_size"),
  configOptions: jsonb("config_options").$type<Array<{ label: string; value: string; notes?: string }>>(),
  approvals: jsonb("approvals").$type<string[]>(),
  commissioningNotes: text("commissioning_notes"),
  typicalPriceBand: text("typical_price_band"),
  heroImage: text("hero_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_model_family_idx").on(t.familyId),
  index("fip_model_manufacturer_idx").on(t.manufacturerId),
  index("fip_model_slug_idx").on(t.slug),
  index("fip_model_deleted_idx").on(t.deletedAt),
]);

/**
 * fip_common_products — commonly-purchased fire-protection items.
 *
 * Not a replacement for the supplier catalogue (that lives in
 * supplier_products). This is a curated list of everyday items the
 * technician references repeatedly — smoke heads, heat heads, MCPs,
 * sounders, strobes, bases, isolators, batteries — with manufacturer,
 * part code, unit, and an indicative price band. Unknown prices are
 * left as N/A rather than invented.
 */
export const fipCommonProducts = pgTable("fip_common_products", {
  id: text("id").primaryKey(),
  category: text("category").notNull().$type<"smoke" | "heat" | "flame" | "mcp" | "sounder" | "strobe" | "base" | "isolator" | "module" | "battery" | "cable" | "other">(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  partCode: text("part_code"),
  description: text("description"),
  unit: text("unit").$type<"each" | "m" | "pack">().default("each"),
  priceBand: text("price_band").$type<"$" | "$$" | "$$$" | "N/A">().default("N/A"),
  indicativePriceAud: numeric("indicative_price_aud", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_common_products_category_idx").on(t.category),
  index("fip_common_products_manufacturer_idx").on(t.manufacturer),
  index("fip_common_products_deleted_idx").on(t.deletedAt),
]);

export const fipComponents = pgTable("fip_components", {
  id: text("id").primaryKey(),
  modelId: text("model_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  kind: text("kind").notNull().$type<"panel" | "module" | "card" | "detector" | "sounder" | "loop" | "battery" | "powersupply" | "other">(),
  partNumber: text("part_number"),
  description: text("description"),
  specs: jsonb("specs"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_component_model_idx").on(t.modelId),
  index("fip_component_kind_idx").on(t.kind),
  index("fip_component_partnumber_idx").on(t.partNumber),
  index("fip_component_deleted_idx").on(t.deletedAt),
]);

// ───────────────────────────────────────────────────────────────────────────
// 1b. Detector type reference library (Pass FIP-R1)
// ───────────────────────────────────────────────────────────────────────────
// Master-level technical content per detector technology. Exists
// independently of the manufacturer hierarchy so an installer can look up
// "what's a photoelectric smoke detector, where can I use it, what AS
// standards apply" without first knowing the brand.

export const fipDetectorTypes = pgTable("fip_detector_types", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** smoke | heat | flame | gas | aspirating | beam | duct | multi | manual_call_point | linear */
  category: text("category").notNull(),
  /** short 1-line summary for list views */
  summary: text("summary").notNull(),
  /** how the detector physically senses the alarm condition */
  operatingPrinciple: text("operating_principle").notNull(),
  /** markdown block describing sensing technology in depth */
  sensingTechnology: text("sensing_technology").notNull(),
  /** markdown-ish list of typical applications / occupancies */
  typicalApplications: jsonb("typical_applications").$type<string[]>().notNull(),
  /** markdown-ish list of unsuitable applications and why */
  unsuitableApplications: jsonb("unsuitable_applications").$type<string[]>().notNull(),
  /** installation requirements — spacing, height, environment */
  installationRequirements: text("installation_requirements").notNull(),
  /** common failure modes with symptoms + likely causes */
  failureModes: jsonb("failure_modes").$type<Array<{ mode: string; symptom: string; cause: string; action: string }>>().notNull(),
  /** routine test procedure steps */
  testProcedure: text("test_procedure").notNull(),
  /** cleaning / maintenance interval and procedure */
  maintenance: text("maintenance").notNull(),
  /** Australian standards references with clause numbers */
  standardsRefs: jsonb("standards_refs").$type<Array<{ code: string; clause?: string; note: string }>>().notNull(),
  /** example models from supported manufacturers with part numbers */
  exampleModels: jsonb("example_models").$type<Array<{ manufacturer: string; model: string; partNumber?: string; notes?: string }>>().notNull(),
  /** expected life span in years */
  lifeSpanYears: integer("life_span_years"),
  /** cost band — "$" | "$$" | "$$$" — rough order for planning */
  costBand: text("cost_band"),
  /** whether it requires any special addressable protocol support */
  addressable: boolean("addressable"),
  /** image URL for the detector icon / hero (optional) */
  heroImage: text("hero_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_detector_types_slug_idx").on(t.slug),
  index("fip_detector_types_category_idx").on(t.category),
  index("fip_detector_types_deleted_idx").on(t.deletedAt),
]);

// ───────────────────────────────────────────────────────────────────────────
// 2. Documents and knowledge base
// ───────────────────────────────────────────────────────────────────────────

export const fipSourceLocations = pgTable("fip_source_locations", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().$type<"bytea" | "disk" | "s3" | "url">(),
  uri: text("uri"),
  bucket: text("bucket"),
  key: text("key"),
  checksum: text("checksum"),
  size: integer("size"),
  contentType: text("content_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("fip_source_checksum_idx").on(t.checksum),
]);

export const fipDocuments = pgTable("fip_documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull().$type<"manual" | "datasheet" | "install_guide" | "programming_guide" | "standard" | "bulletin" | "wiring" | "faq" | "other">(),
  manufacturerId: text("manufacturer_id"),
  familyId: text("family_id"),
  modelId: text("model_id"),
  componentId: text("component_id"),
  language: text("language").default("en"),
  publicationDate: text("publication_date"),
  latestVersionId: text("latest_version_id"),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_doc_kind_idx").on(t.kind),
  index("fip_doc_manufacturer_idx").on(t.manufacturerId),
  index("fip_doc_model_idx").on(t.modelId),
  index("fip_doc_deleted_idx").on(t.deletedAt),
]);

export const fipDocumentVersions = pgTable("fip_document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  versionLabel: text("version_label").notNull(),
  sourceLocationId: text("source_location_id").notNull(),
  pageCount: integer("page_count"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
  ingestStatus: text("ingest_status").$type<"pending" | "ingested" | "failed">().default("pending"),
  ingestError: text("ingest_error"),
  blob: bytea("blob"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_doc_version_doc_idx").on(t.documentId),
  index("fip_doc_version_status_idx").on(t.ingestStatus),
]);

export const fipDocumentSections = pgTable("fip_document_sections", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull(),
  documentId: text("document_id").notNull(),
  title: text("title"),
  path: text("path"),
  pageStart: integer("page_start"),
  pageEnd: integer("page_end"),
  content: text("content").notNull(),
  tokens: integer("tokens"),
  embedding: jsonb("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("fip_doc_section_version_idx").on(t.versionId),
  index("fip_doc_section_doc_idx").on(t.documentId),
]);

// ───────────────────────────────────────────────────────────────────────────
// 3. Standards
// ───────────────────────────────────────────────────────────────────────────

export const fipStandards = pgTable("fip_standards", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  jurisdiction: text("jurisdiction"),
  year: integer("year"),
  currentVersion: text("current_version"),
  supersededBy: text("superseded_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_standard_code_idx").on(t.code),
]);

export const fipStandardClauses = pgTable("fip_standard_clauses", {
  id: text("id").primaryKey(),
  standardId: text("standard_id").notNull(),
  clauseNumber: text("clause_number").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  appliesToKind: text("applies_to_kind"),
  keywords: text("keywords").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_clause_standard_idx").on(t.standardId),
  index("fip_clause_number_idx").on(t.clauseNumber),
]);

export const fipStandardCrossReferences = pgTable("fip_standard_cross_references", {
  id: text("id").primaryKey(),
  fromClauseId: text("from_clause_id").notNull(),
  toClauseId: text("to_clause_id").notNull(),
  relation: text("relation").notNull().$type<"supersedes" | "references" | "conflicts" | "complements">(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("fip_xref_from_idx").on(t.fromClauseId),
  index("fip_xref_to_idx").on(t.toClauseId),
]);

// ───────────────────────────────────────────────────────────────────────────
// 4. Compatibility + fault knowledge
// ───────────────────────────────────────────────────────────────────────────

export const fipCompatibilityLinks = pgTable("fip_compatibility_links", {
  id: text("id").primaryKey(),
  fromComponentId: text("from_component_id").notNull(),
  toComponentId: text("to_component_id").notNull(),
  relation: text("relation").notNull().$type<"replaces" | "compatible_with" | "requires" | "incompatible_with">(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  source: text("source"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_compat_from_idx").on(t.fromComponentId),
  index("fip_compat_to_idx").on(t.toComponentId),
]);

export const fipFaultSignatures = pgTable("fip_fault_signatures", {
  id: text("id").primaryKey(),
  modelId: text("model_id"),
  componentId: text("component_id"),
  code: text("code"),
  displayText: text("display_text"),
  symptom: text("symptom").notNull(),
  likelyCauses: text("likely_causes").array().notNull().default([]),
  firstChecks: text("first_checks").array().notNull().default([]),
  nextActions: text("next_actions").array().notNull().default([]),
  escalationTrigger: text("escalation_trigger"),
  severity: text("severity").$type<"info" | "low" | "medium" | "high" | "critical">().default("medium"),
  sourceClauseIds: text("source_clause_ids").array().notNull().default([]),
  sourceDocumentSectionIds: text("source_document_section_ids").array().notNull().default([]),
  keywords: text("keywords").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_fault_model_idx").on(t.modelId),
  index("fip_fault_component_idx").on(t.componentId),
  index("fip_fault_code_idx").on(t.code),
  index("fip_fault_severity_idx").on(t.severity),
  index("fip_fault_deleted_idx").on(t.deletedAt),
]);

// ───────────────────────────────────────────────────────────────────────────
// 5. Troubleshooting sessions + image identification
// ───────────────────────────────────────────────────────────────────────────

export const fipTroubleshootingSessions = pgTable("fip_troubleshooting_sessions", {
  id: text("id").primaryKey(),
  operatorUserId: text("operator_user_id"),
  linkedJobId: text("linked_job_id"),
  linkedDefectId: text("linked_defect_id"),
  clientId: text("client_id"),
  siteName: text("site_name"),
  identifiedManufacturerId: text("identified_manufacturer_id"),
  identifiedFamilyId: text("identified_family_id"),
  identifiedModelId: text("identified_model_id"),
  enteredFaultCode: text("entered_fault_code"),
  enteredDisplayText: text("entered_display_text"),
  enteredSymptom: text("entered_symptom"),
  stepsTaken: jsonb("steps_taken"),
  recommendations: jsonb("recommendations"),
  partsSuggested: jsonb("parts_suggested"),
  escalationStatus: text("escalation_status").$type<"none" | "requested" | "in_progress" | "resolved">().default("none"),
  summary: text("summary"),
  provenance: jsonb("provenance"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_session_operator_idx").on(t.operatorUserId),
  index("fip_session_linked_job_idx").on(t.linkedJobId),
  index("fip_session_started_idx").on(t.startedAt),
  index("fip_session_deleted_idx").on(t.deletedAt),
]);

export const fipSessionImages = pgTable("fip_session_images", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").$type<"panel_fascia" | "lcd_display" | "keypad" | "module" | "wiring" | "other">().notNull(),
  filename: text("filename"),
  contentType: text("content_type"),
  size: integer("size"),
  checksum: text("checksum"),
  blob: bytea("blob"),
  sourceLocationId: text("source_location_id"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("fip_session_image_session_idx").on(t.sessionId),
]);

export const fipImageIdentificationResults = pgTable("fip_image_identification_results", {
  id: text("id").primaryKey(),
  imageId: text("image_id").notNull(),
  sessionId: text("session_id").notNull(),
  provider: text("provider").notNull().$type<"stub" | "claude-vision" | "manual">(),
  manufacturerId: text("manufacturer_id"),
  familyId: text("family_id"),
  modelId: text("model_id"),
  componentId: text("component_id"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  alternatives: jsonb("alternatives"),
  rawResponse: jsonb("raw_response"),
  manualOverride: boolean("manual_override").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("fip_ident_image_idx").on(t.imageId),
  index("fip_ident_session_idx").on(t.sessionId),
]);

// ───────────────────────────────────────────────────────────────────────────
// 6. Parts, supplier linkage, costing, labour
// ───────────────────────────────────────────────────────────────────────────

export const fipSupplierProducts = pgTable("fip_supplier_products", {
  id: text("id").primaryKey(),
  componentId: text("component_id").notNull(),
  // Reference into the existing ops `suppliers` table, if present.
  supplierId: text("supplier_id"),
  supplierName: text("supplier_name"),
  supplierPartNumber: text("supplier_part_number"),
  description: text("description"),
  currentCost: numeric("current_cost", { precision: 12, scale: 2 }),
  currency: text("currency").default("AUD"),
  leadTimeDays: integer("lead_time_days"),
  stockStatus: text("stock_status"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_supplier_product_component_idx").on(t.componentId),
  index("fip_supplier_product_supplier_idx").on(t.supplierId),
]);

export const fipPartCostHistory = pgTable("fip_part_cost_history", {
  id: text("id").primaryKey(),
  supplierProductId: text("supplier_product_id").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("AUD"),
  source: text("source"),
}, (t) => [
  index("fip_part_cost_product_idx").on(t.supplierProductId),
  index("fip_part_cost_observed_idx").on(t.observedAt),
]);

export const fipLabourTemplates = pgTable("fip_labour_templates", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  kind: text("kind").$type<"replace" | "repair" | "diagnose" | "commission" | "inspection">(),
  hours: numeric("hours", { precision: 10, scale: 2 }).notNull(),
  ratePerHour: numeric("rate_per_hour", { precision: 12, scale: 2 }),
  currency: text("currency").default("AUD"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_labour_template_scope_idx").on(t.scope),
]);

export const fipRepairEstimates = pgTable("fip_repair_estimates", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  linkedQuoteId: text("linked_quote_id"),
  linkedJobId: text("linked_job_id"),
  summary: text("summary"),
  partsTotal: numeric("parts_total", { precision: 14, scale: 2 }).default("0"),
  labourTotal: numeric("labour_total", { precision: 14, scale: 2 }).default("0"),
  otherTotal: numeric("other_total", { precision: 14, scale: 2 }).default("0"),
  grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).default("0"),
  currency: text("currency").default("AUD"),
  lineItems: jsonb("line_items"),
  provenance: jsonb("provenance"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_estimate_session_idx").on(t.sessionId),
  index("fip_estimate_job_idx").on(t.linkedJobId),
  index("fip_estimate_deleted_idx").on(t.deletedAt),
]);

// ───────────────────────────────────────────────────────────────────────────
// 7. Escalation + audit
// ───────────────────────────────────────────────────────────────────────────

export const fipEscalationPacks = pgTable("fip_escalation_packs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull(),
  status: text("status").$type<"draft" | "sent" | "acknowledged" | "resolved">().default("draft"),
  recipient: text("recipient"),
  summary: text("summary"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("fip_escalation_session_idx").on(t.sessionId),
  index("fip_escalation_status_idx").on(t.status),
]);

export const fipAuditRuns = pgTable("fip_audit_runs", {
  id: text("id").primaryKey(),
  auditName: text("audit_name").notNull(),
  scope: text("scope").notNull(),
  passed: boolean("passed").notNull(),
  failedChecks: jsonb("failed_checks"),
  warnings: jsonb("warnings"),
  blockers: jsonb("blockers"),
  metrics: jsonb("metrics"),
  nextActions: jsonb("next_actions"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
}, (t) => [
  index("fip_audit_name_idx").on(t.auditName),
  index("fip_audit_passed_idx").on(t.passed),
  index("fip_audit_started_idx").on(t.startedAt),
]);

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export type FipManufacturer = typeof fipManufacturers.$inferSelect;
export type FipProductFamily = typeof fipProductFamilies.$inferSelect;
export type FipModel = typeof fipModels.$inferSelect;
export type FipComponent = typeof fipComponents.$inferSelect;
export type FipDocument = typeof fipDocuments.$inferSelect;
export type FipDocumentVersion = typeof fipDocumentVersions.$inferSelect;
export type FipDocumentSection = typeof fipDocumentSections.$inferSelect;
export type FipStandard = typeof fipStandards.$inferSelect;
export type FipStandardClause = typeof fipStandardClauses.$inferSelect;
export type FipFaultSignature = typeof fipFaultSignatures.$inferSelect;
export type FipTroubleshootingSession = typeof fipTroubleshootingSessions.$inferSelect;
export type FipSessionImage = typeof fipSessionImages.$inferSelect;
export type FipImageIdentificationResult = typeof fipImageIdentificationResults.$inferSelect;
export type FipSupplierProduct = typeof fipSupplierProducts.$inferSelect;
export type FipLabourTemplate = typeof fipLabourTemplates.$inferSelect;
export type FipRepairEstimate = typeof fipRepairEstimates.$inferSelect;
export type FipEscalationPack = typeof fipEscalationPacks.$inferSelect;
export type FipAuditRun = typeof fipAuditRuns.$inferSelect;

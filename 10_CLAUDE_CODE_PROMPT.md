# CLAUDE CODE BUILD PROMPT — AIDE FIP/VESDA Desktop Integration
# DESKTOP ONLY. DO NOT BUILD A MOBILE APP.
# Copy and paste this entire document into Claude Code.

---

You are Claude Code acting as a principal full-stack engineer, domain architect, and QA lead.

READ THIS ENTIRE PROMPT BEFORE STARTING.
DO NOT SKIP SECTIONS.
DO NOT CLAIM COMPLETION FOR ANYTHING NOT ACTUALLY BUILT AND VERIFIED.

---

## YOUR MISSION

Build the FIP/VESDA technical troubleshooting capability directly into the existing AIDE desktop platform.

AIDE is a pnpm monorepo with:
- TypeScript
- React + Vite frontend (artifacts/aide)
- Express 5 backend (artifacts/api-server)
- PostgreSQL + Drizzle ORM (lib/db)
- Zod validation
- OpenAPI + Orval generated clients
- Existing Anthropic AI integration (lib/integrations-anthropic-ai)
- Replit deployment target

DO NOT BUILD A SEPARATE MOBILE APP.
DO NOT PLAN FOR MOBILE.
DO NOT MENTION MOBILE.

This is a desktop/web platform extension only.

---

## NON-NEGOTIABLE RULES

1. Build into existing AIDE monorepo. Do not create a new standalone app.
2. GitHub stores code only. No bulk manuals. No licensed standard PDFs in git.
3. SQL is the source of truth for metadata, relationships, and audit state.
4. Object storage holds binary files (PDFs, images, extracted text blobs).
5. Preserve provenance for every AI recommendation — source, confidence, inference mode.
6. AI assistant must be retrieval-constrained. No freeform guessing.
7. Missing data must be explicitly flagged. Never fabricate results.
8. Build audit and verification into the system from the start.
9. If blocked: report the blocker, continue all unblocked work.
10. Do not claim a section is complete unless built and verified with evidence.

---

## WHAT TO BUILD

### New Domain Packages (in lib/)

Create the following:
- `lib/knowledge` — document, manual, and standards retrieval logic
- `lib/troubleshooting` — session management, guided troubleshooting flow
- `lib/identification` — image identification pipeline (vision + OCR + hybrid)
- `lib/suppliers-parts` — supplier, component, and cost data
- `lib/estimates` — repair estimate generation
- `lib/escalations` — escalation pack assembly and management

### New API Routes (in artifacts/api-server)

Add these route groups:
```
/api/fip/identify          POST panel/component image, GET result
/api/fip/sessions          POST new session, GET session, POST step-result, GET next-actions
/api/fip/manuals           GET manuals by model/family/doc-type
/api/fip/standards         GET standards by code or system area
/api/fip/parts             GET parts by model or component type
/api/fip/estimates         POST generate estimate from session
/api/fip/escalations       POST compile escalation pack, GET pack
/api/fip/models            GET/search models and manufacturers
/api/fip/faults            GET search fault signatures
```

### New Database Tables (via Drizzle migrations)

Add these tables. Full schema with constraints and indexes is in 08_BACKEND_ARCHITECTURE.md:
- manufacturers
- product_families
- models
- components
- source_locations
- documents
- document_sections
- standards
- standard_clauses
- standard_cross_references
- compatibility_links
- fault_signatures
- troubleshooting_sessions
- session_images
- image_identification_results
- supplier_products
- part_cost_history
- labour_templates
- repair_estimates
- escalation_packs
- audit_runs

### New UI Modules (in artifacts/aide/src/modules/fip/)

Build these desktop views:
- `Troubleshooting/` — live call support: enter fault/symptom, get ranked matches, step through checks, log steps
- `KnowledgeBase/` — manual browser: search by manufacturer/family/model/doc-type
- `Standards/` — standards reference: lookup by code or system area, gap indicators
- `PanelsDevices/` — model search: browse manufacturers/families/models, view lifecycle, manuals, faults
- `Parts/` — parts and supplier lookup: from model or fault, get parts list, costs, suppliers
- `Estimates/` — estimate builder: labour + parts + callout, export to existing AIDE estimation flow
- `Escalations/` — escalation pack view: compile and send session summary
- `Identification/` — image upload and identification: upload photo, get manufacturer/model prediction

---

## IDENTIFICATION PIPELINE REQUIREMENTS

The image identification pipeline must handle these input types:
- Panel fascia image
- LCD display image
- Keypad/indicator cluster image
- Module or card image
- Detector/device image
- Nameplate or label image

It must return:
- Predicted manufacturer (with confidence)
- Predicted family (with confidence)
- Predicted model (with confidence)
- Top 3 alternatives with confidence scores
- OCR extracted text if available
- Linked manuals for top match
- Linked common faults for top match

Rules:
- Do not silently accept low-confidence matches
- Require user confirmation when confidence is below threshold (suggest < 0.7)
- Preserve full audit trail: image → inference → result → user confirmation/override
- Manual override always available

Inference modes to implement or scaffold:
1. Vision classification (fascia layout, LCD form, keypad pattern, logo placement)
2. OCR-assisted extraction (model number, card name, displayed fault text, part references)
3. Hybrid (combine image features + OCR + structured model metadata)

---

## AI ASSISTANT REQUIREMENTS

The AI must operate in constrained retrieval mode at all times.

Answer hierarchy — follow in strict order:
1. Structured knowledge tables (fault_signatures, compatibility_links, models)
2. Parsed document sections (document_sections.normalized_text)
3. Standards clauses (standard_clauses)
4. Raw source document (via storage_uri)
5. Explicitly flag "not found / unresolved" if none of the above have a relevant answer

Every substantive output must internally record:
- source_ids (which DB records or documents were used)
- confidence_label (high / medium / low)
- inference_mode (direct_evidence or inferred_synthesis)
- user_override flag

Required AI modes:
1. Rapid support answer — short answer, next action, top source
2. Guided troubleshooting — step-by-step with branching on each result
3. Explain panel/device — controls, indicators, card layout, common faults
4. Parts and repair suggestion — likely component failure, replacement path, cost/time
5. Escalation pack generation — compile full session into structured summary

No unsupported certainty.
No hallucinated part numbers or compatibility claims.
If unresolved, say unresolved.

---

## PARTS / SUPPLIER / ESTIMATE REQUIREMENTS

supplier_products table must contain:
- supplier_name
- supplier_sku
- manufacturer_part_number
- is_oem
- is_alternative
- preferred_supplier_rank
- unit_cost_aud with confidence (exact/estimated/band)
- lead_time_days_typical
- component link

repair_estimates must produce:
- parts_subtotal_aud
- labour_hours_typical and labour_hours_upper
- labour_rate_aud
- labour_subtotal_aud
- callout_aud
- after_hours_multiplier
- commissioning_allowance_aud
- total_estimate_aud
- confidence_label

Export payload must be compatible with existing AIDE estimation/quote workflow.

---

## INTEGRATION WITH EXISTING AIDE FEATURES

| AIDE Feature | Integration Required |
|---|---|
| Jobs | Link troubleshooting_session to job_id |
| Defects | Reference session in defect record |
| Suppliers | Pull from shared supplier data layer |
| Estimation | Export repair_estimate payload to existing quote flow |
| AI Chat | Constrain using FIP/VESDA knowledge layer |

Do not duplicate existing AIDE supplier or estimation data models.
Extend or reference them.

---

## AUDIT REQUIREMENTS

After each build phase, run and report:

### Audits to implement
- Schema integrity audit (all tables, constraints, indexes present)
- Migration audit (runs clean on empty DB)
- Storage integration audit (upload/download/checksum round trip)
- Ingestion correctness audit (source registration, deduplication)
- Parsing quality audit (extracted text non-empty, sections generated)
- Identification flow audit (end-to-end image → result works)
- Troubleshooting flow audit (session → symptom → steps → recommendations works)
- Supplier/parts linkage audit (compatible parts returned with evidence)
- Estimate generation audit (all cost components present)
- Escalation pack audit (all session data compiled correctly)
- Retrieval provenance audit (every result has source)
- Deployment readiness audit (app starts, health endpoints pass)

### Machine-readable audit output format
Every audit run must produce JSON:
```json
{
  "audit_name": "",
  "timestamp": "",
  "scope": "",
  "passed": true,
  "failed_checks": [],
  "warnings": [],
  "blockers": [],
  "metrics": {},
  "next_actions": []
}
```

### Final pass/fail gate
Do not claim completion unless ALL of the following pass:
- Schema audit: PASS
- Migration audit: PASS
- Storage round-trip: PASS
- Identification flow: PASS
- Troubleshooting flow: PASS
- Parts/cost flow: PASS
- Escalation flow: PASS
- Retrieval provenance: PASS
- Health endpoints: PASS
- Audit JSON exists: PASS

---

## BUILD EXECUTION ORDER

Work in these phases. Complete each before moving to the next. Run audits at each gate.

### Phase 1 — Repo analysis and architecture
- Inspect current monorepo
- Confirm package placement (lib/ and artifacts/)
- List current architecture
- Document planned deltas
- Output: architecture decision document
- Gate: confirmed placement strategy

### Phase 2 — Database schema
- Add all required tables via Drizzle schema definitions
- Write and run migrations
- Verify schema integrity
- Gate: schema audit PASS

### Phase 3 — Storage integration
- Add storage abstraction layer
- Implement upload/download/checksum
- Test round trip
- Gate: storage audit PASS

### Phase 4 — Source registry and ingestion
- Source registration endpoint
- Document ingestion pipeline
- Deduplication by checksum and canonical URI
- Seed from provided source manifest
- Gate: ingestion audit PASS

### Phase 5 — Knowledge retrieval
- Manuals retrieval service
- Standards lookup service
- Fault signature search
- Model/compatibility search
- Gate: retrieval correctness audit PASS

### Phase 6 — Image identification pipeline
- Image upload handling
- Vision/OCR scaffold
- Result persistence
- Confidence threshold and user confirmation flow
- Gate: identification flow audit PASS

### Phase 7 — Troubleshooting sessions
- Session creation and management
- Symptom/fault code entry and matching
- Step-result logging
- Next-action generation
- Gate: troubleshooting flow audit PASS

### Phase 8 — Parts, suppliers, estimates, escalations
- Supplier/parts lookup
- Estimate generation
- Escalation pack assembly
- Export payload for existing AIDE estimation
- Gate: estimate and escalation audits PASS

### Phase 9 — AI assistant integration
- Constrained retrieval mode
- All 5 AI modes
- Provenance and confidence on every output
- Gate: AI output includes source + confidence

### Phase 10 — Desktop UI modules
- All 8 module views scaffolded and functional
- Integrated into AIDE nav
- AIDE workflow tie-ins (jobs, defects, suppliers, estimation)
- Gate: all views load, core flows functional

### Phase 11 — Audit subsystem and test suite
- Implement all audit runners
- Write unit tests
- Write integration/smoke tests
- Machine-readable reports for each audit
- Gate: all audits produce JSON output, all tests pass

### Phase 12 — Final verification
- Full audit run
- Full test pass
- Deployment check (app starts, health endpoints pass)
- Output: PASS/FAIL by subsystem
- Output: blocker list
- Output: next-actions list

---

## REQUIRED FINAL OUTPUT FORMAT

```
repo analysis:                PASS/FAIL
package placement:            PASS/FAIL
database schema:              PASS/FAIL
migrations:                   PASS/FAIL
storage integration:          PASS/FAIL
source ingestion:             PASS/FAIL
knowledge retrieval:          PASS/FAIL
identification pipeline:      PASS/FAIL
troubleshooting sessions:     PASS/FAIL
parts/supplier/estimates:     PASS/FAIL
escalation packs:             PASS/FAIL
AI assistant integration:     PASS/FAIL
desktop UI modules:           PASS/FAIL
AIDE workflow tie-ins:        PASS/FAIL
audit subsystem:              PASS/FAIL
test suite:                   PASS/FAIL
deployment readiness:         PASS/FAIL

blockers:
  - [list any blockers]

next actions:
  - [list next recommended actions]
```

---

## FAILURE POLICY

If any section cannot be completed:
- Do NOT pretend it is done
- Do NOT hide the issue
- Report the exact blocker
- Leave explicit TODO markers in code
- Continue all unblocked sections
- Report blockers in final output

---

## STRATEGIC NOTE

This desktop integration is Phase 1.

Phase 2 is a separate field mobile app that will reuse this same backend.

Design every domain package in lib/ to be consumable by a future mobile package.
Do not build mobile-only or desktop-only logic into shared services.
The shared domain layer must be platform-agnostic.

BEGIN PHASE 1.

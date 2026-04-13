# AIDE Desktop Integration — FIP/VESDA Troubleshooting Module
**Target:** Integrate directly into existing AIDE platform  
**Stack:** Existing pnpm monorepo (TypeScript / React / Express 5 / PostgreSQL / Drizzle)  
**Scope:** Desktop/web only — NO mobile app in this phase

---

## Objective

Make AIDE a superior desktop technical support tool for:
- Handling live incoming technician calls
- Identifying panels, modules, and devices from images
- Retrieving the right manual instantly
- Running guided troubleshooting
- Identifying likely failed parts and compatible replacements
- Generating labour/cost estimates
- Producing structured escalation packs
- Feeding results into existing jobs, defects, suppliers, and estimation workflows

This is the tool that makes you look like you know everything even when a tech is calling from an unfamiliar site with an old panel.

---

## AIDE Current Architecture Summary

```
artifacts/aide              → main frontend (React + Vite)
artifacts/api-server        → backend (Express 5)
lib/db                      → PostgreSQL + Drizzle ORM
lib/api-spec                → OpenAPI spec
lib/api-zod                 → generated/shared Zod validation
lib/api-client-react        → generated React API client
lib/integrations-anthropic-ai → existing Anthropic AI layer
scripts/                    → data import/support scripts
```

---

## New Desktop Modules to Add

### 1. Troubleshooting
Core live-call support. Search by fault code, symptom, or display text.  
Returns: first checks, likely causes, next actions, escalation triggers.

### 2. Knowledge Base
Browse manuals and documents by manufacturer/family/model/component.  
Filter by doc type. Jump to relevant section where possible.

### 3. Standards Reference
Look up standards by system area (FIP, VESDA, EWIS, maintenance, etc.).  
Shows clause summary, gaps flagged, links to primary source.

### 4. Panels & Devices
Search/browse manufacturer and model database.  
Shows: lifecycle status, compatible components, related faults, linked manuals.

### 5. Parts & Suppliers
From a model or fault, get: likely replacement parts, compatible alternatives,  
supplier shortlist, cost band, lead time.

### 6. Technical Estimates
Generate repair scope from a session:  
Parts subtotal + labour hours + callout + commissioning.  
Export as payload to existing AIDE estimation/quote workflow.

### 7. Escalations
Compile session evidence into a structured escalation pack:  
Panel ID, images, fault, steps taken, parts suggested, estimate, standards context.  
Mark status: draft / sent / acknowledged / resolved.

---

## Required Desktop Capabilities

### A. Panel/Device Identification
- Upload photo of panel front (from desktop or pasted from email/Teams)
- Upload photo of LCD screen
- Upload photo of module/card or detector
- Upload photo of nameplate/label
- Inference returns: manufacturer, family, model, confidence, alternatives
- User confirms or manually overrides
- Audit trail kept

### B. Manual and Knowledge Retrieval
- Retrieve by manufacturer / family / model / component type
- Retrieve by doc type (install, service, troubleshooting, etc.)
- Show source, trust level, lifecycle status
- Deep-link to relevant section where parsed
- Show standards mapping for the selected system

### C. Guided Troubleshooting
- Enter: fault code, plain-language symptom, or LCD display text
- Returns: ranked fault signature matches
- For each: first checks, likely causes, next test actions
- Caution/isolation prompts where relevant
- Escalation trigger clearly flagged
- Log each step taken in the session

### D. AI Troubleshooting Assistant
Constrained retrieval mode — does not freewheel.  
Uses: structured tables → fault signatures → compatibility graph → manuals → standards  
Modes:
1. Rapid support answer (what is this fault, first action)
2. Guided troubleshooting (step-by-step with branch questions)
3. Explain this panel/device (controls, LEDs, card layout)
4. Parts and repair suggestion (what failed, what to replace, cost/time)
5. Escalation pack generation (compile full session for handoff)

Every output must show:
- Confidence label (high/medium/low)
- Source reference (which doc/table used)
- "Not found — unresolved" if no evidence exists

### E. Parts / Supplier / Cost / Labour
- From identified model + fault type → suggest likely failed component
- Show compatible replacement parts (OEM and alternatives)
- Show preferred suppliers in order
- Show indicative cost band (AUD)
- Show labour estimate (hours typical, upper)
- Auto-calculate total estimate band
- Export to existing AIDE estimation workflow

### F. Session and Escalation
Each troubleshooting session persists:
- Session ID, operator, linked job ID, linked site/customer
- Identified panel model + confidence
- Uploaded images
- Entered fault code / symptom / display text
- Steps taken (timestamped)
- Recommendations produced (with source)
- Parts suggested
- Estimate created
- Escalation status
- Full audit trail

### G. AIDE Integration Points
| AIDE Feature | Integration |
|---|---|
| Jobs | Link session to job ID |
| Defects | Reference troubleshooting session in defect record |
| Suppliers | Pull from shared supplier data |
| Estimation | Export estimate payload to existing quote workflow |
| AI Chat | Constrain existing AI with FIP/VESDA knowledge layer |
| Analytics | Session volume, escalation rate, resolution stats (later) |

---

## Implementation in Monorepo

### Package Placement

**New domain packages (in lib/):**
- `lib/knowledge` — document/standard/fault retrieval logic
- `lib/troubleshooting` — session management, guided flow
- `lib/identification` — image identification pipeline
- `lib/suppliers-parts` — supplier/component/cost data
- `lib/estimates` — repair estimate generation
- `lib/escalations` — escalation pack assembly

**New API routes (in artifacts/api-server):**
- `/api/fip/identify` — image identification
- `/api/fip/sessions` — troubleshooting sessions
- `/api/fip/manuals` — document/knowledge retrieval
- `/api/fip/standards` — standards lookup
- `/api/fip/parts` — parts/supplier lookup
- `/api/fip/estimates` — estimate generation
- `/api/fip/escalations` — escalation pack management
- `/api/fip/models` — panel/device model search
- `/api/fip/faults` — fault signature search

**New UI modules (in artifacts/aide/src):**
- `modules/fip/Troubleshooting/` — live call support view
- `modules/fip/KnowledgeBase/` — manual/doc browser
- `modules/fip/Standards/` — standards reference
- `modules/fip/PanelsDevices/` — model search/browser
- `modules/fip/Parts/` — parts and supplier lookup
- `modules/fip/Estimates/` — estimate builder
- `modules/fip/Escalations/` — escalation pack view
- `modules/fip/Identification/` — image upload + identification

**New DB tables (via Drizzle migrations):**
See `08_BACKEND_ARCHITECTURE.md` for full schema.  
Add via Drizzle migration: manufacturers, product_families, models, components,  
source_locations, documents, document_sections, standards, compatibility_links,  
fault_signatures, troubleshooting_sessions, session_images, image_identification_results,  
supplier_products, repair_estimates, escalation_packs, audit_runs.

---

## What Must Not Be Cut

Do not skip any of the following in the build:
- Provenance tracking on AI outputs (what source did it come from)
- Confidence labels on identification and troubleshooting answers
- Explicit "not found / unresolved" states — never fake a result
- Session persistence — every troubleshooting session saved
- Audit trail — who did what, when, with what result
- Desktop workflow tie-ins — jobs, defects, suppliers, estimates

---

## What Is Out of Scope (Phase 1)

- No separate mobile application
- No mobile UI package
- No offline sync model
- No field-specific workflows

These come in Phase 2 and will reuse this backend/domain layer directly.

# Backend Architecture — FIP/VESDA Knowledge System
**Target:** Replit runtime | PostgreSQL + Drizzle ORM | FastAPI or Express 5  
**Storage:** GitHub (code only) | Replit SQL (metadata) | Object storage (files)

---

## 1. Design Principles

- SQL is the source of truth for metadata, relationships, and audit state
- Object storage holds binaries (PDFs, images, extracted text)
- GitHub holds code only — no bulk manuals, no licensed standards PDFs
- Provenance preserved for every recommendation
- AI answers are retrieval-constrained, not freeform
- All ingestion is idempotent and auditable
- Missing data is explicitly flagged, never silently assumed

---

## 2. Database Schema

### manufacturers
```sql
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  country_region TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### product_families
```sql
CREATE TABLE product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  family_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'FIP','RFIP','ASD_VESDA','repeater','module','detector','sounder',
    'ancillary','PSU','charger','interface','software','other'
  )),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN (
    'current','legacy','EOL','unknown'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### models
```sql
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_family_id UUID NOT NULL REFERENCES product_families(id),
  model_name TEXT NOT NULL,
  variant_region TEXT,
  standards_context TEXT,
  successor_model_id UUID REFERENCES models(id),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN (
    'current','legacy','EOL','unknown'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### components
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id),
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN (
    'loop_card','network_card','NAC_module','relay_module','PSU',
    'charger','battery','sounder','sounder_base','detector','detector_base',
    'MCP','annunciator','repeater','display','interface_card',
    'ASE','brigade_interface','software','other'
  )),
  part_number TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'current',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### source_locations
```sql
CREATE TABLE source_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'manufacturer_index','pdf','product_page','support_hub',
    'manual_repository','forum','distributor_index','gated_vendor'
  )),
  source_domain TEXT,
  source_uri TEXT NOT NULL UNIQUE,
  canonical_uri TEXT,
  access_class TEXT NOT NULL CHECK (access_class IN (
    'public','gated_login','restricted','internal','unknown'
  )),
  trust_level TEXT NOT NULL CHECK (trust_level IN (
    'primary','primary_regional','authorised_distributor',
    'secondary_regional','secondary','manual_repository','forum'
  )),
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES manufacturers(id),
  product_family_id UUID REFERENCES product_families(id),
  model_id UUID REFERENCES models(id),
  source_location_id UUID NOT NULL REFERENCES source_locations(id),
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'install_commission','operator','programming','service_maintenance',
    'troubleshooting','compatibility_chart','parts_list','interface_doc',
    'EOL_notice','datasheet','application_guide','product_guide',
    'technical_tip','wiring_diagram','software_tool','other'
  )),
  document_number TEXT,
  revision_label TEXT,
  publication_date DATE,
  region_code TEXT DEFAULT 'AU',
  language_code TEXT DEFAULT 'en',
  lifecycle_status TEXT NOT NULL DEFAULT 'current',
  license_status TEXT NOT NULL CHECK (license_status IN (
    'public_redistributable','restricted_licensed','unknown','internal_only'
  )),
  redistributable BOOLEAN NOT NULL DEFAULT FALSE,
  checksum_sha256 TEXT,
  storage_uri TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  ingestion_status TEXT NOT NULL DEFAULT 'pending' CHECK (ingestion_status IN (
    'pending','in_progress','complete','failed','blocked','duplicate'
  )),
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN (
    'pending','in_progress','complete','failed','skipped'
  )),
  audit_status TEXT NOT NULL DEFAULT 'unaudited',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### document_sections
```sql
CREATE TABLE document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  parent_section_id UUID REFERENCES document_sections(id),
  section_type TEXT NOT NULL CHECK (section_type IN (
    'chapter','section','subsection','appendix','table',
    'figure','note','warning','caution','procedure','clause'
  )),
  heading TEXT,
  section_number TEXT,
  ordinal INT NOT NULL,
  raw_text TEXT,
  normalized_text TEXT,
  page_start INT,
  page_end INT,
  parse_confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### standards
```sql
CREATE TABLE standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_code TEXT NOT NULL,
  title TEXT NOT NULL,
  edition_year INT,
  category TEXT NOT NULL CHECK (category IN (
    'design_install_commissioning','maintenance_routine_service',
    'equipment_product_standard','special_hazards','ewis',
    'cross_system_interface','passive_fire','emergency_planning'
  )),
  primary_relevance TEXT NOT NULL,
  jurisdiction TEXT DEFAULT 'AU',
  source_location_id UUID REFERENCES source_locations(id),
  status_in_corpus TEXT NOT NULL CHECK (status_in_corpus IN (
    'found_direct_file','referenced_directly','referenced_only','suspected_missing'
  )),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN (
    'current','superseded','legacy_reference'
  )),
  license_status TEXT NOT NULL DEFAULT 'Standards Australia restricted reproduction',
  checksum_sha256 TEXT,
  storage_uri TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(standard_code, edition_year)
);
```

### compatibility_links
```sql
CREATE TABLE compatibility_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_model_id UUID REFERENCES models(id),
  source_component_id UUID REFERENCES components(id),
  target_model_id UUID REFERENCES models(id),
  target_component_id UUID REFERENCES components(id),
  compatibility_type TEXT NOT NULL CHECK (compatibility_type IN (
    'detector_to_panel','module_to_panel','device_to_base',
    'interface_to_panel','panel_to_panel','successor','ancillary_to_panel'
  )),
  evidence_document_id UUID REFERENCES documents(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### fault_signatures
```sql
CREATE TABLE fault_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES manufacturers(id),
  model_id UUID REFERENCES models(id),
  fault_code_or_label TEXT NOT NULL,
  fault_category TEXT NOT NULL CHECK (fault_category IN (
    'power_fail','ground_fault','loop_open','loop_short','device_missing',
    'duplicate_address','network_comms','NAC_fault','config_mismatch',
    'interface_fault','repeater_fault','battery_fail','charger_fail',
    'airflow_high','airflow_low','pipe_break','pipe_blockage',
    'filter_contamination','aspirator_fault','detector_chamber',
    'environmental_nuisance','test_mode','other'
  )),
  symptom_text TEXT NOT NULL,
  likely_causes TEXT,
  first_checks TEXT,
  escalation_path TEXT,
  evidence_document_id UUID REFERENCES documents(id),
  confidence_label TEXT NOT NULL CHECK (confidence_label IN (
    'high','medium','low','unconfirmed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### troubleshooting_sessions
```sql
CREATE TABLE troubleshooting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id TEXT NOT NULL,
  linked_job_id TEXT,
  linked_site_id TEXT,
  identified_manufacturer_id UUID REFERENCES manufacturers(id),
  identified_family_id UUID REFERENCES product_families(id),
  identified_model_id UUID REFERENCES models(id),
  identification_confidence_label TEXT,
  entered_fault_code TEXT,
  entered_symptom_text TEXT,
  entered_display_text TEXT,
  steps_taken JSONB DEFAULT '[]',
  recommendations_produced JSONB DEFAULT '[]',
  parts_suggested JSONB DEFAULT '[]',
  escalation_status TEXT NOT NULL DEFAULT 'open' CHECK (escalation_status IN (
    'open','escalated','resolved','abandoned'
  )),
  session_status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### session_images
```sql
CREATE TABLE session_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES troubleshooting_sessions(id),
  image_type TEXT NOT NULL CHECK (image_type IN (
    'panel_fascia','lcd_display','keypad_indicator','module_card',
    'detector_device','nameplate_label','other'
  )),
  storage_uri TEXT NOT NULL,
  checksum_sha256 TEXT,
  mime_type TEXT DEFAULT 'image/jpeg',
  file_size_bytes BIGINT,
  capture_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### image_identification_results
```sql
CREATE TABLE image_identification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES troubleshooting_sessions(id),
  image_id UUID REFERENCES session_images(id),
  top_manufacturer_id UUID REFERENCES manufacturers(id),
  top_family_id UUID REFERENCES product_families(id),
  top_model_id UUID REFERENCES models(id),
  confidence_score NUMERIC(5,4),
  confidence_label TEXT CHECK (confidence_label IN ('high','medium','low')),
  alternatives JSONB DEFAULT '[]',
  ocr_extracted_text TEXT,
  inference_mode TEXT CHECK (inference_mode IN (
    'vision_classification','ocr_assisted','hybrid','manual_override'
  )),
  user_confirmed BOOLEAN DEFAULT FALSE,
  user_override_model_id UUID REFERENCES models(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### supplier_products
```sql
CREATE TABLE supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  supplier_sku TEXT,
  manufacturer_id UUID REFERENCES manufacturers(id),
  component_id UUID REFERENCES components(id),
  product_name TEXT NOT NULL,
  manufacturer_part_number TEXT,
  is_oem BOOLEAN DEFAULT TRUE,
  is_alternative BOOLEAN DEFAULT FALSE,
  preferred_supplier_rank INT DEFAULT 3,
  unit_cost_aud NUMERIC(10,2),
  cost_confidence TEXT CHECK (cost_confidence IN ('exact','estimated','band')),
  lead_time_days_typical INT,
  available_au BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### repair_estimates
```sql
CREATE TABLE repair_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES troubleshooting_sessions(id),
  fault_type TEXT,
  component_type TEXT,
  access_complexity TEXT CHECK (access_complexity IN ('easy','moderate','difficult','extreme')),
  repair_action TEXT CHECK (repair_action IN (
    'reset','reconfigure','replace_component','replace_module',
    'replace_panel','isolate_and_monitor','recommission','other'
  )),
  parts_subtotal_aud NUMERIC(10,2),
  labour_hours_typical NUMERIC(5,2),
  labour_hours_upper NUMERIC(5,2),
  labour_rate_aud NUMERIC(8,2),
  labour_subtotal_aud NUMERIC(10,2),
  callout_aud NUMERIC(8,2),
  after_hours_multiplier NUMERIC(3,2) DEFAULT 1.0,
  commissioning_allowance_aud NUMERIC(8,2),
  total_estimate_aud NUMERIC(10,2),
  confidence_label TEXT CHECK (confidence_label IN ('high','medium','low','indicative_only')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### escalation_packs
```sql
CREATE TABLE escalation_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES troubleshooting_sessions(id),
  generated_by_user_id TEXT NOT NULL,
  identified_model_summary TEXT,
  fault_summary TEXT,
  tests_completed JSONB DEFAULT '[]',
  manuals_referenced JSONB DEFAULT '[]',
  parts_suggested JSONB DEFAULT '[]',
  estimate_id UUID REFERENCES repair_estimates(id),
  standards_context TEXT,
  recommended_next_action TEXT,
  escalation_status TEXT NOT NULL DEFAULT 'draft' CHECK (escalation_status IN (
    'draft','sent','acknowledged','resolved'
  )),
  pack_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### audit_runs
```sql
CREATE TABLE audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id UUID,
  status TEXT NOT NULL CHECK (status IN ('pending','running','passed','failed','partial')),
  findings_json JSONB NOT NULL DEFAULT '{}',
  severity_summary JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Required Indexes

```sql
CREATE INDEX idx_manufacturers_name ON manufacturers(name);
CREATE INDEX idx_product_families_manufacturer ON product_families(manufacturer_id);
CREATE INDEX idx_product_families_name ON product_families(family_name);
CREATE INDEX idx_models_family ON models(product_family_id);
CREATE INDEX idx_models_name ON models(model_name);
CREATE INDEX idx_models_lifecycle ON models(lifecycle_status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_number ON documents(document_number);
CREATE INDEX idx_documents_checksum ON documents(checksum_sha256);
CREATE INDEX idx_documents_ingestion ON documents(ingestion_status);
CREATE INDEX idx_documents_model ON documents(model_id);
CREATE INDEX idx_standards_code ON standards(standard_code);
CREATE INDEX idx_standards_category ON standards(category);
CREATE INDEX idx_fault_signatures_code ON fault_signatures(fault_code_or_label);
CREATE INDEX idx_fault_signatures_model ON fault_signatures(model_id);
CREATE INDEX idx_fault_signatures_category ON fault_signatures(fault_category);
CREATE INDEX idx_sessions_operator ON troubleshooting_sessions(operator_user_id);
CREATE INDEX idx_sessions_job ON troubleshooting_sessions(linked_job_id);
```

---

## 4. API Service Endpoints

### Health
```
GET /health
GET /health/database
GET /health/storage
```

### Source Registry
```
POST /api/sources/register
GET  /api/sources
GET  /api/sources/:id
POST /api/sources/:id/verify
```

### Documents
```
POST /api/documents/ingest
GET  /api/documents
GET  /api/documents/:id
GET  /api/documents/:id/sections
POST /api/documents/:id/reparse
```

### Standards
```
POST /api/standards/register
GET  /api/standards
GET  /api/standards/code/:code
GET  /api/standards/:id/clauses
GET  /api/standards/system-map/:system_area
```

### Models and Components
```
GET  /api/manufacturers
GET  /api/families
GET  /api/models/search?q=&manufacturer=&lifecycle=
GET  /api/models/:id
GET  /api/models/:id/manuals
GET  /api/models/:id/faults
GET  /api/models/:id/compatible-parts
GET  /api/components/search
GET  /api/compatibility/search
```

### Faults and Troubleshooting
```
GET  /api/faults/search?q=&manufacturer=&category=
GET  /api/faults/:id
POST /api/sessions
GET  /api/sessions/:id
POST /api/sessions/:id/symptom
POST /api/sessions/:id/step-result
GET  /api/sessions/:id/next-actions
POST /api/sessions/:id/estimate
POST /api/sessions/:id/escalate
GET  /api/escalations/:id
```

### Identification
```
POST /api/identify/panel
POST /api/identify/component
GET  /api/identify/result/:id
```

### Suppliers and Parts
```
GET  /api/parts/search?q=&model=&component_type=
GET  /api/suppliers
```

### Audit
```
POST /api/audit/run/schema
POST /api/audit/run/ingestion
POST /api/audit/run/retrieval
GET  /api/audit/runs
GET  /api/audit/runs/:id
```

---

## 5. Storage Layout

```
object-storage/
  documents/
    raw/{manufacturer}/{family}/{document_id}.pdf
    text/{document_id}.txt
    parsed/{document_id}.json
  standards/
    raw/{standard_code}/{edition}/{standard_id}.pdf
    text/{standard_id}.txt
    parsed/{standard_id}.json
  sessions/
    images/{session_id}/{image_id}.{ext}
    escalation_packs/{session_id}/{pack_id}.json
```

---

## 6. AI Answer Hierarchy

The AI must answer in this order. Do not skip to raw docs.

1. Structured knowledge tables (fault_signatures, compatibility_links, models)
2. Parsed document sections (document_sections with normalized_text)
3. Standards clauses (standard_clauses)
4. Raw document content (documents via storage_uri)
5. Explicitly flag if none of the above have an answer

Every substantive AI output must record internally:
- source_ids (which records/docs were used)
- confidence_label (high/medium/low)
- inference_mode (direct_evidence or inferred_synthesis)
- whether user overrode the suggestion

---

## 7. Replit Deployment Config

```
app/
  api/
    routes/
    middleware/
  services/
    identification/
    documents/
    standards/
    troubleshooting/
    suppliers/
    estimates/
    escalations/
    audit/
  db/
    schema/
    migrations/
    seed/
  storage/
  utils/
  tests/
scripts/
  seed_sources.ts
  seed_manufacturers.ts
  run_audit.ts
```

### Required Environment Variables
```
DATABASE_URL=
STORAGE_BUCKET=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
ANTHROPIC_API_KEY=
ADMIN_API_KEY=
APP_ENV=production
LOG_LEVEL=info
```

### No secrets in GitHub. No bulk binaries in GitHub.

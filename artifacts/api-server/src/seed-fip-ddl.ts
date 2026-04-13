/**
 * FIP / VESDA technical knowledge tables.
 *
 * The drizzle schema in lib/db/src/schema/fip.ts declares these 22 tables,
 * but they were never added to the committed migration SQL. Rather than
 * hand-writing a new drizzle migration + snapshot + journal (all of which
 * need to stay in sync for the drizzle migrator to work), we run a set of
 * `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` statements
 * at startup. This is strictly additive: if the tables already exist the
 * statements are no-ops; if they don't, they are created.
 *
 * No DROP, no ALTER, no TRUNCATE — ever.
 */

export const FIP_DDL_STATEMENTS: string[] = [
  // 1. Manufacturer hierarchy
  `CREATE TABLE IF NOT EXISTS fip_manufacturers (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    country text,
    website text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_mfr_slug_idx ON fip_manufacturers (slug)`,
  `CREATE INDEX IF NOT EXISTS fip_mfr_deleted_idx ON fip_manufacturers (deleted_at)`,

  `CREATE TABLE IF NOT EXISTS fip_product_families (
    id text PRIMARY KEY,
    manufacturer_id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_family_manufacturer_idx ON fip_product_families (manufacturer_id)`,
  `CREATE INDEX IF NOT EXISTS fip_family_slug_idx ON fip_product_families (slug)`,
  `CREATE INDEX IF NOT EXISTS fip_family_deleted_idx ON fip_product_families (deleted_at)`,

  `CREATE TABLE IF NOT EXISTS fip_models (
    id text PRIMARY KEY,
    family_id text NOT NULL,
    manufacturer_id text NOT NULL,
    name text NOT NULL,
    model_number text,
    slug text NOT NULL,
    description text,
    years_active text,
    status text DEFAULT 'current',
    image_checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_model_family_idx ON fip_models (family_id)`,
  `CREATE INDEX IF NOT EXISTS fip_model_manufacturer_idx ON fip_models (manufacturer_id)`,
  `CREATE INDEX IF NOT EXISTS fip_model_slug_idx ON fip_models (slug)`,
  `CREATE INDEX IF NOT EXISTS fip_model_deleted_idx ON fip_models (deleted_at)`,

  `CREATE TABLE IF NOT EXISTS fip_components (
    id text PRIMARY KEY,
    model_id text,
    name text NOT NULL,
    slug text NOT NULL,
    kind text NOT NULL,
    part_number text,
    description text,
    specs jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_component_model_idx ON fip_components (model_id)`,
  `CREATE INDEX IF NOT EXISTS fip_component_kind_idx ON fip_components (kind)`,
  `CREATE INDEX IF NOT EXISTS fip_component_partnumber_idx ON fip_components (part_number)`,
  `CREATE INDEX IF NOT EXISTS fip_component_deleted_idx ON fip_components (deleted_at)`,

  // 2. Documents and knowledge base
  `CREATE TABLE IF NOT EXISTS fip_source_locations (
    id text PRIMARY KEY,
    kind text NOT NULL,
    uri text,
    bucket text,
    key text,
    checksum text,
    size integer,
    content_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS fip_source_checksum_idx ON fip_source_locations (checksum)`,

  `CREATE TABLE IF NOT EXISTS fip_documents (
    id text PRIMARY KEY,
    title text NOT NULL,
    kind text NOT NULL,
    manufacturer_id text,
    family_id text,
    model_id text,
    component_id text,
    language text DEFAULT 'en',
    publication_date text,
    latest_version_id text,
    tags text[] DEFAULT '{}' NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_doc_kind_idx ON fip_documents (kind)`,
  `CREATE INDEX IF NOT EXISTS fip_doc_manufacturer_idx ON fip_documents (manufacturer_id)`,
  `CREATE INDEX IF NOT EXISTS fip_doc_model_idx ON fip_documents (model_id)`,
  `CREATE INDEX IF NOT EXISTS fip_doc_deleted_idx ON fip_documents (deleted_at)`,

  `CREATE TABLE IF NOT EXISTS fip_document_versions (
    id text PRIMARY KEY,
    document_id text NOT NULL,
    version_label text NOT NULL,
    source_location_id text NOT NULL,
    page_count integer,
    ingested_at timestamp with time zone DEFAULT now() NOT NULL,
    ingest_status text DEFAULT 'pending',
    ingest_error text,
    blob bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_doc_version_doc_idx ON fip_document_versions (document_id)`,
  `CREATE INDEX IF NOT EXISTS fip_doc_version_status_idx ON fip_document_versions (ingest_status)`,

  `CREATE TABLE IF NOT EXISTS fip_document_sections (
    id text PRIMARY KEY,
    version_id text NOT NULL,
    document_id text NOT NULL,
    title text,
    path text,
    page_start integer,
    page_end integer,
    content text NOT NULL,
    tokens integer,
    embedding jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS fip_doc_section_version_idx ON fip_document_sections (version_id)`,
  `CREATE INDEX IF NOT EXISTS fip_doc_section_doc_idx ON fip_document_sections (document_id)`,

  // 3. Standards
  `CREATE TABLE IF NOT EXISTS fip_standards (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    title text NOT NULL,
    jurisdiction text,
    year integer,
    current_version text,
    superseded_by text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_standard_code_idx ON fip_standards (code)`,

  `CREATE TABLE IF NOT EXISTS fip_standard_clauses (
    id text PRIMARY KEY,
    standard_id text NOT NULL,
    clause_number text NOT NULL,
    title text,
    content text NOT NULL,
    applies_to_kind text,
    keywords text[] DEFAULT '{}' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_clause_standard_idx ON fip_standard_clauses (standard_id)`,
  `CREATE INDEX IF NOT EXISTS fip_clause_number_idx ON fip_standard_clauses (clause_number)`,

  `CREATE TABLE IF NOT EXISTS fip_standard_cross_references (
    id text PRIMARY KEY,
    from_clause_id text NOT NULL,
    to_clause_id text NOT NULL,
    relation text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS fip_xref_from_idx ON fip_standard_cross_references (from_clause_id)`,
  `CREATE INDEX IF NOT EXISTS fip_xref_to_idx ON fip_standard_cross_references (to_clause_id)`,

  // 4. Compatibility + fault knowledge
  `CREATE TABLE IF NOT EXISTS fip_compatibility_links (
    id text PRIMARY KEY,
    from_component_id text NOT NULL,
    to_component_id text NOT NULL,
    relation text NOT NULL,
    confidence numeric(5,4),
    source text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_compat_from_idx ON fip_compatibility_links (from_component_id)`,
  `CREATE INDEX IF NOT EXISTS fip_compat_to_idx ON fip_compatibility_links (to_component_id)`,

  `CREATE TABLE IF NOT EXISTS fip_fault_signatures (
    id text PRIMARY KEY,
    model_id text,
    component_id text,
    code text,
    display_text text,
    symptom text NOT NULL,
    likely_causes text[] DEFAULT '{}' NOT NULL,
    first_checks text[] DEFAULT '{}' NOT NULL,
    next_actions text[] DEFAULT '{}' NOT NULL,
    escalation_trigger text,
    severity text DEFAULT 'medium',
    source_clause_ids text[] DEFAULT '{}' NOT NULL,
    source_document_section_ids text[] DEFAULT '{}' NOT NULL,
    keywords text[] DEFAULT '{}' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_fault_model_idx ON fip_fault_signatures (model_id)`,
  `CREATE INDEX IF NOT EXISTS fip_fault_component_idx ON fip_fault_signatures (component_id)`,
  `CREATE INDEX IF NOT EXISTS fip_fault_code_idx ON fip_fault_signatures (code)`,
  `CREATE INDEX IF NOT EXISTS fip_fault_severity_idx ON fip_fault_signatures (severity)`,
  `CREATE INDEX IF NOT EXISTS fip_fault_deleted_idx ON fip_fault_signatures (deleted_at)`,

  // 5. Troubleshooting sessions + image identification
  `CREATE TABLE IF NOT EXISTS fip_troubleshooting_sessions (
    id text PRIMARY KEY,
    operator_user_id text,
    linked_job_id text,
    linked_defect_id text,
    client_id text,
    site_name text,
    identified_manufacturer_id text,
    identified_family_id text,
    identified_model_id text,
    entered_fault_code text,
    entered_display_text text,
    entered_symptom text,
    steps_taken jsonb,
    recommendations jsonb,
    parts_suggested jsonb,
    escalation_status text DEFAULT 'none',
    summary text,
    provenance jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_session_operator_idx ON fip_troubleshooting_sessions (operator_user_id)`,
  `CREATE INDEX IF NOT EXISTS fip_session_linked_job_idx ON fip_troubleshooting_sessions (linked_job_id)`,
  `CREATE INDEX IF NOT EXISTS fip_session_started_idx ON fip_troubleshooting_sessions (started_at)`,
  `CREATE INDEX IF NOT EXISTS fip_session_deleted_idx ON fip_troubleshooting_sessions (deleted_at)`,

  `CREATE TABLE IF NOT EXISTS fip_session_images (
    id text PRIMARY KEY,
    session_id text NOT NULL,
    kind text NOT NULL,
    filename text,
    content_type text,
    size integer,
    checksum text,
    blob bytea,
    source_location_id text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS fip_session_image_session_idx ON fip_session_images (session_id)`,

  `CREATE TABLE IF NOT EXISTS fip_image_identification_results (
    id text PRIMARY KEY,
    image_id text NOT NULL,
    session_id text NOT NULL,
    provider text NOT NULL,
    manufacturer_id text,
    family_id text,
    model_id text,
    component_id text,
    confidence numeric(5,4),
    alternatives jsonb,
    raw_response jsonb,
    manual_override boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS fip_ident_image_idx ON fip_image_identification_results (image_id)`,
  `CREATE INDEX IF NOT EXISTS fip_ident_session_idx ON fip_image_identification_results (session_id)`,

  // 6. Parts, supplier linkage, costing, labour
  `CREATE TABLE IF NOT EXISTS fip_supplier_products (
    id text PRIMARY KEY,
    component_id text NOT NULL,
    supplier_id text,
    supplier_name text,
    supplier_part_number text,
    description text,
    current_cost numeric(12,2),
    currency text DEFAULT 'AUD',
    lead_time_days integer,
    stock_status text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_supplier_product_component_idx ON fip_supplier_products (component_id)`,
  `CREATE INDEX IF NOT EXISTS fip_supplier_product_supplier_idx ON fip_supplier_products (supplier_id)`,

  `CREATE TABLE IF NOT EXISTS fip_part_cost_history (
    id text PRIMARY KEY,
    supplier_product_id text NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    cost numeric(12,2) NOT NULL,
    currency text DEFAULT 'AUD',
    source text
  )`,
  `CREATE INDEX IF NOT EXISTS fip_part_cost_product_idx ON fip_part_cost_history (supplier_product_id)`,
  `CREATE INDEX IF NOT EXISTS fip_part_cost_observed_idx ON fip_part_cost_history (observed_at)`,

  `CREATE TABLE IF NOT EXISTS fip_labour_templates (
    id text PRIMARY KEY,
    scope text NOT NULL,
    kind text,
    hours numeric(10,2) NOT NULL,
    rate_per_hour numeric(12,2),
    currency text DEFAULT 'AUD',
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_labour_template_scope_idx ON fip_labour_templates (scope)`,

  `CREATE TABLE IF NOT EXISTS fip_repair_estimates (
    id text PRIMARY KEY,
    session_id text,
    linked_quote_id text,
    linked_job_id text,
    summary text,
    parts_total numeric(14,2) DEFAULT 0,
    labour_total numeric(14,2) DEFAULT 0,
    other_total numeric(14,2) DEFAULT 0,
    grand_total numeric(14,2) DEFAULT 0,
    currency text DEFAULT 'AUD',
    line_items jsonb,
    provenance jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_estimate_session_idx ON fip_repair_estimates (session_id)`,
  `CREATE INDEX IF NOT EXISTS fip_estimate_job_idx ON fip_repair_estimates (linked_job_id)`,
  `CREATE INDEX IF NOT EXISTS fip_estimate_deleted_idx ON fip_repair_estimates (deleted_at)`,

  // 7. Escalation + audit
  `CREATE TABLE IF NOT EXISTS fip_escalation_packs (
    id text PRIMARY KEY,
    session_id text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft',
    recipient text,
    summary text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
  )`,
  `CREATE INDEX IF NOT EXISTS fip_escalation_session_idx ON fip_escalation_packs (session_id)`,
  `CREATE INDEX IF NOT EXISTS fip_escalation_status_idx ON fip_escalation_packs (status)`,

  `CREATE TABLE IF NOT EXISTS fip_audit_runs (
    id text PRIMARY KEY,
    audit_name text NOT NULL,
    scope text NOT NULL,
    passed boolean NOT NULL,
    failed_checks jsonb,
    warnings jsonb,
    blockers jsonb,
    metrics jsonb,
    next_actions jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    duration_ms integer
  )`,
  `CREATE INDEX IF NOT EXISTS fip_audit_name_idx ON fip_audit_runs (audit_name)`,
  `CREATE INDEX IF NOT EXISTS fip_audit_passed_idx ON fip_audit_runs (passed)`,
  `CREATE INDEX IF NOT EXISTS fip_audit_started_idx ON fip_audit_runs (started_at)`,
];

/**
 * Tool schemas exposed to Claude for the agentic sidepanel.
 *
 * Every page that mounts AnalyticsPanel can call /api/chat/agent and Claude
 * will use these tools to search, create, update and delete records, and to
 * drive the UI (navigate / refresh). Tools are intentionally polymorphic —
 * a single `db_search` across every important table beats seven almost-
 * identical search_wip / search_jobs tools and gives Claude fewer mistakes.
 *
 * Adding a tool:
 *   1. Extend AGENT_TOOLS below with the schema
 *   2. Implement the behaviour in lib/chat-tool-exec.ts
 *   3. Whitelist the table in TABLE_ALLOWLIST if it's a new one
 */

export const TABLE_ALLOWLIST = [
  "jobs",
  "wip_records",
  "quotes",
  "defects",
  "invoices",
  "suppliers",
  "supplier_products",
  "todos",
  "notes",
  "toolbox",
  "schedule_events",
  "projects",
  "project_tasks",
  // FIP / VESDA technical knowledge base tables — drive the /fip page.
  "fip_manufacturers",
  "fip_product_families",
  "fip_models",
  "fip_documents",
  "fip_standards",
  "fip_fault_signatures",
  "fip_troubleshooting_sessions",
] as const;

export type AgentTable = (typeof TABLE_ALLOWLIST)[number];

export const AGENT_TOOLS = [
  {
    name: "db_search",
    description:
      "Search any operational table by free-text and optional field filters. " +
      "Returns up to `limit` matching rows as JSON. Always prefer this over " +
      "asking the user for ids. Supported tables: " +
      TABLE_ALLOWLIST.join(", ") +
      ".",
    input_schema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          enum: TABLE_ALLOWLIST,
          description: "Which table to search.",
        },
        query: {
          type: "string",
          description:
            "Free-text substring match across the main text columns of the " +
            "table (site, client, description, task_number, name, text). " +
            "Case-insensitive. Leave empty to list everything that matches the filters.",
        },
        status: { type: "string", description: "Optional status filter." },
        priority: { type: "string", description: "Optional priority filter." },
        client: { type: "string", description: "Optional client-name substring filter." },
        assigned_tech: { type: "string", description: "Optional technician name filter." },
        limit: {
          type: "number",
          description: "Max rows to return (default 20, hard cap 100).",
        },
      },
      required: ["table"],
    },
  },

  {
    name: "db_get",
    description:
      "Fetch a single record by id from one of the allowlisted tables. Returns the full row.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", enum: TABLE_ALLOWLIST },
        id: { type: "string", description: "Primary key of the row." },
      },
      required: ["table", "id"],
    },
  },

  {
    name: "db_create",
    description:
      "Create a new record. Supply all required fields as a JSON object in `data`. " +
      "Required fields per table: " +
      "jobs{site,client,action_required,priority,status}; " +
      "wip_records{site,client}; " +
      "quotes{site,client}; " +
      "defects{site,client,description}; " +
      "invoices{site,client,description}; " +
      "todos{text}; " +
      "notes{text,category,owner}; " +
      "suppliers{name,category}; " +
      "supplier_products{supplier_id,product_name}; " +
      "toolbox{ref,text}. " +
      "Any other field may be supplied in the same data object.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", enum: TABLE_ALLOWLIST },
        data: {
          type: "object",
          description: "Key/value map of column → value. Will be validated before insert.",
          additionalProperties: true,
        },
      },
      required: ["table", "data"],
    },
  },

  {
    name: "db_update",
    description:
      "Update one or more fields on an existing row. Only supply the fields that " +
      "need to change in `data`. Always resolve the id via db_search first if the " +
      "user gave you a name or task number instead of an id.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", enum: TABLE_ALLOWLIST },
        id: { type: "string", description: "Row id to update." },
        data: {
          type: "object",
          description: "Only the fields to change.",
          additionalProperties: true,
        },
      },
      required: ["table", "id", "data"],
    },
  },

  {
    name: "db_delete",
    description:
      "Delete a row by id. Honours the SOFT_DELETE flag — when soft-delete is on " +
      "it sets deleted_at instead of hard-deleting. Always confirm with the user " +
      "before calling this for anything other than notes or todos.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", enum: TABLE_ALLOWLIST },
        id: { type: "string" },
      },
      required: ["table", "id"],
    },
  },

  {
    name: "get_kpi_summary",
    description:
      "Return a compact JSON summary of dashboard KPIs: job counts by status, " +
      "WIP revenue, pipeline totals, outstanding invoices, overdue items. " +
      "Use this when the user asks 'how are we doing' or 'give me a status report'.",
    input_schema: { type: "object" as const, properties: {} },
  },

  {
    name: "ui_navigate",
    description:
      "Navigate the user's browser to a different page within the app. Supported " +
      "paths: /, /chat, /operations, /analytics, /jobs, /todos, /projects, " +
      "/suppliers, /schedule, /toolbox, /notes, /pm, /settings, /jobs/:id.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Route path, starting with /. Use `/jobs/<id>` for a specific job.",
        },
      },
      required: ["path"],
    },
  },

  {
    name: "ui_refresh",
    description:
      "Tell the current page to refetch its data. Call this after any db_create, " +
      "db_update or db_delete so the user immediately sees the change. No args.",
    input_schema: { type: "object" as const, properties: {} },
  },
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]["name"];

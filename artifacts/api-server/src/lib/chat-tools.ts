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
  "project_milestones",
  "project_members",
  "project_activity",
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
      "Fetch a single record by id from one of the allowlisted tables. Returns " +
      "a clipped summary shaped to the table (same fields as db_search rows). " +
      "If you need the complete raw row including fields the summary drops, call " +
      "db_get_full instead.",
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
    name: "db_get_full",
    description:
      "Fetch a single record by id and return EVERY column, including fields " +
      "that db_search and db_get drop (raw_data JSONB, import_batch_id, " +
      "soft-delete timestamps, any legacy columns). Use when debugging, or when " +
      "a second tool call needs a field the summary clipped.",
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
      "in plain English before calling this for anything other than notes or todos. " +
      "For high-value tables (suppliers, fip_manufacturers, fip_product_families, " +
      "fip_models, fip_fault_signatures) a hard guardrail requires you to also pass " +
      "`confirm: \"yes\"` in the input — if you haven't verbally confirmed with the " +
      "user first, DO NOT pass confirm: yes.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", enum: TABLE_ALLOWLIST },
        id: { type: "string" },
        confirm: {
          type: "string",
          enum: ["yes"],
          description: "Set to 'yes' ONLY after the user has explicitly confirmed the deletion in chat for high-value tables. Refuse to set this for any other reason.",
        },
      },
      required: ["table", "id"],
    },
  },

  // ── Estimation workbench tools ────────────────────────────────────────────
  {
    name: "estimate_search_products",
    description:
      "Search the supplier product catalogue (1730+ rows from the FireMate export) " +
      "by free text, supplier name or category. Returns id, product_name, code, " +
      "supplier, cost_price, unit_price, category. Use this before calling " +
      "estimate_add_line so the line inherits the correct cost.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Substring match across name, code, supplier, category" },
        supplier: { type: "string", description: "Exact supplier name filter" },
        category: { type: "string", description: "Exact category filter" },
        limit: { type: "number", description: "Max rows (default 20, cap 100)" },
      },
    },
  },
  {
    name: "estimate_create",
    description:
      "Create a new empty estimate with header info. Returns the estimate id — " +
      "use that id for every subsequent estimate_add_line call.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        client: { type: "string" },
        site: { type: "string" },
        project: { type: "string" },
        default_markup_pct: { type: "number", description: "Applied to every product line unless overridden. Default 40." },
        labour_rate: { type: "number", description: "Hourly labour rate (default 120)" },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "estimate_add_line",
    description:
      "Add a line to an existing estimate. Supply either product_id (resolved " +
      "via estimate_search_products) to pull the cost automatically, OR a " +
      "description + cost_price for free-form / labour lines. Markup defaults " +
      "to the estimate's default_markup_pct.",
    input_schema: {
      type: "object" as const,
      properties: {
        estimate_id: { type: "string" },
        product_id: { type: "string" },
        kind: { type: "string", enum: ["product", "labour", "misc"] },
        description: { type: "string" },
        quantity: { type: "number" },
        unit: { type: "string" },
        cost_price: { type: "number" },
        markup_pct: { type: "number", description: "Override the estimate default for this line" },
        supplier_name: { type: "string" },
        category: { type: "string" },
        notes: { type: "string" },
      },
      required: ["estimate_id"],
    },
  },
  {
    name: "estimate_update_line",
    description:
      "Modify an existing line on an estimate. Any field left unset keeps its " +
      "current value. Totals are recomputed server-side automatically.",
    input_schema: {
      type: "object" as const,
      properties: {
        estimate_id: { type: "string" },
        line_id: { type: "string" },
        quantity: { type: "number" },
        cost_price: { type: "number" },
        markup_pct: { type: "number" },
        description: { type: "string" },
      },
      required: ["estimate_id", "line_id"],
    },
  },
  {
    name: "estimate_set_markup",
    description:
      "Change the default markup on an estimate and reprice every existing " +
      "line to match. Use this for 'apply 45% markup to every line' or " +
      "'drop the margin on the whole estimate to 25%'.",
    input_schema: {
      type: "object" as const,
      properties: {
        estimate_id: { type: "string" },
        default_markup_pct: { type: "number" },
      },
      required: ["estimate_id", "default_markup_pct"],
    },
  },
  {
    name: "estimate_get",
    description: "Fetch an estimate with all its lines and recomputed totals.",
    input_schema: {
      type: "object" as const,
      properties: { estimate_id: { type: "string" } },
      required: ["estimate_id"],
    },
  },
  {
    name: "estimate_list",
    description: "List the most recent 50 estimates (id, number, title, client, grand_total, status).",
    input_schema: { type: "object" as const, properties: {} },
  },

  // ── Metric registry tools (Pass 4 fix #4) ────────────────────────────────
  {
    name: "metric_get",
    description:
      "Compute a named metric from the lib/metrics registry. Returns a " +
      "MetricResult: { id, displayName, unit, period, periodStart, periodEnd, " +
      "rows, headline, previousHeadline, explainQuery }. Use this INSTEAD of " +
      "db_search + prose summarisation whenever the user asks for a KPI or " +
      "aggregated number. The metric's own query is always more correct than " +
      "anything you could synthesise. Current metric ids: revenue_vs_target_mtd.",
    input_schema: {
      type: "object" as const,
      properties: {
        metric_id: { type: "string", description: "Registered metric slug" },
        period: {
          type: "string",
          enum: ["today", "7d", "30d", "mtd", "90d", "ytd", "custom"],
          description: "Defaults to the metric's natural window",
        },
        start_date: { type: "string", description: "ISO date — required when period=custom" },
        end_date: { type: "string", description: "ISO date — required when period=custom" },
      },
      required: ["metric_id"],
    },
  },
  {
    name: "metric_compare",
    description:
      "Fetch a metric for two periods side-by-side and return the delta " +
      "(absolute and percentage). Use when the user asks 'how does this " +
      "month compare to last month' or 'this week vs last week'.",
    input_schema: {
      type: "object" as const,
      properties: {
        metric_id: { type: "string" },
        period_a: { type: "string", enum: ["today", "7d", "30d", "mtd", "90d", "ytd"] },
        period_b: { type: "string", enum: ["today", "7d", "30d", "mtd", "90d", "ytd"] },
      },
      required: ["metric_id", "period_a", "period_b"],
    },
  },
  {
    name: "metric_list",
    description: "List every registered metric with its metadata (id, displayName, description, category, unit). Use this when the user asks what KPIs are available.",
    input_schema: { type: "object" as const, properties: {} },
  },

  {
    name: "get_kpi_summary",
    description:
      "Return a compact JSON summary of dashboard KPIs: job counts by status, " +
      "WIP revenue, pipeline totals, outstanding invoices, overdue items. " +
      "Use this when the user asks 'how are we doing' or 'give me a status report'.",
    input_schema: { type: "object" as const, properties: {} },
  },

  // ─── PA reminder tools (PA rebuild phase 3) ────────────────────────────
  {
    name: "reminder_create",
    description:
      "Create a reminder for the operator. Use whenever the user says 'remind me', 'ping me', " +
      "'follow up on X on Y', or sets any timed nudge. Accepts a title, a remindAt ISO timestamp, " +
      "and an optional body. For natural-language times (e.g. 'tomorrow 9am'), resolve to an ISO " +
      "string yourself before calling — do NOT ask the user for an ISO.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title, e.g. 'Chase Pertronic quote'" },
        remindAt: { type: "string", description: "ISO 8601 timestamp in the operator's local timezone (Australia/Sydney)" },
        body: { type: "string", description: "Optional longer description, notes, links" },
      },
      required: ["title", "remindAt"],
    },
  },
  {
    name: "reminder_list",
    description:
      "List the operator's reminders. By default returns every pending reminder. Pass status='due' " +
      "to get only reminders whose remindAt is now or in the past. Use when the user says 'what " +
      "are my reminders', 'what's coming up', or asks about overdue follow-ups.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "due", "fired", "completed", "snoozed", "cancelled"],
          description: "Optional filter. 'due' means pending + remindAt <= now.",
        },
        limit: { type: "number", description: "Max rows to return. Default 20, cap 100." },
      },
    },
  },
  {
    name: "reminder_complete",
    description:
      "Mark a reminder as completed. Use when the user says 'done', 'finished that', or references " +
      "a specific reminder and says it's handled. Accepts either the reminder id OR a title substring " +
      "match — if a title substring is passed, the most recent matching pending reminder is completed.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Exact reminder id. Preferred when known." },
        titleMatch: { type: "string", description: "Case-insensitive title substring to match against pending reminders." },
      },
    },
  },
  {
    name: "reminder_snooze",
    description:
      "Push a reminder to a new remindAt. Use when the user says 'not now', 'remind me later', " +
      "or specifies a new time. Accepts id or titleMatch plus a new ISO untilIso.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        titleMatch: { type: "string" },
        untilIso: { type: "string", description: "ISO 8601 timestamp for the new fire time" },
      },
      required: ["untilIso"],
    },
  },
  {
    name: "reminder_delete",
    description:
      "Soft-delete a reminder (status becomes cancelled). Use sparingly — most of the time the user " +
      "wants reminder_complete, not delete. Only use delete when the user says 'cancel', 'forget it', " +
      "or 'remove that reminder'.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        titleMatch: { type: "string" },
      },
    },
  },

  // ─── Smart PA tools (Smart Mode phase G) ───────────────────────────────
  {
    name: "pa_get_daily_focus",
    description:
      "Return the operator's daily focus brief: stale tasks, upcoming reminders, and a short set of " +
      "key numbers (revenue MTD, outstanding invoices, pending quotes). Use at the start of a PA " +
      "conversation, whenever the user says 'brief me' / 'what's on my plate' / 'what do I need to " +
      "handle today'. The result is structured — summarise it in plain English, don't dump raw JSON.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "pa_get_stale_tasks",
    description:
      "Return the top N active todos sorted by staleness score (days since update × priority weight, " +
      "with an overdue bonus). Use when the user asks 'what have I been neglecting', 'what's getting " +
      "old', or when you need to pick a task to check in on proactively.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max rows to return (default 5, cap 20)" },
        minDays: { type: "number", description: "Minimum days since last update to include (default 0)" },
      },
    },
  },
  {
    name: "pa_instruction_add",
    description:
      "Capture a user-authored training rule for the PA. Use whenever the user says 'from now on', " +
      "'always', 'never', or otherwise tells you how to behave going forward. Stores the rule in " +
      "pa_instructions and the memory builder injects it into every future turn.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short human label, e.g. 'Never ask about insurance claim'" },
        content: { type: "string", description: "The actual rule text the PA should follow" },
        scope: {
          type: "string",
          enum: ["global", "on_open", "on_stale_check", "on_todo_create"],
          description: "When the rule applies. Default: global.",
        },
        priority: { type: "number", description: "1 (must obey) to 5 (nice to have). Default 3." },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "pa_instruction_list",
    description:
      "List every user-authored training rule. Use when the user says 'what are my PA rules' or " +
      "'show me my training instructions'.",
    input_schema: {
      type: "object" as const,
      properties: {
        scope: {
          type: "string",
          enum: ["global", "on_open", "on_stale_check", "on_todo_create"],
        },
        enabled: { type: "boolean" },
      },
    },
  },
  {
    name: "pa_instruction_update",
    description:
      "Patch an existing PA training rule. Accepts id + any of title, content, scope, priority, enabled. " +
      "Use when the user says 'pause that rule', 'turn off the insurance one', 'change it to only on open'.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        scope: { type: "string" },
        priority: { type: "number" },
        enabled: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "pa_instruction_delete",
    description:
      "Soft-delete a PA training rule. Use when the user says 'remove that rule', 'delete the rule " +
      "about X'. Accepts id OR titleMatch.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        titleMatch: { type: "string" },
      },
    },
  },

  // ─── AIDE Master Prompt Triple-Check tool ───────────────────────────
  {
    name: "triple_check",
    description:
      "Run the AIDE master-prompt triple-check verification protocol on a candidate response. " +
      "Use at the end of any data-heavy answer (job lists, KPI tables, financial figures, dispatch " +
      "recommendations). Pass 1 is structural (no Jade Ogony, no duplicates, no banned phrases). " +
      "Pass 2 is data accuracy (every row traces to source). Pass 3 is maths (re-derive KPIs from raw). " +
      "Returns a structured pass/fail log the agent must paste verbatim in the response.",
    input_schema: {
      type: "object" as const,
      properties: {
        claimedFigures: {
          type: "object",
          description: "Optional map of asserted KPI name -> numeric value to re-verify",
        },
        jobRefs: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of task_numbers or quote_numbers to cross-validate against source",
        },
        responseText: {
          type: "string",
          description: "The candidate response text to structurally audit for banned phrases and AI attribution",
        },
      },
    },
  },

  {
    name: "ui_navigate",
    description:
      "Navigate the user's browser to a different page within the app. Supported " +
      "paths: /, /chat, /operations, /analytics, /jobs, /todos, /projects, " +
      "/suppliers, /schedule, /toolbox, /notes, /pm, /settings, /jobs/:id. " +
      "Accepts query strings (e.g. /jobs?status=Open).",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Route path, starting with /. Query strings allowed.",
        },
      },
      required: ["path"],
    },
  },

  {
    name: "ui_set_filter",
    description:
      "Apply a filter on the page the user is currently looking at. Dispatches a window event " +
      "the host page listens for. Use this after ui_navigate to land on an already-filtered view. " +
      "Examples: filter_key='status' value='Open'; filter_key='priority' value='Critical'; " +
      "filter_key='assigned_tech' value='Gordon Jenkins'. The host page interprets the keys.",
    input_schema: {
      type: "object" as const,
      properties: {
        filter_key: { type: "string", description: "Which filter slot to set (e.g. status, priority, tech, client)" },
        value: { type: "string", description: "The value to apply. Use empty string to clear." },
      },
      required: ["filter_key", "value"],
    },
  },

  {
    name: "ui_open_record",
    description:
      "Highlight and scroll to a specific row on the currently-visible list page. " +
      "Call this after db_search + db_update so the user sees exactly which row you just touched.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string", description: "e.g. wip_records, defects, estimates" },
        id: { type: "string" },
      },
      required: ["table", "id"],
    },
  },

  {
    name: "ui_open_modal",
    description:
      "Open a create or edit modal for a specific record kind on the current page. " +
      "kind is one of: job, wip, quote, defect, invoice, todo, note, estimate, estimate_line. " +
      "Supply id to edit an existing record; omit for a fresh create modal.",
    input_schema: {
      type: "object" as const,
      properties: {
        kind: { type: "string" },
        id: { type: "string", description: "Optional — omit for create, supply for edit" },
      },
      required: ["kind"],
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

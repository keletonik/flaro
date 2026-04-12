/**
 * Uptick CSV dashboard detector and column mapper.
 *
 * Pure functions — no DB, no IO. Given a set of CSV headers and some sample
 * rows, identify which Uptick dashboard export the file came from and return
 * a mapping from CSV header → canonical fact field.
 *
 * Known dashboard shapes are derived from the Uptick Help Center articles
 * (Financial Performance, Workforce Performance, Client Revenue, Client
 * Profitability, Programme Maintenance, PM Forecast, Service Quoting,
 * Defect Quoting, Revenue Report, Realtime Activity / Task Sessions).
 *
 * The detector is deliberately lenient: it normalises header names (strips
 * punctuation, lowercases, collapses whitespace) and matches against a list
 * of synonyms. Confidence score is computed as
 *   matched_required / total_required * 0.7  +  matched_optional / total_optional * 0.3
 * so a file is only auto-picked when the required fields are all present.
 */

export type FactType =
  | "task"
  | "quote"
  | "remark"
  | "contract"
  | "session"
  | "revenue_line"
  | "pm_forecast"
  | "client_metric"
  | "workforce_metric";

export type UptickDashboardType =
  | "financial_performance"
  | "workforce_performance"
  | "client_revenue"
  | "client_profitability"
  | "programme_maintenance"
  | "pm_forecast"
  | "service_quoting"
  | "defect_quoting"
  | "revenue_report"
  | "task_activity"
  | "unknown";

export interface FieldSpec {
  field: string;             // Canonical field name on uptickFacts
  synonyms: string[];        // Lowercased normalised synonyms that should match
  required?: boolean;        // If true, missing it penalises confidence heavily
  numeric?: boolean;         // Cast to number on normalisation
  date?: boolean;            // Cast to ISO date on normalisation
}

export interface DashboardSpec {
  type: UptickDashboardType;
  factType: FactType;
  label: string;
  fields: FieldSpec[];
  /**
   * Optional discriminator keywords. If set, at least one must appear as a
   * substring of any header on the file for this spec to be considered a
   * match. Used to disambiguate defect quoting vs service quoting when they
   * share the same required field shape.
   */
  requireHeaderKeyword?: string[];
}

export interface DetectionResult {
  type: UptickDashboardType;
  factType: FactType;
  confidence: number;         // 0..1
  columnMap: Record<string, string>;   // CSV header → canonical field
  unmapped: string[];         // CSV headers the detector didn't recognise
  missingRequired: string[];  // required fields that weren't found
  warnings: string[];
}

// ───────────────────────────────────────────────────────────────────────────
// Dashboard specs
// ───────────────────────────────────────────────────────────────────────────

const COMMON_CLIENT_SYNONYMS = ["client", "customer", "account", "client name", "customer name"];
const COMMON_SITE_SYNONYMS = ["site", "property", "property name", "location", "building", "address"];
const COMMON_TECH_SYNONYMS = ["technician", "tech", "engineer", "assigned tech", "assignee", "resource", "performed by"];
const COMMON_SERVICE_GROUP_SYNONYMS = ["service group", "service category", "trade", "discipline"];
const COMMON_BRANCH_SYNONYMS = ["branch", "region", "office", "division"];
const COMMON_ACCOUNT_MANAGER_SYNONYMS = ["account manager", "am", "sales rep", "sales contact"];
const COMMON_COST_CENTER_SYNONYMS = ["cost center", "cost centre", "department", "profit center"];
const COMMON_TASK_NUMBER_SYNONYMS = ["task", "task number", "task ref", "task id", "ref", "reference", "work order", "job number"];

export const DASHBOARD_SPECS: DashboardSpec[] = [
  {
    type: "financial_performance",
    factType: "revenue_line",
    label: "Financial Performance",
    fields: [
      { field: "periodDate", synonyms: ["month", "period", "date", "reporting month", "financial month"], required: true, date: true },
      { field: "revenue", synonyms: ["revenue", "net revenue", "invoiced revenue", "net invoiced revenue", "total revenue"], required: true, numeric: true },
      { field: "labourCost", synonyms: ["labour", "labour cost", "labor cost", "labour costs"], numeric: true },
      { field: "materialCost", synonyms: ["materials", "material cost", "materials cost"], numeric: true },
      { field: "otherCost", synonyms: ["other", "other cost", "other costs", "overheads", "expense", "equipment", "subcontracted"], numeric: true },
      { field: "cost", synonyms: ["total cost", "total costs", "cost of sales", "cos", "cogs"], numeric: true },
      { field: "accountManager", synonyms: COMMON_ACCOUNT_MANAGER_SYNONYMS },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
      { field: "serviceGroup", synonyms: COMMON_SERVICE_GROUP_SYNONYMS },
    ],
  },
  {
    type: "workforce_performance",
    factType: "workforce_metric",
    label: "Workforce Performance",
    fields: [
      { field: "technician", synonyms: COMMON_TECH_SYNONYMS, required: true },
      { field: "periodDate", synonyms: ["month", "period", "week", "date"], date: true },
      { field: "quantity", synonyms: ["tasks", "tasks performed", "total tasks", "task count", "completed tasks"], required: true, numeric: true },
      { field: "revenue", synonyms: ["invoiced", "invoiced value", "total invoiced value", "billed", "billed value"], numeric: true },
      { field: "hours", synonyms: ["hours", "labour hours", "time", "total hours", "work hours"], numeric: true },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
      { field: "serviceGroup", synonyms: COMMON_SERVICE_GROUP_SYNONYMS },
      { field: "assetType", synonyms: ["assets serviced", "assets", "asset type"] },
      { field: "severity", synonyms: ["remarks raised", "remarks", "defects raised", "defects"] },
    ],
  },
  {
    type: "client_revenue",
    factType: "client_metric",
    label: "Client Revenue",
    fields: [
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS, required: true },
      { field: "revenue", synonyms: ["annual recurring revenue", "arr", "active revenue", "contracted revenue", "annual value"], required: true, numeric: true },
      { field: "quantity", synonyms: ["properties", "sites", "number of properties", "active properties"], numeric: true },
      { field: "status", synonyms: ["status", "contract status", "client status"] },
      { field: "periodDate", synonyms: ["contract start", "start date", "as of", "period"], date: true },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
      { field: "accountManager", synonyms: COMMON_ACCOUNT_MANAGER_SYNONYMS },
    ],
  },
  {
    type: "client_profitability",
    factType: "client_metric",
    label: "Client Profitability",
    fields: [
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS, required: true },
      { field: "revenue", synonyms: ["net invoiced revenue", "total net invoiced revenue", "revenue", "billed"], required: true, numeric: true },
      { field: "cost", synonyms: ["total actual costs", "actual costs", "total cost", "cost"], required: true, numeric: true },
      { field: "taskCategory", synonyms: ["task category", "category", "service type", "task type"] },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
      { field: "accountManager", synonyms: COMMON_ACCOUNT_MANAGER_SYNONYMS },
      { field: "serviceGroup", synonyms: COMMON_SERVICE_GROUP_SYNONYMS },
      { field: "periodDate", synonyms: ["period", "month", "date"], date: true },
    ],
  },
  {
    type: "programme_maintenance",
    factType: "task",
    label: "Programme Maintenance",
    fields: [
      { field: "taskNumber", synonyms: COMMON_TASK_NUMBER_SYNONYMS, required: true },
      { field: "serviceGroup", synonyms: [...COMMON_SERVICE_GROUP_SYNONYMS, "routine", "routine type"], required: true },
      { field: "periodDate", synonyms: ["due date", "scheduled date", "schedule date", "sched date", "date"], date: true, required: true },
      { field: "endedAt", synonyms: ["completed date", "completion date", "date completed", "done date", "completed"], date: true },
      { field: "status", synonyms: ["status", "state", "routine status", "on time", "on-time", "overdue"] },
      { field: "technician", synonyms: COMMON_TECH_SYNONYMS },
      { field: "site", synonyms: COMMON_SITE_SYNONYMS },
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
    ],
  },
  {
    type: "pm_forecast",
    factType: "pm_forecast",
    label: "PM Forecast",
    fields: [
      { field: "periodDate", synonyms: ["month", "forecast month", "period"], required: true, date: true },
      { field: "hours", synonyms: ["forecasted labour", "forecast labour", "labour hours", "labor hours", "planned hours", "estimated duration"], required: true, numeric: true },
      { field: "revenue", synonyms: ["forecasted revenue", "forecast revenue", "planned revenue", "expected revenue"], numeric: true },
      { field: "serviceGroup", synonyms: COMMON_SERVICE_GROUP_SYNONYMS },
      { field: "site", synonyms: COMMON_SITE_SYNONYMS },
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS },
    ],
  },
  {
    type: "service_quoting",
    factType: "quote",
    label: "Service Quoting",
    fields: [
      { field: "quoteNumber", synonyms: ["quote", "quote number", "quote id", "quote ref", "ref"], required: true },
      { field: "stage", synonyms: ["stage", "status", "quote status", "funnel stage"], required: true },
      { field: "revenue", synonyms: ["value", "quote value", "total", "total value", "amount", "total inc gst"], required: true, numeric: true },
      { field: "markup", synonyms: ["markup", "margin", "margin %", "markup %"], numeric: true },
      { field: "startedAt", synonyms: ["created", "submitted", "submitted date", "date submitted", "created at"], date: true },
      { field: "endedAt", synonyms: ["approved", "approved date", "date approved", "won date", "closed date"], date: true },
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS },
      { field: "site", synonyms: COMMON_SITE_SYNONYMS },
      { field: "accountManager", synonyms: ["author", "created by", "owner", ...COMMON_ACCOUNT_MANAGER_SYNONYMS] },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
      { field: "serviceGroup", synonyms: COMMON_SERVICE_GROUP_SYNONYMS },
    ],
  },
  {
    type: "defect_quoting",
    factType: "quote",
    label: "Defect Quoting",
    requireHeaderKeyword: ["defect", "remark"],
    fields: [
      { field: "quoteNumber", synonyms: ["defect quote", "quote number", "quote id", "ref", "defect id"], required: true },
      { field: "stage", synonyms: ["stage", "status", "defect status", "quote status"], required: true },
      { field: "revenue", synonyms: ["value", "defect value", "total", "total value", "amount"], required: true, numeric: true },
      { field: "severity", synonyms: ["severity", "remark severity", "priority"] },
      { field: "taskNumber", synonyms: [...COMMON_TASK_NUMBER_SYNONYMS, "remark id"] },
      { field: "startedAt", synonyms: ["created", "submitted", "raised", "date raised", "created at"], date: true },
      { field: "endedAt", synonyms: ["approved", "resolved", "actioned", "closed"], date: true },
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS },
      { field: "site", synonyms: COMMON_SITE_SYNONYMS },
      { field: "assetType", synonyms: ["asset", "asset type", "asset category"] },
    ],
  },
  {
    type: "revenue_report",
    factType: "revenue_line",
    label: "Revenue Report",
    fields: [
      { field: "taskNumber", synonyms: ["invoice", "invoice number", "invoice #", "inv", "invoice ref"], required: true },
      { field: "revenue", synonyms: ["amount", "invoice amount", "total", "total inc gst", "net amount", "total net"], required: true, numeric: true },
      { field: "periodDate", synonyms: ["invoice date", "date", "issued", "date issued"], required: true, date: true },
      { field: "serviceGroup", synonyms: [...COMMON_SERVICE_GROUP_SYNONYMS, "group"] },
      { field: "costCenter", synonyms: COMMON_COST_CENTER_SYNONYMS },
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS },
      { field: "site", synonyms: COMMON_SITE_SYNONYMS },
      { field: "branch", synonyms: COMMON_BRANCH_SYNONYMS },
      { field: "accountManager", synonyms: COMMON_ACCOUNT_MANAGER_SYNONYMS },
    ],
  },
  {
    type: "task_activity",
    factType: "session",
    label: "Task Activity / Sessions",
    fields: [
      { field: "technician", synonyms: COMMON_TECH_SYNONYMS, required: true },
      { field: "taskNumber", synonyms: COMMON_TASK_NUMBER_SYNONYMS, required: true },
      { field: "startedAt", synonyms: ["start", "started", "session start", "time start", "clock in"], date: true },
      { field: "endedAt", synonyms: ["end", "ended", "session end", "time end", "clock out"], date: true },
      { field: "hours", synonyms: ["duration", "hours", "time spent", "billable hours", "billed hours"], numeric: true },
      { field: "cost", synonyms: ["labour cost", "cost", "total cost"], numeric: true },
      { field: "site", synonyms: COMMON_SITE_SYNONYMS },
      { field: "client", synonyms: COMMON_CLIENT_SYNONYMS },
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

export function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_\-.()\/\\]/g, " ")
    .replace(/[^a-z0-9\s%$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headerMatches(normalised: string, synonym: string): boolean {
  const s = normaliseHeader(synonym);
  if (normalised === s) return true;
  // Token-set containment so "total invoiced value" matches "invoiced value".
  const nTokens = new Set(normalised.split(" ").filter(Boolean));
  const sTokens = s.split(" ").filter(Boolean);
  if (sTokens.length === 0) return false;
  return sTokens.every((t) => nTokens.has(t));
}

export interface ScoredSpec {
  type: UptickDashboardType;
  factType: FactType;
  label: string;
  confidence: number;
  columnMap: Record<string, string>;
  unmapped: string[];
  missingRequired: string[];
}

function scoreSpec(spec: DashboardSpec, headers: string[]): ScoredSpec {
  const normalised = headers.map((h) => ({ raw: h, norm: normaliseHeader(h) }));
  const columnMap: Record<string, string> = {};
  const mappedHeaders = new Set<string>();
  let matchedRequired = 0;
  let totalRequired = 0;
  let matchedOptional = 0;
  let totalOptional = 0;
  const missingRequired: string[] = [];

  // Discriminator check — if the spec demands a keyword in the raw headers
  // and none are present, bail out with a zero-confidence score so the
  // tie-break can pick a spec that actually matches the file.
  if (spec.requireHeaderKeyword && spec.requireHeaderKeyword.length > 0) {
    const hay = normalised.map((n) => n.norm).join(" ");
    const hit = spec.requireHeaderKeyword.some((kw) => hay.includes(kw.toLowerCase()));
    if (!hit) {
      return {
        type: spec.type,
        factType: spec.factType,
        label: spec.label,
        confidence: 0,
        columnMap: {},
        unmapped: headers,
        missingRequired: spec.fields.filter((f) => f.required).map((f) => f.field),
      };
    }
  }

  for (const field of spec.fields) {
    if (field.required) totalRequired++;
    else totalOptional++;

    // Find the best matching header for this field (first unmapped wins).
    let match: { raw: string; norm: string } | undefined;
    for (const h of normalised) {
      if (mappedHeaders.has(h.raw)) continue;
      if (field.synonyms.some((syn) => headerMatches(h.norm, syn))) {
        match = h;
        break;
      }
    }
    if (match) {
      columnMap[match.raw] = field.field;
      mappedHeaders.add(match.raw);
      if (field.required) matchedRequired++;
      else matchedOptional++;
    } else if (field.required) {
      missingRequired.push(field.field);
    }
  }

  const reqScore = totalRequired > 0 ? matchedRequired / totalRequired : 1;
  const optScore = totalOptional > 0 ? matchedOptional / totalOptional : 0;
  const confidence = Math.round((reqScore * 0.7 + optScore * 0.3) * 10000) / 10000;

  const unmapped = headers.filter((h) => !mappedHeaders.has(h));
  return {
    type: spec.type,
    factType: spec.factType,
    label: spec.label,
    confidence,
    columnMap,
    unmapped,
    missingRequired,
  };
}

/**
 * Detect the Uptick dashboard type of a CSV from its headers.
 * Returns the best-scoring spec; falls back to "unknown" when no spec scores
 * above 0.5 on required fields.
 */
export function detectDashboard(headers: string[]): DetectionResult {
  const scores = DASHBOARD_SPECS.map((s) => scoreSpec(s, headers));
  // Tie-break: highest confidence, then fewest missing-required, then most fields mapped.
  scores.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (a.missingRequired.length !== b.missingRequired.length) return a.missingRequired.length - b.missingRequired.length;
    return Object.keys(b.columnMap).length - Object.keys(a.columnMap).length;
  });
  const best = scores[0];
  const warnings: string[] = [];
  if (best.missingRequired.length > 0) {
    warnings.push(`Missing expected fields: ${best.missingRequired.join(", ")}`);
  }
  if (best.unmapped.length > 0) {
    warnings.push(`${best.unmapped.length} column(s) kept in raw data only: ${best.unmapped.slice(0, 5).join(", ")}${best.unmapped.length > 5 ? "…" : ""}`);
  }
  if (best.confidence < 0.5) {
    return {
      type: "unknown",
      factType: "revenue_line",
      confidence: best.confidence,
      columnMap: best.columnMap,
      unmapped: best.unmapped,
      missingRequired: best.missingRequired,
      warnings: [...warnings, "Low confidence — dashboard type could not be identified automatically."],
    };
  }
  return {
    type: best.type,
    factType: best.factType,
    confidence: best.confidence,
    columnMap: best.columnMap,
    unmapped: best.unmapped,
    missingRequired: best.missingRequired,
    warnings,
  };
}

/**
 * Normalise a CSV row to the canonical fact shape using the column map.
 * Untyped strings are passed through; numeric/date fields are cast.
 * Anything unmapped goes into `data` so it is never lost.
 */
export function normaliseRow(
  row: Record<string, string>,
  spec: DashboardSpec,
  columnMap: Record<string, string>,
): { fact: Record<string, any>; data: Record<string, string> } {
  const fact: Record<string, any> = {};
  const data: Record<string, string> = {};
  const fieldSpecByName = new Map(spec.fields.map((f) => [f.field, f]));

  for (const [header, value] of Object.entries(row)) {
    const canonical = columnMap[header];
    if (!canonical) {
      data[header] = value;
      continue;
    }
    const field = fieldSpecByName.get(canonical);
    if (!field) {
      data[header] = value;
      continue;
    }
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (field.numeric) {
      const n = parseNumeric(value);
      if (n !== null) fact[canonical] = n;
    } else if (field.date) {
      const d = parseDate(value);
      if (d) fact[canonical] = d;
    } else {
      fact[canonical] = String(value).trim();
    }
  }
  return { fact, data };
}

function parseNumeric(v: string): number | null {
  if (typeof v !== "string") return typeof v === "number" ? v : null;
  // Strip currency symbols, thousands separators, percent sign, spaces.
  const cleaned = v.replace(/[\s,$£€]/g, "").replace(/%$/, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string): string | null {
  if (!v) return null;
  // ISO 8601 already
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY (Uptick AU exports use DD/MM/YYYY)
  const m1 = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m1) {
    let [, d, m, y] = m1;
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Month name (e.g. "Apr 2026")
  const m2 = v.match(/^([A-Za-z]{3,})\s*(\d{4})/);
  if (m2) {
    const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      .indexOf(m2[1].toLowerCase().slice(0, 3));
    if (monthIndex >= 0) return `${m2[2]}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  }
  // Last resort: Date.parse
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export function getDashboardSpec(type: UptickDashboardType): DashboardSpec | undefined {
  return DASHBOARD_SPECS.find((s) => s.type === type);
}

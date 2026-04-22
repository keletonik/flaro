/**
 * Division/team filter for FlameSafe — Casper's BR-DETECTION division.
 *
 * Casper's working surface is "dry fire and electrical" = the DETECTION service
 * groups (R/A/M DETECTION) plus a small allowlist of techs in his crew.
 * Anything outside that is somebody else's problem and shouldn't bloat his
 * dashboards.
 *
 * Configurable via env vars in case the team or scope changes:
 *   MY_DIVISION_SERVICE_GROUPS  comma-separated, matched as substrings (case-insensitive).
 *                                Default: "DETECTION" (catches R/A/M DETECTION).
 *   MY_TECHS                    comma-separated, matched as substrings (case-insensitive).
 *                                Default: Gordon, Johnny (= John Minai), Nu, Haidar, Darren.
 *
 * Bypass with `?division=all` on any analytics/wip endpoint.
 */

const DEFAULT_GROUPS = ["DETECTION"];
const DEFAULT_TECHS = ["Gordon", "John", "Nu", "Haid", "Darren"];

function parseList(envVar: string | undefined, fallback: string[]): string[] {
  if (!envVar) return fallback;
  return envVar.split(",").map(s => s.trim()).filter(Boolean);
}

export const MY_DIVISION_SERVICE_GROUPS = parseList(process.env["MY_DIVISION_SERVICE_GROUPS"], DEFAULT_GROUPS)
  .map(s => s.toUpperCase());

export const MY_TECHS = parseList(process.env["MY_TECHS"], DEFAULT_TECHS)
  .map(s => s.toUpperCase());

/** Service group lives in wip_records.raw_data->>'serviceGroup'. */
export function rowServiceGroup(w: { rawData?: any }): string {
  try {
    const r = typeof w.rawData === "string" ? JSON.parse(w.rawData) : (w.rawData || {});
    return String(r.serviceGroup || r.service_group || "");
  } catch {
    return "";
  }
}

/**
 * True when the row belongs to my division.
 *
 * Rule: if serviceGroup is populated, it must contain one of MY_DIVISION_SERVICE_GROUPS.
 * If serviceGroup is empty/missing (≈13% of prod WIP rows — Airtable hasn't tagged them
 * yet), fall back to "yes" so newly-imported rows don't disappear before they're
 * classified. The accompanying tech filter still gates them by crew membership, so
 * this is safe — we won't show e.g. Hugo's untagged rows to Casper, only Casper's
 * own crew's untagged rows.
 */
export function isMyDivision(w: { rawData?: any }): boolean {
  const sg = rowServiceGroup(w).toUpperCase();
  if (!sg) return true;
  return MY_DIVISION_SERVICE_GROUPS.some(g => sg.includes(g));
}

/**
 * "This job is finished" — case-insensitive across every status string we've
 * seen. Uptick uses COMPLETE / PERFORMED / OFFICEREVIEW (work done, sitting in
 * office review/sign-off). The legacy CSV importer used "Done". The Airtable
 * sync uses "Complete". All of these mean the tech is finished and the job
 * shouldn't be on the active board.
 *
 * Without this, completedToday/completedThisWeek/active counts are off by ~10x
 * because the dashboard was matching only literal "Done" while production has
 * 11 Done rows vs 96 truly-finished rows for the same period.
 */
const DONE_STATUSES = new Set(["DONE", "COMPLETE", "COMPLETED", "PERFORMED", "OFFICEREVIEW"]);
export function isDoneStatus(status: string | null | undefined): boolean {
  return DONE_STATUSES.has(String(status || "").toUpperCase());
}
export function isActiveStatus(status: string | null | undefined): boolean {
  return !isDoneStatus(status) && String(status || "").toUpperCase() !== "CANCELLED";
}

/**
 * Outstanding-invoice statuses (case-insensitive). AUTHORISED is on the books but
 * unpaid. SENT is the older Xero label for the same thing. OVERDUE is past due-date.
 * PARTIAL is partially paid. PAID/DRAFT/VOID are excluded.
 */
const OUTSTANDING_STATUSES = new Set(["AUTHORISED", "SENT", "OVERDUE", "PARTIAL"]);
export function isOutstandingInvoice(inv: { status?: string | null }): boolean {
  return OUTSTANDING_STATUSES.has(String(inv.status || "").toUpperCase());
}
export function isOverdueInvoice(inv: { status?: string | null }): boolean {
  return String(inv.status || "").toUpperCase() === "OVERDUE";
}

export function isMyTech(tech: string | null | undefined): boolean {
  if (!tech) return false;
  const t = tech.toUpperCase();
  return MY_TECHS.some(name => t.includes(name));
}

/** True when caller asked to bypass with ?division=all. */
export function isUnfiltered(req: { query?: any }): boolean {
  return String(req?.query?.division || "").toLowerCase() === "all";
}

/** Convenience: filter a WIP-record array to my division + my techs. */
export function filterMyWip<T extends { rawData?: any; assignedTech?: string | null }>(rows: T[]): T[] {
  return rows.filter(w => isMyDivision(w) && isMyTech(w.assignedTech));
}

/** Convenience: filter a job array to my techs (jobs have no service group). */
export function filterMyJobs<T extends { assignedTech?: string | null }>(rows: T[]): T[] {
  return rows.filter(j => isMyTech(j.assignedTech));
}

/**
 * Revenue-eligible invoice statuses (Xero-flavoured, case-insensitive):
 *  - PAID/PARTIAL: cash in.
 *  - AUTHORISED: invoice issued and locked, recognised as revenue even if unpaid.
 *  - DRAFT/VOID: do not count.
 */
const REVENUE_STATUSES = new Set(["PAID", "AUTHORISED", "PARTIAL"]);

export function isRevenueInvoice(inv: { status?: string | null }): boolean {
  return REVENUE_STATUSES.has(String(inv.status || "").toUpperCase());
}

/** Date to attribute revenue to: paid date if present, else issued date, else null. */
export function revenueDate(inv: { datePaid?: string | null; dateIssued?: string | null }): string | null {
  return inv.datePaid || inv.dateIssued || null;
}

export function invoiceAmount(inv: { totalAmount?: any; amount?: any }): number {
  const t = inv.totalAmount;
  if (t !== null && t !== undefined && t !== "") return Number(t);
  const a = inv.amount;
  if (a !== null && a !== undefined && a !== "") return Number(a);
  return 0;
}

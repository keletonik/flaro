/**
 * Operator-authored revenue model constants.
 *
 * Single source of truth for the four numbers that have historically
 * drifted across surfaces (KPI card, agent response, analytics page).
 * When the operator updates these, every downstream reader picks up
 * the new value.
 *
 * Source: AIDE_AI_SYSTEM_PROMPT.md §FINANCIAL INTELLIGENCE — authored
 * by Casper Tavitian / Mentaris, April 2026.
 */

export const OPS_FINANCIAL_MODEL = {
  version: "ops-fin-v1.0",
  monthlyTargetAud: 180_000,
  winRate: 0.605, // 52 / 86 at last data point
  quoteMultiplier: 1.65, // = 1 / win_rate (approx)
  avgFinalisedQuoteAud: 5_370,
  avgMarginPct: 23.3,
  targetMarginPct: 25,
  currentQuotingPaceAud: 48_551,
  currentRevenuePaceAud: 29_356,
  revenueGapAud: 150_644,
  fourLevers: [
    {
      rank: 1,
      label: "Increase quote volume",
      rationale: "Currently ~6x below the ~$298k/mo required to hit the target. Highest leverage of any single change.",
    },
    {
      rank: 2,
      label: "Invoice completed work",
      rationale: "Every PERFORMED-but-not-invoiced task is earned dollars sitting idle. Zero new work required to convert.",
    },
    {
      rank: 3,
      label: "Dispatch READY tasks",
      rationale: "Unassigned READY tasks are revenue waiting for a tech allocation. Immediate cash.",
    },
    {
      rank: 4,
      label: "Improve gross margin",
      rationale: "Each +1% gross margin is ~$4,414 additional GP at the current revenue pace.",
    },
  ],
} as const;

export type OpsFinancialModel = typeof OPS_FINANCIAL_MODEL;

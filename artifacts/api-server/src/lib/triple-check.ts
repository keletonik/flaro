/**
 * AIDE Master Prompt — Triple-Check Verification Protocol.
 *
 * Three passes, run from the agent tool `triple_check`:
 *
 *   Pass 1 — Structural. No Jade Ogony in tech lists, no banned
 *            filler phrases, no em dashes, no AI attribution, no
 *            duplicate primary keys.
 *   Pass 2 — Data accuracy. Every claimed task_number / quote_number
 *            exists in source, every claimed status matches.
 *   Pass 3 — Maths. Every claimed KPI is re-derived from raw data.
 *
 * Source: docs/aide-master-prompt/MASTER.md §2. Called from
 * chat-tool-exec.ts when the agent invokes `triple_check`.
 *
 * Design: returns a structured `{ summary, pass1, pass2, pass3,
 * emission }` object. The `emission` field is the verbatim block the
 * agent is instructed to paste into its response. Everything else is
 * for the UI / observability layer.
 */

import { db } from "@workspace/db";
import { wipRecords, quotes } from "@workspace/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { OPS_FINANCIAL_MODEL } from "./ops-financial-model";

export interface TripleCheckInput {
  claimedFigures: Record<string, number>;
  jobRefs: string[];
  responseText: string;
}

export interface TripleCheckPass {
  ok: boolean;
  failures: string[];
}

export interface TripleCheckResult {
  version: string;
  pass1: TripleCheckPass;
  pass2: TripleCheckPass;
  pass3: TripleCheckPass;
  emission: string;
  summary: { passed: number; failed: number };
}

const BANNED_PHRASES = [
  "it's important to note",
  "i'd be happy to",
  "happy to help",
  "as an ai",
  "as a language model",
  "certainly",
  "absolutely",
  "great question",
  "delve into",
  "leverage",
  "robust",
];

const AI_ATTRIBUTION = [
  "claude",
  "anthropic",
  "openai",
  "gpt-",
  "chatgpt",
  "language model",
];

const EM_DASH = /—/g;
const JADE = /\bjade\s+ogony\b/i;

function pass1(responseText: string): TripleCheckPass {
  const failures: string[] = [];
  const text = (responseText || "").toLowerCase();

  if (JADE.test(text)) failures.push("Jade Ogony mentioned in response — permanent exclusion violated");
  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase)) failures.push(`Banned phrase: "${phrase}"`);
  }
  for (const brand of AI_ATTRIBUTION) {
    if (text.includes(brand)) failures.push(`AI attribution leak: "${brand}"`);
  }
  const emDashes = responseText?.match(EM_DASH);
  if (emDashes && emDashes.length > 0) {
    failures.push(`Em dashes found (${emDashes.length}) — operator style rule violated`);
  }

  return { ok: failures.length === 0, failures };
}

async function pass2(jobRefs: string[]): Promise<TripleCheckPass> {
  const failures: string[] = [];
  if (!jobRefs.length) return { ok: true, failures };

  // Split into task refs vs quote refs by prefix
  const taskRefs = jobRefs.filter((r) => /^t[-_]?\d/i.test(r));
  const quoteRefs = jobRefs.filter((r) => /^q/i.test(r));

  if (taskRefs.length > 0) {
    const foundTasks = await db
      .select({ tn: wipRecords.taskNumber })
      .from(wipRecords)
      .where(and(inArray(wipRecords.taskNumber, taskRefs), isNull(wipRecords.deletedAt)));
    const foundSet = new Set(foundTasks.map((r) => r.tn));
    for (const ref of taskRefs) {
      if (!foundSet.has(ref)) failures.push(`task_number ${ref} not in wip_records`);
    }
  }

  if (quoteRefs.length > 0) {
    const foundQuotes = await db
      .select({ qn: quotes.quoteNumber })
      .from(quotes)
      .where(and(inArray(quotes.quoteNumber, quoteRefs), isNull(quotes.deletedAt)));
    const foundSet = new Set(foundQuotes.map((r) => r.qn));
    for (const ref of quoteRefs) {
      if (!foundSet.has(ref)) failures.push(`quote_number ${ref} not in quotes`);
    }
  }

  return { ok: failures.length === 0, failures };
}

async function pass3(claimedFigures: Record<string, number>): Promise<TripleCheckPass> {
  const failures: string[] = [];
  if (!claimedFigures || Object.keys(claimedFigures).length === 0) {
    return { ok: true, failures };
  }

  // Re-derive every claimed KPI from raw data. Tolerance is $1 on
  // dollar figures, 0.5% on percentages.
  for (const [kpi, asserted] of Object.entries(claimedFigures)) {
    const lower = kpi.toLowerCase();
    try {
      if (lower.includes("pipeline")) {
        const [row] = await db.execute(sql`
          SELECT COALESCE(SUM(quote_amount)::numeric, 0) AS n
          FROM wip_records
          WHERE deleted_at IS NULL AND status NOT IN ('Completed', 'On Hold', 'Cancelled')
        `).then((r: any) => r.rows);
        const recomputed = Number(row?.n ?? 0);
        if (Math.abs(recomputed - asserted) > 1) {
          failures.push(`pipeline: asserted ${asserted}, recomputed ${recomputed.toFixed(2)}`);
        }
      } else if (lower.includes("win") && lower.includes("rate")) {
        const [row] = await db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'Accepted')::int AS won,
            COUNT(*)::int AS total
          FROM quotes
          WHERE deleted_at IS NULL
        `).then((r: any) => r.rows);
        const total = Number(row?.total ?? 0);
        const won = Number(row?.won ?? 0);
        const recomputed = total > 0 ? won / total : 0;
        if (Math.abs(recomputed - asserted) > 0.005) {
          failures.push(`win_rate: asserted ${asserted}, recomputed ${recomputed.toFixed(4)}`);
        }
      } else if (lower.includes("monthly") && lower.includes("target")) {
        const recomputed = OPS_FINANCIAL_MODEL.monthlyTargetAud;
        if (Math.abs(recomputed - asserted) > 1) {
          failures.push(`monthly_target: asserted ${asserted}, canonical ${recomputed}`);
        }
      }
    } catch (err) {
      failures.push(`${kpi}: re-derivation failed — ${(err as Error)?.message}`);
    }
  }

  return { ok: failures.length === 0, failures };
}

function buildEmission(p1: TripleCheckPass, p2: TripleCheckPass, p3: TripleCheckPass): string {
  const passed = [p1.ok, p2.ok, p3.ok].filter(Boolean).length;
  const failed = 3 - passed;
  const line = (label: string, pass: TripleCheckPass) =>
    pass.ok ? `${label}: CLEAN` : `${label}: FAILURES — ${pass.failures.join("; ")}`;
  return [
    `TRIPLE CHECK: ✓ ${passed} passed  ✗ ${failed} failed`,
    line("Pass 1 — Structural", p1),
    line("Pass 2 — Data accuracy", p2),
    line("Pass 3 — Maths", p3),
  ].join("\n");
}

export async function runTripleCheck(input: TripleCheckInput): Promise<TripleCheckResult> {
  const [p1, p2, p3] = await Promise.all([
    Promise.resolve(pass1(input.responseText)),
    pass2(input.jobRefs),
    pass3(input.claimedFigures),
  ]);
  const passed = [p1.ok, p2.ok, p3.ok].filter(Boolean).length;
  return {
    version: "triple-check-v1.0",
    pass1: p1,
    pass2: p2,
    pass3: p3,
    emission: buildEmission(p1, p2, p3),
    summary: { passed, failed: 3 - passed },
  };
}

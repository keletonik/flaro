import { Router } from "express";
import { db, jobs } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { softDeleteEnabled } from "../lib/soft-delete";
import { isMyTech, isUnfiltered, isDoneStatus, MY_TECHS } from "../lib/division-filter";
import { pushJobToAirtable } from "../lib/airtable-sync";
import { broadcastEvent } from "../lib/events";

/**
 * Scheduling Assistant — beta
 * ---------------------------
 * Pulls every open/incomplete job (status NOT in DONE/COMPLETE/etc.) and
 * groups them into suggested "runs" per technician. A run is a cluster of
 * jobs in the same suburb that one tech can sensibly knock over together.
 *
 * Heuristics (intentionally simple — this is base-build #1):
 *   1. Filter to my-crew jobs (existing isMyTech allowlist)
 *   2. Drop anything in a done/completed status
 *   3. Bucket by assignedTech (null → "Unassigned")
 *   4. Within each tech, group by extracted suburb
 *   5. Cap a run at 8 jobs; spill into "<suburb> #2" etc.
 *   6. Sort runs by their top priority then job count
 *
 * The endpoint is read-only and does not mutate any job. The frontend uses
 * the response purely as a planning suggestion — Casper applies it manually.
 */

const router = Router();

// Ranks include an explicit "Untriaged" below Low so jobs with no
// priority set don't get silently promoted to "Low" by the reverse
// lookup. Keep Untriaged = 0 so it sorts last naturally.
const PRIORITY_RANK: Record<string, number> = {
  Critical: 4, High: 3, Medium: 2, Low: 1, Untriaged: 0,
};
const RUN_CAP = 8;

function priorityRankOf(p: string | null | undefined): number {
  if (!p) return 0;
  // Accept any case — Uptick imports arrive uppercase, Airtable title case,
  // hand-typed entries lowercase. Canonicalise before lookup.
  const key = p.trim().toLowerCase();
  if (key === "critical" || key === "urgent") return 4;
  if (key === "high") return 3;
  if (key === "medium") return 2;
  if (key === "low") return 1;
  return 0;
}

function labelFromRank(rank: number): string {
  if (rank >= 4) return "Critical";
  if (rank >= 3) return "High";
  if (rank >= 2) return "Medium";
  if (rank >= 1) return "Low";
  return "Untriaged";
}

/**
 * Extract the suburb from an Australian address. Examples handled:
 *   "12 Smith St, Parramatta NSW 2150"        → "Parramatta"
 *   "Unit 5, 100 George St, Sydney NSW"       → "Sydney"
 *   "Lvl 2, 88 Phillip St, Sydney 2000"       → "Sydney"
 *   "Shop 3, Westfield, Parramatta NSW 2150"  → "Parramatta"  (was "Westfield")
 *   "Bankstown"                               → "Bankstown"
 * Falls back to "No address" when the input is falsy so the manager
 * sees it as a data-quality signal instead of a silent "Unknown" bucket.
 */
function extractSuburb(address: string | null | undefined): string {
  if (!address) return "No address";
  let cleaned = address
    .replace(/\s+/g, " ")
    .replace(/,?\s*Australia\s*$/i, "")
    .trim();
  if (!cleaned) return "No address";

  // Strip retail/tenancy prefixes up front — "Shop 3, Westfield, Parramatta"
  // used to pick "Westfield" as the suburb. Drop any leading comma-chunk
  // that starts with a known retail token. We loop in case multiple
  // chunks at the front are prefixes (e.g. "Suite 5, Lvl 2, 100 George St …").
  const RETAIL_PREFIX = /^(shop|unit|ste|suite|lvl|level|apt|apartment|floor|fl)\b/i;
  const RETAIL_CONTAINS = /^(westfield|myer|westpoint|chatswood chase|bondi junction)\b/i;
  const segments = cleaned.split(",").map(s => s.trim());
  while (segments.length > 1 && (RETAIL_PREFIX.test(segments[0]) || RETAIL_CONTAINS.test(segments[0]))) {
    segments.shift();
  }
  cleaned = segments.join(", ");

  // Strip trailing postcode (4 digits) — both ", 2150" and " 2150" forms.
  const noPostcode = cleaned.replace(/[,\s]+\d{4}\s*$/, "").trim();
  // Strip trailing state token if present.
  const noState = noPostcode.replace(/[,\s]+(?:NSW|VIC|QLD|ACT|SA|WA|TAS|NT)\s*$/i, "").trim();
  // Suburb is the last non-empty comma chunk of what's left — but skip
  // any trailing retail chunk there too (e.g. "..., Westfield").
  const parts = noState.split(",").map(p => p.trim()).filter(Boolean);
  let idx = parts.length - 1;
  while (idx > 0 && RETAIL_CONTAINS.test(parts[idx])) idx--;
  const suburb = parts[idx];
  return suburb ? titleCase(suburb) : "No address";
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.length === 0 ? w : w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

interface SuggestedJob {
  id: string;
  taskNumber: string | null;
  site: string;
  address: string | null;
  priority: string | null;
  status: string | null;
  dueDate: string | null;
  actionRequired: string | null;
}

interface SuggestedRun {
  runId: string;
  suburb: string;
  jobCount: number;
  topPriority: string;
  jobs: SuggestedJob[];
}

interface TechBucket {
  tech: string;
  isUnassigned: boolean;
  totalOpenJobs: number;
  runs: SuggestedRun[];
}

router.get("/scheduling-suggestions", async (req, res, next) => {
  try {
    const unfiltered = isUnfiltered(req);
    const conditions = softDeleteEnabled() ? [isNull(jobs.deletedAt)] : [];
    const all = conditions.length
      ? await db.select().from(jobs).where(conditions[0])
      : await db.select().from(jobs);

    // Open = not in any done-state. CANCELLED is not "open work to schedule".
    type JobRow = typeof jobs.$inferSelect;
    const openJobs = (all as JobRow[]).filter((j: JobRow) => {
      if (isDoneStatus(j.status)) return false;
      if ((j.status ?? "").toUpperCase() === "CANCELLED") return false;
      return true;
    });

    // My-crew filter — but keep unassigned jobs visible so we can suggest who picks them up.
    const myJobs: JobRow[] = unfiltered
      ? openJobs
      : openJobs.filter((j: JobRow) => !j.assignedTech || isMyTech(j.assignedTech));

    // Bucket by tech.
    const byTech = new Map<string, typeof myJobs>();
    for (const j of myJobs) {
      const key = j.assignedTech?.trim() || "__UNASSIGNED__";
      if (!byTech.has(key)) byTech.set(key, []);
      byTech.get(key)!.push(j);
    }

    const buckets: TechBucket[] = [];
    for (const [techKey, techJobs] of byTech.entries()) {
      const isUnassigned = techKey === "__UNASSIGNED__";

      // Group by suburb.
      const bySuburb = new Map<string, typeof techJobs>();
      for (const j of techJobs) {
        const suburb = extractSuburb(j.address);
        if (!bySuburb.has(suburb)) bySuburb.set(suburb, []);
        bySuburb.get(suburb)!.push(j);
      }

      const runs: SuggestedRun[] = [];
      for (const [suburb, suburbJobs] of bySuburb.entries()) {
        // Sort within suburb: priority desc, then due date asc (nulls last).
        const sorted = [...suburbJobs].sort((a, b) => {
          const pa = priorityRankOf(a.priority);
          const pb = priorityRankOf(b.priority);
          if (pa !== pb) return pb - pa;
          const da = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
          const db_ = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
          return da - db_;
        });

        // Spill into multiple runs if we exceed the daily cap.
        const chunks: typeof sorted[] = [];
        for (let i = 0; i < sorted.length; i += RUN_CAP) {
          chunks.push(sorted.slice(i, i + RUN_CAP));
        }
        chunks.forEach((chunk, idx) => {
          const topPriorityRank = chunk.reduce(
            (acc, j) => Math.max(acc, priorityRankOf(j.priority)), 0,
          );
          const topPriority = labelFromRank(topPriorityRank);
          runs.push({
            runId: `${techKey}::${suburb}::${idx + 1}`.toLowerCase().replace(/\s+/g, "-"),
            suburb: chunks.length > 1 ? `${suburb} #${idx + 1}` : suburb,
            jobCount: chunk.length,
            topPriority,
            jobs: chunk.map(j => ({
              id: j.id,
              taskNumber: j.taskNumber ?? null,
              site: j.site,
              address: j.address ?? null,
              priority: j.priority ?? null,
              status: j.status ?? null,
              dueDate: j.dueDate ?? null,
              actionRequired: j.actionRequired ?? null,
            })),
          });
        });
      }

      // Order runs: highest priority first, then largest cluster.
      runs.sort((a, b) => {
        const pa = PRIORITY_RANK[a.topPriority] ?? 0;
        const pb = PRIORITY_RANK[b.topPriority] ?? 0;
        if (pa !== pb) return pb - pa;
        return b.jobCount - a.jobCount;
      });

      buckets.push({
        tech: isUnassigned ? "Unassigned" : techKey,
        isUnassigned,
        totalOpenJobs: techJobs.length,
        runs,
      });
    }

    // Order tech buckets: heaviest workload first (so the 1500-job tech
    // surfaces ahead of the 10-job tech). Unassigned is always last — it's
    // a destination bucket for dispatch, not a working tech.
    buckets.sort((a, b) => {
      if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? 1 : -1;
      if (a.totalOpenJobs !== b.totalOpenJobs) return b.totalOpenJobs - a.totalOpenJobs;
      return a.tech.localeCompare(b.tech);
    });

    res.json({
      generatedAt: new Date().toISOString(),
      version: "beta-2",
      totalOpenJobs: myJobs.length,
      knownCrew: MY_TECHS,
      buckets,
    });
  } catch (err) { next(err); }
});

// ── Reassign ─────────────────────────────────────────────────────────────
// Drag-to-reassign from the Scheduling page fires POST /reassign with
// { jobId, newTech }. newTech must be one of MY_TECHS or the sentinel
// "Unassigned" (which clears the column). Writes to DB, triggers Airtable
// write-back, broadcasts a data_change so every open tab refetches.

const KNOWN_TECHS = [
  "Gordon Jenkins",
  "Darren Brailey",
  "Haider Al-Heyoury",
  "John Minai",
  "Nu Unasa",
  "TBC",
];

router.post("/scheduling-suggestions/reassign", async (req, res, next) => {
  try {
    const { jobId, newTech } = (req.body ?? {}) as { jobId?: string; newTech?: string | null };
    if (!jobId || typeof jobId !== "string") {
      res.status(400).json({ error: "jobId is required" });
      return;
    }

    // Normalise + validate the target tech. null/""/Unassigned all clear
    // the column; anything else must match a known tech name exactly.
    let assignedTech: string | null = null;
    if (newTech && newTech.trim() && newTech.trim().toLowerCase() !== "unassigned") {
      const match = KNOWN_TECHS.find(t => t.toLowerCase() === newTech.trim().toLowerCase());
      if (!match) {
        res.status(400).json({
          error: `Unknown tech "${newTech}". Allowed: ${KNOWN_TECHS.join(", ")} or "Unassigned".`,
        });
        return;
      }
      assignedTech = match;
    }

    const [existing] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }

    const [updated] = await db.update(jobs)
      .set({ assignedTech, updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
      .returning();

    // Fire-and-forget write-back to Airtable. Errors are logged inside
    // the helper and don't block the response.
    void pushJobToAirtable(jobId);
    broadcastEvent("data_change", { source: "scheduling-reassign", jobId, assignedTech });

    res.json({
      jobId: updated.id,
      taskNumber: updated.taskNumber,
      assignedTech: updated.assignedTech,
    });
  } catch (err) { next(err); }
});

export default router;

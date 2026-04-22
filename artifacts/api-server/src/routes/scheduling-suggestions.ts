import { Router } from "express";
import { db, jobs } from "@workspace/db";
import { isNull } from "drizzle-orm";
import { softDeleteEnabled } from "../lib/soft-delete";
import { isMyTech, isUnfiltered, isDoneStatus, MY_TECHS } from "../lib/division-filter";

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

const PRIORITY_RANK: Record<string, number> = {
  Critical: 4, High: 3, Medium: 2, Low: 1,
};
const RUN_CAP = 8;

/**
 * Extract the suburb from an Australian address. Examples handled:
 *   "12 Smith St, Parramatta NSW 2150"     → "Parramatta"
 *   "Unit 5, 100 George St, Sydney NSW"    → "Sydney"
 *   "Lvl 2, 88 Phillip St, Sydney 2000"    → "Sydney"
 *   "Bankstown"                            → "Bankstown"
 * Falls back to "Unknown" when nothing extractable.
 */
function extractSuburb(address: string | null | undefined): string {
  if (!address) return "Unknown";
  const cleaned = address
    .replace(/\s+/g, " ")
    .replace(/,?\s*Australia\s*$/i, "")
    .trim();
  if (!cleaned) return "Unknown";

  // Strip trailing postcode (4 digits) — both ", 2150" and " 2150" forms.
  const noPostcode = cleaned.replace(/[,\s]+\d{4}\s*$/, "").trim();
  // Strip trailing state token if present.
  const noState = noPostcode.replace(/[,\s]+(?:NSW|VIC|QLD|ACT|SA|WA|TAS|NT)\s*$/i, "").trim();
  // Suburb is the last non-empty comma chunk of what's left.
  const parts = noState.split(",").map(p => p.trim()).filter(Boolean);
  const suburb = parts[parts.length - 1];
  return suburb ? titleCase(suburb) : "Unknown";
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
    const openJobs = all.filter(j => {
      if (isDoneStatus(j.status)) return false;
      if ((j.status ?? "").toUpperCase() === "CANCELLED") return false;
      return true;
    });

    // My-crew filter — but keep unassigned jobs visible so we can suggest who picks them up.
    const myJobs = unfiltered
      ? openJobs
      : openJobs.filter(j => !j.assignedTech || isMyTech(j.assignedTech));

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
          const pa = PRIORITY_RANK[a.priority ?? ""] ?? 0;
          const pb = PRIORITY_RANK[b.priority ?? ""] ?? 0;
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
            (acc, j) => Math.max(acc, PRIORITY_RANK[j.priority ?? ""] ?? 0), 0,
          );
          const topPriority =
            Object.entries(PRIORITY_RANK).find(([, v]) => v === topPriorityRank)?.[0] ?? "Low";
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

    // Order tech buckets: real techs first (alpha), unassigned last.
    buckets.sort((a, b) => {
      if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? 1 : -1;
      return a.tech.localeCompare(b.tech);
    });

    res.json({
      generatedAt: new Date().toISOString(),
      version: "beta-1",
      totalOpenJobs: myJobs.length,
      knownCrew: MY_TECHS,
      buckets,
    });
  } catch (err) { next(err); }
});

export default router;

/**
 * GET /api/kpi/metrics — aggregate bento-block numbers for the dashboard.
 *
 * CANONICAL NUMBERS: fields marked "// via metric registry" below read
 * from `lib/metrics/*` instead of re-aggregating here. The hand-rolled
 * rollups are kept for the fields that don't yet have a named metric
 * (overview counts, wip byTech, quotes byStatus) — those will migrate
 * across as Pass 4 proceeds.
 *
 * See docs/audit/PASS_4_analytics.md §3.1 for why "revenue this month"
 * used to be computed three different ways and why it must not be.
 */

import { Router } from "express";
import { db, pool } from "@workspace/db";
import { jobs, wipRecords, quotes, defects, invoices, todos } from "@workspace/db";
import { computeMetric } from "../lib/metrics/registry";
import {
  isMyDivision,
  isMyTech,
  isUnfiltered,
  isRevenueInvoice,
  revenueDate,
  invoiceAmount as invAmt,
  isOutstandingInvoice,
  isOverdueInvoice,
  isDoneStatus,
  isActiveStatus,
} from "../lib/division-filter";

const router = Router();

// Light cache so the dashboard's 20s refetch interval doesn't hammer the DB
// with five full-table scans every tick on every open client.
const kpiCache = new Map<string, { data: any; expires: number }>();
export function invalidateKpiCache() { kpiCache.clear(); }

router.get("/kpi/metrics", async (req, res, next) => {
  try {
    const unfiltered = isUnfiltered(req);
    const cacheKey = unfiltered ? "kpi-all" : "kpi-mine";
    const cached = kpiCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) { res.json(cached.data); return; }
    const [allJobsRaw, allWipRaw, allQuotesRaw, allDefects, allInvoicesRaw, allTodos] = await Promise.all([
      db.select().from(jobs),
      db.select().from(wipRecords),
      db.select().from(quotes),
      db.select().from(defects),
      db.select().from(invoices),
      db.select().from(todos),
    ]);

    const allWip = unfiltered ? allWipRaw : allWipRaw.filter(w => isMyDivision(w) && isMyTech(w.assignedTech));
    const allJobs = unfiltered ? allJobsRaw : allJobsRaw.filter(j => isMyTech(j.assignedTech));
    const myTaskNumbers = new Set(allWip.map(w => w.taskNumber).filter(Boolean) as string[]);
    const allInvoices = unfiltered
      ? allInvoicesRaw
      : allInvoicesRaw.filter(i => !i.taskNumber || myTaskNumbers.has(i.taskNumber));
    const allQuotes = unfiltered
      ? allQuotesRaw
      : allQuotesRaw.filter(q => !q.taskNumber || myTaskNumbers.has(q.taskNumber));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Done = Done | Complete | COMPLETE | PERFORMED | OFFICEREVIEW (Uptick / Airtable variants).
    const activeJobs = allJobs.filter(j => isActiveStatus(j.status));
    const completedThisWeek = allJobs.filter(j => isDoneStatus(j.status) && j.updatedAt >= weekStart);
    const completedToday = allJobs.filter(j => isDoneStatus(j.status) && j.updatedAt >= today);

    const activeWip = allWip.filter(w => isActiveStatus(w.status));
    const wipRevenue = allWip.reduce((sum, w) => sum + (w.quoteAmount ? Number(w.quoteAmount) : 0), 0);
    const wipInvoiced = allWip.reduce((sum, w) => sum + (w.invoiceAmount ? Number(w.invoiceAmount) : 0), 0);

    const pendingQuotes = allQuotes.filter(q => q.status === "Sent" || q.status === "Draft");
    const acceptedQuotes = allQuotes.filter(q => q.status === "Accepted");
    const quotesTotal = allQuotes.reduce((sum, q) => sum + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0);
    const quotesAcceptedTotal = acceptedQuotes.reduce((sum, q) => sum + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0);

    const openDefects = allDefects.filter(d => d.status === "Open" || d.status === "Quoted");
    const criticalDefects = allDefects.filter(d => d.severity === "Critical" && d.status !== "Resolved");

    // Case-insensitive status match. Real Xero data has both AUTHORISED (modern)
    // and Sent (legacy) for the "issued, not yet paid" state — using literal
    // === "Sent" misses ~95% of outstanding invoices.
    const outstandingInvoices = allInvoices.filter(isOutstandingInvoice);
    const overdueInvoices = allInvoices.filter(isOverdueInvoice);
    const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + invAmt(i), 0);
    // Canonical revenue-this-month comes from the metric registry.
    // Falls back to the legacy hand-rolled sum only if the registry
    // call errors — should never happen, but keeps the dashboard
    // resilient while we migrate the other fields across.
    // Revenue: AUTHORISED/PAID/PARTIAL (case-insensitive), attributed to date_paid
    // if known else date_issued. Aligns with /api/analytics/wip — single source.
    // The metric-registry path is bypassed when divisional filtering is active
    // (the registry doesn't know about divisions yet).
    const revenueRows = allInvoices
      .filter(isRevenueInvoice)
      .map(i => ({ i, d: revenueDate(i) }))
      .filter(x => x.d) as { i: typeof allInvoices[number]; d: string }[];
    let revenueThisMonth = 0;
    if (unfiltered) {
      try {
        const mtdMetric = await computeMetric(pool as any, "revenue_vs_target_mtd", { period: "mtd" });
        revenueThisMonth = mtdMetric.headline ?? 0;
      } catch (e) {
        revenueThisMonth = revenueRows
          .filter(x => new Date(x.d) >= monthStart)
          .reduce((sum, x) => sum + invAmt(x.i), 0);
      }
    } else {
      revenueThisMonth = revenueRows
        .filter(x => new Date(x.d) >= monthStart)
        .reduce((sum, x) => sum + invAmt(x.i), 0);
    }
    const revenueThisWeek = revenueRows
      .filter(x => new Date(x.d) >= weekStart)
      .reduce((sum, x) => sum + invAmt(x.i), 0);

    const activeTodos = allTodos.filter(t => !t.completed);
    const overdueTodos = allTodos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today);

    res.json({
      overview: {
        activeJobs: activeJobs.length,
        completedToday: completedToday.length,
        completedThisWeek: completedThisWeek.length,
        criticalJobs: activeJobs.filter(j => j.priority === "Critical").length,
        activeTodos: activeTodos.length,
        overdueTodos: overdueTodos.length,
      },
      wip: {
        total: allWip.length,
        active: activeWip.length,
        totalQuoteValue: wipRevenue,
        totalInvoiced: wipInvoiced,
        byStatus: countBy(allWip, "status"),
        byTech: countBy(activeWip, "assignedTech"),
      },
      quotes: {
        total: allQuotes.length,
        pending: pendingQuotes.length,
        accepted: acceptedQuotes.length,
        totalValue: quotesTotal,
        acceptedValue: quotesAcceptedTotal,
        conversionRate: allQuotes.length ? Math.round((acceptedQuotes.length / allQuotes.length) * 100) : 0,
        byStatus: countBy(allQuotes, "status"),
      },
      defects: {
        total: allDefects.length,
        open: openDefects.length,
        critical: criticalDefects.length,
        bySeverity: countBy(allDefects, "severity"),
        byStatus: countBy(allDefects, "status"),
      },
      invoices: {
        total: allInvoices.length,
        outstanding: outstandingInvoices.length,
        overdue: overdueInvoices.length,
        outstandingTotal,
        revenueThisWeek,
        revenueThisMonth,
        byStatus: countBy(allInvoices, "status"),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

function countBy<T extends Record<string, any>>(arr: T[], key: keyof T): Record<string, number> {
  const counts: Record<string, number> = {};
  arr.forEach(item => {
    const val = String(item[key] || "Unknown");
    counts[val] = (counts[val] || 0) + 1;
  });
  return counts;
}

export default router;

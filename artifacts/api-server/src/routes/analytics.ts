import { Router } from "express";
import { db } from "@workspace/db";
import { jobs, wipRecords, quotes, defects, invoices } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// Simple in-memory cache with 60-second TTL
const cache = new Map<string, { data: any; expires: number }>();
function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  return null;
}
function setCache(key: string, data: any, ttlMs = 60000) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// Exposed so mutations elsewhere in the API can invalidate stale analytics snapshots.
export function invalidateAnalyticsCache() {
  cache.clear();
}

router.get("/analytics/wip", async (req, res, next) => {
  const cached = getCached("analytics-wip");
  if (cached) { res.json(cached); return; }
  try {
    const allWip = await db.select().from(wipRecords);
    const allJobs = await db.select().from(jobs);
    const allQuotes = await db.select().from(quotes);
    const allInvoices = await db.select().from(invoices);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Revenue target — configurable via env var, defaults to $180k
    const MONTHLY_TARGET = Number(process.env.MONTHLY_REVENUE_TARGET) || 180000;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const dailyTarget = MONTHLY_TARGET / daysInMonth;
    const proRataTarget = dailyTarget * dayOfMonth;

    // Calculate revenue by period
    const paidInvoices = allInvoices.filter(i => i.status === "Paid" && i.datePaid);

    function getWeekStart(d: Date): Date {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.getFullYear(), d.getMonth(), diff);
    }

    // Revenue by day (last 30 days)
    const revenueByDay: { date: string; revenue: number; target: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayRevenue = paidInvoices
        .filter(inv => inv.datePaid && inv.datePaid.startsWith(dateStr))
        .reduce((sum, inv) => sum + (inv.totalAmount ? Number(inv.totalAmount) : (inv.amount ? Number(inv.amount) : 0)), 0);
      revenueByDay.push({ date: dateStr, revenue: dayRevenue, target: dailyTarget });
    }

    // Revenue by week (last 12 weeks)
    const revenueByWeek: { week: string; revenue: number; target: number }[] = [];
    const weeklyTarget = MONTHLY_TARGET / 4.33;
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const ws = getWeekStart(weekStart);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      const wsStr = ws.toISOString().split("T")[0];
      const weStr = we.toISOString().split("T")[0];
      const weekRevenue = paidInvoices
        .filter(inv => inv.datePaid && inv.datePaid >= wsStr && inv.datePaid <= weStr)
        .reduce((sum, inv) => sum + (inv.totalAmount ? Number(inv.totalAmount) : (inv.amount ? Number(inv.amount) : 0)), 0);
      revenueByWeek.push({ week: `W${12 - i} (${ws.getDate()}/${ws.getMonth() + 1})`, revenue: weekRevenue, target: weeklyTarget });
    }

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number; target: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const mStr = m.toISOString().split("T")[0];
      const mEndStr = mEnd.toISOString().split("T")[0];
      const monthRevenue = paidInvoices
        .filter(inv => inv.datePaid && inv.datePaid >= mStr && inv.datePaid <= mEndStr)
        .reduce((sum, inv) => sum + (inv.totalAmount ? Number(inv.totalAmount) : (inv.amount ? Number(inv.amount) : 0)), 0);
      const monthName = m.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      revenueByMonth.push({ month: monthName, revenue: monthRevenue, target: MONTHLY_TARGET });
    }

    // WIP by status
    const wipByStatus: Record<string, number> = {};
    allWip.forEach(w => { wipByStatus[w.status] = (wipByStatus[w.status] || 0) + 1; });

    // WIP by tech
    const wipByTech: Record<string, { count: number; value: number }> = {};
    allWip.forEach(w => {
      const tech = w.assignedTech || "Unassigned";
      if (!wipByTech[tech]) wipByTech[tech] = { count: 0, value: 0 };
      wipByTech[tech].count++;
      wipByTech[tech].value += w.quoteAmount ? Number(w.quoteAmount) : 0;
    });

    // WIP by job type
    const wipByType: Record<string, number> = {};
    allWip.forEach(w => { const t = w.jobType || "Other"; wipByType[t] = (wipByType[t] || 0) + 1; });

    // WIP value by status
    const wipValueByStatus: Record<string, number> = {};
    allWip.forEach(w => { wipValueByStatus[w.status] = (wipValueByStatus[w.status] || 0) + (w.quoteAmount ? Number(w.quoteAmount) : 0); });

    // Tasks completed over time (last 30 days)
    const completedByDay: { date: string; completed: number }[] = [];
    const completedJobs = allJobs.filter(j => j.status === "Done");
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = completedJobs.filter(j => j.updatedAt.toISOString().split("T")[0] === dateStr).length;
      completedByDay.push({ date: dateStr, completed: count });
    }

    // Average completion time (days between created and done)
    const completionTimes = completedJobs
      .filter(j => j.createdAt && j.updatedAt)
      .map(j => (j.updatedAt.getTime() - j.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const avgCompletionDays = completionTimes.length ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10 : 0;

    // Quote conversion funnel
    const quoteFunnel = {
      total: allQuotes.length,
      sent: allQuotes.filter(q => q.status === "Sent").length,
      accepted: allQuotes.filter(q => q.status === "Accepted").length,
      declined: allQuotes.filter(q => q.status === "Declined").length,
      expired: allQuotes.filter(q => q.status === "Expired").length,
      totalValue: allQuotes.reduce((s, q) => s + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0),
      acceptedValue: allQuotes.filter(q => q.status === "Accepted").reduce((s, q) => s + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0),
    };

    // Revenue summary
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const thisWeekStart = getWeekStart(today).toISOString().split("T")[0];
    const thisWeekEnd = (() => { const d = getWeekStart(today); d.setDate(d.getDate() + 6); return d.toISOString().split("T")[0]; })();

    const revenueThisMonth = paidInvoices.filter(i => i.datePaid && i.datePaid >= thisMonthStart && i.datePaid <= thisMonthEnd)
      .reduce((s, i) => s + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);
    const revenueThisWeek = paidInvoices.filter(i => i.datePaid && i.datePaid >= thisWeekStart && i.datePaid <= thisWeekEnd)
      .reduce((s, i) => s + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);
    const revenueToday = paidInvoices.filter(i => i.datePaid && i.datePaid.startsWith(today.toISOString().split("T")[0]))
      .reduce((s, i) => s + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);

    // Outstanding pipeline
    const outstandingInvoices = allInvoices.filter(i => i.status === "Sent" || i.status === "Overdue");
    const outstandingTotal = outstandingInvoices.reduce((s, i) => s + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);
    const overdueTotal = allInvoices.filter(i => i.status === "Overdue").reduce((s, i) => s + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);

    // WIP pipeline total
    const wipPipelineTotal = allWip.filter(w => w.status !== "Completed").reduce((s, w) => s + (w.quoteAmount ? Number(w.quoteAmount) : 0), 0);

    const result = {
      revenue: {
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
        monthlyTarget: MONTHLY_TARGET,
        proRataTarget,
        progressPercent: MONTHLY_TARGET > 0 ? Math.round((revenueThisMonth / MONTHLY_TARGET) * 100) : 0,
        byDay: revenueByDay,
        byWeek: revenueByWeek,
        byMonth: revenueByMonth,
      },
      wip: {
        total: allWip.length,
        active: allWip.filter(w => w.status !== "Completed").length,
        pipelineValue: wipPipelineTotal,
        byStatus: wipByStatus,
        byTech: Object.entries(wipByTech).map(([tech, d]) => ({ tech, ...d })),
        byType: wipByType,
        valueByStatus: wipValueByStatus,
      },
      tasks: {
        totalCompleted: completedJobs.length,
        activeJobs: allJobs.filter(j => j.status !== "Done").length,
        avgCompletionDays,
        completedByDay,
      },
      quotes: quoteFunnel,
      invoices: {
        outstanding: outstandingTotal,
        overdue: overdueTotal,
        total: allInvoices.length,
      },
      generatedAt: new Date().toISOString(),
    };
    setCache("analytics-wip", result);
    res.json(result);
  } catch (err) { next(err); }
});

// Quote-to-Invoice Pipeline Gap Detection
router.get("/analytics/pipeline-gaps", async (req, res, next) => {
  const cached = getCached("pipeline-gaps");
  if (cached) { res.json(cached); return; }
  try {
    const allQuotes = await db.select().from(quotes);
    const allWip = await db.select().from(wipRecords);
    const allInvoices = await db.select().from(invoices);

    // Gap A: Accepted quotes with no corresponding WIP record
    const acceptedQuotes = allQuotes.filter(q => q.status === "Accepted");
    const wipTaskNumbers = new Set(allWip.map(w => w.taskNumber).filter(Boolean));
    const quotesWithoutWip = acceptedQuotes.filter(q => q.taskNumber && !wipTaskNumbers.has(q.taskNumber));

    // Gap B: Completed WIP with no invoice raised
    const completedWip = allWip.filter(w => w.status === "Completed");
    const invoiceTaskNumbers = new Set(allInvoices.map(i => i.taskNumber).filter(Boolean));
    const wipWithoutInvoice = completedWip.filter(w => w.taskNumber && !invoiceTaskNumbers.has(w.taskNumber));

    // Gap C: Invoices significantly less than quoted amount
    const underInvoiced = allInvoices.filter(inv => {
      if (!inv.taskNumber) return false;
      const quote = allQuotes.find(q => q.taskNumber === inv.taskNumber && q.status === "Accepted");
      if (!quote || !quote.quoteAmount) return false;
      const quoteAmt = Number(quote.quoteAmount);
      const invAmt = Number(inv.totalAmount || inv.amount || 0);
      return quoteAmt > 0 && invAmt > 0 && invAmt < quoteAmt * 0.85;
    }).map(inv => {
      const quote = allQuotes.find(q => q.taskNumber === inv.taskNumber);
      return {
        invoiceNumber: inv.invoiceNumber, taskNumber: inv.taskNumber, site: inv.site, client: inv.client,
        invoiceAmount: Number(inv.totalAmount || inv.amount || 0),
        quoteAmount: Number(quote?.quoteAmount || 0),
        gap: Number(quote?.quoteAmount || 0) - Number(inv.totalAmount || inv.amount || 0),
      };
    });

    const totalAtRisk = quotesWithoutWip.reduce((s, q) => s + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0)
      + wipWithoutInvoice.reduce((s, w) => s + (w.quoteAmount ? Number(w.quoteAmount) : 0), 0)
      + underInvoiced.reduce((s, i) => s + i.gap, 0);

    const gapResult = {
      totalAtRisk,
      quotesWithoutWip: quotesWithoutWip.map(q => ({
        quoteNumber: q.quoteNumber, taskNumber: q.taskNumber, site: q.site, client: q.client,
        amount: q.quoteAmount ? Number(q.quoteAmount) : 0,
      })),
      wipWithoutInvoice: wipWithoutInvoice.map(w => ({
        taskNumber: w.taskNumber, site: w.site, client: w.client,
        amount: w.quoteAmount ? Number(w.quoteAmount) : 0,
      })),
      underInvoiced,
      summary: {
        acceptedQuotesTotal: acceptedQuotes.length,
        quotesWithoutWipCount: quotesWithoutWip.length,
        quotesWithoutWipValue: quotesWithoutWip.reduce((s, q) => s + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0),
        wipWithoutInvoiceCount: wipWithoutInvoice.length,
        wipWithoutInvoiceValue: wipWithoutInvoice.reduce((s, w) => s + (w.quoteAmount ? Number(w.quoteAmount) : 0), 0),
        underInvoicedCount: underInvoiced.length,
        underInvoicedGap: underInvoiced.reduce((s, i) => s + i.gap, 0),
      },
    };
    setCache("pipeline-gaps", gapResult);
    res.json(gapResult);
  } catch (err) { next(err); }
});

export default router;

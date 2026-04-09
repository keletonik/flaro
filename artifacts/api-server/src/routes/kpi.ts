import { Router } from "express";
import { db } from "@workspace/db";
import { jobs, wipRecords, quotes, defects, invoices, todos } from "@workspace/db";

const router = Router();

router.get("/kpi/metrics", async (req, res, next) => {
  try {
    const [allJobs, allWip, allQuotes, allDefects, allInvoices, allTodos] = await Promise.all([
      db.select().from(jobs),
      db.select().from(wipRecords),
      db.select().from(quotes),
      db.select().from(defects),
      db.select().from(invoices),
      db.select().from(todos),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const activeJobs = allJobs.filter(j => j.status !== "Done");
    const completedThisWeek = allJobs.filter(j => j.status === "Done" && j.updatedAt >= weekStart);
    const completedToday = allJobs.filter(j => j.status === "Done" && j.updatedAt >= today);

    const activeWip = allWip.filter(w => w.status !== "Completed");
    const wipRevenue = allWip.reduce((sum, w) => sum + (w.quoteAmount ? Number(w.quoteAmount) : 0), 0);
    const wipInvoiced = allWip.reduce((sum, w) => sum + (w.invoiceAmount ? Number(w.invoiceAmount) : 0), 0);

    const pendingQuotes = allQuotes.filter(q => q.status === "Sent" || q.status === "Draft");
    const acceptedQuotes = allQuotes.filter(q => q.status === "Accepted");
    const quotesTotal = allQuotes.reduce((sum, q) => sum + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0);
    const quotesAcceptedTotal = acceptedQuotes.reduce((sum, q) => sum + (q.quoteAmount ? Number(q.quoteAmount) : 0), 0);

    const openDefects = allDefects.filter(d => d.status === "Open" || d.status === "Quoted");
    const criticalDefects = allDefects.filter(d => d.severity === "Critical" && d.status !== "Resolved");

    const outstandingInvoices = allInvoices.filter(i => i.status === "Sent" || i.status === "Overdue");
    const overdueInvoices = allInvoices.filter(i => i.status === "Overdue");
    const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);
    const paidThisMonth = allInvoices.filter(i => i.status === "Paid" && i.datePaid && new Date(i.datePaid) >= monthStart);
    const revenueThisMonth = paidThisMonth.reduce((sum, i) => sum + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);
    const revenueThisWeek = allInvoices.filter(i => i.status === "Paid" && i.datePaid && new Date(i.datePaid) >= weekStart)
      .reduce((sum, i) => sum + (i.totalAmount ? Number(i.totalAmount) : (i.amount ? Number(i.amount) : 0)), 0);

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

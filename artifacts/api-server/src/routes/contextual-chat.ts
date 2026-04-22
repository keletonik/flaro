import { Router } from "express";
import { db } from "@workspace/db";
import { wipRecords, quotes, defects, invoices, suppliers, supplierProducts, jobs } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { isActiveStatus } from "../lib/division-filter";

const router = Router();

type SectionType = "wip" | "quotes" | "defects" | "invoices" | "suppliers" | "dashboard" | "tasks";

const UPTICK_CONTEXT = `
UPTICK DOMAIN KNOWLEDGE:
- Uptick is the primary field service management platform used by the business
- Task types: I&T (Inspection & Testing from routines), Callout (ad-hoc), Repair (from approved defect quotes)
- Task statuses: Not Ready → Ready → Scheduled → In Progress → Performed → Office Review/Revisit/On Hold → Completed → Archived
- Remark severity levels: Informational, Recommendation, Non-Conformance, Non-Critical Defect, Impairment (Severity 10 — system out of order)
- Remark statuses: Unpublished → Open → Open (Quoted) → Resolved (Pending) → Resolved
- Defect Quote flow: Draft → Finalised → Submitted → Approved → Actioned (also: Declined, Expired)
- Service Quote flow: Draft → Finalised → Submitted → Approved → Completed
- Invoice statuses: Draft → Authorised → Paid
- Billing types: Fixed (flat fee intervals) or Do & Charge (per-asset or per-visit fee)
- Compliance standards: AS 1851-2012 (routine maintenance), AS 1670.1-2018 (detection/alarm), AS 1670.4-2018
- NSW framework: EP&A Act 1979, AFSS (Annual Fire Safety Statement), EFSM compliance
- Service Groups: define trade areas (Sprinkler, Electrical, Portable Equipment, etc.)
- Routines: recurring service schedules tied to asset types at set frequencies (monthly/quarterly/annual)
- Revenue target: $180,000/month

RULES:
- Be direct, efficient, no corporate waffle
- Australian English (colour, organise, prioritise)
- Never use robotic phrasing
- Reference actual numbers from the data when answering
- When asked to format for presentation, use clean structured summaries suitable for management reports
- Provide actionable insights, not just observations
`;

const SECTION_PROMPTS: Record<SectionType, string> = {
  wip: `You are a senior operations analyst for a fire protection service division. You're analysing Work in Progress (WIP) data extracted from Uptick.

Your expertise: scheduling optimisation, revenue maximisation, workload distribution across technicians, identifying bottlenecks, and prioritising jobs by value and urgency. You understand that WIP records represent active repair tasks with quote values, authorised amounts, assigned technicians, and scheduling dates. You know the Uptick task lifecycle and can advise on which jobs to prioritise for invoicing and which are at risk of going stale.
${UPTICK_CONTEXT}`,

  quotes: `You are a senior sales pipeline analyst for a fire protection company. You're analysing quote data from Uptick.

Your expertise: quote conversion rate analysis, identifying high-value opportunities, tracking follow-ups needed, optimising the quoting process, and forecasting revenue from the pipeline. You understand defect quotes (from inspections) vs service quotes (maintenance proposals), their different status flows, and how quote approval drives repair task creation and revenue.
${UPTICK_CONTEXT}`,

  defects: `You are a senior compliance and defect management analyst for a fire protection company. You're analysing defect/remark data from Uptick inspections.

Your expertise: defect pattern analysis, identifying buildings with recurring issues, prioritising critical safety defects by severity level, tracking remediation progress, and assessing compliance risk. You understand remark severities (Informational through Impairment), the quoting pipeline from defect to rectification, and the regulatory obligations under AS 1851 and AS 1670 standards.
${UPTICK_CONTEXT}`,

  invoices: `You are a senior financial analyst for a fire protection company. You're analysing invoice and accounts receivable data.

Your expertise: outstanding invoice analysis, overdue account identification, revenue metrics, cash flow optimisation, aged receivables breakdown, and revenue forecasting. You understand Uptick's invoice lifecycle (Draft → Authorised → Paid), billing contract types (Fixed vs Do & Charge), and how revenue flows from completed tasks through to accounting integration with Xero/MYOB.
${UPTICK_CONTEXT}`,

  suppliers: `You are a procurement specialist for a fire protection company in Sydney, NSW. You have access to the supplier directory and product price lists.

Your expertise: product pricing comparison across suppliers, identifying best deals, managing procurement decisions, tracking supplier performance, and optimising material costs. You know fire protection equipment categories: fire panels, detectors, extinguishers, sprinklers, emergency lighting, and electrical components.
${UPTICK_CONTEXT}`,

  dashboard: `You are a senior operations strategist for a fire protection service division. You have access to ALL operational data — jobs, WIP, quotes, defects, invoices, tasks, and financial metrics.

Your expertise: strategic operations analysis, performance trend identification, executive-level summaries, KPI tracking against the $180k monthly revenue target, workload balancing across technicians, and identifying operational risks. When asked to summarise or report, produce clean structured output suitable for presenting to management.
${UPTICK_CONTEXT}`,

  tasks: `You are a productivity and task management specialist helping a fire protection service manager optimise their daily workflow.

Your expertise: task prioritisation, dependency identification, optimal daily scheduling, flagging overdue items, and workload management. You understand the urgency framework: Critical = safety/compliance risk, High = client impact this week, Medium = this fortnight, Low = when convenient.
${UPTICK_CONTEXT}`,
};

async function fetchSectionData(section: SectionType): Promise<string> {
  switch (section) {
    case "wip": {
      const data = await db.select().from(wipRecords);
      if (!data.length) return "No WIP records in the system yet.";
      return `WIP Records (${data.length} total):\n${data.slice(0, 100).map(r =>
        `Task: ${r.taskNumber || "-"} | Site: ${r.site} | Client: ${r.client} | Type: ${r.jobType || "-"} | Status: ${r.status} | Tech: ${r.assignedTech || "-"} | Quote: $${r.quoteAmount || 0} | Invoice: $${r.invoiceAmount || 0} | Due: ${r.dueDate || "-"}`
      ).join("\n")}${data.length > 100 ? `\n... and ${data.length - 100} more records` : ""}`;
    }
    case "quotes": {
      const data = await db.select().from(quotes);
      if (!data.length) return "No quotes in the system yet.";
      return `Quotes (${data.length} total):\n${data.slice(0, 100).map(r =>
        `Quote: ${r.quoteNumber || r.taskNumber || "-"} | Site: ${r.site} | Client: ${r.client} | Amount: $${r.quoteAmount || 0} | Status: ${r.status} | Created: ${r.dateCreated || "-"}`
      ).join("\n")}`;
    }
    case "defects": {
      const data = await db.select().from(defects);
      if (!data.length) return "No defects in the system yet.";
      return `Defects (${data.length} total):\n${data.slice(0, 100).map(r =>
        `Task: ${r.taskNumber || "-"} | Site: ${r.site} | Client: ${r.client} | Severity: ${r.severity} | Status: ${r.status} | Type: ${r.assetType || "-"} | Location: ${r.location || "-"}`
      ).join("\n")}`;
    }
    case "invoices": {
      const data = await db.select().from(invoices);
      if (!data.length) return "No invoices in the system yet.";
      return `Invoices (${data.length} total):\n${data.slice(0, 100).map(r =>
        `Invoice: ${r.invoiceNumber || "-"} | Client: ${r.client} | Amount: $${r.totalAmount || r.amount || 0} | Status: ${r.status} | Due: ${r.dateDue || "-"} | Issued: ${r.dateIssued || "-"}`
      ).join("\n")}`;
    }
    case "suppliers": {
      const [sups, prods] = await Promise.all([
        db.select().from(suppliers),
        db.select().from(supplierProducts),
      ]);
      let text = `Suppliers (${sups.length} total):\n${sups.map(s =>
        `${s.name} | Category: ${s.category} | Contact: ${s.contactName || "-"} | Phone: ${s.phone || "-"} | Suburb: ${s.suburb || "-"} | Rating: ${s.rating}`
      ).join("\n")}`;
      if (prods.length) {
        text += `\n\nProduct Catalogue (${prods.length} items):\n${prods.slice(0, 200).map(p =>
          `${p.productName} | Code: ${p.productCode || "-"} | Brand: ${p.brand || "-"} | Price: $${p.unitPrice || "-"} per ${p.unit || "each"} | Supplier: ${sups.find(s => s.id === p.supplierId)?.name || "-"}`
        ).join("\n")}`;
      }
      return text;
    }
    case "dashboard": {
      const [allJobs, allWip, allQuotes, allDefects, allInvoices] = await Promise.all([
        db.select().from(jobs), db.select().from(wipRecords), db.select().from(quotes),
        db.select().from(defects), db.select().from(invoices),
      ]);
      return `Dashboard Overview:\nJobs: ${allJobs.length} total, ${allJobs.filter(j => isActiveStatus(j.status)).length} active\nWIP: ${allWip.length} records, ${allWip.filter(w => isActiveStatus(w.status)).length} active\nQuotes: ${allQuotes.length} total, ${allQuotes.filter(q => q.status === "Sent" || q.status === "Draft").length} pending\nDefects: ${allDefects.length} total, ${allDefects.filter(d => d.status === "Open").length} open\nInvoices: ${allInvoices.length} total, ${allInvoices.filter(i => i.status === "Sent" || i.status === "Overdue").length} outstanding`;
    }
    case "tasks": {
      return "Task data is provided in the user's message context.";
    }
    default:
      return "No data available for this section.";
  }
}

router.post("/chat/contextual", async (req, res, next) => {
  try {
    const { section, message, history } = req.body as {
      section: SectionType;
      message: string;
      history?: { role: string; content: string }[];
    };

    if (!section || !message) {
      res.status(400).json({ error: "section and message are required" });
      return;
    }

    const basePrompt = SECTION_PROMPTS[section] || SECTION_PROMPTS.dashboard;
    const sectionData = await fetchSectionData(section);
    const systemPrompt = `${basePrompt}\n\nCURRENT DATA:\n${sectionData}`;

    const messages: { role: "user" | "assistant"; content: string }[] = [];

    if (history?.length) {
      for (const msg of history.filter(m => m.content?.trim())) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let fullResponse = "";
    let clientDisconnected = false;
    // SSE heartbeat — see Pass 5 §3.3.
    const heartbeat = setInterval(() => {
      if (res.writableEnded) return;
      try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { /* dead */ }
    }, 15_000);
    req.on("close", () => { clientDisconnected = true; clearInterval(heartbeat); });
    res.on("close", () => clearInterval(heartbeat));

    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      });

      for await (const event of stream) {
        if (clientDisconnected) { stream.abort(); break; }
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullResponse += event.delta.text;
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }

      if (!clientDisconnected && fullResponse) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
    } catch (err: any) {
      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify({ error: "Analysis failed. Please try again." })}\n\n`);
      }
    }

    res.end();
  } catch (err) { next(err); }
});

export default router;

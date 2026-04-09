import { Router } from "express";
import { db } from "@workspace/db";
import { wipRecords, quotes, defects, invoices, suppliers, supplierProducts, jobs } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

type SectionType = "wip" | "quotes" | "defects" | "invoices" | "suppliers" | "dashboard" | "tasks";

const SECTION_PROMPTS: Record<SectionType, string> = {
  wip: `You are a senior data analyst specialising in field service management operations. You're analysing Work in Progress (WIP) data from Uptick for a fire protection service manager in NSW, Australia. Help with scheduling optimisation, revenue maximisation, workload distribution, identifying bottlenecks, and prioritising jobs. Be direct, use Australian English, and provide actionable insights. When asked about specific data, reference actual numbers from the dataset provided.`,
  quotes: `You are a senior data analyst specialising in quoting and sales pipeline analysis for a fire protection company in NSW, Australia. Help analyse quote conversion rates, identify high-value opportunities, track follow-ups needed, and optimise the quoting process. Be direct, use Australian English, and provide actionable insights.`,
  defects: `You are a senior compliance and defect management analyst for a fire protection company in NSW. Help analyse defect patterns, identify buildings with recurring issues, prioritise critical safety defects, and track remediation progress. Reference AS 1851, AS 1670.1 standards where relevant. Be direct, use Australian English.`,
  invoices: `You are a senior financial analyst specialising in accounts receivable for a fire protection company in NSW. Help analyse outstanding invoices, identify overdue accounts, calculate revenue metrics, and optimise cash flow. Be direct, use Australian English, and provide actionable insights.`,
  suppliers: `You are a procurement specialist for a fire protection company in Sydney, NSW. You have access to the supplier directory and price lists. Help find products, compare prices across suppliers, identify the best deals, and manage procurement decisions. When asked about prices, reference actual data from the price lists. Be direct, use Australian English.`,
  dashboard: `You are a senior operations analyst for a fire protection service division in NSW. You have access to all operational metrics — jobs, WIP, quotes, defects, invoices, and tasks. Help with strategic insights, identifying trends, and providing executive-level summaries. Be direct, use Australian English.`,
  tasks: `You are a productivity and task management specialist helping a fire protection service manager stay on top of their workload. Help prioritise tasks, identify dependencies, suggest optimal scheduling, and flag overdue items. Be direct, use Australian English.`,
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
      return `Dashboard Overview:\nJobs: ${allJobs.length} total, ${allJobs.filter(j => j.status !== "Done").length} active\nWIP: ${allWip.length} records, ${allWip.filter(w => w.status !== "Completed").length} active\nQuotes: ${allQuotes.length} total, ${allQuotes.filter(q => q.status === "Sent" || q.status === "Draft").length} pending\nDefects: ${allDefects.length} total, ${allDefects.filter(d => d.status === "Open").length} open\nInvoices: ${allInvoices.length} total, ${allInvoices.filter(i => i.status === "Sent" || i.status === "Overdue").length} outstanding`;
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

    const systemPrompt = SECTION_PROMPTS[section] || SECTION_PROMPTS.dashboard;
    const sectionData = await fetchSectionData(section);

    const messages: { role: "user" | "assistant"; content: string }[] = [];

    if (history?.length) {
      for (const msg of history.filter(m => m.content?.trim())) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    messages.push({
      role: "user",
      content: `CURRENT DATA:\n${sectionData}\n\nUSER QUESTION:\n${message}`,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    let clientDisconnected = false;
    req.on("close", () => { clientDisconnected = true; });

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

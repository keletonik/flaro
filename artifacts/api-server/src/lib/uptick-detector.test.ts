import { describe, it, expect } from "vitest";
import {
  DASHBOARD_SPECS,
  detectDashboard,
  getDashboardSpec,
  normaliseHeader,
  normaliseRow,
} from "./uptick-detector";

describe("normaliseHeader", () => {
  it("lowercases and strips punctuation", () => {
    expect(normaliseHeader("Invoice Number")).toBe("invoice number");
    expect(normaliseHeader("Total_Invoiced_Value")).toBe("total invoiced value");
    expect(normaliseHeader("Quote (ref)")).toBe("quote ref");
    expect(normaliseHeader("  Date   Paid  ")).toBe("date paid");
  });
});

describe("detectDashboard", () => {
  it("identifies a Financial Performance export", () => {
    const headers = ["Month", "Revenue", "Labour", "Materials", "Other Cost"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("financial_performance");
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.columnMap["Month"]).toBe("periodDate");
    expect(r.columnMap["Revenue"]).toBe("revenue");
    expect(r.columnMap["Labour"]).toBe("labourCost");
  });

  it("identifies a Workforce Performance export", () => {
    const headers = ["Technician", "Tasks Performed", "Total Invoiced Value", "Hours", "Assets Serviced"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("workforce_performance");
    expect(r.columnMap["Technician"]).toBe("technician");
    expect(r.columnMap["Tasks Performed"]).toBe("quantity");
    expect(r.columnMap["Total Invoiced Value"]).toBe("revenue");
  });

  it("identifies a Service Quoting export", () => {
    const headers = ["Quote Number", "Stage", "Value", "Client", "Submitted", "Approved"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("service_quoting");
    expect(r.columnMap["Quote Number"]).toBe("quoteNumber");
    expect(r.columnMap["Stage"]).toBe("stage");
    expect(r.columnMap["Value"]).toBe("revenue");
  });

  it("identifies a Revenue Report export", () => {
    const headers = ["Invoice Number", "Amount", "Invoice Date", "Service Group", "Cost Center", "Client"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("revenue_report");
    expect(r.columnMap["Invoice Date"]).toBe("periodDate");
    expect(r.columnMap["Amount"]).toBe("revenue");
    expect(r.columnMap["Cost Center"]).toBe("costCenter");
  });

  it("identifies a Client Revenue export", () => {
    const headers = ["Client", "Annual Recurring Revenue", "Properties", "Status"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("client_revenue");
    expect(r.columnMap["Annual Recurring Revenue"]).toBe("revenue");
    expect(r.columnMap["Properties"]).toBe("quantity");
  });

  it("identifies a Programme Maintenance export", () => {
    const headers = ["Ref", "Routine Type", "Due Date", "Status", "Technician", "Site"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("programme_maintenance");
    expect(r.columnMap["Ref"]).toBe("taskNumber");
    expect(r.columnMap["Due Date"]).toBe("periodDate");
  });

  it("identifies a Task Activity / Sessions export", () => {
    const headers = ["Technician", "Task", "Start", "End", "Duration"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("task_activity");
    expect(r.columnMap["Start"]).toBe("startedAt");
    expect(r.columnMap["End"]).toBe("endedAt");
    expect(r.columnMap["Duration"]).toBe("hours");
  });

  it("identifies a Defect Quoting export", () => {
    const headers = ["Defect Quote", "Stage", "Value", "Severity", "Client"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("defect_quoting");
    expect(r.columnMap["Defect Quote"]).toBe("quoteNumber");
    expect(r.columnMap["Severity"]).toBe("severity");
  });

  it("returns unknown for junk headers", () => {
    const headers = ["Foo", "Bar", "Baz"];
    const r = detectDashboard(headers);
    expect(r.type).toBe("unknown");
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("every dashboard spec can be fetched by type", () => {
    for (const s of DASHBOARD_SPECS) {
      expect(getDashboardSpec(s.type)).toBeTruthy();
    }
  });
});

describe("normaliseRow", () => {
  const spec = getDashboardSpec("revenue_report")!;
  const map: Record<string, string> = {
    "Invoice Number": "taskNumber",
    "Amount": "revenue",
    "Invoice Date": "periodDate",
    "Service Group": "serviceGroup",
  };

  it("casts numeric fields and strips currency symbols", () => {
    const row = { "Invoice Number": "INV-1", "Amount": "$1,234.56", "Invoice Date": "01/04/2026", "Service Group": "Electrical" };
    const { fact, data } = normaliseRow(row, spec, map);
    expect(fact.revenue).toBe(1234.56);
    expect(fact.taskNumber).toBe("INV-1");
    expect(fact.serviceGroup).toBe("Electrical");
    expect(data).toEqual({});
  });

  it("parses DD/MM/YYYY as ISO", () => {
    const row = { "Invoice Number": "INV-2", "Amount": "100", "Invoice Date": "01/04/2026", "Service Group": "" };
    const { fact } = normaliseRow(row, spec, map);
    expect(fact.periodDate).toBe("2026-04-01");
  });

  it("parses month-name dates like 'Apr 2026'", () => {
    const row = { "Invoice Number": "INV-3", "Amount": "0", "Invoice Date": "Apr 2026", "Service Group": "" };
    const { fact } = normaliseRow(row, spec, map);
    expect(fact.periodDate).toBe("2026-04-01");
  });

  it("keeps unmapped columns in data jsonb", () => {
    const row = { "Invoice Number": "INV-4", "Amount": "50", "Extra": "keep me", "Invoice Date": "2026-04-01", "Service Group": "" };
    const { fact, data } = normaliseRow(row, spec, map);
    expect(fact.taskNumber).toBe("INV-4");
    expect(data.Extra).toBe("keep me");
  });

  it("drops empty strings rather than coercing to zero", () => {
    const row = { "Invoice Number": "", "Amount": "", "Invoice Date": "", "Service Group": "" };
    const { fact } = normaliseRow(row, spec, map);
    expect(fact.revenue).toBeUndefined();
    expect(fact.taskNumber).toBeUndefined();
    expect(fact.periodDate).toBeUndefined();
  });
});

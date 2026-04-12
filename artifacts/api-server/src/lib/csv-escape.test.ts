import { describe, it, expect } from "vitest";

// Mirror of the frontend helper in artifacts/aide/src/lib/api.ts, tested here
// because the api-server already has a vitest harness. Keep in sync with the
// frontend copy.
const CSV_FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];
function escapeCsvCell(value: any): string {
  let val = String(value ?? "");
  if (val.length > 0 && CSV_FORMULA_TRIGGERS.includes(val[0]!)) {
    val = `'${val}`;
  }
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

describe("escapeCsvCell", () => {
  it("passes through plain text unchanged", () => {
    expect(escapeCsvCell("Acme Corp")).toBe("Acme Corp");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("prefixes leading formula triggers with a single quote", () => {
    // "=SUM(A1:A2)" has no comma/newline/dquote, so no outer wrapping.
    expect(escapeCsvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell("+1234")).toBe("'+1234");
    expect(escapeCsvCell("-evil")).toBe("'-evil");
    expect(escapeCsvCell("@sheet")).toBe("'@sheet");
    expect(escapeCsvCell("\tTab")).toBe("'\tTab");
    // Formula trigger + separator → both protections apply.
    expect(escapeCsvCell("=A1,B2")).toBe("\"'=A1,B2\"");
  });

  it("wraps cells with separators in quotes and escapes embedded quotes", () => {
    expect(escapeCsvCell("a,b")).toBe("\"a,b\"");
    expect(escapeCsvCell('He said "hi"')).toBe("\"He said \"\"hi\"\"\"");
    expect(escapeCsvCell("line1\nline2")).toBe("\"line1\nline2\"");
  });

  it("does not treat mid-string = + - @ as formula triggers", () => {
    expect(escapeCsvCell("1+2")).toBe("1+2");
    expect(escapeCsvCell("email@domain")).toBe("email@domain");
  });
});

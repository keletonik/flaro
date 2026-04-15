/**
 * Generic client-side CSV export helper.
 *
 * Used by the operations tabs' "Download CSV" button (Pass 7 fix 4).
 * Zero network round-trip — the rows are already on the client. Column
 * order is derived from the first row's keys unless `columns` is
 * supplied explicitly.
 */

export function rowsToCsv(
  rows: Record<string, unknown>[],
  columns?: string[],
): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]!);
  const header = cols.map(csvCell).join(",");
  const lines = [header];
  for (const r of rows) {
    lines.push(cols.map((c) => csvCell(r[c])).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** One-shot helper — rows → filename.csv download. */
export function exportRows(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: string[],
) {
  downloadCsv(filename, rowsToCsv(rows, columns));
}

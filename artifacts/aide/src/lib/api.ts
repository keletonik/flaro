// Base URL for the api server. Defaults to the same origin (the Replit
// all-in-one deployment routes /api/* to the api-server artifact). When the
// frontend is hosted on a different origin (e.g. a Vercel static deploy
// pointing at a Replit-hosted api), set VITE_API_BASE to the full origin
// (e.g. `https://my-repl.replit.dev`) — /api is appended automatically.
const API_ORIGIN = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "") ?? "";
const BASE = `${API_ORIGIN}/api`;
const TOKEN_STORAGE_KEY = "ops-auth-token";

function authHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function apiFetch<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(opts?.headers || {}),
    },
  });
  if (res.status === 401) {
    try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch { /* ignore */ }
  }
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function streamChat(
  section: string,
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();
  fetch(`${BASE}/chat/contextual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, message, history }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) { onError("Request failed"); return; }
    const reader = res.body?.getReader();
    if (!reader) { onError("No stream"); return; }
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) onChunk(data.content);
          if (data.done && !finished) { finished = true; onDone(); }
          if (data.error) onError(data.error);
        } catch {}
      }
    }
    if (!finished) onDone();
  }).catch((err) => {
    if (err.name !== "AbortError") onError(err.message);
  });
  return controller;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
}

// Cells that begin with any of these are treated as formulas by Excel/Sheets/Numbers.
// Prefix with a single quote so they render as text instead of executing.
const CSV_FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvCell(value: any): string {
  let val = String(value ?? "");
  if (val.length > 0 && CSV_FORMULA_TRIGGERS.includes(val[0]!)) {
    val = `'${val}`;
  }
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => headers.map(h => escapeCsvCell(row[h])).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

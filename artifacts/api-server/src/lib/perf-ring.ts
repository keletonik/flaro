/**
 * Rolling request-duration ring buffer.
 *
 * Closes Pass 5 finding §3.9 (no p95 tracking). Holds the last N
 * request durations in memory, exposes a stats function that
 * returns p50/p95/p99 plus a slow-requests list. The ring is cheap
 * (4 ints per record, O(1) insert), zero external deps.
 *
 * Consumers:
 *   - Express middleware `perfMiddleware()` that records each request
 *   - GET /api/diag/perf that reads `getPerfStats()`
 */

const CAP = 1000;

interface Record_ {
  ms: number;
  method: string;
  path: string;
  status: number;
  ts: number;
}

const ring: Record_[] = [];
let head = 0;

export function recordRequest(r: Record_) {
  if (ring.length < CAP) ring.push(r);
  else {
    ring[head] = r;
    head = (head + 1) % CAP;
  }
}

export function getPerfStats() {
  if (ring.length === 0) {
    return { count: 0, p50: 0, p95: 0, p99: 0, slowest: [] as Record_[] };
  }
  const sorted = [...ring].sort((a, b) => a.ms - b.ms);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]!.ms;
  const slowest = [...ring].sort((a, b) => b.ms - a.ms).slice(0, 10);
  return {
    count: ring.length,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    slowest: slowest.map((r) => ({
      ms: r.ms,
      method: r.method,
      path: r.path,
      status: r.status,
      ts: r.ts,
    })),
  };
}

import type { Request, Response, NextFunction } from "express";

export function perfMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - started;
      const path = req.originalUrl.split("?")[0] || req.path;
      recordRequest({
        ms,
        method: req.method,
        path,
        status: res.statusCode,
        ts: started,
      });
    });
    next();
  };
}

/**
 * GET /api/metrics        — list every registered metric's metadata
 * GET /api/metrics/:id    — compute a specific metric
 *
 * The single endpoint for every named metric. Reads from the
 * lib/metrics registry — zero inline SQL, no per-route aggregation.
 * Dashboard cards, analytics page charts and the metric_get agent
 * tool all read through this.
 *
 * Query parameters for :id:
 *   period    today | 7d | 30d | mtd | 90d | ytd | custom
 *   start     ISO date (required when period=custom)
 *   end       ISO date (required when period=custom)
 *   filter_*  any additional filter (e.g. filter_client=Goodman)
 *
 * Response shape: MetricResult from lib/metrics/types.
 */

import { Router } from "express";
import { pool } from "@workspace/db";
import { computeMetric, getMetric, listMetrics } from "../lib/metrics/registry";
import type { MetricParams, Period } from "../lib/metrics/types";

const router = Router();

router.get("/metrics", async (_req, res, next) => {
  try {
    res.json({ metrics: listMetrics() });
  } catch (err) {
    next(err);
  }
});

router.get("/metrics/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!getMetric(id)) {
      res.status(404).json({ error: `Unknown metric: ${id}` });
      return;
    }

    const q = req.query;
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(q)) {
      if (typeof v === "string" && k.startsWith("filter_")) {
        filters[k.slice(7)] = v;
      }
    }

    const params: MetricParams = {
      period: (typeof q.period === "string" ? (q.period as Period) : undefined),
      startDate: typeof q.start === "string" ? q.start : undefined,
      endDate: typeof q.end === "string" ? q.end : undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };

    const result = await computeMetric(pool, id, params);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

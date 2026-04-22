import { Router } from "express";
import { getSyncStatus, syncAirtableAll, probeAirtable } from "../lib/airtable-sync";

const router = Router();

/**
 * GET /api/airtable/status
 *
 * Returns sync state plus a diagnostic envelope so "Airtable isn't updating"
 * becomes a one-glance debuggable issue. The `diagnosis` array lists
 * problems detected right now and a human-readable fix for each one.
 */
router.get("/airtable/status", async (_req, res) => {
  const s = getSyncStatus();
  const diagnosis: string[] = [];

  if (!s.enabled) {
    diagnosis.push(
      "AIRTABLE_PAT (or AIRTABLE_API_KEY) is not set in the deployment environment. " +
      "Fix: Replit → Deployments → Settings → Secrets → add AIRTABLE_PAT."
    );
  }
  if (s.enabled && !s.lastSyncAt) {
    diagnosis.push(
      "Sync is enabled but has never run. The service may have just started, " +
      "or the deployment is running old code. Wait 30s and re-check; if still " +
      "null, redeploy the current main."
    );
  }
  if (s.lastError) {
    diagnosis.push(`Most recent sync error: ${s.lastError}`);
  }
  for (const [key, t] of Object.entries(s.tables)) {
    if (t.error) diagnosis.push(`Table "${key}" error: ${t.error}`);
  }
  if (s.enabled && s.lastSyncAt) {
    const ageMs = Date.now() - new Date(s.lastSyncAt).getTime();
    if (ageMs > s.pollIntervalMs * 3) {
      diagnosis.push(
        `Last sync was ${Math.round(ageMs / 1000)}s ago, more than 3× the poll interval. ` +
        "The poller may have stalled. A deployment restart usually fixes it."
      );
    }
  }

  // Also probe Airtable right now to distinguish "PAT is wrong" from
  // "code never ran the sync". Skipped if not enabled (would throw).
  let liveProbe: { ok: boolean; status: number; detail?: string } | null = null;
  if (s.enabled) {
    try {
      liveProbe = await probeAirtable();
      if (!liveProbe.ok) {
        diagnosis.push(
          `Airtable rejected a live probe with HTTP ${liveProbe.status}. ` +
          "This usually means the PAT is invalid, expired, or scoped to the wrong base."
        );
      }
    } catch (err: any) {
      liveProbe = { ok: false, status: 0, detail: err?.message || String(err) };
      diagnosis.push(`Airtable probe threw: ${liveProbe.detail}`);
    }
  }

  res.json({
    ...s,
    diagnosis,
    healthy: diagnosis.length === 0,
    liveProbe,
    advice:
      diagnosis.length === 0
        ? "All signals green."
        : "See `diagnosis` array for the specific fix(es).",
  });
});

/**
 * POST /api/airtable/sync
 * One-shot full sync. Same as the poller runs, but synchronous and returns
 * the result inline so you can see what happened.
 */
router.post("/airtable/sync", async (_req, res, next) => {
  try {
    const tables = await syncAirtableAll();
    res.json({ tables, status: getSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

/**
 * POST /api/airtable/force-sync
 * Alias kept for scripts that were coded against the longer name.
 */
router.post("/airtable/force-sync", async (_req, res, next) => {
  try {
    const tables = await syncAirtableAll();
    res.json({ tables, status: getSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;

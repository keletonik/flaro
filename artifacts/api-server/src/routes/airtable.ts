import { Router } from "express";
import { getSyncStatus, syncAirtableAll } from "../lib/airtable-sync";

const router = Router();

router.get("/airtable/status", (_req, res) => {
  res.json(getSyncStatus());
});

router.post("/airtable/sync", async (_req, res, next) => {
  try {
    const tables = await syncAirtableAll();
    res.json({ tables, status: getSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;

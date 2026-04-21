/**
 * PA Command Centre — POST /api/pa/command
 *
 * A thin natural-language dispatcher. The manager types imperatives like
 * "add todo call Casper" or "mark job TSK-123 done"; this endpoint maps the
 * verb to an existing CRUD call and returns a receipt.
 *
 * v1 is regex-based — deterministic, traceable, no LLM dependency for the
 * hot path. A follow-up pass can swap in tool-calling if expressiveness
 * becomes a bottleneck.
 *
 * Every action goes through the same DB layer as the rest of the app, so the
 * existing SSE fan-out and Airtable write-back fire automatically.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { jobs, todos } from "@workspace/db";
import { eq, or, ilike, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { broadcastEvent } from "../lib/events";
import { pushJobToAirtable } from "../lib/airtable-sync";

const router = Router();

type CommandResult =
  | { ok: true; verb: string; summary: string; data?: unknown }
  | { ok: false; verb: string; reason: string };

/**
 * Tiny intent parser. Only matches imperatives we can fulfil deterministically;
 * anything else falls through to `help`, so the user sees what the PA knows
 * how to do. No fuzzy matching — misunderstandings are worse than "not today".
 */
function parse(input: string): { verb: string; args: Record<string, string> } {
  const s = input.trim();
  const m = (re: RegExp) => re.exec(s);

  let x = m(/^(?:add|create|new)\s+(?:a\s+)?(?:todo|task)[:\s]+(.+)$/i);
  if (x) return { verb: "create_todo", args: { text: x[1].trim() } };

  x = m(/^(?:add|create|new)\s+(?:a\s+)?note[:\s]+(.+)$/i);
  if (x) return { verb: "create_note", args: { text: x[1].trim() } };

  x = m(/^(?:mark|set)\s+(?:todo|task)\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed)$/i);
  if (x) return { verb: "complete_todo", args: { query: x[1].trim() } };

  x = m(/^(?:mark|set)\s+job\s+(.+?)\s+(?:as\s+)?(open|in\s*progress|booked|blocked|waiting|done)$/i);
  if (x) return { verb: "update_job_status", args: { query: x[1].trim(), status: x[2].trim() } };

  x = m(/^assign\s+job\s+(.+?)\s+to\s+(.+)$/i);
  if (x) return { verb: "assign_job", args: { query: x[1].trim(), tech: x[2].trim() } };

  x = m(/^(?:find|search|show|list)\s+jobs?\s+(?:for\s+|at\s+|with\s+|matching\s+)?(.+)$/i);
  if (x) return { verb: "search_jobs", args: { query: x[1].trim() } };

  x = m(/^(?:find|search|show|list)\s+jobs?$/i);
  if (x) return { verb: "search_jobs", args: { query: "" } };

  x = m(/^(?:status|what'?s going on|summary|overview|brief)$/i);
  if (x) return { verb: "status", args: {} };

  x = m(/^help$/i);
  if (x) return { verb: "help", args: {} };

  return { verb: "unknown", args: { raw: s } };
}

/** Normalise status words coming out of the regex into the DB enum. */
function normaliseStatus(s: string): "Open" | "In Progress" | "Booked" | "Blocked" | "Waiting" | "Done" {
  const v = s.toLowerCase().replace(/\s+/g, " ").trim();
  if (v.startsWith("in")) return "In Progress";
  if (v === "booked") return "Booked";
  if (v === "blocked") return "Blocked";
  if (v === "waiting") return "Waiting";
  if (v === "done") return "Done";
  return "Open";
}

/** Best-effort resolver: query → single job. Matches task number or site. */
async function resolveJob(query: string) {
  const q = query.trim();
  if (!q) return null;
  const rows = await db
    .select()
    .from(jobs)
    .where(or(eq(jobs.taskNumber, q), ilike(jobs.site, `%${q}%`)))
    .limit(2);
  return rows.length === 1 ? rows[0] : null;
}

/** Best-effort resolver: query → single todo. Matches id or text contains. */
async function resolveTodo(query: string) {
  const q = query.trim();
  if (!q) return null;
  const rows = await db
    .select()
    .from(todos)
    .where(or(eq(todos.id, q), ilike(todos.text, `%${q}%`)))
    .limit(2);
  return rows.length === 1 ? rows[0] : null;
}

router.post("/pa/command", async (req, res, next) => {
  const text: string = (req.body?.text || req.body?.message || "").toString();
  if (!text.trim()) {
    res.status(400).json({ ok: false, reason: "empty command" });
    return;
  }
  const parsed = parse(text);
  try {
    let result: CommandResult;
    const now = new Date();

    switch (parsed.verb) {
      case "create_todo": {
        const row = {
          id: randomUUID(),
          text: parsed.args.text,
          completed: false,
          priority: "Medium" as const,
          category: "Work",
          dependencies: [],
          createdAt: now,
          updatedAt: now,
        };
        const [inserted] = await db.insert(todos).values(row).returning();
        broadcastEvent("data_change", { source: "pa-command", verb: parsed.verb });
        result = { ok: true, verb: parsed.verb, summary: `todo added · "${inserted.text}"`, data: inserted };
        break;
      }

      case "create_note": {
        // Notes table is managed elsewhere; surface a soft "todo" fallback.
        const row = {
          id: randomUUID(),
          text: parsed.args.text,
          completed: false,
          priority: "Low" as const,
          category: "Notes",
          dependencies: [],
          createdAt: now,
          updatedAt: now,
        };
        const [inserted] = await db.insert(todos).values(row).returning();
        broadcastEvent("data_change", { source: "pa-command", verb: parsed.verb });
        result = { ok: true, verb: parsed.verb, summary: `note saved · "${inserted.text}"`, data: inserted };
        break;
      }

      case "complete_todo": {
        const hit = await resolveTodo(parsed.args.query);
        if (!hit) { result = { ok: false, verb: parsed.verb, reason: `no single todo matches "${parsed.args.query}"` }; break; }
        const [updated] = await db.update(todos).set({ completed: true, updatedAt: now }).where(eq(todos.id, hit.id)).returning();
        broadcastEvent("data_change", { source: "pa-command", verb: parsed.verb });
        result = { ok: true, verb: parsed.verb, summary: `todo completed · "${updated.text}"`, data: updated };
        break;
      }

      case "update_job_status": {
        const hit = await resolveJob(parsed.args.query);
        if (!hit) { result = { ok: false, verb: parsed.verb, reason: `no single job matches "${parsed.args.query}"` }; break; }
        const status = normaliseStatus(parsed.args.status);
        const [updated] = await db.update(jobs).set({ status, updatedAt: now }).where(eq(jobs.id, hit.id)).returning();
        broadcastEvent("data_change", { source: "pa-command", verb: parsed.verb });
        void pushJobToAirtable(hit.id);
        result = { ok: true, verb: parsed.verb, summary: `${updated.taskNumber || updated.site} → ${status}`, data: updated };
        break;
      }

      case "assign_job": {
        const hit = await resolveJob(parsed.args.query);
        if (!hit) { result = { ok: false, verb: parsed.verb, reason: `no single job matches "${parsed.args.query}"` }; break; }
        const [updated] = await db.update(jobs).set({ assignedTech: parsed.args.tech, updatedAt: now }).where(eq(jobs.id, hit.id)).returning();
        broadcastEvent("data_change", { source: "pa-command", verb: parsed.verb });
        void pushJobToAirtable(hit.id);
        result = { ok: true, verb: parsed.verb, summary: `${updated.taskNumber || updated.site} → ${updated.assignedTech}`, data: updated };
        break;
      }

      case "search_jobs": {
        const q = parsed.args.query;
        const base = db.select({
          id: jobs.id, taskNumber: jobs.taskNumber, site: jobs.site,
          client: jobs.client, status: jobs.status, priority: jobs.priority,
          assignedTech: jobs.assignedTech, dueDate: jobs.dueDate,
        }).from(jobs).orderBy(desc(jobs.updatedAt)).limit(10);
        const rows = q
          ? await base.where(or(ilike(jobs.site, `%${q}%`), ilike(jobs.client, `%${q}%`), ilike(jobs.taskNumber, `%${q}%`)))
          : await base;
        result = { ok: true, verb: parsed.verb, summary: `${rows.length} jobs${q ? ` matching "${q}"` : ""}`, data: rows };
        break;
      }

      case "status": {
        // Single round-trip count summary. Cheap and useful as a briefing.
        const [{ open }] = await db.select({ open: sql<number>`count(*)::int` }).from(jobs).where(eq(jobs.status, "Open"));
        const [{ inProgress }] = await db.select({ inProgress: sql<number>`count(*)::int` }).from(jobs).where(eq(jobs.status, "In Progress"));
        const [{ doneToday }] = await db.select({ doneToday: sql<number>`count(*)::int` }).from(jobs).where(sql`status = 'Done' AND updated_at::date = CURRENT_DATE`);
        const [{ openTodos }] = await db.select({ openTodos: sql<number>`count(*)::int` }).from(todos).where(eq(todos.completed, false));
        result = {
          ok: true, verb: parsed.verb,
          summary: `${open} open · ${inProgress} in progress · ${doneToday} done today · ${openTodos} todos`,
          data: { open, inProgress, doneToday, openTodos },
        };
        break;
      }

      case "help": {
        result = {
          ok: true, verb: parsed.verb,
          summary: "available commands",
          data: [
            "add todo <text>",
            "create note <text>",
            "mark todo <text> done",
            "mark job <task#|site> <open|in progress|booked|blocked|waiting|done>",
            "assign job <task#|site> to <tech name>",
            "search jobs [<query>]",
            "status",
          ],
        };
        break;
      }

      default: {
        result = {
          ok: false, verb: "unknown",
          reason: `not a command i recognise. try "help" for the list.`,
        };
      }
    }

    res.json(result);
  } catch (err: any) {
    next(err);
  }
});

export default router;

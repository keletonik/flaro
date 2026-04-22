import { Router } from "express";
import { db } from "@workspace/db";
import { jobs, notes } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { isMyTech, isUnfiltered } from "../lib/division-filter";

const router = Router();

router.get("/dashboard/summary", async (req, res, next) => {
  try {
    const unfiltered = isUnfiltered(req);
    const allJobsRaw = await db.select().from(jobs);
    const allNotes = await db.select().from(notes);
    // Scope to my crew unless ?division=all. Notes are personal already, no filter.
    const allJobs = unfiltered ? allJobsRaw : allJobsRaw.filter(j => isMyTech(j.assignedTech));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const critical  = allJobs.filter(j => j.priority === "Critical" && j.status !== "Done").length;
    const high      = allJobs.filter(j => j.priority === "High"     && j.status !== "Done").length;
    const open      = allJobs.filter(j => j.status === "Open").length;
    const active    = allJobs.filter(j => j.status !== "Done").length;
    const doneToday = allJobs.filter(j => j.status === "Done" && j.updatedAt >= today).length;
    const totalJobs = active;
    const openNotes = allNotes.filter(n => n.status === "Open").length;

    res.json({ critical, high, open, active, doneToday, totalJobs, openNotes });
  } catch (err) { next(err); }
});

router.get("/dashboard/focus", async (req, res, next) => {
  try {
    const unfiltered = isUnfiltered(req);
    const allJobsRaw  = await db.select().from(jobs);
    const allNotes = await db.select().from(notes);
    // Same scope as /dashboard/summary so the AI bullets describe the same world.
    const allJobs = unfiltered ? allJobsRaw : allJobsRaw.filter(j => isMyTech(j.assignedTech));

    const openJobs      = allJobs.filter(j => j.status !== "Done");
    const openNotesList = allNotes.filter(n => n.status === "Open");

    if (!openJobs.length && !openNotesList.length) {
      res.json({ points: ["All clear — no open jobs or notes."], generatedAt: new Date().toISOString() });
      return;
    }

    const jobsSummary = openJobs.slice(0, 10).map(j =>
      `Job: ${j.taskNumber || "No ref"} — ${j.site} (${j.client}) | Priority: ${j.priority} | Status: ${j.status} | Action: ${j.actionRequired}${j.dueDate ? ` | Due: ${j.dueDate}` : ""}`
    ).join("\n");

    const notesSummary = openNotesList.slice(0, 10).map(n =>
      `[${n.category}] ${n.text}`
    ).join("\n");

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are AIDE, a personal operations assistant. Based on the following open jobs and notes, generate 3-5 concise bullet points for today's focus. Be direct and prioritise urgently. Australian English.

OPEN JOBS:
${jobsSummary || "None"}

OPEN NOTES:
${notesSummary || "None"}

Return ONLY a JSON array of strings, no explanation, no markdown. Example: ["Do X urgently", "Follow up on Y", "Check Z"]`,
        }],
      });

      const content = response.content[0];
      if (content.type !== "text") throw new Error("Unexpected response type");

      let points: string[];
      try {
        const text = content.text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        points = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        points = content.text.split("\n").filter(Boolean).map(s => s.replace(/^[-•*]\s*/, ""));
      }

      res.json({ points, generatedAt: new Date().toISOString() });
    } catch {
      res.json({
        points: ["Unable to generate focus points. Check your open jobs and notes manually."],
        generatedAt: new Date().toISOString(),
      });
    }
  } catch (err) { next(err); }
});

export default router;

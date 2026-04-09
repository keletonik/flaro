import { Router } from "express";
import { db } from "@workspace/db";
import { jobs } from "@workspace/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { CreateJobBody, UpdateJobBody, ListJobsQueryParams, GetJobParams, UpdateJobParams, DeleteJobParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

router.get("/jobs", async (req, res) => {
  const parsed = ListJobsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { status, priority, search } = parsed.data;

  let query = db.select().from(jobs).$dynamic();
  const conditions = [];

  if (status) {
    conditions.push(eq(jobs.status, status));
  }
  if (priority) {
    conditions.push(eq(jobs.priority, priority));
  }
  if (search) {
    conditions.push(
      or(
        ilike(jobs.site, `%${search}%`),
        ilike(jobs.client, `%${search}%`),
        ilike(jobs.taskNumber!, `%${search}%`),
        ilike(jobs.assignedTech!, `%${search}%`),
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query.orderBy(jobs.createdAt);

  res.json(result.map(j => ({
    ...j,
    uptickNotes: j.uptickNotes || [],
    dueDate: j.dueDate ?? null,
    notes: j.notes ?? null,
    taskNumber: j.taskNumber ?? null,
    address: j.address ?? null,
    contactName: j.contactName ?? null,
    contactNumber: j.contactNumber ?? null,
    contactEmail: j.contactEmail ?? null,
    assignedTech: j.assignedTech ?? null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  })));
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const id = randomUUID();
  const now = new Date();
  const [job] = await db.insert(jobs).values({
    id,
    ...parsed.data,
    uptickNotes: [],
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json({
    ...job,
    uptickNotes: job.uptickNotes || [],
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

router.get("/jobs/:id", async (req, res) => {
  const parsed = GetJobParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, parsed.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    ...job,
    uptickNotes: job.uptickNotes || [],
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

router.patch("/jobs/:id", async (req, res) => {
  const paramsParsed = UpdateJobParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const bodyParsed = UpdateJobBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { uptickNote, ...rest } = bodyParsed.data;

  const [existing] = await db.select().from(jobs).where(eq(jobs.id, paramsParsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const updatedUptickNotes = uptickNote
    ? [...(existing.uptickNotes || []), uptickNote]
    : existing.uptickNotes;

  const [updated] = await db.update(jobs)
    .set({ ...rest, uptickNotes: updatedUptickNotes, updatedAt: new Date() })
    .where(eq(jobs.id, paramsParsed.data.id))
    .returning();

  res.json({
    ...updated,
    uptickNotes: updated.uptickNotes || [],
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.delete("/jobs/:id", async (req, res) => {
  const parsed = DeleteJobParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [existing] = await db.select().from(jobs).where(eq(jobs.id, parsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await db.delete(jobs).where(eq(jobs.id, parsed.data.id));
  res.status(204).end();
});

export default router;

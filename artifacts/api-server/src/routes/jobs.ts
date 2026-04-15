import { Router } from "express";
import { db } from "@workspace/db";
import { jobs } from "@workspace/db";
import { eq, and, or, ilike, sql, isNull } from "drizzle-orm";
import { parsePagination, paginatedResponse } from "../lib/pagination";
import { CreateJobBody, UpdateJobBody, ListJobsQueryParams, GetJobParams, UpdateJobParams, DeleteJobParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { deleteRow, softDeleteEnabled } from "../lib/soft-delete";

const router = Router();

const serializeJob = (j: typeof jobs.$inferSelect) => ({
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
});

router.get("/jobs", async (req, res, next) => {
  try {
    const parsed = ListJobsQueryParams.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

    const { status, priority, search } = parsed.data;
    let query = db.select().from(jobs).$dynamic();
    const conditions = [];

    if (softDeleteEnabled()) conditions.push(isNull(jobs.deletedAt));
    if (status) conditions.push(eq(jobs.status, status as any));
    if (priority) conditions.push(eq(jobs.priority, priority as any));
    if (search) {
      const safe = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(or(
        ilike(jobs.site, `%${safe}%`),
        ilike(jobs.client, `%${safe}%`),
        ilike(jobs.taskNumber!, `%${safe}%`),
        ilike(jobs.assignedTech!, `%${safe}%`),
        ilike(jobs.address!, `%${safe}%`),
        ilike(jobs.actionRequired, `%${safe}%`),
        ilike(jobs.notes!, `%${safe}%`),
      ));
    }

    if (conditions.length > 0) query = query.where(and(...conditions));
    // Support both flat array (for generated hooks) and paginated response
    if (req.query.page) {
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(jobs).$dynamic();
      if (conditions.length > 0) countQuery = countQuery.where(and(...conditions));
      const [{ count: total }] = await countQuery;
      const pg = parsePagination(req);
      const result = await query.orderBy(jobs.createdAt).limit(pg.limit).offset(pg.offset);
      res.json(paginatedResponse(result.map(serializeJob), Number(total), pg));
    } else {
      const result = await query.orderBy(jobs.createdAt);
      res.json(result.map(serializeJob));
    }
  } catch (err) { next(err); }
});

router.post("/jobs", async (req, res, next) => {
  try {
    const parsed = CreateJobBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const id = randomUUID();
    const now = new Date();
    const [job] = await db.insert(jobs).values({
      id, ...parsed.data, uptickNotes: [], createdAt: now, updatedAt: now,
    }).returning();

    res.status(201).json(serializeJob(job));
  } catch (err) { next(err); }
});

router.get("/jobs/:id", async (req, res, next) => {
  try {
    const parsed = GetJobParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, parsed.data.id));
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    res.json(serializeJob(job));
  } catch (err) { next(err); }
});

router.patch("/jobs/:id", async (req, res, next) => {
  try {
    const paramsParsed = UpdateJobParams.safeParse(req.params);
    if (!paramsParsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const bodyParsed = UpdateJobBody.safeParse(req.body);
    if (!bodyParsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

    const [existing] = await db.select().from(jobs).where(eq(jobs.id, paramsParsed.data.id));
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }

    const { uptickNote, ...rest } = bodyParsed.data;
    const updatedUptickNotes = uptickNote
      ? [...(existing.uptickNotes || []), uptickNote]
      : existing.uptickNotes;

    const [updated] = await db.update(jobs)
      .set({ ...rest, uptickNotes: updatedUptickNotes, updatedAt: new Date() })
      .where(eq(jobs.id, paramsParsed.data.id))
      .returning();

    res.json(serializeJob(updated));
  } catch (err) { next(err); }
});

router.delete("/jobs/:id", async (req, res, next) => {
  try {
    const parsed = DeleteJobParams.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

    const [existing] = await db.select().from(jobs).where(eq(jobs.id, parsed.data.id));
    if (!existing) { res.status(404).json({ error: "Job not found" }); return; }

    await deleteRow(jobs, parsed.data.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

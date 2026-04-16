import { Router } from "express";
import { db } from "@workspace/db";
import { jobs, changeLogs } from "@workspace/db";
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

const MAX_IMPORT_ROWS = parseInt(process.env.MAX_IMPORT_ROWS || "10000", 10);

router.post("/jobs/import", async (req, res, next) => {
  try {
    const { rows, columnMap } = req.body as { rows: Record<string, string>[]; columnMap: Record<string, string> };
    if (!rows?.length) { res.status(400).json({ error: "No data rows provided" }); return; }
    if (rows.length > MAX_IMPORT_ROWS) { res.status(413).json({ error: `Too many rows (${rows.length}). Limit is ${MAX_IMPORT_ROWS}.` }); return; }

    // Helper: resolve a value from the row using the column map + fuzzy fallbacks
    const resolve = (row: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) {
        // Check direct column map first
        const mapped = columnMap[k];
        if (mapped && row[mapped]?.trim()) return row[mapped].trim();
        // Check raw CSV column name
        if (row[k]?.trim()) return row[k].trim();
      }
      return undefined;
    };

    const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];
    const VALID_STATUSES = ["Open", "In Progress", "Booked", "Blocked", "Waiting", "Done"];
    const now = new Date();
    const batchId = randomUUID();

    const records = rows.map(row => {
      // Apply column mapping: csvCol -> dbField
      const mapped: Record<string, any> = {};
      for (const [csvCol, dbField] of Object.entries(columnMap)) {
        if (dbField && dbField !== "skip" && row[csvCol] !== undefined && row[csvCol] !== "") {
          mapped[dbField] = row[csvCol].trim();
        }
      }

      // Also try common Uptick CSV column names as fallbacks
      const site = mapped.site
        || resolve(row, "Property Name", "property_name", "Site", "site", "Property")
        || "Unknown";
      const client = mapped.client
        || resolve(row, "Property Client Ref", "property_client_ref", "Client", "client", "Customer", "Client Name")
        || "Unknown";
      const actionRequired = mapped.actionRequired
        || mapped.description
        || resolve(row, "Description", "description", "Scope of works", "scope_of_works", "Action Required", "action_required", "Scope", "Task")
        || "Imported job";
      let priority = mapped.priority || resolve(row, "Priority", "priority") || "Medium";
      if (!VALID_PRIORITIES.includes(priority)) priority = "Medium";
      let status = mapped.status || resolve(row, "Status", "status") || "Open";
      if (!VALID_STATUSES.includes(status)) status = "Open";
      const taskNumber = mapped.taskNumber
        || resolve(row, "Ref", "ref", "Task Number", "task_number", "Task Ref", "ID")
        || null;
      const address = mapped.address
        || resolve(row, "Address", "address", "Property Address", "Site Address")
        || null;
      const contactName = mapped.contactName
        || resolve(row, "Name", "Contact Name", "contact_name", "Contact")
        || null;
      const contactNumber = mapped.contactNumber
        || resolve(row, "Phone", "contact_number", "Contact Number", "Mobile")
        || null;
      const contactEmail = mapped.contactEmail
        || resolve(row, "Email", "contact_email", "Contact Email")
        || null;
      const assignedTech = mapped.assignedTech
        || resolve(row, "Assigned Tech", "assigned_tech", "Technician", "Tech", "Assigned To")
        || null;
      const dueDate = mapped.dueDate
        || resolve(row, "Due Date", "due_date", "Due", "Scheduled Date")
        || null;
      const notes = mapped.notes
        || resolve(row, "Notes", "notes", "Comments", "Remarks")
        || null;
      // Collect unmapped Uptick fields into notes for reference
      const propertyRef = resolve(row, "Property Ref", "property_ref");
      const scopeOfWorks = resolve(row, "Scope of works", "scope_of_works");
      const extraNotes = [notes, propertyRef ? `Property Ref: ${propertyRef}` : null, scopeOfWorks && scopeOfWorks !== actionRequired ? `Scope: ${scopeOfWorks}` : null].filter(Boolean).join(" | ") || null;

      return {
        id: randomUUID(),
        site, client, actionRequired, priority, status,
        taskNumber, address, contactName, contactNumber, contactEmail,
        assignedTech, dueDate, notes: extraNotes, uptickNotes: [],
        createdAt: now, updatedAt: now,
      };
    });

    // Batch insert in chunks of 500 to avoid Postgres parameter limits
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      await db.insert(jobs).values(chunk);
      totalInserted += chunk.length;
    }

    // Log the import to change_logs
    try {
      await db.insert(changeLogs).values({
        id: randomUUID(),
        action: "import",
        table: "jobs",
        batchId,
        rowCount: totalInserted,
        summary: `Imported ${totalInserted} jobs from CSV`,
        createdAt: now,
      });
    } catch { /* change_logs table may not exist yet */ }

    res.status(201).json({ imported: totalInserted, batchId });
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

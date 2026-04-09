import { Router } from "express";
import { db } from "@workspace/db";
import { projects, projectTasks } from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const VALID_PROJECT_STATUSES = ["Active", "On Hold", "Completed", "Archived"] as const;
const VALID_TASK_STATUSES = ["To Do", "In Progress", "Review", "Done"] as const;
const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

const serializeProject = (p: typeof projects.$inferSelect) => ({
  ...p,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

const serializeTask = (t: typeof projectTasks.$inferSelect) => ({
  ...t,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});

router.get("/projects", async (req, res, next) => {
  try {
    const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
    res.json(result.map(serializeProject));
  } catch (err) { next(err); }
});

router.post("/projects", async (req, res, next) => {
  try {
    const { name, description, status, priority, colour, dueDate } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

    const safeStatus = VALID_PROJECT_STATUSES.includes(status) ? status : "Active";
    const safePriority = VALID_PRIORITIES.includes(priority) ? priority : "Medium";

    const [project] = await db.insert(projects).values({
      id: randomUUID(),
      name: String(name).trim(),
      description: description?.trim() || null,
      status: safeStatus,
      priority: safePriority,
      colour: colour || "#7C3AED",
      dueDate: dueDate || null,
    }).returning();

    res.status(201).json(serializeProject(project));
  } catch (err) { next(err); }
});

router.patch("/projects/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (!existing) { res.status(404).json({ error: "Project not found" }); return; }

    const { name, description, status, priority, colour, dueDate } = req.body;
    const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) { res.status(400).json({ error: "Name cannot be empty" }); return; }
      updates.name = trimmed;
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (status !== undefined && VALID_PROJECT_STATUSES.includes(status)) updates.status = status;
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updates.priority = priority;
    if (colour !== undefined) updates.colour = colour;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;

    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    res.json(serializeProject(updated));
  } catch (err) { next(err); }
});

router.delete("/projects/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (!existing) { res.status(404).json({ error: "Project not found" }); return; }
    await db.delete(projects).where(eq(projects.id, id));
    res.status(204).end();
  } catch (err) { next(err); }
});

router.get("/projects/:projectId/tasks", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await db.select().from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(asc(projectTasks.position), asc(projectTasks.createdAt));
    res.json(result.map(serializeTask));
  } catch (err) { next(err); }
});

router.post("/projects/:projectId/tasks", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const { title, description, status, priority, assignee, dueDate, position } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "Title is required" }); return; }

    const safeStatus = VALID_TASK_STATUSES.includes(status) ? status : "To Do";
    const safePriority = VALID_PRIORITIES.includes(priority) ? priority : "Medium";

    const [task] = await db.insert(projectTasks).values({
      id: randomUUID(),
      projectId,
      title: String(title).trim(),
      description: description?.trim() || null,
      status: safeStatus,
      priority: safePriority,
      assignee: assignee?.trim() || null,
      dueDate: dueDate || null,
      position: typeof position === "number" ? position : 0,
    }).returning();

    res.status(201).json(serializeTask(task));
  } catch (err) { next(err); }
});

router.patch("/projects/:projectId/tasks/:taskId", async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const [existing] = await db.select().from(projectTasks).where(and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId)));
    if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

    const { title, description, status, priority, assignee, dueDate, position } = req.body;
    const updates: Partial<typeof projectTasks.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) { res.status(400).json({ error: "Title cannot be empty" }); return; }
      updates.title = trimmed;
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (status !== undefined && VALID_TASK_STATUSES.includes(status)) updates.status = status;
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updates.priority = priority;
    if (assignee !== undefined) updates.assignee = assignee?.trim() || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (position !== undefined) updates.position = position;

    const [updated] = await db.update(projectTasks).set(updates).where(eq(projectTasks.id, taskId)).returning();
    res.json(serializeTask(updated));
  } catch (err) { next(err); }
});

router.delete("/projects/:projectId/tasks/:taskId", async (req, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const [existing] = await db.select().from(projectTasks).where(and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId)));
    if (!existing) { res.status(404).json({ error: "Task not found" }); return; }
    await db.delete(projectTasks).where(and(eq(projectTasks.id, taskId), eq(projectTasks.projectId, projectId)));
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;

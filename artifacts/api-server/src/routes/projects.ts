import { Router } from "express";
import { db } from "@workspace/db";
import { projects, projectTasks, projectMilestones, projectActivity, projectMembers } from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const VALID_MEMBER_ROLES = ["Lead", "Contributor", "Reviewer", "Stakeholder"] as const;

async function recordActivity(
  projectId: string,
  action: string,
  summary: string,
  extras: { taskId?: string | null; milestoneId?: string | null; actor?: string | null; meta?: unknown } = {},
) {
  try {
    await db.insert(projectActivity).values({
      id: randomUUID(),
      projectId,
      action,
      summary,
      taskId: extras.taskId ?? null,
      milestoneId: extras.milestoneId ?? null,
      actor: extras.actor ?? null,
      meta: extras.meta ? (extras.meta as object) : null,
    });
  } catch {}
}

const serializeMilestone = (m: typeof projectMilestones.$inferSelect) => ({
  ...m,
  completedAt: m.completedAt ? m.completedAt.toISOString() : null,
  createdAt: m.createdAt.toISOString(),
  updatedAt: m.updatedAt.toISOString(),
});

const serializeMember = (m: typeof projectMembers.$inferSelect) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
});

const serializeActivity = (a: typeof projectActivity.$inferSelect) => ({
  ...a,
  createdAt: a.createdAt.toISOString(),
});

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

    await recordActivity(project.id, "project.created", `Project "${project.name}" created`);
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
    const changed = Object.keys(updates).filter((k) => k !== "updatedAt");
    if (changed.length > 0) {
      await recordActivity(id, "project.updated", `Project updated: ${changed.join(", ")}`, { meta: updates });
    }
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

    await recordActivity(projectId, "task.created", `Task "${task.title}" created`, { taskId: task.id });
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
    if (status !== undefined && existing.status !== status) {
      await recordActivity(projectId, "task.status_changed", `"${updated.title}" moved from ${existing.status} to ${updated.status}`, { taskId });
    } else if (Object.keys(updates).length > 1) {
      await recordActivity(projectId, "task.updated", `Task "${updated.title}" updated`, { taskId });
    }
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

router.get("/projects/:projectId/milestones", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await db.select().from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(asc(projectMilestones.position), asc(projectMilestones.dueDate));
    res.json(result.map(serializeMilestone));
  } catch (err) { next(err); }
});

router.post("/projects/:projectId/milestones", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const { name, description, dueDate, colour, position } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

    const [milestone] = await db.insert(projectMilestones).values({
      id: randomUUID(),
      projectId,
      name: String(name).trim(),
      description: description?.trim() || null,
      dueDate: dueDate || null,
      colour: colour || "#10B981",
      position: typeof position === "number" ? position : 0,
    }).returning();

    await recordActivity(projectId, "milestone.created", `Milestone "${milestone.name}" added`, { milestoneId: milestone.id });
    res.status(201).json(serializeMilestone(milestone));
  } catch (err) { next(err); }
});

router.patch("/projects/:projectId/milestones/:milestoneId", async (req, res, next) => {
  try {
    const { projectId, milestoneId } = req.params;
    const [existing] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId)));
    if (!existing) { res.status(404).json({ error: "Milestone not found" }); return; }

    const { name, description, dueDate, colour, position, completed } = req.body;
    const updates: Partial<typeof projectMilestones.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) { res.status(400).json({ error: "Name cannot be empty" }); return; }
      updates.name = trimmed;
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (colour !== undefined) updates.colour = colour;
    if (position !== undefined) updates.position = position;
    if (completed !== undefined) {
      updates.completedAt = completed ? new Date() : null;
    }

    const [updated] = await db.update(projectMilestones).set(updates).where(eq(projectMilestones.id, milestoneId)).returning();
    if (completed !== undefined) {
      await recordActivity(projectId, completed ? "milestone.completed" : "milestone.reopened",
        `Milestone "${updated.name}" ${completed ? "completed" : "reopened"}`, { milestoneId });
    }
    res.json(serializeMilestone(updated));
  } catch (err) { next(err); }
});

router.delete("/projects/:projectId/milestones/:milestoneId", async (req, res, next) => {
  try {
    const { projectId, milestoneId } = req.params;
    const [existing] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId)));
    if (!existing) { res.status(404).json({ error: "Milestone not found" }); return; }
    await db.delete(projectMilestones).where(eq(projectMilestones.id, milestoneId));
    await recordActivity(projectId, "milestone.deleted", `Milestone "${existing.name}" removed`);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.get("/projects/:projectId/members", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await db.select().from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.name));
    res.json(result.map(serializeMember));
  } catch (err) { next(err); }
});

router.post("/projects/:projectId/members", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const { name, role, avatarColor } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }

    const safeRole = VALID_MEMBER_ROLES.includes(role) ? role : "Contributor";

    const [member] = await db.insert(projectMembers).values({
      id: randomUUID(),
      projectId,
      name: String(name).trim(),
      role: safeRole,
      avatarColor: avatarColor || "#6366F1",
    }).returning();

    await recordActivity(projectId, "member.added", `${member.name} joined as ${member.role}`);
    res.status(201).json(serializeMember(member));
  } catch (err) { next(err); }
});

router.delete("/projects/:projectId/members/:memberId", async (req, res, next) => {
  try {
    const { projectId, memberId } = req.params;
    const [existing] = await db.select().from(projectMembers).where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)));
    if (!existing) { res.status(404).json({ error: "Member not found" }); return; }
    await db.delete(projectMembers).where(eq(projectMembers.id, memberId));
    await recordActivity(projectId, "member.removed", `${existing.name} removed from project`);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.get("/projects/:projectId/activity", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const result = await db.select().from(projectActivity)
      .where(eq(projectActivity.projectId, projectId))
      .orderBy(desc(projectActivity.createdAt))
      .limit(limit);
    res.json(result.map(serializeActivity));
  } catch (err) { next(err); }
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { pmBoards, pmGroups, pmColumns, pmItems, pmViews, pmActivity } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();
const uid = () => randomUUID();
const now = () => new Date();

const serializeTs = (r: any) => ({ ...r, createdAt: r.createdAt?.toISOString?.() || r.createdAt, updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt });

// ─── Board Templates ─────────────────────────────────────────────────────────
const TEMPLATES: Record<string, { groups: string[]; columns: { name: string; type: string; options?: any }[] }> = {
  "project-tracker": {
    groups: ["To Do", "In Progress", "Review", "Complete"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "Not Started", color: "#94A3B8" }, { label: "Working", color: "#F59E0B" }, { label: "Review", color: "#3B82F6" }, { label: "Done", color: "#10B981" }, { label: "Blocked", color: "#EF4444" }] },
      { name: "Owner", type: "person" }, { name: "Priority", type: "priority" },
      { name: "Due Date", type: "date" }, { name: "Timeline", type: "timeline" },
      { name: "Progress", type: "progress" }, { name: "Notes", type: "text" },
    ],
  },
  "sprint-planning": {
    groups: ["Backlog", "Sprint 1", "Sprint 2", "Done"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "Backlog", color: "#94A3B8" }, { label: "To Do", color: "#3B82F6" }, { label: "In Progress", color: "#F59E0B" }, { label: "Testing", color: "#8B5CF6" }, { label: "Done", color: "#10B981" }] },
      { name: "Assignee", type: "person" }, { name: "Story Points", type: "number" },
      { name: "Priority", type: "priority" }, { name: "Sprint", type: "dropdown", options: [{ label: "Sprint 1" }, { label: "Sprint 2" }, { label: "Sprint 3" }] },
      { name: "Due Date", type: "date" },
    ],
  },
  "task-management": {
    groups: ["Urgent", "This Week", "Next Week", "Later"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "Open", color: "#3B82F6" }, { label: "Working", color: "#F59E0B" }, { label: "Done", color: "#10B981" }] },
      { name: "Owner", type: "person" }, { name: "Priority", type: "priority" },
      { name: "Due Date", type: "date" }, { name: "Category", type: "dropdown", options: [{ label: "Work" }, { label: "Admin" }, { label: "Compliance" }, { label: "Follow-up" }] },
    ],
  },
  "compliance-tracker": {
    groups: ["Pending Inspection", "Defects Found", "Remediation", "Compliant"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "Pending", color: "#F59E0B" }, { label: "Non-Compliant", color: "#EF4444" }, { label: "In Remediation", color: "#3B82F6" }, { label: "Compliant", color: "#10B981" }] },
      { name: "Site", type: "text" }, { name: "Inspector", type: "person" },
      { name: "Standard", type: "dropdown", options: [{ label: "AS 1851" }, { label: "AS 1670.1" }, { label: "AS 1670.4" }] },
      { name: "Due Date", type: "date" }, { name: "Priority", type: "priority" },
      { name: "Notes", type: "text" },
    ],
  },
  "maintenance-schedule": {
    groups: ["Monthly", "Quarterly", "Six-Monthly", "Annual"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "Scheduled", color: "#3B82F6" }, { label: "In Progress", color: "#F59E0B" }, { label: "Complete", color: "#10B981" }, { label: "Overdue", color: "#EF4444" }] },
      { name: "Site", type: "text" }, { name: "Technician", type: "person" },
      { name: "Service Type", type: "dropdown", options: [{ label: "Fire Panels" }, { label: "Detectors" }, { label: "Sprinklers" }, { label: "Extinguishers" }, { label: "Emergency Lighting" }] },
      { name: "Due Date", type: "date" }, { name: "Last Service", type: "date" },
    ],
  },
  "resource-planning": {
    groups: ["Available", "Assigned", "On Leave", "Training"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "Available", color: "#10B981" }, { label: "Assigned", color: "#3B82F6" }, { label: "On Leave", color: "#94A3B8" }, { label: "Training", color: "#8B5CF6" }] },
      { name: "Person", type: "person" }, { name: "Capacity", type: "progress" },
      { name: "Current Job", type: "text" }, { name: "Location", type: "text" },
      { name: "Hours This Week", type: "number" },
    ],
  },
  "blank": { groups: ["Group 1"], columns: [{ name: "Status", type: "status", options: [{ label: "To Do", color: "#94A3B8" }, { label: "In Progress", color: "#F59E0B" }, { label: "Done", color: "#10B981" }] }, { name: "Owner", type: "person" }, { name: "Due Date", type: "date" }] },
  "client-onboarding": {
    groups: ["New Clients", "Setup", "First Service", "Active"],
    columns: [
      { name: "Status", type: "status", options: [{ label: "New", color: "#3B82F6" }, { label: "Setup", color: "#F59E0B" }, { label: "First Service", color: "#8B5CF6" }, { label: "Active", color: "#10B981" }] },
      { name: "Client", type: "text" }, { name: "Contact", type: "text" },
      { name: "Account Manager", type: "person" }, { name: "Contract Value", type: "number" },
      { name: "Start Date", type: "date" },
    ],
  },
};

// ─── Boards CRUD ─────────────────────────────────────────────────────────────
router.get("/pm/boards", async (req, res, next) => {
  try {
    const result = await db.select().from(pmBoards).where(eq(pmBoards.archived, false)).orderBy(asc(pmBoards.sortOrder));
    res.json(result.map(serializeTs));
  } catch (err) { next(err); }
});

router.post("/pm/boards", async (req, res, next) => {
  try {
    const { name, description, template, color, icon } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
    const boardId = uid();
    const tmpl = TEMPLATES[template || "blank"] || TEMPLATES.blank;

    // Create board
    const [board] = await db.insert(pmBoards).values({
      id: boardId, name: name.trim(), description: description || null,
      template: template || "blank", color: color || "#3B82F6", icon: icon || "folder",
      createdAt: now(), updatedAt: now(),
    }).returning();

    // Create template groups
    for (let i = 0; i < tmpl.groups.length; i++) {
      await db.insert(pmGroups).values({ id: uid(), boardId, name: tmpl.groups[i], color: color || "#3B82F6", sortOrder: i });
    }

    // Create template columns
    for (let i = 0; i < tmpl.columns.length; i++) {
      const col = tmpl.columns[i];
      await db.insert(pmColumns).values({ id: uid(), boardId, name: col.name, type: col.type as any, options: col.options || null, sortOrder: i });
    }

    // Log activity
    await db.insert(pmActivity).values({ id: uid(), boardId, action: "created", newValue: name });

    res.status(201).json(serializeTs(board));
  } catch (err) { next(err); }
});

router.get("/pm/boards/:id", async (req, res, next) => {
  try {
    const [board] = await db.select().from(pmBoards).where(eq(pmBoards.id, req.params.id));
    if (!board) { res.status(404).json({ error: "Board not found" }); return; }
    const groups = await db.select().from(pmGroups).where(eq(pmGroups.boardId, req.params.id)).orderBy(asc(pmGroups.sortOrder));
    const columns = await db.select().from(pmColumns).where(eq(pmColumns.boardId, req.params.id)).orderBy(asc(pmColumns.sortOrder));
    const items = await db.select().from(pmItems).where(and(eq(pmItems.boardId, req.params.id), eq(pmItems.archived, false))).orderBy(asc(pmItems.sortOrder));
    const views = await db.select().from(pmViews).where(eq(pmViews.boardId, req.params.id));
    res.json({ ...serializeTs(board), groups: groups.map(serializeTs), columns: columns.map(serializeTs), items: items.map(serializeTs), views: views.map(serializeTs) });
  } catch (err) { next(err); }
});

router.patch("/pm/boards/:id", async (req, res, next) => {
  try {
    const { name, description, color, icon, defaultView, archived } = req.body;
    const updates: Record<string, any> = { updatedAt: now() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (defaultView !== undefined) updates.defaultView = defaultView;
    if (archived !== undefined) updates.archived = archived;
    const [updated] = await db.update(pmBoards).set(updates).where(eq(pmBoards.id, req.params.id)).returning();
    res.json(serializeTs(updated));
  } catch (err) { next(err); }
});

router.delete("/pm/boards/:id", async (req, res, next) => {
  try {
    await db.delete(pmBoards).where(eq(pmBoards.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

// ─── Groups CRUD ─────────────────────────────────────────────────────────────
router.post("/pm/boards/:boardId/groups", async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const [group] = await db.insert(pmGroups).values({ id: uid(), boardId: req.params.boardId, name: name || "New Group", color: color || "#3B82F6" }).returning();
    res.status(201).json(serializeTs(group));
  } catch (err) { next(err); }
});

router.patch("/pm/groups/:id", async (req, res, next) => {
  try {
    const { name, color, collapsed, sortOrder } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (collapsed !== undefined) updates.collapsed = collapsed;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const [updated] = await db.update(pmGroups).set(updates).where(eq(pmGroups.id, req.params.id)).returning();
    res.json(serializeTs(updated));
  } catch (err) { next(err); }
});

router.delete("/pm/groups/:id", async (req, res, next) => {
  try { await db.delete(pmGroups).where(eq(pmGroups.id, req.params.id)); res.status(204).end(); } catch (err) { next(err); }
});

// ─── Columns CRUD ────────────────────────────────────────────────────────────
router.post("/pm/boards/:boardId/columns", async (req, res, next) => {
  try {
    const { name, type, options, width } = req.body;
    const [col] = await db.insert(pmColumns).values({ id: uid(), boardId: req.params.boardId, name: name || "New Column", type: type || "text", options: options || null, width: width || 150 }).returning();
    res.status(201).json(serializeTs(col));
  } catch (err) { next(err); }
});

router.patch("/pm/columns/:id", async (req, res, next) => {
  try {
    const { name, type, options, width, hidden, sortOrder, required } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (options !== undefined) updates.options = options;
    if (width !== undefined) updates.width = width;
    if (hidden !== undefined) updates.hidden = hidden;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (required !== undefined) updates.required = required;
    const [updated] = await db.update(pmColumns).set(updates).where(eq(pmColumns.id, req.params.id)).returning();
    res.json(serializeTs(updated));
  } catch (err) { next(err); }
});

router.delete("/pm/columns/:id", async (req, res, next) => {
  try { await db.delete(pmColumns).where(eq(pmColumns.id, req.params.id)); res.status(204).end(); } catch (err) { next(err); }
});

// ─── Items CRUD ──────────────────────────────────────────────────────────────
router.post("/pm/boards/:boardId/items", async (req, res, next) => {
  try {
    const { name, groupId, parentId, values } = req.body;
    const [item] = await db.insert(pmItems).values({
      id: uid(), boardId: req.params.boardId, groupId: groupId || null,
      parentId: parentId || null, name: name || "New Item", values: values || {},
      createdAt: now(), updatedAt: now(),
    }).returning();
    await db.insert(pmActivity).values({ id: uid(), boardId: req.params.boardId, itemId: item.id, action: "created", newValue: name });
    res.status(201).json(serializeTs(item));
  } catch (err) { next(err); }
});

router.patch("/pm/items/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(pmItems).where(eq(pmItems.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Item not found" }); return; }
    const { name, groupId, parentId, values, sortOrder, archived } = req.body;
    const updates: Record<string, any> = { updatedAt: now() };
    if (name !== undefined) updates.name = name;
    if (groupId !== undefined) updates.groupId = groupId;
    if (parentId !== undefined) updates.parentId = parentId;
    if (values !== undefined) updates.values = { ...(existing.values as any || {}), ...values };
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (archived !== undefined) updates.archived = archived;

    // Log field changes
    if (values) {
      for (const [field, newVal] of Object.entries(values)) {
        const oldVal = (existing.values as any)?.[field];
        if (oldVal !== newVal) {
          await db.insert(pmActivity).values({ id: uid(), boardId: existing.boardId, itemId: existing.id, action: "updated", field, oldValue: String(oldVal ?? ""), newValue: String(newVal ?? "") });
        }
      }
    }

    const [updated] = await db.update(pmItems).set(updates).where(eq(pmItems.id, req.params.id)).returning();
    res.json(serializeTs(updated));
  } catch (err) { next(err); }
});

router.delete("/pm/items/:id", async (req, res, next) => {
  try {
    const [existing] = await db.select().from(pmItems).where(eq(pmItems.id, req.params.id));
    if (existing) await db.insert(pmActivity).values({ id: uid(), boardId: existing.boardId, itemId: existing.id, action: "deleted", oldValue: existing.name });
    await db.delete(pmItems).where(eq(pmItems.id, req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
});

// ─── Views CRUD ──────────────────────────────────────────────────────────────
router.post("/pm/boards/:boardId/views", async (req, res, next) => {
  try {
    const { name, type, config } = req.body;
    const [view] = await db.insert(pmViews).values({ id: uid(), boardId: req.params.boardId, name: name || "New View", type: type || "table", config: config || {} }).returning();
    res.status(201).json(serializeTs(view));
  } catch (err) { next(err); }
});

router.delete("/pm/views/:id", async (req, res, next) => {
  try { await db.delete(pmViews).where(eq(pmViews.id, req.params.id)); res.status(204).end(); } catch (err) { next(err); }
});

// ─── Activity Log ────────────────────────────────────────────────────────────
router.get("/pm/boards/:boardId/activity", async (req, res, next) => {
  try {
    const result = await db.select().from(pmActivity).where(eq(pmActivity.boardId, req.params.boardId)).orderBy(desc(pmActivity.createdAt)).limit(50);
    res.json(result.map(serializeTs));
  } catch (err) { next(err); }
});

// ─── Templates List ──────────────────────────────────────────────────────────
router.get("/pm/templates", async (_req, res) => {
  res.json(Object.entries(TEMPLATES).map(([key, tmpl]) => ({
    key, name: key.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    groups: tmpl.groups.length, columns: tmpl.columns.length,
    columnTypes: tmpl.columns.map(c => c.type),
  })));
});

export default router;

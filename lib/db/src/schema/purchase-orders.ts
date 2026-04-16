import { index, pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),

  // Core PO identifiers
  poNumber: text("po_number").notNull(),
  client: text("client").notNull(),
  site: text("site"),
  amount: numeric("amount", { precision: 12, scale: 2 }),

  // Workflow state:
  //  Received  → email landed, not yet matched
  //  Matched   → linked to defect / quote / task
  //  Approved  → client has approved the PO (what user mostly cares about)
  //  Actioned  → updated in Uptick / scheduled
  //  Completed → work done, invoiced
  //  Cancelled → withdrawn
  status: text("status")
    .notNull()
    .$type<"Received" | "Matched" | "Approved" | "Actioned" | "Completed" | "Cancelled">()
    .default("Received"),

  // Linkage to the rest of the system
  defectId: text("defect_id"),
  quoteId: text("quote_id"),
  quoteNumber: text("quote_number"),
  taskNumber: text("task_number"),

  // Email source context — where the approval came from
  emailSubject: text("email_subject"),
  emailFrom: text("email_from"),
  emailReceivedAt: timestamp("email_received_at", { withTimezone: true }),
  emailBody: text("email_body"),

  // Approval metadata
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: text("approved_by"),

  // Checklist the user ticks off after approval:
  //   [{ id, label, done, doneAt }]
  // e.g. "Updated Uptick", "Scheduled crew", "Emailed client", "Invoice raised"
  checklist: jsonb("checklist").notNull().default([]),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("purchase_orders_status_idx").on(table.status),
  index("purchase_orders_client_idx").on(table.client),
  index("purchase_orders_po_number_idx").on(table.poNumber),
  index("purchase_orders_defect_id_idx").on(table.defectId),
  index("purchase_orders_quote_id_idx").on(table.quoteId),
  index("purchase_orders_task_number_idx").on(table.taskNumber),
  index("purchase_orders_created_at_idx").on(table.createdAt),
]);

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  createdAt: true,
  updatedAt: true,
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string | null;
};

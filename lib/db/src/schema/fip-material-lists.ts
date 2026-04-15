/**
 * fip_material_lists + fip_material_list_items
 *
 * Operator-authored lists of parts + custom line items needed for a
 * job or a quote. The Common Products card in the FIP Command Centre
 * is the primary producer; the operator builds up a list of items,
 * adds a custom line, then saves the whole thing as a note for later
 * referral.
 *
 * Design notes:
 *   - Lists are per-user (identified by `owner` column) so multiple
 *     operators can have their own working lists without clashing.
 *   - Items can be either a reference to a row in fip_common_products
 *     (via product_id) OR a free-form custom entry (custom = true,
 *     product_id = null). The frontend picks which shape to use.
 *   - Every list can be exported as a note into the existing `notes`
 *     table with category = 'Follow Up' and raw_data.kind =
 *     'fip-material-list'. The note carries a formatted plaintext
 *     render of the list so it shows up in the existing notes list
 *     view without needing a custom renderer.
 *   - Soft-deletable. Never destructive.
 */
import { index, integer, numeric, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fipMaterialLists = pgTable(
  "fip_material_lists",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    owner: text("owner").notNull().default("casper"),
    panelSlug: text("panel_slug"),
    siteRef: text("site_ref"),
    taskRef: text("task_ref"),
    notes: text("notes"),
    status: text("status").notNull().$type<"open" | "saved" | "archived">().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("fip_material_lists_owner_idx").on(t.owner),
    index("fip_material_lists_panel_idx").on(t.panelSlug),
    index("fip_material_lists_status_idx").on(t.status),
    index("fip_material_lists_deleted_idx").on(t.deletedAt),
  ],
);

export const fipMaterialListItems = pgTable(
  "fip_material_list_items",
  {
    id: text("id").primaryKey(),
    listId: text("list_id").notNull(),
    productId: text("product_id"),
    custom: boolean("custom").notNull().default(false),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    partCode: text("part_code"),
    category: text("category"),
    description: text("description"),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unit: text("unit").default("each"),
    unitPriceAud: numeric("unit_price_aud", { precision: 10, scale: 2 }),
    totalAud: numeric("total_aud", { precision: 12, scale: 2 }),
    supplierName: text("supplier_name"),
    supplierProductCode: text("supplier_product_code"),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("fip_material_list_items_list_idx").on(t.listId),
    index("fip_material_list_items_product_idx").on(t.productId),
    index("fip_material_list_items_deleted_idx").on(t.deletedAt),
  ],
);

export const insertFipMaterialListSchema = createInsertSchema(fipMaterialLists).omit({
  createdAt: true,
  updatedAt: true,
});
export type FipMaterialList = typeof fipMaterialLists.$inferSelect;
export type InsertFipMaterialList = z.infer<typeof insertFipMaterialListSchema>;
export type FipMaterialListItem = typeof fipMaterialListItems.$inferSelect;

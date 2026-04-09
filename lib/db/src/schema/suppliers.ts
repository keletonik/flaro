import { index, pgTable, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").$type<"Fire Panels" | "Detectors" | "Extinguishers" | "Sprinklers" | "Emergency Lighting" | "Electrical" | "General" | "Other">().default("General"),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  suburb: text("suburb"),
  accountNumber: text("account_number"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  rating: text("rating").$type<"Preferred" | "Approved" | "Backup" | "New">().default("Approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("suppliers_category_idx").on(table.category),
  index("suppliers_name_idx").on(table.name),
  index("suppliers_created_at_idx").on(table.createdAt),
]);

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  createdAt: true,
  updatedAt: true,
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export const supplierProducts = pgTable("supplier_products", {
  id: text("id").primaryKey(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  productCode: text("product_code"),
  category: text("category"),
  brand: text("brand"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  unit: text("unit").default("each"),
  description: text("description"),
  notes: text("notes"),
  rawData: jsonb("raw_data"),
  importBatchId: text("import_batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("supplier_products_supplier_id_idx").on(table.supplierId),
  index("supplier_products_category_idx").on(table.category),
  index("supplier_products_product_name_idx").on(table.productName),
  index("supplier_products_created_at_idx").on(table.createdAt),
]);

export const insertSupplierProductSchema = createInsertSchema(supplierProducts).omit({
  createdAt: true,
  updatedAt: true,
});

export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type InsertSupplierProduct = z.infer<typeof insertSupplierProductSchema>;

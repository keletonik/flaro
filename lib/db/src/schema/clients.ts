import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(), // lowercase, trimmed for dedup
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("clients_normalized_name_idx").on(table.normalizedName),
  index("clients_name_idx").on(table.name),
]);

export type Client = typeof clients.$inferSelect;

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  address: text("address"),
  suburb: text("suburb"),
  clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
  buildingClass: text("building_class"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("sites_normalized_name_idx").on(table.normalizedName),
  index("sites_client_id_idx").on(table.clientId),
]);

export type Site = typeof sites.$inferSelect;

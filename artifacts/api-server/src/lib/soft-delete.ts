import type { PgTable } from "drizzle-orm/pg-core";
import { and, eq, isNull, inArray, type SQL } from "drizzle-orm";
import { db } from "@workspace/db";

/**
 * SOFT_DELETE=1 enables soft deletion (an UPDATE on deleted_at) instead of a
 * destructive DELETE. Rollback: unset the env var and the code path goes back
 * to hard-delete behaviour, untouched.
 */
export function softDeleteEnabled(): boolean {
  return process.env["SOFT_DELETE"] === "1";
}

/**
 * Build a WHERE clause that excludes soft-deleted rows when the flag is on.
 * When the flag is off, returns the original clause unchanged.
 *
 * Use in every list/read handler on tables that have a deleted_at column:
 *
 *     const where = withSoftDelete(table, existingClause);
 */
export function withSoftDelete<T extends PgTable>(
  table: T,
  existing: SQL | undefined,
): SQL | undefined {
  if (!softDeleteEnabled()) return existing;
  const deletedAt = (table as any).deletedAt;
  if (!deletedAt) return existing;
  const clause = isNull(deletedAt);
  return existing ? and(existing, clause) : clause;
}

/** Delete a single row by id. Honours SOFT_DELETE. */
export async function deleteRow<T extends PgTable & { id: any; deletedAt?: any }>(
  table: T,
  id: string,
): Promise<void> {
  if (softDeleteEnabled() && (table as any).deletedAt) {
    await db.update(table as any).set({ deletedAt: new Date() }).where(eq((table as any).id, id));
    return;
  }
  await db.delete(table as any).where(eq((table as any).id, id));
}

/** Delete many rows by id. Honours SOFT_DELETE. */
export async function deleteRows<T extends PgTable & { id: any; deletedAt?: any }>(
  table: T,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  if (softDeleteEnabled() && (table as any).deletedAt) {
    await db.update(table as any).set({ deletedAt: new Date() }).where(inArray((table as any).id, ids));
    return;
  }
  await db.delete(table as any).where(inArray((table as any).id, ids));
}

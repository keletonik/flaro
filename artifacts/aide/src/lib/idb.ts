/**
 * idb.ts - thin IndexedDB wrapper for on-device storage.
 *
 * Stores:
 *   bookmarks      - {id, kind, refId, label, addedAt, deletedAt?}
 *   notes          - {id, scope, scopeId, body, createdAt, updatedAt}
 *   cached-manuals - {id, brandId, modelId, filename, mime, size, blob, addedAt}
 *
 * No external deps. All reads/writes are Promise-wrapped. Schema is
 * versioned (DB_VERSION) so future migrations land in onupgradeneeded.
 */

const DB_NAME = "aide-fip";
const DB_VERSION = 1;

export type BookmarkKind = "panel" | "scenario" | "module" | "brand";

export interface Bookmark {
  id: string;
  kind: BookmarkKind;
  /** ID of the bookmarked item in its source dataset (e.g. "pertronic-f220"). */
  refId: string;
  /** Human-readable label so the bookmark list works without re-resolving. */
  label: string;
  addedAt: number;
  /** Soft-delete timestamp so a future cloud sync can resolve conflicts. */
  deletedAt?: number;
}

export interface SiteNote {
  id: string;
  /** Scope tag - "panel", "site", "global". */
  scope: "panel" | "site" | "global";
  /** ID within the scope (model id, site name, or empty for global). */
  scopeId: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface CachedManual {
  id: string;
  /** Optional brand association so the UI can group. */
  brandId?: string;
  /** Optional model association. */
  modelId?: string;
  filename: string;
  mime: string;
  size: number;
  /** Stored as a Blob to keep memory off the JS heap. */
  blob: Blob;
  addedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("bookmarks")) {
        const s = db.createObjectStore("bookmarks", { keyPath: "id" });
        s.createIndex("kind_refId", ["kind", "refId"], { unique: true });
        s.createIndex("addedAt", "addedAt");
      }
      if (!db.objectStoreNames.contains("notes")) {
        const s = db.createObjectStore("notes", { keyPath: "id" });
        s.createIndex("scope_scopeId", ["scope", "scopeId"]);
        s.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("cached-manuals")) {
        const s = db.createObjectStore("cached-manuals", { keyPath: "id" });
        s.createIndex("brandId", "brandId");
        s.createIndex("modelId", "modelId");
        s.createIndex("addedAt", "addedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
  return dbPromise;
}

function withStore<T>(
  storeName: "bookmarks" | "notes" | "cached-manuals",
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = run(store);
        tx.oncomplete = () => {
          if (req) resolve(req.result as T);
          else resolve(undefined as unknown as T);
        };
        tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
        tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
      }),
  );
}

// ── Bookmarks ────────────────────────────────────────────────────────

function bookmarkId(kind: BookmarkKind, refId: string): string {
  return `${kind}:${refId}`;
}

export async function addBookmark(
  kind: BookmarkKind, refId: string, label: string,
): Promise<Bookmark> {
  const bm: Bookmark = {
    id: bookmarkId(kind, refId),
    kind,
    refId,
    label,
    addedAt: Date.now(),
  };
  await withStore("bookmarks", "readwrite", (s) => s.put(bm));
  return bm;
}

export async function removeBookmark(kind: BookmarkKind, refId: string): Promise<void> {
  await withStore("bookmarks", "readwrite", (s) => s.delete(bookmarkId(kind, refId)));
}

export async function isBookmarked(kind: BookmarkKind, refId: string): Promise<boolean> {
  const v = await withStore<Bookmark | undefined>(
    "bookmarks", "readonly", (s) => s.get(bookmarkId(kind, refId)),
  );
  return !!v && !v.deletedAt;
}

export async function listBookmarks(): Promise<Bookmark[]> {
  const all = await withStore<Bookmark[]>(
    "bookmarks", "readonly", (s) => s.getAll(),
  );
  return (all ?? [])
    .filter((b) => !b.deletedAt)
    .sort((a, b) => b.addedAt - a.addedAt);
}

// ── Notes ────────────────────────────────────────────────────────────

export async function getNote(scope: SiteNote["scope"], scopeId: string): Promise<SiteNote | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const idx = tx.objectStore("notes").index("scope_scopeId");
    const req = idx.get([scope, scopeId]);
    req.onsuccess = () => resolve(req.result as SiteNote | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function putNote(note: Omit<SiteNote, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<SiteNote> {
  const existing = await getNote(note.scope, note.scopeId);
  const now = Date.now();
  const next: SiteNote = {
    id: existing?.id ?? note.id ?? `note:${note.scope}:${note.scopeId}:${now}`,
    scope: note.scope,
    scopeId: note.scopeId,
    body: note.body,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await withStore("notes", "readwrite", (s) => s.put(next));
  return next;
}

export async function listNotes(): Promise<SiteNote[]> {
  const all = await withStore<SiteNote[]>("notes", "readonly", (s) => s.getAll());
  return (all ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Cached manuals (PR 4 uses these) ────────────────────────────────

export async function addCachedManual(m: Omit<CachedManual, "id" | "addedAt">): Promise<CachedManual> {
  const cm: CachedManual = {
    id: `manual:${m.modelId ?? m.brandId ?? "any"}:${Date.now()}`,
    addedAt: Date.now(),
    ...m,
  };
  await withStore("cached-manuals", "readwrite", (s) => s.put(cm));
  return cm;
}

export async function listCachedManuals(): Promise<CachedManual[]> {
  const all = await withStore<CachedManual[]>("cached-manuals", "readonly", (s) => s.getAll());
  return (all ?? []).sort((a, b) => b.addedAt - a.addedAt);
}

export async function removeCachedManual(id: string): Promise<void> {
  await withStore("cached-manuals", "readwrite", (s) => s.delete(id));
}

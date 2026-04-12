/**
 * FIP storage adapter.
 *
 * Phase 1 ships the Postgres bytea backend (rows already have `blob` columns
 * on fip_session_images and fip_document_versions). Phase 2 can swap to an S3
 * adapter without touching call sites by wiring a different implementation
 * and leaving the interface the same.
 *
 * The interface is deliberately narrow: put, get, exists, delete, checksum.
 * Binary blobs live in the DB so a Replit restart doesn't lose them.
 */

import { createHash, randomUUID } from "crypto";

export interface StoredObject {
  id: string;
  bytes: Buffer;
  contentType: string;
  size: number;
  checksum: string;
  kind: "bytea" | "disk" | "s3";
}

export interface PutOptions {
  contentType?: string;
  filename?: string;
}

export interface StorageAdapter {
  readonly kind: "bytea" | "disk" | "s3";
  put(bytes: Buffer, opts?: PutOptions): Promise<StoredObject>;
  get(id: string): Promise<StoredObject | null>;
  exists(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

// In-memory bytea adapter used as the Phase 1 default. Binary rows land in
// fip_session_images.blob and fip_document_versions.blob directly from the
// route handlers; this adapter exists for tests and as a reference
// implementation of the interface.
export class InMemoryStorage implements StorageAdapter {
  readonly kind = "bytea" as const;
  private objects = new Map<string, StoredObject>();

  async put(bytes: Buffer, opts: PutOptions = {}): Promise<StoredObject> {
    const id = randomUUID();
    const obj: StoredObject = {
      id,
      bytes,
      contentType: opts.contentType ?? "application/octet-stream",
      size: bytes.length,
      checksum: sha256(bytes),
      kind: "bytea",
    };
    this.objects.set(id, obj);
    return obj;
  }

  async get(id: string): Promise<StoredObject | null> {
    return this.objects.get(id) ?? null;
  }

  async exists(id: string): Promise<boolean> {
    return this.objects.has(id);
  }

  async delete(id: string): Promise<void> {
    this.objects.delete(id);
  }
}

export function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Safety wrapper: accepts either a Buffer or a base64 data URL/body and
// normalises to { bytes, contentType }.
export function parseBinaryInput(input: string | Buffer | undefined | null, hint?: string): { bytes: Buffer; contentType: string } {
  if (!input) return { bytes: Buffer.alloc(0), contentType: hint ?? "application/octet-stream" };
  if (Buffer.isBuffer(input)) return { bytes: input, contentType: hint ?? "application/octet-stream" };
  // data URL
  const m = input.match(/^data:([^;,]+);base64,(.+)$/);
  if (m) return { bytes: Buffer.from(m[2], "base64"), contentType: m[1] };
  // raw base64
  if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length > 32) {
    try {
      return { bytes: Buffer.from(input, "base64"), contentType: hint ?? "application/octet-stream" };
    } catch { /* fall through */ }
  }
  // plain text fallback
  return { bytes: Buffer.from(input, "utf8"), contentType: hint ?? "text/plain" };
}

let _adapter: StorageAdapter = new InMemoryStorage();
export function getStorageAdapter(): StorageAdapter { return _adapter; }
export function setStorageAdapter(adapter: StorageAdapter): void { _adapter = adapter; }

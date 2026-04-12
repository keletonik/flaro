import { describe, it, expect } from "vitest";
import { createHash, scryptSync, randomBytes, timingSafeEqual } from "crypto";

// These are exact copies of the in-file helpers so we can unit-test the
// dual-read logic without standing up a DB. Keep the hash functions in sync
// with routes/auth.ts.
const LEGACY_SALT = "flamesafe-ops-salt-2026";
const SCRYPT_KEYLEN = 64;
function hashLegacy(password: string): string {
  return createHash("sha256").update(password + LEGACY_SALT).digest("hex");
}
function hashScrypt(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
}
function verifyScrypt(password: string, salt: string, expected: string): boolean {
  const computed = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expectedBuf = Buffer.from(expected, "hex");
  if (computed.length !== expectedBuf.length) return false;
  return timingSafeEqual(computed, expectedBuf);
}

describe("password hashing", () => {
  it("legacy sha256 is deterministic", () => {
    expect(hashLegacy("hunter2")).toBe(hashLegacy("hunter2"));
  });

  it("scrypt with a per-user salt changes output", () => {
    const salt1 = randomBytes(16).toString("hex");
    const salt2 = randomBytes(16).toString("hex");
    expect(hashScrypt("hunter2", salt1)).not.toBe(hashScrypt("hunter2", salt2));
  });

  it("verifyScrypt matches only when the password and salt match", () => {
    const salt = randomBytes(16).toString("hex");
    const hash = hashScrypt("correct horse", salt);
    expect(verifyScrypt("correct horse", salt, hash)).toBe(true);
    expect(verifyScrypt("wrong horse", salt, hash)).toBe(false);
    expect(verifyScrypt("correct horse", randomBytes(16).toString("hex"), hash)).toBe(false);
  });

  it("verifyScrypt handles length mismatches without throwing", () => {
    const salt = randomBytes(16).toString("hex");
    expect(verifyScrypt("p", salt, "abcd")).toBe(false);
  });
});

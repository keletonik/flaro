import { describe, it, expect, afterEach, vi } from "vitest";

// Importing ./soft-delete pulls in @workspace/db which throws at module load
// when DATABASE_URL isn't set. Stub the db boundary so the flag helper can be
// tested in isolation.
vi.mock("@workspace/db", () => ({ db: {} }));

import { softDeleteEnabled } from "./soft-delete";

describe("softDeleteEnabled", () => {
  const orig = process.env["SOFT_DELETE"];
  afterEach(() => {
    if (orig === undefined) delete process.env["SOFT_DELETE"];
    else process.env["SOFT_DELETE"] = orig;
  });

  it("is off by default", () => {
    delete process.env["SOFT_DELETE"];
    expect(softDeleteEnabled()).toBe(false);
  });

  it("is off when SOFT_DELETE=0", () => {
    process.env["SOFT_DELETE"] = "0";
    expect(softDeleteEnabled()).toBe(false);
  });

  it("is on when SOFT_DELETE=1", () => {
    process.env["SOFT_DELETE"] = "1";
    expect(softDeleteEnabled()).toBe(true);
  });

  it("is off for any other value (strict '1' check)", () => {
    process.env["SOFT_DELETE"] = "true";
    expect(softDeleteEnabled()).toBe(false);
    process.env["SOFT_DELETE"] = "yes";
    expect(softDeleteEnabled()).toBe(false);
  });
});

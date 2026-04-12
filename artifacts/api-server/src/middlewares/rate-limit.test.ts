import { describe, it, expect, afterEach } from "vitest";
import { loginRateLimiter, apiRateLimiter } from "./rate-limit";

describe("rate limiters", () => {
  const orig = process.env["RATE_LIMIT_DISABLED"];
  afterEach(() => {
    if (orig === undefined) delete process.env["RATE_LIMIT_DISABLED"];
    else process.env["RATE_LIMIT_DISABLED"] = orig;
  });

  it("returns a no-op middleware when RATE_LIMIT_DISABLED=1", () => {
    process.env["RATE_LIMIT_DISABLED"] = "1";
    const mw = loginRateLimiter();
    let nextCalled = false;
    mw({} as any, {} as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it("returns a real limiter when not disabled", () => {
    delete process.env["RATE_LIMIT_DISABLED"];
    const mw = loginRateLimiter();
    // express-rate-limit returns a function; a real limiter sets some metadata.
    expect(typeof mw).toBe("function");
    expect(mw.length).toBeGreaterThanOrEqual(2);
  });

  it("apiRateLimiter honours the same flag", () => {
    process.env["RATE_LIMIT_DISABLED"] = "1";
    const mw = apiRateLimiter();
    let nextCalled = false;
    mw({} as any, {} as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});

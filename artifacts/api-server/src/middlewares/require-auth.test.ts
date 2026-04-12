import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The middleware depends on auth state via ./routes/auth — mock at the module level.
vi.mock("../routes/auth", () => ({
  getSessionUser: vi.fn(),
  getSessionUserAsync: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { requireAuth } from "./require-auth";
import { getSessionUser, getSessionUserAsync } from "../routes/auth";

function makeReq(overrides: any = {}) {
  return {
    url: "/jobs",
    method: "GET",
    headers: {},
    ...overrides,
  };
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    status(code: number) { res.statusCode = code; return res; },
    json(body: any) { res.body = body; return res; },
  };
  return res;
}

describe("requireAuth", () => {
  const origEnforce = process.env["AUTH_ENFORCE"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (origEnforce === undefined) delete process.env["AUTH_ENFORCE"];
    else process.env["AUTH_ENFORCE"] = origEnforce;
  });

  it("always allows /auth/login without a token", async () => {
    process.env["AUTH_ENFORCE"] = "true";
    const req = makeReq({ url: "/auth/login", method: "POST" });
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("allows /healthz and /events without a token", async () => {
    process.env["AUTH_ENFORCE"] = "true";
    for (const url of ["/healthz", "/events"]) {
      const req = makeReq({ url });
      const res = makeRes();
      const next = vi.fn();
      await requireAuth(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it("rejects missing token with 401 when AUTH_ENFORCE=true", async () => {
    process.env["AUTH_ENFORCE"] = "true";
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as any, res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("lets unauthenticated requests through when AUTH_ENFORCE is not 'true'", async () => {
    delete process.env["AUTH_ENFORCE"];
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("attaches req.auth when a valid token is present", async () => {
    process.env["AUTH_ENFORCE"] = "true";
    (getSessionUser as any).mockReturnValue({
      userId: "u1", username: "casper", displayName: "Casper", role: "admin", expiresAt: Date.now() + 60_000,
    });
    const req: any = makeReq({ headers: { authorization: "Bearer tok123" } });
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.auth).toEqual({
      userId: "u1", username: "casper", displayName: "Casper", role: "admin",
    });
  });

  it("falls through to the async DB lookup on cache miss", async () => {
    process.env["AUTH_ENFORCE"] = "true";
    (getSessionUser as any).mockReturnValue(null);
    (getSessionUserAsync as any).mockResolvedValue({
      userId: "u2", username: "jade", displayName: "Jade", role: "manager", expiresAt: Date.now() + 60_000,
    });
    const req: any = makeReq({ headers: { authorization: "Bearer warm-cold" } });
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res as any, next);
    expect(getSessionUserAsync).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(req.auth?.username).toBe("jade");
  });
});

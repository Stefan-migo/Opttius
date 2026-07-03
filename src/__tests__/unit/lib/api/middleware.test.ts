/**
 * Unit tests for API middleware (middleware.ts)
 *
 * Tests requireAuth, requireRole, composeMiddleware, withCORS,
 * logRequest, and withRequestId.
 *
 * @module __tests__/unit/lib/api/middleware.test
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  composeMiddleware,
  logRequest,
  requireAuth,
  requireRole,
  withCORS,
  withRequestId,
} from "@/lib/api/middleware";
import { createServiceRoleClient } from "@/utils/supabase/server";

// Mock dependencies
vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

function makeRequest(overrides: Partial<NextRequest> = {}): NextRequest {
  return {
    url: "http://localhost:3000/api/test",
    headers: new Headers(),
    ...overrides,
  } as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------
describe("requireAuth", () => {
  it("should return userId and user on valid Bearer token", async () => {
    const mockUser = { id: "uid-1", email: "a@b.com" };
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown);

    const result = await requireAuth(
      makeRequest({ headers: new Headers({ authorization: "Bearer tok" }) }),
    );

    expect(result.userId).toBe("uid-1");
    expect(result.user.email).toBe("a@b.com");
  });

  it("should throw AuthenticationError when auth header is missing", async () => {
    const req = makeRequest();
    await expect(requireAuth(req)).rejects.toThrow(AuthenticationError);
    await expect(requireAuth(req)).rejects.toThrow(
      "Authorization header required",
    );
  });

  it("should throw AuthenticationError when auth header is not Bearer", async () => {
    const req = makeRequest({
      headers: new Headers({ authorization: "Basic xyz" }),
    });
    await expect(requireAuth(req)).rejects.toThrow(AuthenticationError);
  });

  it("should throw AuthenticationError on invalid or expired token", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Invalid token"),
        }),
      },
    } as unknown);

    const req = makeRequest({
      headers: new Headers({ authorization: "Bearer bad" }),
    });
    // The inner AuthenticationError("Invalid or expired token") is caught
    // and re-thrown by the outer catch as "Authentication failed"
    await expect(requireAuth(req)).rejects.toThrow(AuthenticationError);
    await expect(requireAuth(req)).rejects.toThrow("Authentication failed");
  });

  it("should throw AuthenticationError when getUser throws", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("network error")),
      },
    } as unknown);

    const req = makeRequest({
      headers: new Headers({ authorization: "Bearer tok" }),
    });
    await expect(requireAuth(req)).rejects.toThrow(AuthenticationError);
  });
});

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------
describe("requireRole", () => {
  it("should pass when user is admin (default role)", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown);

    await expect(requireRole("uid-1")).resolves.toBeUndefined();
  });

  it("should throw AuthorizationError when is_admin returns false", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown);

    await expect(requireRole("uid-1")).rejects.toThrow(AuthorizationError);
    await expect(requireRole("uid-1")).rejects.toThrow(
      "Insufficient permissions",
    );
  });

  it("should throw AuthorizationError when is_admin RPC errors", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("db") }),
    } as unknown);

    await expect(requireRole("uid-1")).rejects.toThrow(AuthorizationError);
    await expect(requireRole("uid-1")).rejects.toThrow(
      "Unable to verify admin status",
    );
  });

  it("should throw AuthorizationError for requiredRole other than admin", async () => {
    const mockRpc = vi
      .fn()
      .mockResolvedValueOnce({ data: true, error: null }) // is_admin
      .mockResolvedValueOnce({ data: "admin", error: null }); // get_admin_role
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: mockRpc,
    } as unknown);

    // Single call — matching on message covers both AuthorizationError type and text
    await expect(requireRole("uid-1", "super_admin")).rejects.toThrow(
      "only 'admin' role exists",
    );
  });

  it("should throw when get_admin_role RPC errors", async () => {
    const mockRpc = vi
      .fn()
      .mockResolvedValueOnce({ data: true, error: null }) // is_admin
      .mockResolvedValueOnce({
        data: null,
        error: new Error("role error"),
      }); // get_admin_role
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: mockRpc,
    } as unknown);

    // requiredRole !== "admin" enters the second RPC block
    await expect(requireRole("uid-1", "super_admin")).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("should throw AuthorizationError when supabase.rpc throws unexpectedly", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockRejectedValue(new Error("unexpected")),
    } as unknown);

    await expect(requireRole("uid-1")).rejects.toThrow(AuthorizationError);
    await expect(requireRole("uid-1")).rejects.toThrow(
      "Authentication system error",
    );
  });
});

// ---------------------------------------------------------------------------
// composeMiddleware
// ---------------------------------------------------------------------------
describe("composeMiddleware", () => {
  it("should chain middlewares around the base handler", async () => {
    const order: string[] = [];

    const mw1 = async (
      _req: NextRequest,
      h: () => Promise<NextResponse>,
    ): Promise<NextResponse> => {
      order.push("mw1-before");
      const res = await h();
      order.push("mw1-after");
      return res;
    };
    const mw2 = async (
      _req: NextRequest,
      h: () => Promise<NextResponse>,
    ): Promise<NextResponse> => {
      order.push("mw2-before");
      const res = await h();
      order.push("mw2-after");
      return res;
    };

    const composed = composeMiddleware(mw1, mw2);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const request = makeRequest();

    await composed(request, handler);

    expect(order).toEqual([
      "mw1-before",
      "mw2-before",
      "mw2-after",
      "mw1-after",
    ]);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should propagate error from inner middleware through chain", async () => {
    const mwOuter = async (
      _req: NextRequest,
      h: () => Promise<NextResponse>,
    ): Promise<NextResponse> => h();
    const mwInner = async (): Promise<NextResponse> => {
      throw new Error("inner error");
    };

    const composed = composeMiddleware(mwOuter, mwInner);
    const request = makeRequest();

    await expect(composed(request, () => NextResponse.json({ ok: true }))).rejects.toThrow(
      "inner error",
    );
  });

  it("should stop chain when outer middleware throws before calling handler", async () => {
    const mwThrow = async (): Promise<NextResponse> => {
      throw new Error("stop");
    };
    const mwNever = vi.fn();
    const composed = composeMiddleware(mwThrow, mwNever);
    const request = makeRequest();

    await expect(composed(request, () => NextResponse.json({ ok: true }))).rejects.toThrow(
      "stop",
    );
    expect(mwNever).not.toHaveBeenCalled();
  });

  it("should return the response from the chain", async () => {
    const mw = async (
      _req: NextRequest,
      h: () => Promise<NextResponse>,
    ): Promise<NextResponse> => h();
    const composed = composeMiddleware(mw);
    const request = makeRequest();

    const response = await composed(request, () =>
      NextResponse.json({ result: "done" }, { status: 201 }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.result).toBe("done");
  });
});

// ---------------------------------------------------------------------------
// withCORS
// ---------------------------------------------------------------------------
describe("withCORS", () => {
  const buildResponse = (): NextResponse =>
    NextResponse.json({}, { status: 200 });

  it("should set Access-Control-Allow-Methods header", () => {
    const res = withCORS(buildResponse());
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE, OPTIONS",
    );
  });

  it("should set Access-Control-Allow-Headers header", () => {
    const res = withCORS(buildResponse());
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization",
    );
  });

  it("should set Access-Control-Max-Age to 86400", () => {
    const res = withCORS(buildResponse());
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("should set Access-Control-Allow-Origin when origin is allowed", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.opttius.com");
    const res = withCORS(buildResponse(), "https://app.opttius.com");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.opttius.com",
    );
    vi.unstubAllEnvs();
  });

  it("should not set Access-Control-Allow-Origin for disallowed origins", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.opttius.com");
    const res = withCORS(buildResponse(), "https://evil.com");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("should use custom methods when provided", () => {
    const res = withCORS(buildResponse(), undefined, ["GET", "POST"]);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST");
  });
});

// ---------------------------------------------------------------------------
// logRequest
// ---------------------------------------------------------------------------
describe("logRequest", () => {
  it("should return a function", () => {
    const request = makeRequest();
    const end = logRequest(request);
    expect(typeof end).toBe("function");
  });

  it("should log request on creation and response on end", async () => {
    const appLogger = await import("@/lib/logger").then((m) => m.appLogger);
    const request = makeRequest({ method: "POST" });
    const startTime = Date.now();

    const end = logRequest(request, startTime);
    expect(appLogger.debug).toHaveBeenCalledWith("Request received", {
      method: "POST",
      url: "http://localhost:3000/api/test",
      clientIp: "unknown",
      userAgent: "unknown",
    });

    const response = NextResponse.json({ ok: true }, { status: 201 });
    end(response);

    expect(appLogger.debug).toHaveBeenCalledWith("Request completed", {
      method: "POST",
      url: "http://localhost:3000/api/test",
      status: 201,
      duration: expect.any(Number),
    });
  });
});

// ---------------------------------------------------------------------------
// withRequestId
// ---------------------------------------------------------------------------
describe("withRequestId", () => {
  it("should set X-Request-ID header with a UUID", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("fixed-uuid-123");

    const response = withRequestId(NextResponse.json({}));
    expect(response.headers.get("X-Request-ID")).toBe("fixed-uuid-123");

    vi.restoreAllMocks();
  });
});

/**
 * Unit tests for supabase server.ts
 *
 * @module __tests__/unit/supabase/server.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetAll = vi.fn(() => []);
const mockSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ getAll: mockGetAll, set: mockSet })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ server: true })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
  })),
}));

// --- Imports ---

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  createClient as createSvrClient,
  createClientFromRequest,
  createServiceRoleClient,
} from "@/utils/supabase/server";

// --- Tests ---

describe("createClient (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a server client when env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const client = await createSvrClient();

    expect(client).toEqual({ server: true });
    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );

    vi.unstubAllEnvs();
  });

  it("catches setAll errors from Server Components", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    mockSet.mockImplementation(() => {
      throw new Error("Server Component");
    });

    // Capture the cookies config passed to createServerClient
    let capturedCookiesConfig: {
      getAll: () => unknown[];
      setAll: (cookies: { name: string; value: string; options: object }[]) => void;
    } | null = null;
    (createServerClient as unknown as import("vitest").Mock).mockImplementation(
      (_url: string, _key: string, config: { cookies: typeof capturedCookiesConfig }) => {
        capturedCookiesConfig = config.cookies;
        return { server: true };
      },
    );

    await createSvrClient();

    // setAll silently catches throws from cookieStore.set()
    expect(() =>
      capturedCookiesConfig!.setAll([{ name: "test", value: "val", options: {} }]),
    ).not.toThrow();
    expect(mockSet).toHaveBeenCalledWith("test", "val", {});

    vi.unstubAllEnvs();
  });
});

describe("createClientFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates client from Bearer token", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "1" } },
      error: null,
    });
    (createSupabaseClient as unknown as import("vitest").Mock).mockReturnValue({
      auth: { getUser: mockGetUser },
    });

    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer test-jwt" },
    }) as unknown as Request;

    const result = await createClientFromRequest(request);

    expect(createSupabaseClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      {
        global: { headers: { Authorization: "Bearer test-jwt" } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    // Bearer path should NOT use createServerClient
    expect(createServerClient).not.toHaveBeenCalled();

    await result.getUser();
    expect(mockGetUser).toHaveBeenCalledWith("test-jwt");

    vi.unstubAllEnvs();
  });

  it("falls back to cookie auth when no Authorization header", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const request = new Request("http://localhost") as unknown as Request;

    await createClientFromRequest(request);

    // Falls through to createClient() which uses createServerClient
    expect(createServerClient).toHaveBeenCalled();
    // Should NOT use createSupabaseClient (that's the Bearer path)
    expect(createSupabaseClient).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("falls back to cookie auth when request is undefined", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    await createClientFromRequest();

    expect(createServerClient).toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("ignores non-Bearer Authorization header (cookie fallback)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const request = new Request("http://localhost", {
      headers: { Authorization: "Basic base64stuff" },
    }) as unknown as Request;

    await createClientFromRequest(request);

    expect(createServerClient).toHaveBeenCalled();
    expect(createSupabaseClient).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });
});

describe("createServiceRoleClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates admin client when SUPABASE_SERVICE_ROLE_KEY is set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");

    const client = createServiceRoleClient();

    expect(createSupabaseClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    vi.unstubAllEnvs();
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is not configured", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => createServiceRoleClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is not configured",
    );

    vi.unstubAllEnvs();
  });
});

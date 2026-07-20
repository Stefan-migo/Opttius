/**
 * Unit tests for createRootAdminClient()
 *
 * @module __tests__/unit/supabase/root-admin.test
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rootAdmin: true })),
}));

import { createClient } from "@supabase/supabase-js";

import { createRootAdminClient } from "@/utils/supabase/root-admin";

describe("createRootAdminClient", () => {
  it("returns a root admin client when SUPABASE_SERVICE_ROLE_KEY is set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");

    const client = createRootAdminClient();

    expect(client).toEqual({ rootAdmin: true });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    vi.unstubAllEnvs();
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is not set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => createRootAdminClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is not configured for root admin client",
    );

    vi.unstubAllEnvs();
  });

  it("falls back to empty URL when NEXT_PUBLIC_SUPABASE_URL is not set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    const client = createRootAdminClient();

    expect(client).toEqual({ rootAdmin: true });
    expect(createClient).toHaveBeenCalledWith(
      "",
      "test-service-role-key",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    vi.unstubAllEnvs();
  });
});

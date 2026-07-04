/**
 * Unit tests for createCronClient()
 *
 * @module __tests__/unit/supabase/cron.test
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ cron: true })),
}));

import { createClient } from "@supabase/supabase-js";
import { createCronClient } from "@/utils/supabase/cron";

describe("createCronClient", () => {
  it("returns a cron client when SUPABASE_SERVICE_ROLE_KEY is set", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");

    const client = createCronClient();

    expect(client).toEqual({ cron: true });
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

    expect(() => createCronClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is not configured for cron client",
    );

    vi.unstubAllEnvs();
  });
});

/**
 * Unit tests for createClient() (browser client)
 *
 * @module __tests__/unit/supabase/client.test
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ browser: true })),
}));

import { createBrowserClient } from "@supabase/ssr";

import { createClient } from "@/utils/supabase/client";

describe("createClient", () => {
  it("returns a SupabaseClient when NEXT_PUBLIC env vars are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const client = createClient();

    expect(client).toEqual({ browser: true });
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
    );

    vi.unstubAllEnvs();
  });

  it("passes env values through (non-null assertion)", () => {
    // Setup always sets these — test verifies createBrowserClient is still called with whatever is there
    const client = createClient();

    expect(client).toEqual({ browser: true });
    // The ! non-null assertion passes whatever the env value is, even undefined at runtime
    expect(createBrowserClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
    );
  });
});

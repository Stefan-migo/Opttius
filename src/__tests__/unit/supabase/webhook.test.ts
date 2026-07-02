/**
 * Unit tests for createWebhookClient()
 *
 * @module __tests__/unit/supabase/webhook.test
 */

import { describe, expect, it, vi } from "vitest";

// Mock @supabase/supabase-js before importing the module under test
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ webhook: true })),
}));

import { createClient } from "@supabase/supabase-js";
import { createWebhookClient } from "@/utils/supabase/webhook";

describe("createWebhookClient", () => {
  it("returns a SupabaseClient when SUPABASE_WEBHOOK_KEY is set", () => {
    vi.stubEnv("SUPABASE_WEBHOOK_KEY", "test-webhook-jwt");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");

    const client = createWebhookClient();

    expect(client).toEqual({ webhook: true });
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-webhook-jwt",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    vi.unstubAllEnvs();
  });

  it("throws when SUPABASE_WEBHOOK_KEY is not set", () => {
    vi.stubEnv("SUPABASE_WEBHOOK_KEY", "");

    expect(() => createWebhookClient()).toThrow(
      "SUPABASE_WEBHOOK_KEY is not configured",
    );

    vi.unstubAllEnvs();
  });
});

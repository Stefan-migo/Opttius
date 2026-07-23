/**
 * Unit tests for email org utilities (org-utils.ts)
 *
 * Tests getOrganizationInfoWithFallbacks with a mocked Supabase client.
 */

import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getOrganizationInfoWithFallbacks } from "@/lib/email/org-utils";
import { createServiceRoleClient } from "@/utils/supabase/server";

/** Build a chainable supabase mock that returns a given result from .single() */
function mockOrgQuery(result: PostgrestSingleResponse<unknown>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  chain.single.mockResolvedValue(result);

  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: vi.fn(() => chain),
  } as unknown as ReturnType<typeof createServiceRoleClient>);

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrganizationInfoWithFallbacks", () => {
  it("returns null when no organizationId provided", async () => {
    const result = await getOrganizationInfoWithFallbacks();
    expect(result).toBeNull();
  });

  it("returns null when organization is not found", async () => {
    mockOrgQuery({ data: null, error: null } as PostgrestSingleResponse<null>);

    const result = await getOrganizationInfoWithFallbacks("org-missing");
    expect(result).toBeNull();
  });

  it("resolves display name from metadata.email_display_name", async () => {
    mockOrgQuery({
      data: { name: "Org Raw", metadata: { email_display_name: "Optica Display" } },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.resolvedDisplayName).toBe("Optica Display");
  });

  it("falls back to org name when email_display_name is missing", async () => {
    mockOrgQuery({
      data: { name: "Org Raw Name", metadata: {} },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.resolvedDisplayName).toBe("Org Raw Name");
  });

  it("resolves support email from metadata.support_email", async () => {
    mockOrgQuery({
      data: {
        name: "Test Org",
        metadata: { support_email: "support@test.cl" },
      },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.resolvedSupportEmail).toBe("support@test.cl");
  });

  it("falls back to system_config.contact_email when no support_email in metadata", async () => {
    const chain = mockOrgQuery({
      data: { name: "Test Org", metadata: {} },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    // First .single() returns org. Then two maybeSingle calls happen.
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { config_value: "contact@org.cl" }, error: null }) // org-level config
      .mockResolvedValueOnce({ data: null, error: null }); // global config (not needed)

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.resolvedSupportEmail).toBe("contact@org.cl");
  });

  it("falls back to global system_config when org-level config is absent", async () => {
    const chain = mockOrgQuery({
      data: { name: "Test Org", metadata: {} },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // no org-level config
      .mockResolvedValueOnce({ data: { config_value: "global@opttius.cl" }, error: null }); // global

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.resolvedSupportEmail).toBe("global@opttius.cl");
  });

  it("falls back to DEFAULT_REPLY_TO when no config found", async () => {
    const chain = mockOrgQuery({
      data: { name: "Test Org", metadata: {} },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.resolvedSupportEmail).toBe("contacto@opttius.cl");
  });

  it("returns null on supabase error and logs it", async () => {
    mockOrgQuery({
      data: null,
      error: new Error("DB down"),
    } as unknown as PostgrestSingleResponse<unknown>);

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result).toBeNull();
  });

  it("returns null when supabase throws", async () => {
    vi.mocked(createServiceRoleClient).mockImplementation(() => {
      throw new Error("Network error");
    });

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result).toBeNull();
  });

  it("returns org info with name and metadata", async () => {
    mockOrgQuery({
      data: {
        name: "Test Org",
        metadata: { email_display_name: "Display", support_email: "s@t.cl" },
      },
      error: null,
    } as unknown as PostgrestSingleResponse<unknown>);

    const result = await getOrganizationInfoWithFallbacks("org-1");
    expect(result?.name).toBe("Test Org");
    expect(result?.metadata).toEqual({ email_display_name: "Display", support_email: "s@t.cl" });
  });
});

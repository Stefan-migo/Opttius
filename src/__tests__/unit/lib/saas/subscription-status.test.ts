/**
 * Unit tests for getSubscriptionStatus
 *
 * Tests subscription status detection for organizations:
 * active, expired, past_due, cancelled, no subscription,
 * and the special demo/root org bypass.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { getSubscriptionStatus, isTrialExpired } from "@/lib/saas/subscription-status";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_ORG = "00000000-0000-0000-0000-000000000001";
const ROOT_ORG = "00000000-0000-0000-0000-000000000010";
const ORG_ID = "org-123";

function mockChain(opts: { maybeSingleResult: { data: unknown; error: unknown } }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(opts.maybeSingleResult),
  };
  // @ts-expect-error - chaining mock
  return chain;
}

function setupMocks(
  subResult: { data: unknown; error: unknown },
  orgResult?: { data: unknown; error: unknown },
) {
  const subChain = mockChain({ maybeSingleResult: subResult });
  const orgChain = orgResult
    ? mockChain({ maybeSingleResult: orgResult })
    : undefined;

  const fromMock = vi.fn().mockReturnValueOnce(subChain);
  if (orgChain) fromMock.mockReturnValueOnce(orgChain);

  (createServiceRoleClient as Mock).mockReturnValue({ from: fromMock });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getSubscriptionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Demo / Root org (never expire) ─────────────────────────────────

  it("returns active for demo org regardless of DB state", async () => {
    setupMocks({ data: null, error: null });

    const result = await getSubscriptionStatus(DEMO_ORG);

    expect(result.status).toBe("active");
    expect(result.isExpired).toBe(false);
    expect(result.isTrialExpired).toBe(false);
  });

  it("returns active for root org regardless of DB state", async () => {
    setupMocks({ data: null, error: null });

    const result = await getSubscriptionStatus(ROOT_ORG);

    expect(result.status).toBe("active");
    expect(result.isExpired).toBe(false);
  });

  it("includes current_period fields from DB for demo org when present", async () => {
    const mockSub = {
      current_period_start: "2025-01-01T00:00:00Z",
      current_period_end: "2025-12-31T00:00:00Z",
    };
    setupMocks({ data: mockSub, error: null });

    const result = await getSubscriptionStatus(DEMO_ORG);

    expect(result.currentPeriodStart).toEqual(new Date("2025-01-01T00:00:00Z"));
    expect(result.currentPeriodEnd).toEqual(new Date("2025-12-31T00:00:00Z"));
    expect(result.cancelAt).toBeNull();
    expect(result.canceledAt).toBeNull();
  });

  // ── Org status (suspended / cancelled) ────────────────────────────

  it("returns expired when org is suspended", async () => {
    const mockSub = {
      id: "sub-1",
      status: "active",
      current_period_end: "2030-01-01T00:00:00Z",
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "suspended" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("expired");
    expect(result.isExpired).toBe(true);
    expect(result.organizationId).toBe(ORG_ID);
  });

  it("returns expired when org is cancelled", async () => {
    const mockSub = {
      id: "sub-1",
      status: "active",
      current_period_end: "2030-01-01T00:00:00Z",
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "cancelled" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("expired");
  });

  // ── No subscription ───────────────────────────────────────────────

  it("returns status 'none' when no subscription exists", async () => {
    setupMocks(
      { data: null, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("none");
    expect(result.isExpired).toBe(true);
    expect(result.isTrialExpired).toBe(true);
    expect(result.trialEndsAt).toBeNull();
  });

  // ── Active subscription ───────────────────────────────────────────

  it("returns status 'active' for a valid subscription in period", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "active",
      trial_ends_at: null,
      current_period_start: "2025-01-01T00:00:00Z",
      current_period_end: future,
      cancel_at: null,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("active");
    expect(result.isExpired).toBe(false);
    expect(result.isTrialExpired).toBe(false);
  });

  // ── Past due ──────────────────────────────────────────────────────

  it("returns expired when subscription is past_due", async () => {
    const mockSub = {
      id: "sub-1",
      status: "past_due",
      current_period_start: "2025-01-01T00:00:00Z",
      current_period_end: "2030-01-01T00:00:00Z",
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("expired");
    expect(result.isExpired).toBe(true);
    expect(result.isTrialExpired).toBe(false);
  });

  // ── Trial expired ─────────────────────────────────────────────────

  it("returns expired when trial has ended", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "trialing",
      trial_ends_at: past,
      current_period_end: past,
      cancel_at: null,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("expired");
    expect(result.isTrialExpired).toBe(true);
    expect(result.isExpired).toBe(true);
  });

  // ── Cancelled (immediate vs. future) ──────────────────────────────

  it("returns cancelled status with future cancel_at (access until then)", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "cancelled",
      trial_ends_at: null,
      current_period_start: "2025-01-01T00:00:00Z",
      current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
      cancel_at: future,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("cancelled");
    expect(result.isExpired).toBe(false);
    expect(result.cancelAt).toBeInstanceOf(Date);
  });

  it("returns expired for cancelled with immediate canceled_at", async () => {
    const mockSub = {
      id: "sub-1",
      status: "cancelled",
      trial_ends_at: null,
      current_period_start: "2025-01-01T00:00:00Z",
      current_period_end: "2025-06-01T00:00:00Z",
      cancel_at: null,
      canceled_at: "2025-06-01T00:00:00Z",
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.isExpired).toBe(true);
  });

  it("returns expired for cancelled with past cancel_at", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "cancelled",
      trial_ends_at: null,
      current_period_start: "2025-01-01T00:00:00Z",
      current_period_end: past,
      cancel_at: past,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("cancelled");
    expect(result.isExpired).toBe(true);
  });

  // ── Active but expired period ─────────────────────────────────────

  it("returns expired when active subscription period has ended", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "active",
      trial_ends_at: null,
      current_period_start: "2024-01-01T00:00:00Z",
      current_period_end: past,
      cancel_at: null,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await getSubscriptionStatus(ORG_ID);

    expect(result.status).toBe("expired");
    expect(result.isExpired).toBe(true);
  });
});

// ── isTrialExpired convenience wrapper ──────────────────────────────

describe("isTrialExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when trial is expired", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "trialing",
      trial_ends_at: past,
      current_period_end: past,
      cancel_at: null,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await isTrialExpired(ORG_ID);
    expect(result).toBe(true);
  });

  it("returns false when trial is not expired", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const mockSub = {
      id: "sub-1",
      status: "trialing",
      trial_ends_at: future,
      current_period_end: future,
      cancel_at: null,
      canceled_at: null,
    };
    setupMocks(
      { data: mockSub, error: null },
      { data: { status: "active" }, error: null },
    );

    const result = await isTrialExpired(ORG_ID);
    expect(result).toBe(false);
  });
});

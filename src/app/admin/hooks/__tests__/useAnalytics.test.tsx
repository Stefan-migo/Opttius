import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { useAnalytics } from "../useAnalytics";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

describe("useAnalytics", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches analytics data for a specific branch", async () => {
    const analyticsData = { kpis: { totalRevenue: 50000 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { analytics: analyticsData } }),
    });

    const { result } = renderHook(
      () => useAnalytics({ branchId: "branch-abc", period: "30" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(analyticsData);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/analytics/dashboard?period=30",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-branch-id": "branch-abc" }),
      }),
    );
  });

  it("uses global header when branchId is null", async () => {
    const analyticsData = { kpis: { totalRevenue: 100000 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { analytics: analyticsData } }),
    });

    const { result } = renderHook(
      () => useAnalytics({ branchId: null, period: "90" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(analyticsData);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/analytics/dashboard?period=90",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-branch-id": "global" }),
      }),
    );
  });

  it("falls back when analytics is at top level (no data wrapper)", async () => {
    const analyticsData = { kpis: { totalRevenue: 25000 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, analytics: analyticsData }),
    });

    const { result } = renderHook(
      () => useAnalytics({ branchId: "branch-xyz", period: "30" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(analyticsData);
  });

  it("throws when API returns success: false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: { message: "No data for period" },
      }),
    });

    const { result } = renderHook(
      () => useAnalytics({ branchId: "branch-abc", period: "30" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(
      () => useAnalytics({ branchId: "branch-abc", period: "30" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("has correct queryKey shape", () => {
    // QueryClientProvider hydration needed to observe queryKey via cache
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(
      () => useAnalytics({ branchId: "branch-1", period: "60" }),
      { wrapper },
    );

    const query = client.getQueryCache().find({ queryKey: ["admin", "analytics", "branch-1", "60"] });
    expect(query).toBeDefined();
    expect(query?.queryKey).toEqual(["admin", "analytics", "branch-1", "60"]);
  });
});

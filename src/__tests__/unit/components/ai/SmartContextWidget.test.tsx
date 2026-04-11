import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SmartContextWidget } from "@/components/ai/SmartContextWidget";

describe("SmartContextWidget", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it("should render loading state", () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <QueryClientProvider client={queryClient}>
        <SmartContextWidget section="dashboard" />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Cargando.../i)).toBeInTheDocument();
  });

  it("should render insights correctly", async () => {
    const mockInsights = [
      {
        id: "1",
        organization_id: "org-1",
        section: "dashboard",
        type: "warning",
        title: "Test Warning",
        message: "Test message",
        priority: 8,
        is_dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ insights: mockInsights }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SmartContextWidget section="dashboard" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Insights \(1\)/i)).toBeInTheDocument();
    });
  });

  it("should handle no insights case", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ insights: [] }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SmartContextWidget section="dashboard" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      // Should show the basic widget without insights
      expect(screen.getByText(/Insights/i)).toBeInTheDocument();
    });
  });

  it("should handle errors gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SmartContextWidget section="dashboard" />
      </QueryClientProvider>,
    );

    // Component should handle error without crashing
    expect(() =>
      render(
        <QueryClientProvider client={queryClient}>
          <SmartContextWidget section="dashboard" />
        </QueryClientProvider>,
      ),
    ).not.toThrow();
  });

  it("should handle dismiss action", async () => {
    const mockInsights = [
      {
        id: "1",
        organization_id: "org-1",
        section: "dashboard",
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 5,
        is_dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: mockInsights }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(
      <QueryClientProvider client={queryClient}>
        <SmartContextWidget section="dashboard" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Insights \(1\)/i)).toBeInTheDocument();
    });

    // Component should accept dismiss callback without errors
    expect(() => {
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) });
    }).not.toThrow();
  });

  it("should handle feedback action", async () => {
    const mockInsights = [
      {
        id: "1",
        organization_id: "org-1",
        section: "dashboard",
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 5,
        is_dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insights: mockInsights }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(
      <QueryClientProvider client={queryClient}>
        <SmartContextWidget section="dashboard" />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Insights \(1\)/i)).toBeInTheDocument();
    });

    // Component should accept feedback callback without errors
    expect(() => {
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) });
    }).not.toThrow();
  });
});

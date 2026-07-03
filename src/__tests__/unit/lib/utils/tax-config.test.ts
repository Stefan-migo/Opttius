import { describe, expect, it, beforeEach, vi } from "vitest";

import { getTaxPercentage, getTaxPercentageServer } from "@/lib/utils/tax-config";

// Mock the logger to keep test output clean
vi.mock("@/lib/logger", () => ({
  appLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTaxPercentage", () => {
  it("returns fallback when fetch fails", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    const result = await getTaxPercentage(19);
    expect(result).toBe(19);
  });

  it("returns fallback when response is not ok", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await getTaxPercentage(19);
    expect(result).toBe(19);
  });

  it("returns config value when tax_percentage is found", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          configs: [{ config_key: "tax_percentage", config_value: "22" }],
        }),
    } as Response);

    const result = await getTaxPercentage(19);
    expect(result).toBe(22);
  });

  it("returns config value from tax_rate as fallback key", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          configs: [{ config_key: "tax_rate", config_value: "21" }],
        }),
    } as Response);

    const result = await getTaxPercentage(19);
    expect(result).toBe(21);
  });

  it("ignores config value when it is not a positive number", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          configs: [{ config_key: "tax_percentage", config_value: "0" }],
        }),
    } as Response);

    const result = await getTaxPercentage(19);
    expect(result).toBe(19);
  });

  it("handles config_value as number (not string)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          configs: [{ config_key: "tax_percentage", config_value: 22 }],
        }),
    } as Response);

    const result = await getTaxPercentage(19);
    expect(result).toBe(22);
  });

  it("uses default fallback of 19 when not specified", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    const result = await getTaxPercentage();
    expect(result).toBe(19);
  });
});

describe("getTaxPercentageServer", () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        or: () => ({
          maybeSingle: vi.fn(),
        }),
      }),
    }),
  };

  it("returns fallback when supabase returns an error", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("DB error"),
            }),
          }),
        }),
      }),
    };

    const result = await getTaxPercentageServer(supabase, 19);
    expect(result).toBe(19);
  });

  it("returns fallback when no config found", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await getTaxPercentageServer(supabase, 19);
    expect(result).toBe(19);
  });

  it("returns config value when found", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { config_value: "22", value_type: "number" },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await getTaxPercentageServer(supabase, 19);
    expect(result).toBe(22);
  });

  it("handles config_value that needs JSON.parse", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { config_value: '"22"', value_type: "string" },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await getTaxPercentageServer(supabase, 19);
    expect(result).toBe(22);
  });

  it("handles numeric config_value directly", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { config_value: 22, value_type: "number" },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await getTaxPercentageServer(supabase, 19);
    expect(result).toBe(22);
  });

  it("uses default fallback of 19 when not specified", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("DB error"),
            }),
          }),
        }),
      }),
    };

    const result = await getTaxPercentageServer(supabase);
    expect(result).toBe(19);
  });
});

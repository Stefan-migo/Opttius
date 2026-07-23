import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatInTimezone,
  getLocalDateBoundsUTC,
  getTodayInTimezone,
} from "@/lib/utils/date-timezone";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getLocalDateBoundsUTC", () => {
  it("returns start and end ISO strings for a date in default timezone (America/Santiago)", () => {
    const { start, end } = getLocalDateBoundsUTC("2024-06-15");
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
  });

  it("produces a range that spans exactly 24h in local time", () => {
    const { start, end } = getLocalDateBoundsUTC("2024-06-15");
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    // should be 24h - 1ms = 86399999ms (23:59:59.999 in local time)
    expect(diffMs).toBeGreaterThanOrEqual(86399000);
    expect(diffMs).toBeLessThanOrEqual(86400000);
  });

  it("handles a different timezone", () => {
    const { start, end } = getLocalDateBoundsUTC("2024-06-15", "America/Argentina/Buenos_Aires");
    expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
  });
});

describe("getTodayInTimezone", () => {
  it("returns YYYY-MM-DD format for default timezone", () => {
    const result = getTodayInTimezone();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date based on system time", () => {
    // System time is 2024-06-15T12:00:00.000Z
    // In America/Santiago (UTC-4 in June), this is 2024-06-15 08:00
    expect(getTodayInTimezone()).toBe("2024-06-15");
  });

  it("accepts a custom timezone", () => {
    const result = getTodayInTimezone("America/New_York");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatInTimezone", () => {
  it("formats a date string in default timezone", () => {
    const result = formatInTimezone("2024-06-15T12:00:00.000Z");
    expect(result).toContain("2024");
    expect(result).toContain("6");
    expect(result).toContain("15");
    expect(result).toContain(":");
  });

  it("formats a Date object", () => {
    const result = formatInTimezone(new Date("2024-06-15T12:00:00.000Z"));
    expect(result).toContain("2024");
  });

  it("returns 'Sin fecha' for invalid date", () => {
    expect(formatInTimezone("not-a-date")).toBe("Sin fecha");
  });

  it("uses custom timezone", () => {
    const result = formatInTimezone("2024-06-15T12:00:00.000Z", "America/New_York");
    expect(result).toContain("2024");
  });

  it("uses custom formatting options", () => {
    const result = formatInTimezone("2024-06-15T12:00:00.000Z", "America/Santiago", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(result).toContain("2024");
    expect(result).toContain("junio");
  });
});

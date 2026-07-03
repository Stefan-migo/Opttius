import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  formatDate,
  formatRelativeDate,
  formatCurrency,
  formatPrice,
  formatNumber,
  formatDateTime,
  formatTimeAgo,
} from "@/lib/utils/formatting";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("formatDate", () => {
  it("returns 'Sin fecha' for null / undefined / empty", () => {
    expect(formatDate(null)).toBe("Sin fecha");
    expect(formatDate(undefined)).toBe("Sin fecha");
    expect(formatDate("")).toBe("Sin fecha");
  });

  it("returns 'Sin fecha' for invalid date strings", () => {
    expect(formatDate("not-a-date")).toBe("Sin fecha");
    expect(formatDate("2024-13-01")).toBe("Sin fecha");
  });

  it("formats short format with year by default", () => {
    const result = formatDate("2024-06-15T12:00:00.000Z");
    expect(result).toContain("2024");
    expect(result).toContain("6");
    expect(result).toContain("15");
  });

  it("omits year when includeYear is false", () => {
    const result = formatDate("2024-06-15T12:00:00.000Z", { includeYear: false });
    expect(result).not.toContain("2024");
  });

  it("includes time when includeTime is true", () => {
    const result = formatDate("2024-06-15T12:00:00.000Z", { includeTime: true });
    expect(result).toContain(":00");
  });

  it("formats with full format (weekday + long month)", () => {
    const result = formatDate("2024-06-15T12:00:00.000Z", { format: "full" });
    expect(result).toContain("2024");
  });

  it("accepts a Date object", () => {
    const result = formatDate(new Date("2024-06-15T12:00:00.000Z"));
    expect(result).toContain("2024");
  });

  it("accepts a numeric timestamp", () => {
    const ts = new Date("2024-06-15T12:00:00.000Z").getTime();
    const result = formatDate(ts);
    expect(result).toContain("2024");
  });

});

describe("formatRelativeDate", () => {
  it("returns 'Sin fecha' for null / undefined", () => {
    expect(formatRelativeDate(null)).toBe("Sin fecha");
    expect(formatRelativeDate(undefined)).toBe("Sin fecha");
  });

  it("returns 'Hoy' for today's date", () => {
    expect(formatRelativeDate(new Date())).toBe("Hoy");
  });

  it("returns 'Ayer' for yesterday's date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe("Ayer");
  });

  it("returns formatted date for older dates in the same year", () => {
    const oldDate = new Date("2024-01-15T12:00:00.000Z");
    const result = formatRelativeDate(oldDate);
    expect(result).toContain("enero");
    expect(result).toContain("15");
    expect(result).not.toContain("2024");
  });

  it("includes year for older dates in a different year", () => {
    const oldDate = new Date("2023-06-15T12:00:00.000Z");
    const result = formatRelativeDate(oldDate);
    expect(result).toContain("2023");
  });
});

describe("formatCurrency", () => {
  it("returns $0 for null / undefined / NaN", () => {
    expect(formatCurrency(null)).toBe("$0");
    expect(formatCurrency(undefined)).toBe("$0");
    expect(formatCurrency(NaN)).toBe("$0");
  });

  it("formats CLP by default", () => {
    const result = formatCurrency(10000);
    expect(result).toContain("10.000");
  });

  it("supports ARS locale and currency", () => {
    const result = formatCurrency(10000, {
      locale: "es-AR",
      currency: "ARS",
    });
    expect(result).toContain("10.000");
  });

  it("respects fraction digits", () => {
    const result = formatCurrency(10000.5, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(result).toContain(",");
    expect(result).toContain("50");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatPrice", () => {
  it("returns '0' for null / undefined / NaN", () => {
    expect(formatPrice(null)).toBe("0");
    expect(formatPrice(undefined)).toBe("0");
    expect(formatPrice(NaN)).toBe("0");
  });

  it("formats an integer", () => {
    expect(formatPrice(10000)).toBe("10.000");
  });

  it("formats with decimals", () => {
    const result = formatPrice(10000.5);
    expect(result).toContain("10.000");
    expect(result).toContain("5");
  });
});

describe("formatNumber", () => {
  it("returns '0' for null / undefined / NaN", () => {
    expect(formatNumber(null)).toBe("0");
    expect(formatNumber(undefined)).toBe("0");
    expect(formatNumber(NaN)).toBe("0");
  });

  it("formats with thousands separator", () => {
    expect(formatNumber(1000)).toBe("1.000");
    expect(formatNumber(1000000)).toBe("1.000.000");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatDateTime", () => {
  it("returns 'Sin fecha' for null / undefined", () => {
    expect(formatDateTime(null)).toBe("Sin fecha");
    expect(formatDateTime(undefined)).toBe("Sin fecha");
  });

  it("returns 'Sin fecha' for invalid input", () => {
    expect(formatDateTime("bad-date")).toBe("Sin fecha");
  });

  it("includes date and time", () => {
    const result = formatDateTime("2024-06-15T12:00:00.000Z");
    expect(result).toContain("2024");
    expect(result).toContain(":00");
  });
});

describe("formatTimeAgo", () => {
  it("returns 'Sin fecha' for null / undefined", () => {
    expect(formatTimeAgo(null)).toBe("Sin fecha");
    expect(formatTimeAgo(undefined)).toBe("Sin fecha");
  });

  it("returns 'Hace menos de un minuto' for < 60s", () => {
    const recent = new Date(Date.now() - 30000);
    expect(formatTimeAgo(recent)).toBe("Hace menos de un minuto");
  });

  it("returns 'Hace 1 minuto' for 1 minute", () => {
    const date = new Date(Date.now() - 60000);
    expect(formatTimeAgo(date)).toBe("Hace 1 minuto");
  });

  it("returns 'Hace X minutos' for minutes", () => {
    const date = new Date(Date.now() - 5 * 60000);
    expect(formatTimeAgo(date)).toBe("Hace 5 minutos");
  });

  it("returns 'Hace 1 hora' for 1 hour", () => {
    const date = new Date(Date.now() - 3600000);
    expect(formatTimeAgo(date)).toBe("Hace 1 hora");
  });

  it("returns 'Hace X horas' for hours", () => {
    const date = new Date(Date.now() - 5 * 3600000);
    expect(formatTimeAgo(date)).toBe("Hace 5 horas");
  });

  it("returns 'Hace 1 día' for 1 day", () => {
    const date = new Date(Date.now() - 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 1 día");
  });

  it("returns 'Hace X días' for days", () => {
    const date = new Date(Date.now() - 3 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 3 días");
  });

  it("returns 'Hace 1 semana' for 1 week", () => {
    const date = new Date(Date.now() - 7 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 1 semana");
  });

  it("returns 'Hace X semanas' for weeks", () => {
    const date = new Date(Date.now() - 3 * 7 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 3 semanas");
  });

  it("returns 'Hace 1 mes' for 1 month", () => {
    const date = new Date(Date.now() - 30 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 1 mes");
  });

  it("returns 'Hace X meses' for months", () => {
    const date = new Date(Date.now() - 3 * 30 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 3 meses");
  });

  it("returns 'Hace 1 año' for 1 year", () => {
    const date = new Date(Date.now() - 365 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 1 año");
  });

  it("returns 'Hace X años' for years", () => {
    const date = new Date(Date.now() - 2 * 365 * 86400000);
    expect(formatTimeAgo(date)).toBe("Hace 2 años");
  });

  it("handles Date object input", () => {
    const date = new Date(Date.now() - 60000);
    expect(formatTimeAgo(date)).toBe("Hace 1 minuto");
  });

  it("handles string input", () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(formatTimeAgo(past)).toBe("Hace 1 minuto");
  });
});

/**
 * Unit tests for notifications constants.
 *
 * Tests NOTIFICATION_ICONS, NOTIFICATION_TYPE_LABELS, PRIORITY_LABELS,
 * PRIORITY_COLORS, PRIORITY_BADGE_COLORS, and formatTimeSince.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  NOTIFICATION_ICONS,
  NOTIFICATION_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_BADGE_COLORS,
  formatTimeSince,
} from "@/lib/notifications/constants";

describe("NOTIFICATION_ICONS", () => {
  it("has all expected notification type keys", () => {
    const keys = Object.keys(NOTIFICATION_ICONS);
    expect(keys).toContain("quote_new");
    expect(keys).toContain("work_order_new");
    expect(keys).toContain("appointment_new");
    expect(keys).toContain("new_customer");
    expect(keys).toContain("sale_new");
    expect(keys).toContain("low_stock");
    expect(keys).toContain("payment_received");
    expect(keys).toContain("support_ticket_new");
    expect(keys).toContain("system_alert");
    expect(keys).toContain("custom");
  });

  it("maps every type to a LucideIcon component", () => {
    for (const icon of Object.values(NOTIFICATION_ICONS)) {
      expect(icon).toBeDefined();
    }
  });

  it("has the same keys as NOTIFICATION_TYPE_LABELS (consistency)", () => {
    const iconKeys = Object.keys(NOTIFICATION_ICONS).sort();
    const labelKeys = Object.keys(NOTIFICATION_TYPE_LABELS).sort();
    expect(iconKeys).toEqual(labelKeys);
  });
});

describe("NOTIFICATION_TYPE_LABELS", () => {
  it("all labels are non-empty Spanish strings", () => {
    for (const label of Object.values(NOTIFICATION_TYPE_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("has correct Spanish labels for key types", () => {
    expect(NOTIFICATION_TYPE_LABELS.quote_new).toBe("Nuevo Presupuesto");
    expect(NOTIFICATION_TYPE_LABELS.work_order_completed).toBe(
      "Trabajo Completado",
    );
    expect(NOTIFICATION_TYPE_LABELS.low_stock).toBe("Stock Bajo");
    expect(NOTIFICATION_TYPE_LABELS.payment_failed).toBe("Pago Fallido");
    expect(NOTIFICATION_TYPE_LABELS.custom).toBe("Personalizada");
  });
});

describe("PRIORITY_LABELS", () => {
  it("maps all four priorities to Spanish labels", () => {
    expect(PRIORITY_LABELS).toEqual({
      low: "Baja",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    });
  });
});

describe("PRIORITY_COLORS", () => {
  it("has entries for all four priorities in order", () => {
    expect(Object.keys(PRIORITY_COLORS)).toEqual([
      "low",
      "medium",
      "high",
      "urgent",
    ]);
  });

  it("each color value is a non-empty admin token string", () => {
    for (const color of Object.values(PRIORITY_COLORS)) {
      expect(typeof color).toBe("string");
      expect(color.length).toBeGreaterThan(0);
      expect(color).toMatch(/^text-admin-/);
    }
  });
});

describe("PRIORITY_BADGE_COLORS", () => {
  it("has entries for all four priorities in order", () => {
    expect(Object.keys(PRIORITY_BADGE_COLORS)).toEqual([
      "low",
      "medium",
      "high",
      "urgent",
    ]);
  });

  it("each badge color value is a non-empty string", () => {
    for (const color of Object.values(PRIORITY_BADGE_COLORS)) {
      expect(typeof color).toBe("string");
      expect(color.length).toBeGreaterThan(0);
    }
  });
});

describe("formatTimeSince", () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Hace un momento" for < 60 seconds', () => {
    expect(formatTimeSince(new Date(NOW - 30_000).toISOString())).toBe(
      "Hace un momento",
    );
  });

  it("returns minutes for < 1 hour", () => {
    expect(formatTimeSince(new Date(NOW - 120_000).toISOString())).toBe(
      "Hace 2 min",
    );
  });

  it("returns hours for < 24 hours", () => {
    expect(formatTimeSince(new Date(NOW - 7_200_000).toISOString())).toBe(
      "Hace 2 h",
    );
  });

  it("returns days for < 7 days", () => {
    expect(formatTimeSince(new Date(NOW - 172_800_000).toISOString())).toBe(
      "Hace 2 días",
    );
  });

  it("returns formatted date for >= 7 days", () => {
    const result = formatTimeSince(
      new Date(NOW - 604_800_000).toISOString(),
    );
    // es-AR locale: "7 de nov de 2023"
    expect(result).toMatch(/^\d{1,2} de [a-z]{3,9} de \d{4}$/);
  });
});

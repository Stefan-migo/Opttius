/**
 * Tests for cashPaymentUtils.ts — cash register payment utilities.
 *
 * Coverage:
 *   - PAYMENT_METHOD_FILTER_MAP: structure
 *   - STATUS_BADGE_CONFIG: structure
 *   - resolveClosureStatus: closed, draft+session, draft no session, other
 *   - formatPaymentMethod: known methods, unknown fallback
 *   - computeCashDifference: null, valid, zero, negative
 */
import { describe, expect, it } from "vitest";
import {
  PAYMENT_METHOD_FILTER_MAP,
  STATUS_BADGE_CONFIG,
  resolveClosureStatus,
  formatPaymentMethod,
  computeCashDifference,
} from "../cashPaymentUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

describe("PAYMENT_METHOD_FILTER_MAP", () => {
  it("maps cash to ['cash']", () => {
    expect(PAYMENT_METHOD_FILTER_MAP.cash).toEqual(["cash"]);
  });

  it("maps debit to ['debit', 'debit_card']", () => {
    expect(PAYMENT_METHOD_FILTER_MAP.debit).toEqual(["debit", "debit_card"]);
  });

  it("maps credit to ['credit', 'credit_card']", () => {
    expect(PAYMENT_METHOD_FILTER_MAP.credit).toEqual(["credit", "credit_card"]);
  });

  it("maps transfer to ['transfer']", () => {
    expect(PAYMENT_METHOD_FILTER_MAP.transfer).toEqual(["transfer"]);
  });

  it("has exactly 4 filter groups", () => {
    expect(Object.keys(PAYMENT_METHOD_FILTER_MAP)).toHaveLength(4);
  });
});

describe("STATUS_BADGE_CONFIG", () => {
  it("has entries for draft, confirmed, reviewed, closed, reopened", () => {
    expect(STATUS_BADGE_CONFIG).toHaveProperty("draft");
    expect(STATUS_BADGE_CONFIG).toHaveProperty("confirmed");
    expect(STATUS_BADGE_CONFIG).toHaveProperty("reviewed");
    expect(STATUS_BADGE_CONFIG).toHaveProperty("closed");
    expect(STATUS_BADGE_CONFIG).toHaveProperty("reopened");
  });

  it("draft has variant secondary and label Abierta", () => {
    expect(STATUS_BADGE_CONFIG.draft).toEqual({
      variant: "secondary",
      label: "Abierta",
    });
  });

  it("closed has variant default and label Cerrada", () => {
    expect(STATUS_BADGE_CONFIG.closed).toEqual({
      variant: "default",
      label: "Cerrada",
    });
  });
});

// ─── resolveClosureStatus ─────────────────────────────────────────────────────

describe("resolveClosureStatus", () => {
  it("returns 'Cerrada' for closed status regardless of session", () => {
    const result = resolveClosureStatus("closed", "session-1");
    expect(result.label).toBe("Cerrada");
    expect(result.variant).toBe("default");
  });

  it("returns 'Cerrada' for closed status even without session", () => {
    const result = resolveClosureStatus("closed", null);
    expect(result.label).toBe("Cerrada");
  });

  it("returns 'Abierta' (reopened) for draft with active session", () => {
    const result = resolveClosureStatus("draft", "session-1");
    expect(result.label).toBe("Abierta");
    expect(result.variant).toBe("secondary");
  });

  it("returns 'Abierta' (draft) for draft without session", () => {
    const result = resolveClosureStatus("draft", null);
    expect(result.label).toBe("Abierta");
    expect(result.variant).toBe("secondary");
  });

  it("returns status badge for confirmed", () => {
    const result = resolveClosureStatus("confirmed", null);
    expect(result.label).toBe("Confirmado");
    expect(result.variant).toBe("default");
  });

  it("returns fallback for unknown status", () => {
    const result = resolveClosureStatus("unknown_status", null);
    expect(result.label).toBe("unknown_status");
    expect(result.variant).toBe("outline");
  });
});

// ─── formatPaymentMethod ──────────────────────────────────────────────────────

describe("formatPaymentMethod", () => {
  it("formats cash to Efectivo", () => {
    expect(formatPaymentMethod("cash")).toBe("Efectivo");
  });

  it("formats debit to Débito", () => {
    expect(formatPaymentMethod("debit")).toBe("Débito");
  });

  it("formats credit to Crédito", () => {
    expect(formatPaymentMethod("credit")).toBe("Crédito");
  });

  it("formats transfer to Transf.", () => {
    expect(formatPaymentMethod("transfer")).toBe("Transf.");
  });

  it("formats deposit to Abono", () => {
    expect(formatPaymentMethod("deposit")).toBe("Abono");
  });

  it("formats installments to Cuotas", () => {
    expect(formatPaymentMethod("installments")).toBe("Cuotas");
  });

  it("returns the method string itself for unknown methods", () => {
    expect(formatPaymentMethod("unknown_method")).toBe("unknown_method");
  });
});

// ─── computeCashDifference ────────────────────────────────────────────────────

describe("computeCashDifference", () => {
  it("returns null when actualCash is null", () => {
    expect(computeCashDifference(null, 300000)).toBeNull();
  });

  it("returns null when actualCash is undefined", () => {
    expect(computeCashDifference(undefined, 300000)).toBeNull();
  });

  it("returns positive difference when actual > expected", () => {
    expect(computeCashDifference(350000, 300000)).toBe(50000);
  });

  it("returns negative difference when actual < expected", () => {
    expect(computeCashDifference(250000, 300000)).toBe(-50000);
  });

  it("returns 0 when actual equals expected", () => {
    expect(computeCashDifference(300000, 300000)).toBe(0);
  });

  it("handles 0 expected cash", () => {
    expect(computeCashDifference(50000, 0)).toBe(50000);
  });
});

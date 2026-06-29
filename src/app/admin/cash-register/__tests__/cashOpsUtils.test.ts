/**
 * Tests for cashOpsUtils.ts — cash operations utilities.
 *
 * Coverage:
 *   - buildClosureParams: basic pagination, with field_operation_id
 *   - buildOrderParams: all payment_status mappings, pagination
 *   - buildCloseCashBody: with/without field_operation_id
 *   - getTodayChileDate: delegates to getTodayInTimezone
 *   - buildCreditNotesDateRange: wide range (5y back, 1y ahead)
 *   - extractOrderCustomerName: priority chain
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildClosureParams,
  buildOrderParams,
  buildCloseCashBody,
  getTodayChileDate,
  buildCreditNotesDateRange,
  extractOrderCustomerName,
} from "../cashOpsUtils";

// Mock date-timezone to control getTodayChileDate
vi.mock("@/lib/utils/date-timezone", () => ({
  getTodayInTimezone: vi.fn(() => "2026-06-29"),
}));

// ─── buildClosureParams ───────────────────────────────────────────────────────

describe("buildClosureParams", () => {
  it("builds params with page and itemsPerPage", () => {
    const params = buildClosureParams(2, 10);
    expect(params.get("limit")).toBe("10");
    expect(params.get("offset")).toBe("10"); // (2-1)*10
  });

  it("adds field_operation_id when provided", () => {
    const params = buildClosureParams(1, 25, "fo-123");
    expect(params.get("field_operation_id")).toBe("fo-123");
    expect(params.get("limit")).toBe("25");
  });

  it("omits field_operation_id when not provided", () => {
    const params = buildClosureParams(1, 10);
    expect(params.has("field_operation_id")).toBe(false);
  });

  it("calculates offset correctly for page 3", () => {
    const params = buildClosureParams(3, 20);
    expect(params.get("offset")).toBe("40"); // (3-1)*20
  });
});

// ─── buildOrderParams ─────────────────────────────────────────────────────────

describe("buildOrderParams", () => {
  const baseFilters = {
    date_from: "2026-06-01",
    date_to: "2026-06-29",
    payment_status: "all",
    payment_method: "cash",
  };

  it("builds params with date range and pagination", () => {
    const params = buildOrderParams(baseFilters, 1, 10);
    expect(params.get("date_from")).toBe("2026-06-01");
    expect(params.get("date_to")).toBe("2026-06-29");
    expect(params.get("limit")).toBe("10");
    expect(params.get("offset")).toBe("0");
  });

  it("maps payment_status cancelled to status=cancelled", () => {
    const params = buildOrderParams(
      { ...baseFilters, payment_status: "cancelled" },
      1,
      10,
    );
    expect(params.get("status")).toBe("cancelled");
    expect(params.has("payment_status")).toBe(false);
  });

  it("maps payment_status refunded to payment_status=refunded", () => {
    const params = buildOrderParams(
      { ...baseFilters, payment_status: "refunded" },
      1,
      10,
    );
    expect(params.get("payment_status")).toBe("refunded");
  });

  it("passes through other payment_status values", () => {
    const params = buildOrderParams(
      { ...baseFilters, payment_status: "paid" },
      1,
      10,
    );
    expect(params.get("payment_status")).toBe("paid");
  });

  it("omits payment_status when 'all'", () => {
    const params = buildOrderParams(baseFilters, 1, 10);
    expect(params.has("payment_status")).toBe(false);
    expect(params.has("status")).toBe(false);
  });
});

// ─── buildCloseCashBody ───────────────────────────────────────────────────────

describe("buildCloseCashBody", () => {
  const baseInput = {
    closure_date: "2026-06-29",
    opening_cash_amount: 100000,
    actual_cash: 350000,
    card_machine_debit_total: 150000,
    card_machine_credit_total: 100000,
    notes: null,
    discrepancies: null,
  };

  it("builds body with all required fields", () => {
    const body = buildCloseCashBody(baseInput);
    expect(body.closure_date).toBe("2026-06-29");
    expect(body.opening_cash_amount).toBe(100000);
    expect(body.actual_cash).toBe(350000);
    expect(body.card_machine_debit_total).toBe(150000);
    expect(body.card_machine_credit_total).toBe(100000);
    expect(body.notes).toBeNull();
    expect(body.discrepancies).toBeNull();
  });

  it("includes field_operation_id when provided", () => {
    const body = buildCloseCashBody({
      ...baseInput,
      field_operation_id: "fo-456",
    });
    expect(body.field_operation_id).toBe("fo-456");
  });

  it("omits field_operation_id when not provided", () => {
    const body = buildCloseCashBody(baseInput);
    expect(body.field_operation_id).toBeUndefined();
  });
});

// ─── getTodayChileDate ────────────────────────────────────────────────────────

describe("getTodayChileDate", () => {
  it("returns date from getTodayInTimezone with America/Santiago", () => {
    expect(getTodayChileDate()).toBe("2026-06-29");
  });
});

// ─── buildCreditNotesDateRange ────────────────────────────────────────────────

describe("buildCreditNotesDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns date_from 5 years before today", () => {
    const range = buildCreditNotesDateRange();
    expect(range.date_from).toBe("2021-06-29");
  });

  it("returns date_to 1 year after today", () => {
    const range = buildCreditNotesDateRange();
    expect(range.date_to).toBe("2027-06-29");
  });

  it("returns strings in YYYY-MM-DD format", () => {
    const range = buildCreditNotesDateRange();
    expect(range.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.date_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── extractOrderCustomerName ─────────────────────────────────────────────────

describe("extractOrderCustomerName", () => {
  it("returns customer_name when present", () => {
    const name = extractOrderCustomerName({ customer_name: "Juan Pérez" } as Record<string, unknown>);
    expect(name).toBe("Juan Pérez");
  });

  it("falls back to sii_business_name when customer_name is absent", () => {
    const name = extractOrderCustomerName({
      sii_business_name: "Óptica Los Andes Ltda.",
    } as Record<string, unknown>);
    expect(name).toBe("Óptica Los Andes Ltda.");
  });

  it("falls back to billing names when present", () => {
    const name = extractOrderCustomerName({
      billing_first_name: "María",
      billing_last_name: "González",
    } as Record<string, unknown>);
    expect(name).toBe("María González");
  });

  it("falls back to customer_email", () => {
    const name = extractOrderCustomerName({
      customer_email: "cliente@example.com",
    } as Record<string, unknown>);
    expect(name).toBe("cliente@example.com");
  });

  it("returns fallback string when no name fields exist", () => {
    const name = extractOrderCustomerName({} as Record<string, unknown>);
    expect(name).toBe("Cliente no registrado");
  });

  it("prioritizes customer_name over all other fields", () => {
    const name = extractOrderCustomerName({
      customer_name: "Ana López",
      sii_business_name: "Empresa SAC",
      billing_first_name: "Ana",
      billing_last_name: "López",
      customer_email: "ana@email.com",
    } as Record<string, unknown>);
    expect(name).toBe("Ana López");
  });
});

/**
 * Unit tests for buildClosurePayload
 *
 * Tests the pure payload builder for cash register closures.
 * No DB mocking needed — pure function.
 */

import { describe, expect, it } from "vitest";

import { buildClosurePayload } from "@/lib/cash-register/closure-builder";
import type { ClosurePayloadParams } from "@/lib/cash-register/closure-builder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validParams(overrides?: Partial<ClosurePayloadParams>): ClosurePayloadParams {
  return {
    branch_id: "branch-1",
    closure_date: "2025-07-01",
    closed_by: "user-1",
    pos_session_id: "session-1",
    opening_cash_amount: 100000,
    total_sales: 500000,
    total_transactions: 10,
    cash_sales: 200000,
    debit_card_sales: 150000,
    credit_card_sales: 100000,
    installments_sales: 30000,
    other_payment_sales: 20000,
    expected_cash: 300000,
    actual_cash: 295000,
    cash_difference: -5000,
    card_machine_debit_total: 148000,
    card_machine_credit_total: 98000,
    card_machine_difference: -4000,
    total_subtotal: 420000,
    total_tax: 80000,
    total_discounts: 15000,
    closing_cash_amount: 295000,
    notes: "Cierre normal",
    discrepancies: { cash: -5000, card: -4000 },
    opened_at: "2025-07-01T08:00:00Z",
    status: "closed",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildClosurePayload", () => {
  it("builds a complete closure payload from valid params", () => {
    const params = validParams();
    const result = buildClosurePayload(params);

    expect(result.branch_id).toBe("branch-1");
    expect(result.closure_date).toBe("2025-07-01");
    expect(result.closed_by).toBe("user-1");
    expect(result.pos_session_id).toBe("session-1");
    expect(result.total_sales).toBe(500000);
    expect(result.total_transactions).toBe(10);
    expect(result.cash_sales).toBe(200000);
    expect(result.expected_cash).toBe(300000);
    expect(result.actual_cash).toBe(295000);
    expect(result.cash_difference).toBe(-5000);
    expect(result.discrepancies).toEqual({ cash: -5000, card: -4000 });
    expect(result.notes).toBe("Cierre normal");
    expect(result.status).toBe("closed");
  });

  it("includes field_operation_id when provided", () => {
    const params = validParams({ field_operation_id: "fo-1" });
    const result = buildClosurePayload(params);

    expect(result.field_operation_id).toBe("fo-1");
  });

  it("omits field_operation_id when not provided", () => {
    const params = validParams({ field_operation_id: undefined });
    const result = buildClosurePayload(params);

    expect((result as Record<string, unknown>).field_operation_id).toBeUndefined();
  });

  it("defaults status to 'closed' when not provided", () => {
    const { status: _, ...rest } = validParams();
    const result = buildClosurePayload(rest as ClosurePayloadParams);

    expect(result.status).toBe("closed");
  });

  it("allows custom status", () => {
    const params = validParams({ status: "audited" });
    const result = buildClosurePayload(params);

    expect(result.status).toBe("audited");
  });

  it("handles nil actual_cash (not yet counted)", () => {
    const params = validParams({ actual_cash: null, closing_cash_amount: null, cash_difference: 0 });
    const result = buildClosurePayload(params);

    expect(result.actual_cash).toBeNull();
    expect(result.closing_cash_amount).toBeNull();
    expect(result.cash_difference).toBe(0);
  });

  it("sets updated_at to current ISO timestamp", () => {
    const before = Date.now();
    const result = buildClosurePayload(validParams());
    const after = Date.now();

    const updatedAt = new Date(result.updated_at).getTime();
    expect(updatedAt).toBeGreaterThanOrEqual(before);
    expect(updatedAt).toBeLessThanOrEqual(after);
  });

  it("copies all financial fields correctly", () => {
    const params = validParams();
    const result = buildClosurePayload(params);

    expect(result.opening_cash_amount).toBe(params.opening_cash_amount);
    expect(result.total_sales).toBe(params.total_sales);
    expect(result.debit_card_sales).toBe(params.debit_card_sales);
    expect(result.credit_card_sales).toBe(params.credit_card_sales);
    expect(result.installments_sales).toBe(params.installments_sales);
    expect(result.other_payment_sales).toBe(params.other_payment_sales);
    expect(result.card_machine_debit_total).toBe(params.card_machine_debit_total);
    expect(result.card_machine_credit_total).toBe(params.card_machine_credit_total);
    expect(result.card_machine_difference).toBe(params.card_machine_difference);
    expect(result.total_subtotal).toBe(params.total_subtotal);
    expect(result.total_tax).toBe(params.total_tax);
    expect(result.total_discounts).toBe(params.total_discounts);
  });

  it("handles null notes and empty discrepancies", () => {
    const params = validParams({ notes: null, discrepancies: null });
    const result = buildClosurePayload(params);

    expect(result.notes).toBeNull();
    expect(result.discrepancies).toBeNull();
  });
});

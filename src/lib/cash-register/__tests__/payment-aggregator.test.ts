/**
 * Tests for payment-aggregator.ts pure functions.
 *
 * Coverage:
 *   - Identity: same input → same PaymentSummary (GET/POST compatibility gate)
 *   - Tier 1: sessionPayments aggregation
 *   - Tier 2: orderPayments fallback
 *   - Tier 3: mp_payment_method fallback
 *   - Credit notes: negative amounts reducing totals
 *   - Empty edge case: all empty → zeros + source "no_payments"
 *   - coerceAmount: null, undefined, string, NaN, valid number
 */
import { describe, expect, it } from "vitest";
import {
  aggregatePayments,
  coerceAmount,
} from "@/lib/cash-register/payment-aggregator";
import type { PaymentAggregatorInput } from "@/lib/cash-register/payment-aggregator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(
  overrides?: Partial<PaymentAggregatorInput>,
): PaymentAggregatorInput {
  return {
    sessionPayments: [],
    orders: [],
    orderPayments: [],
    ...overrides,
  };
}

// ─── coerceAmount ────────────────────────────────────────────────────────────

describe("coerceAmount", () => {
  it("returns 0 for null", () => {
    expect(coerceAmount(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(coerceAmount(undefined)).toBe(0);
  });

  it("converts numeric strings to number", () => {
    expect(coerceAmount("15000")).toBe(15000);
  });

  it("returns 0 for NaN", () => {
    expect(coerceAmount(NaN)).toBe(0);
  });

  it("passes through valid numbers", () => {
    expect(coerceAmount(42000)).toBe(42000);
  });

  it("returns 0 for negative infinity", () => {
    expect(coerceAmount(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("preserves negative numbers (credit notes)", () => {
    expect(coerceAmount(-5000)).toBe(-5000);
  });

  it("handles zero", () => {
    expect(coerceAmount(0)).toBe(0);
  });
});

// ─── Identity Test (Safety Gate) ─────────────────────────────────────────────

describe("identity", () => {
  it("GET and POST produce identical PaymentSummary for same input", () => {
    const input = makeInput({
      sessionPayments: [
        { amount: 10000, payment_method: "cash" },
        { amount: 25000, payment_method: "debit" },
        { amount: 35000, payment_method: "credit" },
        { amount: 15000, payment_method: "transfer" },
        { amount: 20000, payment_method: "installments" },
        { amount: 5000, payment_method: "check" },
        { amount: 3000, payment_method: "prepago" },
      ],
      orders: [],
    });

    // Calling the same function twice simulates what GET and POST each do
    const result1 = aggregatePayments(input);
    const result2 = aggregatePayments(input);

    expect(result1).toEqual(result2);

    // Verify the breakdown is correct
    expect(result1.cash_sales).toBe(10000);
    expect(result1.debit_card_sales).toBe(25000);
    expect(result1.credit_card_sales).toBe(35000);
    expect(result1.transfer_sales).toBe(15000);
    expect(result1.installments_sales).toBe(20000);
    // check → other_payment_sales, prepago → other_payment_sales
    expect(result1.other_payment_sales).toBe(8000);
    expect(result1.source).toBe("session_payments");
  });
});

// ─── Tier 1: Session Payments ────────────────────────────────────────────────

describe("Tier 1 — sessionPayments", () => {
  it("aggregates cash payments", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [
          { amount: 50000, payment_method: "cash" },
          { amount: 30000, payment_method: "cash" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(80000);
    expect(result.source).toBe("session_payments");
  });

  it("aggregates debit payments", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 45000, payment_method: "debit" }],
      }),
    );
    expect(result.debit_card_sales).toBe(45000);
    expect(result.source).toBe("session_payments");
  });

  it("aggregates credit payments", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 60000, payment_method: "credit" }],
      }),
    );
    expect(result.credit_card_sales).toBe(60000);
  });

  it("aggregates transfer payments", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 120000, payment_method: "transfer" }],
      }),
    );
    expect(result.transfer_sales).toBe(120000);
  });

  it("aggregates installments payments", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 90000, payment_method: "installments" }],
      }),
    );
    expect(result.installments_sales).toBe(90000);
  });

  it("routes unknown payment methods to other_payment_sales", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 7000, payment_method: "store_credit" }],
      }),
    );
    expect(result.other_payment_sales).toBe(7000);
  });

  it("handles mixed payment methods", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [
          { amount: 10000, payment_method: "cash" },
          { amount: 20000, payment_method: "debit" },
          { amount: 30000, payment_method: "credit" },
          { amount: 40000, payment_method: "transfer" },
          { amount: 50000, payment_method: "installments" },
          { amount: 6000, payment_method: "check" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(10000);
    expect(result.debit_card_sales).toBe(20000);
    expect(result.credit_card_sales).toBe(30000);
    expect(result.transfer_sales).toBe(40000);
    expect(result.installments_sales).toBe(50000);
    expect(result.other_payment_sales).toBe(6000);
  });

  it("handles null amounts", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: null, payment_method: "cash" }],
      }),
    );
    expect(result.cash_sales).toBe(0);
  });

  it("handles undefined amounts via plain object", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [
          { amount: undefined as unknown as number, payment_method: "debit" },
        ],
      }),
    );
    expect(result.debit_card_sales).toBe(0);
  });
});

// ─── Tier 2: Order Payments ──────────────────────────────────────────────────

describe("Tier 2 — orderPayments fallback", () => {
  it("uses orderPayments when sessionPayments is empty", () => {
    const result = aggregatePayments(
      makeInput({
        orderPayments: [
          { amount: 55000, payment_method: "cash" },
          { amount: 33000, payment_method: "credit" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(55000);
    expect(result.credit_card_sales).toBe(33000);
    expect(result.debit_card_sales).toBe(0);
    expect(result.source).toBe("order_payments");
  });

  it("ignores sessionPayments when sessionPayments is empty but orderPayments exists", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [],
        orderPayments: [{ amount: 10000, payment_method: "transfer" }],
        orders: [{ id: "o1", total_amount: 50000 }],
      }),
    );
    expect(result.transfer_sales).toBe(10000);
    expect(result.source).toBe("order_payments");
  });

  it("handles empty orderPayments array (not undefined)", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [],
        orderPayments: [],
        orders: [{ id: "o1", total_amount: 50000, mp_payment_method: "cash" }],
      }),
    );
    // Falls through to Tier 3
    expect(result.cash_sales).toBe(50000);
    expect(result.source).toBe("order_mp_method");
  });
});

// ─── Tier 3: mp_payment_method ───────────────────────────────────────────────

describe("Tier 3 — mp_payment_method fallback", () => {
  it("uses mp_payment_method when both sessionPayments and orderPayments are empty", () => {
    const result = aggregatePayments(
      makeInput({
        orders: [{ id: "o1", total_amount: 80000, mp_payment_method: "debit" }],
      }),
    );
    expect(result.debit_card_sales).toBe(80000);
    expect(result.source).toBe("order_mp_method");
  });

  it("maps debit_card alias to debit_card_sales", () => {
    const result = aggregatePayments(
      makeInput({
        orders: [
          { id: "o2", total_amount: 45000, mp_payment_method: "debit_card" },
        ],
      }),
    );
    expect(result.debit_card_sales).toBe(45000);
  });

  it("maps credit_card alias to credit_card_sales", () => {
    const result = aggregatePayments(
      makeInput({
        orders: [
          { id: "o3", total_amount: 99000, mp_payment_method: "credit_card" },
        ],
      }),
    );
    expect(result.credit_card_sales).toBe(99000);
  });

  it("defaults to cash when mp_payment_method is undefined", () => {
    const result = aggregatePayments(
      makeInput({
        orders: [{ id: "o4", total_amount: 25000 }],
      }),
    );
    expect(result.cash_sales).toBe(25000);
  });

  it("aggregates multiple orders in Tier 3", () => {
    const result = aggregatePayments(
      makeInput({
        orders: [
          { id: "o1", total_amount: 10000, mp_payment_method: "cash" },
          { id: "o2", total_amount: 20000, mp_payment_method: "debit" },
          { id: "o3", total_amount: 30000, mp_payment_method: "credit" },
          { id: "o4", total_amount: 40000, mp_payment_method: "transfer" },
          { id: "o5", total_amount: 50000, mp_payment_method: "installments" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(10000);
    expect(result.debit_card_sales).toBe(20000);
    expect(result.credit_card_sales).toBe(30000);
    expect(result.transfer_sales).toBe(40000);
    expect(result.installments_sales).toBe(50000);
    expect(result.other_payment_sales).toBe(0);
  });

  it("routes unknown mp_payment_method to other_payment_sales", () => {
    const result = aggregatePayments(
      makeInput({
        orders: [
          { id: "o6", total_amount: 7777, mp_payment_method: "unknown_method" },
        ],
      }),
    );
    expect(result.other_payment_sales).toBe(7777);
  });
});

// ─── Credit Notes (Negative Amounts) ─────────────────────────────────────────

describe("credit notes — negative amounts", () => {
  it("reduces cash_sales when a cash refund is included", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [
          { amount: 50000, payment_method: "cash" },
          { amount: -10000, payment_method: "cash" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(40000);
  });

  it("reduces credit_card_sales with credit card refund", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [
          { amount: 100000, payment_method: "credit" },
          { amount: -25000, payment_method: "credit" },
        ],
      }),
    );
    expect(result.credit_card_sales).toBe(75000);
  });

  it("handles mixed positive and negative amounts across methods", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [
          { amount: 50000, payment_method: "cash" },
          { amount: 30000, payment_method: "debit" },
          { amount: -5000, payment_method: "cash" },
          { amount: 20000, payment_method: "credit" },
          { amount: -10000, payment_method: "credit" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(45000);
    expect(result.debit_card_sales).toBe(30000);
    expect(result.credit_card_sales).toBe(10000);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("returns zeros and source no_payments when all inputs are empty", () => {
    const result = aggregatePayments(
      makeInput({ sessionPayments: [], orders: [], orderPayments: [] }),
    );
    expect(result).toEqual({
      cash_sales: 0,
      debit_card_sales: 0,
      credit_card_sales: 0,
      transfer_sales: 0,
      installments_sales: 0,
      other_payment_sales: 0,
      source: "no_payments",
    });
  });

  it("returns zeros when no inputs provided at all", () => {
    const result = aggregatePayments(makeInput());
    expect(result.source).toBe("no_payments");
    expect(result.cash_sales).toBe(0);
  });

  it("prefers sessionPayments over orderPayments", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 100, payment_method: "cash" }],
        orderPayments: [{ amount: 999, payment_method: "credit" }],
        orders: [
          { id: "o1", total_amount: 999, mp_payment_method: "transfer" },
        ],
      }),
    );
    expect(result.cash_sales).toBe(100);
    expect(result.credit_card_sales).toBe(0);
    expect(result.transfer_sales).toBe(0);
    expect(result.source).toBe("session_payments");
  });

  it("prefers orderPayments over mp_payment_method when sessionPayments empty", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [],
        orderPayments: [{ amount: 200, payment_method: "debit" }],
        orders: [{ id: "o1", total_amount: 999, mp_payment_method: "cash" }],
      }),
    );
    expect(result.debit_card_sales).toBe(200);
    expect(result.cash_sales).toBe(0);
    expect(result.source).toBe("order_payments");
  });

  it("handles initialSummary pre-population", () => {
    const result = aggregatePayments(
      makeInput({
        sessionPayments: [{ amount: 5000, payment_method: "cash" }],
        initialSummary: { cash_sales: 1000 },
      }),
    );
    expect(result.cash_sales).toBe(6000);
  });
});

// ─── Closure Builder ─────────────────────────────────────────────────────────

import { buildClosurePayload } from "@/lib/cash-register/closure-builder";
import type { ClosurePayloadParams } from "@/lib/cash-register/closure-builder";

describe("buildClosurePayload", () => {
  const baseParams: ClosurePayloadParams = {
    branch_id: "b1",
    closure_date: "2024-06-15",
    closed_by: "u1",
    pos_session_id: "s1",
    opening_cash_amount: 100000,
    total_sales: 500000,
    total_transactions: 10,
    cash_sales: 200000,
    debit_card_sales: 150000,
    credit_card_sales: 100000,
    installments_sales: 50000,
    other_payment_sales: 0,
    expected_cash: 300000,
    actual_cash: 300000,
    cash_difference: 0,
    card_machine_debit_total: 150000,
    card_machine_credit_total: 100000,
    card_machine_difference: 0,
    total_subtotal: 450000,
    total_tax: 50000,
    total_discounts: 0,
    closing_cash_amount: 300000,
    notes: null,
    discrepancies: null,
    opened_at: "2024-06-15T09:00:00",
  };

  it("builds a complete closure payload with all required fields", () => {
    const payload = buildClosurePayload(baseParams);

    expect(payload.branch_id).toBe("b1");
    expect(payload.closure_date).toBe("2024-06-15");
    expect(payload.closed_by).toBe("u1");
    expect(payload.pos_session_id).toBe("s1");
    expect(payload.opening_cash_amount).toBe(100000);
    expect(payload.total_sales).toBe(500000);
    expect(payload.total_transactions).toBe(10);
    expect(payload.cash_sales).toBe(200000);
    expect(payload.debit_card_sales).toBe(150000);
    expect(payload.credit_card_sales).toBe(100000);
    expect(payload.installments_sales).toBe(50000);
    expect(payload.other_payment_sales).toBe(0);
    expect(payload.expected_cash).toBe(300000);
    expect(payload.actual_cash).toBe(300000);
    expect(payload.cash_difference).toBe(0);
    expect(payload.total_subtotal).toBe(450000);
    expect(payload.total_tax).toBe(50000);
    expect(payload.total_discounts).toBe(0);
    expect(payload.closing_cash_amount).toBe(300000);
    expect(payload.notes).toBeNull();
    expect(payload.discrepancies).toBeNull();
    expect(payload.status).toBe("closed");
    expect(payload.opened_at).toBe("2024-06-15T09:00:00");
    expect(payload.updated_at).toBeDefined();
    expect(typeof payload.updated_at).toBe("string");
  });

  it("omits field_operation_id when not provided", () => {
    const payload = buildClosurePayload(baseParams);
    expect(payload.field_operation_id).toBeUndefined();
  });

  it("includes field_operation_id when provided", () => {
    const payload = buildClosurePayload({
      ...baseParams,
      field_operation_id: "fo-1",
    });
    expect(payload.field_operation_id).toBe("fo-1");
  });

  it("uses provided status instead of default", () => {
    const payload = buildClosurePayload({
      ...baseParams,
      status: "draft",
    });
    expect(payload.status).toBe("draft");
  });

  it("handles null pos_session_id", () => {
    const payload = buildClosurePayload({
      ...baseParams,
      pos_session_id: null,
    });
    expect(payload.pos_session_id).toBeNull();
  });

  it("handles discrepancies object", () => {
    const payload = buildClosurePayload({
      ...baseParams,
      discrepancies: { card_machine: { expected: 100000, actual: 95000 } },
    });
    expect(payload.discrepancies).toEqual({
      card_machine: { expected: 100000, actual: 95000 },
    });
  });
});

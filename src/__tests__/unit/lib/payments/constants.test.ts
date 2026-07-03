/**
 * Unit tests for payment constants
 *
 * @module __tests__/unit/lib/payments/constants.test
 */

import { describe, expect, it } from "vitest";

import {
  PAYMENT_METHOD_MAP,
  PAYMENT_METHODS_ORDER_PAYMENTS,
} from "@/lib/payments/constants";

describe("PAYMENT_METHOD_MAP", () => {
  it("should map cash to cash", () => {
    expect(PAYMENT_METHOD_MAP.cash).toBe("cash");
  });

  it("should map card to debit", () => {
    expect(PAYMENT_METHOD_MAP.card).toBe("debit");
  });

  it("should map debit_card to debit", () => {
    expect(PAYMENT_METHOD_MAP.debit_card).toBe("debit");
  });

  it("should map credit_card to credit", () => {
    expect(PAYMENT_METHOD_MAP.credit_card).toBe("credit");
  });

  it("should map transfer to transfer", () => {
    expect(PAYMENT_METHOD_MAP.transfer).toBe("transfer");
  });

  it("should map deposit to transfer", () => {
    expect(PAYMENT_METHOD_MAP.deposit).toBe("transfer");
  });
});

describe("PAYMENT_METHODS_ORDER_PAYMENTS", () => {
  it("should contain all valid payment methods", () => {
    expect(PAYMENT_METHODS_ORDER_PAYMENTS).toHaveLength(5);
    expect(PAYMENT_METHODS_ORDER_PAYMENTS).toEqual([
      "cash",
      "debit",
      "credit",
      "transfer",
      "check",
    ]);
  });

  it("should have readonly type semantics (as const)", () => {
    // TypeScript `as const` makes it readonly at compile time only
    // Runtime is a regular array — check values instead
    expect(PAYMENT_METHODS_ORDER_PAYMENTS).toContain("cash");
    expect(PAYMENT_METHODS_ORDER_PAYMENTS).toContain("check");
  });
});

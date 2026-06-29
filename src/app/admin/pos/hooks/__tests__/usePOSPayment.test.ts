/**
 * Tests for usePOSPayment — POS payment handling hook.
 *
 * Coverage:
 *   - Initial state: defaults
 *   - Totals calculation: with/without included tax, mixed, empty cart
 *   - Change calculation
 *   - Minimum deposit (30%)
 *   - isPaymentSufficient: cash full, cash partial, non-cash
 *   - Effective payment amount
 *   - Reset payment
 *   - Quick cash amounts (unique, rounding)
 *   - Handle payment: success, insufficient
 *   - Validate payment: cash, card, transfer
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePOSPayment } from "../usePOSPayment";
import type { POSCartItem } from "../../types";

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeCartItem(
  overrides?: Partial<POSCartItem>,
): POSCartItem {
  return {
    product: { id: "p-1", name: "Product", price: 10000, inventory_quantity: 5 },
    quantity: 1,
    unitPrice: 10000,
    subtotal: 10000,
    priceIncludesTax: true,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("usePOSPayment", () => {
  describe("initial state", () => {
    it("defaults to cash payment method", () => {
      const { result } = renderHook(() => usePOSPayment());
      expect(result.current.paymentMethod).toBe("cash");
    });

    it("initializes totals to zero with empty cart", () => {
      const { result } = renderHook(() => usePOSPayment({ cart: [] }));
      expect(result.current.totals).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
    });

    it("initializes cashReceived to 0", () => {
      const { result } = renderHook(() => usePOSPayment());
      expect(result.current.cashReceived).toBe(0);
    });

    it("initializes isPartial to false", () => {
      const { result } = renderHook(() => usePOSPayment());
      expect(result.current.isPartial).toBe(false);
    });
  });

  describe("totals calculation", () => {
    it("computes totals for cart items with tax included", () => {
      const cart = [
        makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true }),
      ];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      // 119000 includes 19% IVA → base = 119000 / 1.19 = 100000, tax = 19000
      expect(result.current.totals.subtotal).toBe(100000);
      expect(result.current.totals.taxAmount).toBe(19000);
      expect(result.current.totals.total).toBe(119000);
    });

    it("computes totals for cart items without tax included", () => {
      const cart = [
        makeCartItem({ unitPrice: 100000, subtotal: 100000, priceIncludesTax: false }),
      ];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      // 100000 without IVA → tax = 19000, total = 119000
      expect(result.current.totals.subtotal).toBe(100000);
      expect(result.current.totals.taxAmount).toBe(19000);
      expect(result.current.totals.total).toBe(119000);
    });

    it("handles mixed tax-included and non-tax items", () => {
      const cart = [
        makeCartItem({ unitPrice: 119000, quantity: 1, subtotal: 119000, priceIncludesTax: true }),
        makeCartItem({
          unitPrice: 50000,
          quantity: 1,
          subtotal: 50000,
          priceIncludesTax: false,
          product: { id: "p-2", name: "Labor", price: 50000, inventory_quantity: 0 },
        }),
      ];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      // Item 1: base = 119000/1.19 = 100000, tax extracted = 19000
      // Item 2: base = 50000, tax added = 50000 * 0.19 = 9500
      // subtotal = 100000 + 50000 = 150000
      // tax = 19000 + 9500 = 28500
      // total = 150000 + 28500 = 178500
      expect(result.current.totals.subtotal).toBe(150000);
      expect(result.current.totals.taxAmount).toBe(28500);
      expect(result.current.totals.total).toBe(178500);
    });

    it("handles multiple quantities", () => {
      const cart = [
        makeCartItem({ unitPrice: 59500, quantity: 2, subtotal: 119000, priceIncludesTax: true }),
      ];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      // 59500 * 2 = 119000 → base = 100000, tax = 19000
      expect(result.current.totals.subtotal).toBe(100000);
      expect(result.current.totals.taxAmount).toBe(19000);
    });
  });

  describe("change calculation", () => {
    it("returns 0 when cashReceived is less than total", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(30000));
      expect(result.current.change).toBe(0);
    });

    it("calculates correct change when cashReceived exceeds total", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      // 50000 includes tax → base = ~42017, total = 50000
      act(() => result.current.setCashReceived(60000));
      expect(result.current.change).toBe(10000);
    });

    it("returns 0 when cashReceived equals total", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(50000));
      expect(result.current.change).toBe(0);
    });
  });

  describe("minDeposit", () => {
    it("calculates 30% of total as minimum deposit", () => {
      const cart = [makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      expect(result.current.minDeposit).toBe(35700); // 119000 * 0.3
    });
  });

  describe("isPaymentSufficient", () => {
    it("is true when cashReceived >= total for cash payment", () => {
      const cart = [makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(119000));
      expect(result.current.isPaymentSufficient).toBe(true);
    });

    it("is false when cashReceived < total for cash payment (non-partial)", () => {
      const cart = [makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(50000));
      expect(result.current.isPaymentSufficient).toBe(false);
    });

    it("is true for partial payment when partialAmount >= minDeposit", () => {
      const cart = [makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => {
        result.current.setIsPartial(true);
        result.current.setPartialAmount(35700);
      });
      expect(result.current.isPaymentSufficient).toBe(true);
    });

    it("is false for partial payment when partialAmount < minDeposit", () => {
      const cart = [makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => {
        result.current.setIsPartial(true);
        result.current.setPartialAmount(10000);
      });
      expect(result.current.isPaymentSufficient).toBe(false);
    });

    it("is always true for non-cash payment methods (card, transfer)", () => {
      const cart = [makeCartItem({ unitPrice: 119000, subtotal: 119000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setPaymentMethod("debit_card"));
      expect(result.current.isPaymentSufficient).toBe(true);

      act(() => result.current.setPaymentMethod("credit_card"));
      expect(result.current.isPaymentSufficient).toBe(true);

      act(() => result.current.setPaymentMethod("transfer"));
      expect(result.current.isPaymentSufficient).toBe(true);
    });
  });

  describe("effectivePaymentAmount", () => {
    it("equals total when not partial", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      expect(result.current.effectivePaymentAmount).toBe(50000);
    });

    it("equals partialAmount when isPartial", () => {
      const cart = [makeCartItem({ unitPrice: 100000, subtotal: 100000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => {
        result.current.setIsPartial(true);
        result.current.setPartialAmount(40000);
      });
      expect(result.current.effectivePaymentAmount).toBe(40000);
    });
  });

  describe("effectiveChange", () => {
    it("calculates change against effective payment amount", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => {
        result.current.setIsPartial(true);
        result.current.setPartialAmount(30000);
        result.current.setCashReceived(50000);
      });
      expect(result.current.effectiveChange).toBe(20000); // 50000 - 30000
    });
  });

  describe("resetPayment", () => {
    it("resets all payment fields to defaults", () => {
      const { result } = renderHook(() => usePOSPayment());

      act(() => {
        result.current.setCashReceived(50000);
        result.current.setIsPartial(true);
        result.current.setPartialAmount(20000);
        result.current.setFiscalReference("FIS-123");
        result.current.setCardLastFour("1234");
        result.current.setCardBrand("Visa");
        result.current.setTransferReference("TRF-001");
      });

      act(() => result.current.resetPayment());

      expect(result.current.cashReceived).toBe(0);
      expect(result.current.isPartial).toBe(false);
      expect(result.current.partialAmount).toBe(0);
      expect(result.current.fiscalReference).toBe("");
      expect(result.current.cardLastFour).toBe("");
      expect(result.current.cardBrand).toBe("");
      expect(result.current.transferReference).toBe("");
    });
  });

  describe("handleQuickCash", () => {
    it("sets cash received to the given amount", () => {
      const { result } = renderHook(() => usePOSPayment());

      act(() => result.current.handleQuickCash(50000));
      expect(result.current.cashReceived).toBe(50000);
    });
  });

  describe("quickCashAmounts", () => {
    it("generates unique rounded amounts above total", () => {
      const cart = [makeCartItem({ unitPrice: 22300, subtotal: 22300, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      // total = 22300, quick amounts should round up
      expect(result.current.quickCashAmounts.length).toBeGreaterThanOrEqual(1);
      expect(result.current.quickCashAmounts.every((a) => a >= 22300)).toBe(true);
      expect(new Set(result.current.quickCashAmounts).size).toBe(
        result.current.quickCashAmounts.length,
      );
    });
  });

  describe("handlePayment", () => {
    it("returns payment data when payment is sufficient", () => {
      const onSubmit = (): void => {};
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart, onPaymentSubmit: onSubmit }));

      act(() => result.current.setCashReceived(50000));

      let paymentData: ReturnType<typeof result.current.handlePayment> | undefined;
      act(() => {
        paymentData = result.current.handlePayment();
      });

      expect(paymentData?.method).toBe("cash");
      expect(paymentData?.cashReceived).toBe(50000);
      expect(paymentData?.change).toBe(0);
      expect(paymentData?.isPartial).toBe(false);
    });

    it("throws when payment is insufficient", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(10000));

      expect(() => result.current.handlePayment()).toThrow("Monto insuficiente");
    });

    it("includes additional payment fields when set", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => {
        result.current.setPaymentMethod("transfer");
        result.current.setTransferReference("TRF-001");
      });

      let paymentData: ReturnType<typeof result.current.handlePayment> | undefined;
      act(() => {
        paymentData = result.current.handlePayment();
      });

      expect(paymentData?.method).toBe("transfer");
      expect(paymentData?.transferReference).toBe("TRF-001");
    });
  });

  describe("validatePayment", () => {
    it("returns null when cash is sufficient", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(50000));

      expect(result.current.validatePayment()).toBeNull();
    });

    it("returns error when cash is insufficient and not partial", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => result.current.setCashReceived(10000));

      expect(result.current.validatePayment()).toBe("Monto en efectivo insuficiente");
    });

    it("returns null when cash is insufficient but isPartial", () => {
      const cart = [makeCartItem({ unitPrice: 50000, subtotal: 50000, priceIncludesTax: true })];
      const { result } = renderHook(() => usePOSPayment({ cart }));

      act(() => {
        result.current.setCashReceived(10000);
        result.current.setIsPartial(true);
      });

      // Partial bypasses the "cash insufficient" check
      expect(result.current.validatePayment()).toBeNull();
    });

    it("returns error when transfer reference is empty for transfer method", () => {
      const { result } = renderHook(() => usePOSPayment());

      act(() => result.current.setPaymentMethod("transfer"));

      expect(result.current.validatePayment()).toBe("Ingrese referencia de transferencia");
    });

    it("returns null for card payments without additional validation", () => {
      const { result } = renderHook(() => usePOSPayment());

      act(() => result.current.setPaymentMethod("debit_card"));

      expect(result.current.validatePayment()).toBeNull();
    });
  });
});

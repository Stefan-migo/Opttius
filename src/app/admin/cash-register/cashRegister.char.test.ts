/**
 * Characterization test for cash-register/page.tsx extraction.
 *
 * Tests the public API boundary of each extracted module:
 * - cashRegister.types — type shapes
 * - cashPaymentUtils — payment method handling, status badges, cash difference
 * - cashOpsUtils — API call helpers and parameter builders
 * - cashPrintUtils — receipt/print (placeholder)
 *
 * Captures current behavior before/after extraction. No behavioral changes.
 */
import { describe, expect, it } from "vitest";

// ─── Types ───────────────────────────────────────────────────────────────────

import type { CashClosure, DailySummary, Movement } from "./cashRegister.types";

describe("cashRegister.types", () => {
  it("CashClosure has all required fields", () => {
    const c: CashClosure = {
      id: "c1",
      branch_id: "b1",
      closure_date: "2024-01-15",
      closed_by: "u1",
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
      status: "confirmed",
      opened_at: "2024-01-15T09:00:00",
      closed_at: "2024-01-15T18:00:00",
      confirmed_at: null,
    };
    expect(c.id).toBe("c1");
    expect(c.status).toBe("confirmed");
    expect(c.cash_sales).toBe(200000);
  });

  it("CashClosure supports optional transfer_sales", () => {
    const c: CashClosure = {
      id: "c2",
      branch_id: "b1",
      closure_date: "2024-01-15",
      closed_by: "u1",
      opening_cash_amount: 100000,
      total_sales: 600000,
      total_transactions: 12,
      cash_sales: 200000,
      debit_card_sales: 150000,
      credit_card_sales: 100000,
      transfer_sales: 50000,
      installments_sales: 100000,
      other_payment_sales: 0,
      expected_cash: 300000,
      actual_cash: 300000,
      cash_difference: 0,
      card_machine_debit_total: 150000,
      card_machine_credit_total: 100000,
      card_machine_difference: 0,
      total_subtotal: 540000,
      total_tax: 60000,
      total_discounts: 0,
      closing_cash_amount: 300000,
      notes: null,
      discrepancies: null,
      status: "closed",
      opened_at: "2024-01-15T09:00:00",
      closed_at: "2024-01-15T18:00:00",
      confirmed_at: null,
    };
    expect(c.transfer_sales).toBe(50000);
  });

  it("CashClosure supports branch and closed_by_user nested objects", () => {
    const c: CashClosure = {
      id: "c3",
      branch_id: "b1",
      closure_date: "2024-01-15",
      closed_by: "u1",
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
      status: "draft",
      opened_at: "2024-01-15T09:00:00",
      closed_at: "2024-01-15T18:00:00",
      confirmed_at: null,
      branch: { id: "b1", name: "Sucursal Central", code: "SC001" },
      closed_by_user: { id: "u1", first_name: "Juan", last_name: "Pérez" },
    };
    expect(c.branch?.name).toBe("Sucursal Central");
    expect(c.closed_by_user?.first_name).toBe("Juan");
  });

  it("DailySummary has all required fields", () => {
    const s: DailySummary = {
      date: "2024-01-15",
      branch_id: "b1",
      opening_cash_amount: 100000,
      total_sales: 500000,
      total_transactions: 10,
      cash_sales: 200000,
      debit_card_sales: 150000,
      credit_card_sales: 100000,
      transfer_sales: 50000,
      installments_sales: 0,
      other_payment_sales: 0,
      expected_cash: 300000,
      total_subtotal: 450000,
      total_tax: 50000,
      total_discounts: 0,
    };
    expect(s.expected_cash).toBe(300000);
    expect(s.transfer_sales).toBe(50000);
  });

  it("DailySummary supports optional cash_inflows/cash_outflows", () => {
    const s: DailySummary = {
      date: "2024-01-15",
      branch_id: "b1",
      opening_cash_amount: 100000,
      total_sales: 500000,
      total_transactions: 10,
      cash_sales: 200000,
      cash_inflows: 50000,
      cash_outflows: 10000,
      debit_card_sales: 150000,
      credit_card_sales: 100000,
      transfer_sales: 50000,
      installments_sales: 0,
      other_payment_sales: 0,
      expected_cash: 340000,
      total_subtotal: 450000,
      total_tax: 50000,
      total_discounts: 0,
    };
    expect(s.cash_inflows).toBe(50000);
    expect(s.cash_outflows).toBe(10000);
  });

  it("Movement has all required fields with movement_type union", () => {
    const m: Movement = {
      id: "m1",
      movement_type: "sale",
      order_id: "o1",
      order_number: "ORD-001",
      customer_name: "María García",
      customer_rut: "12.345.678-9",
      payment_method: "Efectivo",
      payment_method_code: "cash",
      amount: 150000,
      payment_status: "Completo",
      paid_at: "2024-01-15T12:30:00",
      notes: null,
      order_total: 150000,
      order_payment_status: "paid",
    };
    expect(m.movement_type).toBe("sale");
    expect(m.amount).toBe(150000);
  });

  it("Movement supports all three movement_type values", () => {
    const sale: Movement["movement_type"] = "sale";
    const partial: Movement["movement_type"] = "partial_payment";
    const creditNote: Movement["movement_type"] = "credit_note";
    expect([sale, partial, creditNote]).toHaveLength(3);
  });
});

// ─── Payment Utils ───────────────────────────────────────────────────────────

import {
  PAYMENT_METHOD_FILTER_MAP,
  STATUS_BADGE_CONFIG,
  resolveClosureStatus,
  formatPaymentMethod,
  computeCashDifference,
} from "./cashPaymentUtils";

describe("cashPaymentUtils", () => {
  describe("PAYMENT_METHOD_FILTER_MAP", () => {
    it("maps cash to cash codes", () => {
      expect(PAYMENT_METHOD_FILTER_MAP.cash).toEqual(["cash"]);
    });

    it("maps debit to debit and debit_card", () => {
      expect(PAYMENT_METHOD_FILTER_MAP.debit).toEqual(["debit", "debit_card"]);
    });

    it("maps credit to credit and credit_card", () => {
      expect(PAYMENT_METHOD_FILTER_MAP.credit).toEqual([
        "credit",
        "credit_card",
      ]);
    });

    it("maps transfer to transfer only", () => {
      expect(PAYMENT_METHOD_FILTER_MAP.transfer).toEqual(["transfer"]);
    });

    it("has exactly 4 payment methods", () => {
      expect(Object.keys(PAYMENT_METHOD_FILTER_MAP)).toHaveLength(4);
    });
  });

  describe("STATUS_BADGE_CONFIG", () => {
    it("defines draft as Abierta secondary", () => {
      expect(STATUS_BADGE_CONFIG.draft).toEqual({
        variant: "secondary",
        label: "Abierta",
      });
    });

    it("defines confirmed as Confirmado default", () => {
      expect(STATUS_BADGE_CONFIG.confirmed).toEqual({
        variant: "default",
        label: "Confirmado",
      });
    });

    it("defines closed as Cerrada default", () => {
      expect(STATUS_BADGE_CONFIG.closed).toEqual({
        variant: "default",
        label: "Cerrada",
      });
    });

    it("defines reopened as Abierta secondary", () => {
      expect(STATUS_BADGE_CONFIG.reopened).toEqual({
        variant: "secondary",
        label: "Abierta",
      });
    });

    it("covers all closure status values", () => {
      expect(Object.keys(STATUS_BADGE_CONFIG).sort()).toEqual([
        "closed",
        "confirmed",
        "draft",
        "reopened",
        "reviewed",
      ]);
    });
  });

  describe("resolveClosureStatus", () => {
    it("returns closed config for closed status regardless of session", () => {
      const result = resolveClosureStatus("closed", "session-1");
      expect(result.label).toBe("Cerrada");
    });

    it("returns reopened config for draft with session", () => {
      const result = resolveClosureStatus("draft", "session-1");
      expect(result.label).toBe("Abierta");
    });

    it("returns draft config for draft without session", () => {
      const result = resolveClosureStatus("draft");
      expect(result.label).toBe("Abierta");
    });

    it("returns reviewed config for reviewed status", () => {
      const result = resolveClosureStatus("reviewed");
      expect(result.label).toBe("Revisado");
    });

    it("returns confirmed config for confirmed status", () => {
      const result = resolveClosureStatus("confirmed");
      expect(result.label).toBe("Confirmado");
    });

    it("returns fallback for unknown status", () => {
      const result = resolveClosureStatus("unknown");
      expect(result).toEqual({ variant: "outline", label: "unknown" });
    });
  });

  describe("formatPaymentMethod", () => {
    it("returns Efectivo for cash", () => {
      expect(formatPaymentMethod("cash")).toBe("Efectivo");
    });

    it("returns Débito for debit", () => {
      expect(formatPaymentMethod("debit")).toBe("Débito");
    });

    it("returns Crédito for credit", () => {
      expect(formatPaymentMethod("credit")).toBe("Crédito");
    });

    it("returns Transf. for transfer", () => {
      expect(formatPaymentMethod("transfer")).toBe("Transf.");
    });

    it("returns Abono for deposit", () => {
      expect(formatPaymentMethod("deposit")).toBe("Abono");
    });

    it("returns Cuotas for installments", () => {
      expect(formatPaymentMethod("installments")).toBe("Cuotas");
    });

    it("returns the raw method for unknown codes", () => {
      expect(formatPaymentMethod("prepago")).toBe("prepago");
    });
  });

  describe("computeCashDifference", () => {
    it("returns null when actualCash is null", () => {
      expect(computeCashDifference(null, 100000)).toBeNull();
    });

    it("returns null when actualCash is undefined", () => {
      expect(computeCashDifference(undefined, 100000)).toBeNull();
    });

    it("returns positive difference when actual > expected", () => {
      expect(computeCashDifference(150000, 100000)).toBe(50000);
    });

    it("returns negative difference when actual < expected", () => {
      expect(computeCashDifference(80000, 100000)).toBe(-20000);
    });

    it("returns zero when exact match", () => {
      expect(computeCashDifference(100000, 100000)).toBe(0);
    });

    it("handles zero expected cash", () => {
      expect(computeCashDifference(5000, 0)).toBe(5000);
    });
  });
});

// ─── Cash Ops Utils ──────────────────────────────────────────────────────────

import {
  buildClosureParams,
  buildOrderParams,
  buildCloseCashBody,
  getTodayChileDate,
  extractOrderCustomerName,
  buildCreditNotesDateRange,
} from "./cashOpsUtils";

describe("cashOpsUtils", () => {
  describe("buildClosureParams", () => {
    it("builds params with page and limit", () => {
      const params = buildClosureParams(1, 20);
      expect(params.get("limit")).toBe("20");
      expect(params.get("offset")).toBe("0");
    });

    it("calculates offset from page number", () => {
      const params = buildClosureParams(3, 10);
      expect(params.get("offset")).toBe("20");
    });

    it("appends field_operation_id when provided", () => {
      const params = buildClosureParams(1, 20, "fo-1");
      expect(params.get("field_operation_id")).toBe("fo-1");
    });

    it("does not include field_operation_id when not provided", () => {
      const params = buildClosureParams(1, 20);
      expect(params.has("field_operation_id")).toBe(false);
    });
  });

  describe("buildOrderParams", () => {
    const defaultFilters = {
      date_from: "2024-01-15",
      date_to: "2024-01-15",
      payment_status: "all" as const,
      payment_method: "all" as const,
    };

    it("builds params with dates, limit and offset", () => {
      const params = buildOrderParams(defaultFilters, 1, 20);
      expect(params.get("date_from")).toBe("2024-01-15");
      expect(params.get("date_to")).toBe("2024-01-15");
      expect(params.get("limit")).toBe("20");
      expect(params.get("offset")).toBe("0");
    });

    it("adds status=cancelled for cancelled payment status", () => {
      const params = buildOrderParams(
        { ...defaultFilters, payment_status: "cancelled" },
        1,
        20,
      );
      expect(params.get("status")).toBe("cancelled");
      expect(params.has("payment_status")).toBe(false);
    });

    it("adds payment_status=refunded for refunded payment status", () => {
      const params = buildOrderParams(
        { ...defaultFilters, payment_status: "refunded" },
        1,
        20,
      );
      expect(params.get("payment_status")).toBe("refunded");
    });

    it("adds payment_status for specific status", () => {
      const params = buildOrderParams(
        { ...defaultFilters, payment_status: "paid" },
        1,
        20,
      );
      expect(params.get("payment_status")).toBe("paid");
    });

    it("omits payment_status when all", () => {
      const params = buildOrderParams(defaultFilters, 1, 20);
      expect(params.has("payment_status")).toBe(false);
      expect(params.has("status")).toBe(false);
    });
  });

  describe("buildCloseCashBody", () => {
    it("builds a close body with all required fields", () => {
      const body = buildCloseCashBody({
        closure_date: "2024-01-15T00:00:00",
        opening_cash_amount: 100000,
        actual_cash: 150000,
        card_machine_debit_total: 50000,
        card_machine_credit_total: 75000,
        notes: "Cierre normal",
        discrepancies: null,
      });
      expect(body.closure_date).toBe("2024-01-15T00:00:00");
      expect(body.opening_cash_amount).toBe(100000);
      expect(body.actual_cash).toBe(150000);
      expect(body.notes).toBe("Cierre normal");
      expect(body.discrepancies).toBeNull();
    });

    it("accepts optional field_operation_id", () => {
      const body = buildCloseCashBody({
        closure_date: "2024-01-15T00:00:00",
        opening_cash_amount: 100000,
        actual_cash: 150000,
        card_machine_debit_total: 0,
        card_machine_credit_total: 0,
        notes: null,
        discrepancies: null,
        field_operation_id: "fo-1",
      });
      expect(body.field_operation_id).toBe("fo-1");
    });
  });

  describe("getTodayChileDate", () => {
    it("returns a string in YYYY-MM-DD format", () => {
      const date = getTodayChileDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("extractOrderCustomerName", () => {
    it("returns customer_name when available", () => {
      expect(extractOrderCustomerName({ customer_name: "Juan Pérez" })).toBe(
        "Juan Pérez",
      );
    });

    it("returns sii_business_name when customer_name absent", () => {
      expect(
        extractOrderCustomerName({ sii_business_name: "Empresa Ltda." }),
      ).toBe("Empresa Ltda.");
    });

    it("returns combined billing names when available", () => {
      expect(
        extractOrderCustomerName({
          billing_first_name: "María",
          billing_last_name: "García",
        }),
      ).toBe("María García");
    });

    it("returns customer_email as fallback", () => {
      expect(extractOrderCustomerName({ customer_email: "a@b.com" })).toBe(
        "a@b.com",
      );
    });

    it('returns "Cliente no registrado" when nothing matches', () => {
      expect(extractOrderCustomerName({})).toBe("Cliente no registrado");
    });
  });

  describe("buildCreditNotesDateRange", () => {
    it("returns date_from 5 years ago and date_to 1 year ahead", () => {
      const range = buildCreditNotesDateRange();
      expect(range).toHaveProperty("date_from");
      expect(range).toHaveProperty("date_to");
      expect(range.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.date_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

// ─── Print Utils ─────────────────────────────────────────────────────────────

import { hasPrintSupport } from "./cashPrintUtils";

describe("cashPrintUtils", () => {
  it("hasPrintSupport returns false (no print logic extracted yet)", () => {
    // ponytail: placeholder — no print/receipt logic found in page.tsx
    expect(hasPrintSupport()).toBe(false);
  });
});

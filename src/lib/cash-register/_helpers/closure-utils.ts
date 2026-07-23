/**
 * Pure utility functions for cash register closure.
 *
 * Extracted from closure-service.ts to reduce parent to <300 lines.
 * Zero behavioral changes — pure extraction.
 */

import { coerceAmount } from "@/lib/cash-register/payment-aggregator";
import type { PaymentAggregatorInput } from "@/lib/cash-register/payment-aggregator";
import type { ClosurePayloadParams } from "@/lib/cash-register/closure-builder";

import type { ClosureInputRaw, OrderTotals } from "./closure-types";

// ─── Date Alignment ─────────────────────────────────────────────────────────

export function alignDateWithSession(
  dateStr: string,
  openSession: { opening_time?: string } | null,
): string {
  if (openSession?.opening_time) {
    const sessionDateStr = openSession.opening_time.split("T")[0];
    if (sessionDateStr !== dateStr) {
      return sessionDateStr;
    }
  }
  return dateStr;
}

// ─── Cash Inflows/Outflows ─────────────────────────────────────────────────

export function calculateCashInflowsOutflows(
  sessionPayments: PaymentAggregatorInput["sessionPayments"],
): { cashInflows: number; cashOutflows: number } {
  let cashInflows = 0;
  let cashOutflows = 0;

  for (const payment of sessionPayments) {
    const amount = coerceAmount(payment.amount);
    if (payment.payment_method === "cash") {
      if (amount >= 0) cashInflows += amount;
      else cashOutflows += Math.abs(amount);
    }
  }

  return { cashInflows, cashOutflows };
}

// ─── Order Totals ───────────────────────────────────────────────────────────

export function calculateOrderTotals(orders: any[]): OrderTotals {
  let totalSales = 0;
  let totalSubtotal = 0;
  let totalTax = 0;
  let totalDiscounts = 0;

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    totalSales += coerceAmount(order.total_amount);
    totalSubtotal += coerceAmount(order.subtotal);
    totalTax += coerceAmount(order.tax_amount);
    totalDiscounts += coerceAmount(order.discount_amount);
  }

  return { totalSales, totalSubtotal, totalTax, totalDiscounts };
}

// ─── Closure Payload Input Builder ─────────────────────────────────────────

export function buildClosureInput(raw: ClosureInputRaw): ClosurePayloadParams {
  return {
    branch_id: raw.branch_id,
    closure_date: raw.closure_date,
    closed_by: raw.closed_by,
    pos_session_id: raw.pos_session_id,
    ...(raw.field_operation_id
      ? { field_operation_id: raw.field_operation_id }
      : {}),
    opening_cash_amount: raw.opening_cash_amount,
    total_sales: raw.totalSales,
    total_transactions: raw.totalTransactions,
    cash_sales: raw.cashSales,
    debit_card_sales: raw.debitCardSales,
    credit_card_sales: raw.creditCardSales,
    installments_sales: raw.installmentsSales,
    // PRESERVED: merge transfer_sales into other_payment_sales (POST-only behavior)
    other_payment_sales: raw.otherPaymentSales + raw.transferSales,
    expected_cash: raw.expectedCash,
    actual_cash:
      raw.actual_cash !== undefined && raw.actual_cash !== null
        ? Number(raw.actual_cash)
        : null,
    cash_difference: raw.cashDifference,
    card_machine_debit_total:
      raw.card_machine_debit_total !== undefined &&
      raw.card_machine_debit_total !== null
        ? Number(raw.card_machine_debit_total)
        : 0,
    card_machine_credit_total:
      raw.card_machine_credit_total !== undefined &&
      raw.card_machine_credit_total !== null
        ? Number(raw.card_machine_credit_total)
        : 0,
    card_machine_difference: raw.cardMachineDifference,
    total_subtotal: raw.totalSubtotal,
    total_tax: raw.totalTax,
    total_discounts: raw.totalDiscounts,
    closing_cash_amount:
      raw.actual_cash !== undefined && raw.actual_cash !== null
        ? Number(raw.actual_cash)
        : null,
    notes: raw.notes || null,
    discrepancies: raw.discrepancies || null,
    status: "closed",
    opened_at: raw.openedAt,
  };
}

/**
 * Cash operations utility functions for the cash register page.
 *
 * Extracted from page.tsx to enable independent testing and reuse.
 * Contains: API parameter builders, close body builder, date helpers,
 * and order customer name extraction.
 */

import { getTodayInTimezone } from "@/lib/utils/date-timezone";

// ─── URL Parameter Builders ──────────────────────────────────────────────────

export interface OrderFilters {
  date_from: string;
  date_to: string;
  payment_status: string;
  payment_method: string;
}

/**
 * Builds URLSearchParams for closure pagination.
 */
export function buildClosureParams(
  page: number,
  itemsPerPage: number,
  fieldOperationId?: string,
): URLSearchParams {
  const offset = (page - 1) * itemsPerPage;
  const params = new URLSearchParams({
    limit: itemsPerPage.toString(),
    offset: offset.toString(),
  });
  if (fieldOperationId) {
    params.append("field_operation_id", fieldOperationId);
  }
  return params;
}

/**
 * Builds URLSearchParams for order listing with filters.
 */
export function buildOrderParams(
  filters: OrderFilters,
  page: number,
  itemsPerPage: number,
): URLSearchParams {
  const offset = (page - 1) * itemsPerPage;
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
    limit: itemsPerPage.toString(),
    offset: offset.toString(),
  });

  if (filters.payment_status === "cancelled") {
    params.append("status", "cancelled");
  } else if (filters.payment_status === "refunded") {
    params.append("payment_status", "refunded");
  } else if (filters.payment_status !== "all") {
    params.append("payment_status", filters.payment_status);
  }

  return params;
}

// ─── Cash Close Body Builder ─────────────────────────────────────────────────

export interface CloseCashBodyInput {
  closure_date: string;
  opening_cash_amount: number;
  actual_cash: number;
  card_machine_debit_total: number;
  card_machine_credit_total: number;
  notes: string | null;
  discrepancies: string | null;
  field_operation_id?: string;
}

/**
 * Builds the request body for closing the cash register.
 */
export function buildCloseCashBody(
  input: CloseCashBodyInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    closure_date: input.closure_date,
    opening_cash_amount: input.opening_cash_amount,
    actual_cash: input.actual_cash,
    card_machine_debit_total: input.card_machine_debit_total,
    card_machine_credit_total: input.card_machine_credit_total,
    notes: input.notes,
    discrepancies: input.discrepancies,
  };
  if (input.field_operation_id) {
    body.field_operation_id = input.field_operation_id;
  }
  return body;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

/** Returns today's date in Chile timezone as YYYY-MM-DD. */
export function getTodayChileDate(): string {
  return getTodayInTimezone("America/Santiago");
}

/**
 * Returns a wide date range (5 years back, 1 year ahead) for credit notes
 * to avoid timezone/year mismatches between client and DB.
 */
export function buildCreditNotesDateRange(): {
  date_from: string;
  date_to: string;
} {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 5);
  to.setFullYear(to.getFullYear() + 1);
  return {
    date_from: from.toISOString().split("T")[0],
    date_to: to.toISOString().split("T")[0],
  };
}

// ─── Order Helpers ───────────────────────────────────────────────────────────

/** Extracts the best available customer display name from an order. */
export function extractOrderCustomerName(
  order: Record<string, unknown>,
): string {
  return (
    (order.customer_name as string) ||
    (order.sii_business_name as string) ||
    (order.billing_first_name && order.billing_last_name
      ? `${order.billing_first_name as string} ${order.billing_last_name as string}`.trim()
      : "") ||
    (order.customer_email as string) ||
    "Cliente no registrado"
  );
}

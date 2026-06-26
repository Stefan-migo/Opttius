/**
 * Pure closure payload builder extracted from close/route.ts.
 *
 * Takes structured params and returns a DB-ready closure payload.
 * No side effects — the route decides what values to pass for
 * each field (e.g. whether to merge transfer_sales into
 * other_payment_sales before calling this builder).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClosurePayloadParams {
  branch_id: string;
  closure_date: string;
  closed_by: string;
  pos_session_id: string | null;
  field_operation_id?: string;
  opening_cash_amount: number;
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  debit_card_sales: number;
  credit_card_sales: number;
  installments_sales: number;
  other_payment_sales: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  card_machine_debit_total: number;
  card_machine_credit_total: number;
  card_machine_difference: number;
  total_subtotal: number;
  total_tax: number;
  total_discounts: number;
  closing_cash_amount: number | null;
  notes: string | null;
  discrepancies: Record<string, unknown> | null;
  opened_at: string;
  status?: string;
}

export interface ClosurePayload {
  branch_id: string;
  closure_date: string;
  closed_by: string;
  pos_session_id: string | null;
  field_operation_id?: string;
  opening_cash_amount: number;
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  debit_card_sales: number;
  credit_card_sales: number;
  installments_sales: number;
  other_payment_sales: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  card_machine_debit_total: number;
  card_machine_credit_total: number;
  card_machine_difference: number;
  total_subtotal: number;
  total_tax: number;
  total_discounts: number;
  closing_cash_amount: number | null;
  notes: string | null;
  discrepancies: Record<string, unknown> | null;
  status: string;
  opened_at: string;
  updated_at: string;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildClosurePayload(
  params: ClosurePayloadParams,
): ClosurePayload {
  return {
    branch_id: params.branch_id,
    closure_date: params.closure_date,
    closed_by: params.closed_by,
    pos_session_id: params.pos_session_id,
    ...(params.field_operation_id
      ? { field_operation_id: params.field_operation_id }
      : {}),
    opening_cash_amount: params.opening_cash_amount,
    total_sales: params.total_sales,
    total_transactions: params.total_transactions,
    cash_sales: params.cash_sales,
    debit_card_sales: params.debit_card_sales,
    credit_card_sales: params.credit_card_sales,
    installments_sales: params.installments_sales,
    other_payment_sales: params.other_payment_sales,
    expected_cash: params.expected_cash,
    actual_cash: params.actual_cash,
    cash_difference: params.cash_difference,
    card_machine_debit_total: params.card_machine_debit_total,
    card_machine_credit_total: params.card_machine_credit_total,
    card_machine_difference: params.card_machine_difference,
    total_subtotal: params.total_subtotal,
    total_tax: params.total_tax,
    total_discounts: params.total_discounts,
    closing_cash_amount: params.closing_cash_amount,
    notes: params.notes,
    discrepancies: params.discrepancies,
    status: params.status ?? "closed",
    opened_at: params.opened_at,
    updated_at: new Date().toISOString(),
  };
}

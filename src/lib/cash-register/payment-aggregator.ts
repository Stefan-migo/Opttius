/**
 * Pure payment aggregation function extracted from close/route.ts.
 *
 * 3-tier fallback:
 *   1. sessionPayments → aggregate by payment_method
 *   2. orderPayments   → aggregate by payment_method
 *   3. orders          → aggregate by mp_payment_method
 *
 * No side effects, no DB calls, no supabase imports.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type AggregationSource =
  | "session_payments"
  | "order_payments"
  | "order_mp_method"
  | "no_payments";

export interface PaymentSummary {
  cash_sales: number;
  debit_card_sales: number;
  credit_card_sales: number;
  transfer_sales: number;
  installments_sales: number;
  other_payment_sales: number;
  source: AggregationSource;
}

export interface OrderPaymentRow {
  amount: number | null;
  payment_method: string;
  order_id?: string;
  pos_session_id?: string;
}

export interface CreditNoteMovementRow {
  amount: number;
  refund_method: string;
}

export interface PaymentAggregatorInput {
  sessionPayments: (
    | OrderPaymentRow
    | { amount: number; payment_method: string }
  )[];
  orders: {
    id: string;
    total_amount: number;
    mp_payment_method?: string;
    status?: string;
  }[];
  orderPayments?: OrderPaymentRow[];
  initialSummary?: Partial<PaymentSummary>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function coerceAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  if (!isFinite(num)) return 0;
  return num;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

/** Tier 1 & 2: aggregate from order_payment rows (normalized payment_method). */
function aggregateFromPaymentRows(
  summary: PaymentSummary,
  items: Array<{ amount: number | null; payment_method: string }>,
): void {
  for (const item of items) {
    const amount = coerceAmount(item.amount);
    switch (item.payment_method) {
      case "cash":
        summary.cash_sales += amount;
        break;
      case "debit":
        summary.debit_card_sales += amount;
        break;
      case "credit":
        summary.credit_card_sales += amount;
        break;
      case "transfer":
        summary.transfer_sales += amount;
        break;
      case "installments":
        summary.installments_sales += amount;
        break;
      default:
        summary.other_payment_sales += amount;
        break;
    }
  }
}

/** Tier 3: aggregate from order rows using mp_payment_method (may include aliases). */
function aggregateFromOrdersByMpMethod(
  summary: PaymentSummary,
  orders: PaymentAggregatorInput["orders"],
): void {
  for (const order of orders) {
    // ponytail: matches current GET/POST behavior — cancelled orders are NOT
    // filtered here (they have no mp_payment_method and would default to "cash").
    // If sessionPayments/orderPayments exist they are preferred, so this only
    // runs as final fallback.
    const amount = coerceAmount(order.total_amount);
    const method = order.mp_payment_method || "cash";
    switch (method) {
      case "cash":
        summary.cash_sales += amount;
        break;
      case "debit":
      case "debit_card":
        summary.debit_card_sales += amount;
        break;
      case "credit":
      case "credit_card":
        summary.credit_card_sales += amount;
        break;
      case "transfer":
        summary.transfer_sales += amount;
        break;
      case "installments":
        summary.installments_sales += amount;
        break;
      default:
        summary.other_payment_sales += amount;
        break;
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function aggregatePayments(
  input: PaymentAggregatorInput,
): PaymentSummary {
  const summary: PaymentSummary = {
    cash_sales: input.initialSummary?.cash_sales ?? 0,
    debit_card_sales: input.initialSummary?.debit_card_sales ?? 0,
    credit_card_sales: input.initialSummary?.credit_card_sales ?? 0,
    transfer_sales: input.initialSummary?.transfer_sales ?? 0,
    installments_sales: input.initialSummary?.installments_sales ?? 0,
    other_payment_sales: input.initialSummary?.other_payment_sales ?? 0,
    source: "no_payments",
  };

  if (input.sessionPayments.length > 0) {
    summary.source = "session_payments";
    aggregateFromPaymentRows(summary, input.sessionPayments);
  } else if (input.orderPayments && input.orderPayments.length > 0) {
    summary.source = "order_payments";
    aggregateFromPaymentRows(summary, input.orderPayments);
  } else if (input.orders.length > 0) {
    summary.source = "order_mp_method";
    aggregateFromOrdersByMpMethod(summary, input.orders);
  }

  return summary;
}

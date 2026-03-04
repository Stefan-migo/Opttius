/**
 * Payment constants for POS and order_payments.
 *
 * @module lib/payments/constants
 */

/** Map from process-sale/UI payment method types to order_payments DB values */
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: "cash",
  card: "debit", // order_payments only allows cash, debit, credit, transfer, check
  debit_card: "debit",
  credit_card: "credit",
  transfer: "transfer",
  deposit: "transfer",
};

/** Valid payment methods for order_payments table */
export const PAYMENT_METHODS_ORDER_PAYMENTS = [
  "cash",
  "debit",
  "credit",
  "transfer",
  "check",
] as const;

export type OrderPaymentMethod =
  (typeof PAYMENT_METHODS_ORDER_PAYMENTS)[number];

/**
 * Process Payment Utils — pure functions for payment amount computation,
 * method resolution, work order payment status, and stock reduction.
 *
 * Extracted from process-sale/route.ts T-122. All functions are pure
 * (no side effects, no DB calls).
 */

import { PAYMENT_METHOD_MAP } from "@/lib/payments/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentEntry {
  amount: number;
  method: string;
  [key: string]: unknown;
}

export interface PaymentAmountParams {
  agreementId: string | null;
  copagoAmount: number | null;
  paymentsArray: PaymentEntry[];
  depositAmount: number | null;
  cashReceived: number | null;
  totalAmount: number;
}

export interface DbPaymentMethodParams {
  agreementId: string | null;
  copagoAmount: number | null;
  paymentMethodType: string;
  paymentsArray: PaymentEntry[];
}

export interface WorkOrderStatusResult {
  status: string;
  paymentStatus: string;
}

export interface OrderPaymentsPayloadParams {
  agreementId: string | null;
  copagoAmount: number | null;
  dbPaymentMethod: string;
  paymentsArray: PaymentEntry[];
  paymentMethodType: string;
  fiscalReference: string | null;
  siiInvoiceNumber: string | null;
}

export interface StockReductionItem {
  product_id: string;
  branch_id: string | null;
  quantity: number;
}

export interface ProductInfo {
  id: string;
  name?: string;
  product_type?: string;
  [key: string]: unknown;
}

// ─── Payment Amount ──────────────────────────────────────────────────────────

export function computePaymentAmount(params: PaymentAmountParams): number {
  const {
    agreementId,
    copagoAmount,
    paymentsArray,
    depositAmount,
    cashReceived,
    totalAmount,
  } = params;

  if (agreementId && copagoAmount != null) {
    return copagoAmount;
  }
  if (paymentsArray.length > 0) {
    return paymentsArray.reduce((s, p) => s + p.amount, 0);
  }
  return depositAmount || cashReceived || totalAmount;
}

// ─── DB Payment Method ───────────────────────────────────────────────────────

export function computeDbPaymentMethod(params: DbPaymentMethodParams): string {
  const { agreementId, copagoAmount, paymentMethodType, paymentsArray } =
    params;

  if (agreementId && copagoAmount != null) {
    return PAYMENT_METHOD_MAP[paymentMethodType] || paymentMethodType;
  }
  if (paymentsArray.length > 0) {
    return (
      PAYMENT_METHOD_MAP[paymentsArray[0].method] ||
      paymentsArray[0].method ||
      "cash"
    );
  }
  return PAYMENT_METHOD_MAP[paymentMethodType] || paymentMethodType;
}

// ─── Work Order Payment Status (Cash-First Logic) ────────────────────────────

export function computeWorkOrderStatus(
  paymentAmount: number,
  minDeposit: number,
  totalAmount: number,
  balance: number,
): WorkOrderStatusResult {
  if (paymentAmount < minDeposit) {
    return { status: "on_hold_payment", paymentStatus: "pending" };
  }
  if (balance === 0) {
    return { status: "ordered", paymentStatus: "paid" };
  }
  return { status: "ordered", paymentStatus: "partial" };
}

// ─── Lens Cost ───────────────────────────────────────────────────────────────

export function computeLensCost(
  presbyopiaSolution: string | null | undefined,
  farLensCost: number | null | undefined,
  nearLensCost: number | null | undefined,
  contactLensCost: number | null | undefined,
  lensCost: number,
): number {
  if (presbyopiaSolution === "two_separate") {
    return (farLensCost || 0) + (nearLensCost || 0);
  }
  return contactLensCost || lensCost || 0;
}

// ─── Cash Amount ─────────────────────────────────────────────────────────────

export function computeCashAmount(
  paymentsArray: PaymentEntry[],
  paymentMethodType: string,
  cashReceived: number | null | undefined,
  totalAmount: number,
): number {
  if (paymentsArray.length > 0) {
    return paymentsArray
      .filter((p) => p.method === "cash")
      .reduce((s, p) => s + p.amount, 0);
  }
  if (paymentMethodType === "cash") {
    return cashReceived || totalAmount;
  }
  return 0;
}

// ─── Order Payments Payload ──────────────────────────────────────────────────

export function buildOrderPaymentsPayload(
  params: OrderPaymentsPayloadParams,
): Array<{
  amount: number;
  payment_method: string;
  payment_reference: string | null;
  notes: string;
}> {
  const {
    agreementId,
    copagoAmount,
    dbPaymentMethod,
    paymentsArray,
    paymentMethodType,
    fiscalReference,
    siiInvoiceNumber,
  } = params;

  if (agreementId && copagoAmount != null) {
    return [
      {
        amount: copagoAmount,
        payment_method: dbPaymentMethod,
        payment_reference: fiscalReference?.trim() || siiInvoiceNumber || null,
        notes: `Copago convenio - ${paymentMethodType}`,
      },
    ];
  }

  if (paymentsArray.length > 0) {
    return paymentsArray.map((p, i) => ({
      amount: p.amount,
      payment_method: PAYMENT_METHOD_MAP[p.method] || p.method,
      payment_reference:
        i === 0 ? fiscalReference?.trim() || siiInvoiceNumber || null : null,
      notes:
        paymentsArray.length > 1
          ? `Pago ${i + 1}/${paymentsArray.length} - ${PAYMENT_METHOD_MAP[p.method] || p.method}`
          : `Pago - ${PAYMENT_METHOD_MAP[p.method] || p.method}`,
    }));
  }

  return [
    {
      amount: computePaymentAmount({
        agreementId,
        copagoAmount,
        paymentsArray,
        depositAmount: null,
        cashReceived: null,
        totalAmount: paymentsArray.reduce((s, p) => s + p.amount, 0) || 0,
      }),
      payment_method: dbPaymentMethod,
      payment_reference: fiscalReference?.trim() || siiInvoiceNumber || null,
      notes: `Pago inicial - Método: ${paymentMethodType}`,
    },
  ];
}

// ─── Stock Reduction Items ───────────────────────────────────────────────────

export function buildStockReductionItems(
  items: Array<{ product_id?: string; quantity: number }>,
  productsForStockCheck: ProductInfo[],
  effectiveBranchId: string | null,
): StockReductionItem[] {
  return items
    .filter(
      (item) =>
        item.product_id &&
        !item.product_id.includes("frame-manual") &&
        !item.product_id.includes("lens-") &&
        !item.product_id.includes("treatments-") &&
        !item.product_id.includes("labor-") &&
        !item.product_id.includes("discount-"),
    )
    .filter((item) => {
      const product = productsForStockCheck.find(
        (p) => p.id === item.product_id,
      );
      return product?.product_type === "frame" ||
        product?.product_type === "accessory"
        ? true
        : false;
    })
    .map((item) => ({
      product_id: item.product_id!,
      branch_id: effectiveBranchId,
      quantity: item.quantity,
    }));
}

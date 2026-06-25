/**
 * Process Response Builder — pure functions for API response formatting.
 *
 * Extracted from process-sale/route.ts T-123. All functions are pure
 * (no side effects, no DB calls).
 */

import type { Order as BillingOrder } from "@/lib/billing/adapters/BillingAdapter";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku: string | null;
}

export interface CustomerNameResult {
  customerName: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
}

export interface BuildCustomerNameParams {
  customer: {
    id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  customerName: string | null;
  siiBusinessName: string | null;
  customerId: string | null;
}

export interface BuildFullOrderResponseParams {
  id: string;
  order_number: string;
  [key: string]: unknown;
}

export interface BuildBillingOrderParams {
  orderId: string;
  orderNumber: string;
  customerId: string | null | undefined;
  branchId: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  items: OrderItem[];
  customer: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    rut?: string;
  } | null;
  createdAt: string | undefined;
  ocNumber: string | null;
  purchaseOrderId: string | null | undefined;
  agreementId: string | null | undefined;
  customerName: string | null;
  email: string | null;
  customerRut: string | null;
  siiBusinessName: string | null;
}

export interface BillingResult {
  folio?: string;
  pdfUrl?: string;
  type?: string;
}

// ─── Build Order Items ───────────────────────────────────────────────────────

export function buildOrderItems(
  items: Array<{
    product_id?: string | null;
    product_name?: string;
    quantity: number;
    unit_price: number;
    sku?: string | null;
  }>,
): OrderItem[] {
  return items.map((item, idx) => ({
    id: `item-${idx}`,
    product_id: item.product_id || null,
    product_name: item.product_name || "Producto",
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    sku: item.sku || null,
  }));
}

// ─── Build Customer Name ─────────────────────────────────────────────────────

export function buildCustomerName(
  params: BuildCustomerNameParams,
): CustomerNameResult {
  const { customer, customerName, siiBusinessName, customerId } = params;

  if (customerId && customer) {
    // Registered customer
    const name =
      customer.first_name && customer.last_name
        ? `${customer.first_name} ${customer.last_name}`.trim()
        : customer.email || null;
    return {
      customerName: name,
      billingFirstName: customer.first_name || null,
      billingLastName: customer.last_name || null,
    };
  }

  if (customerName) {
    // Unregistered customer with name
    const nameParts = customerName.split(" ");
    return {
      customerName,
      billingFirstName: nameParts[0] || null,
      billingLastName: nameParts.slice(1).join(" ") || null,
    };
  }

  if (siiBusinessName) {
    // Company (SII)
    return {
      customerName: siiBusinessName,
      billingFirstName: null,
      billingLastName: null,
    };
  }

  return {
    customerName: null,
    billingFirstName: null,
    billingLastName: null,
  };
}

// ─── Build Full Order Response ───────────────────────────────────────────────

export function buildFullOrderResponse(
  order: BuildFullOrderResponseParams,
  orderItems: OrderItem[],
  paymentAmount: number,
  dbPaymentMethod: string,
  siiInvoiceNumber: string | null,
  customerName: string | null,
  billingFirstName: string | null,
  billingLastName: string | null,
): Record<string, unknown> {
  return {
    ...order,
    order_items: orderItems,
    order_payments: [
      { amount: paymentAmount, payment_method: dbPaymentMethod },
    ],
    sii_invoice_number: siiInvoiceNumber,
    customer_name: customerName,
    billing_first_name: billingFirstName,
    billing_last_name: billingLastName,
  };
}

// ─── Build Work Order Response ───────────────────────────────────────────────

export function buildWorkOrderResponse(
  workOrderId: string | null,
  workOrderNumber: string | null | undefined,
  siiInvoiceNumber: string | null,
): Record<string, unknown> | null {
  if (!workOrderId) return null;
  return {
    id: workOrderId,
    work_order_number: workOrderNumber,
    sii_invoice_number: siiInvoiceNumber,
  };
}

// ─── Build Billing Response ──────────────────────────────────────────────────

export function buildBillingResponse(
  billingResult: BillingResult | null,
): Record<string, unknown> | null {
  if (!billingResult) return null;
  return {
    folio: billingResult.folio,
    pdfUrl: billingResult.pdfUrl,
    type: billingResult.type,
  };
}

// ─── Build Billing Order ─────────────────────────────────────────────────────

export function buildBillingOrder(
  params: BuildBillingOrderParams,
): BillingOrder {
  const {
    orderId,
    orderNumber,
    customerId,
    branchId,
    totalAmount,
    subtotal,
    taxAmount,
    items,
    customer,
    createdAt,
    ocNumber,
    purchaseOrderId,
    agreementId,
    customerName,
    email,
    customerRut,
    siiBusinessName,
  } = params;

  return {
    id: orderId,
    order_number: orderNumber,
    customer_id: customerId ?? undefined,
    branch_id: branchId,
    total_amount: totalAmount,
    subtotal: subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    items: items.map((i) => ({
      id: i.id,
      product_id: i.product_id || undefined,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
      sku: i.sku || undefined,
    })),
    customer: customer
      ? {
          id: customer.id ?? "",
          first_name: customer.first_name ?? undefined,
          last_name: customer.last_name ?? undefined,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          rut: customer.rut ?? undefined,
          business_name: undefined,
        }
      : {
          id: "",
          first_name: customerName?.split(" ")[0] ?? undefined,
          last_name: customerName?.split(" ").slice(1).join(" ") ?? undefined,
          email: email ?? undefined,
          phone: undefined,
          rut: customerRut ?? undefined,
          business_name: siiBusinessName ?? undefined,
        },
    created_at: createdAt ?? new Date().toISOString(),
    oc_number: ocNumber ?? undefined,
    purchase_order_id: purchaseOrderId ?? undefined,
    agreement_id: agreementId ?? undefined,
  };
}

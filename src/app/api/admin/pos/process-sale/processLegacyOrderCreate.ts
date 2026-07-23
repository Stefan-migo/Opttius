/**
 * processLegacyOrderCreate — creates order, order_items, payments, and POS transaction.
 *
 * Extracted from processLegacyHandler.ts to reduce file size.
 */

import { appLogger as logger } from "@/lib/logger";
import { PAYMENT_METHOD_MAP } from "@/lib/payments/constants";

import type { ProcessSaleContext } from "./processSaleTypes";

export interface LegacyOrderResult {
  order: Record<string, unknown>;
  orderError: boolean;
}

export async function createLegacyOrder(
  ctx: ProcessSaleContext,
): Promise<Record<string, unknown> | null> {
  const { data: newOrderData, error: orderError } = await ctx.supabase
    .from("orders")
    .insert({
      order_number: ctx.orderNumber,
      email: ctx.email || (ctx.customer?.email as string) || "venta@pos.local",
      status: "processing",
      payment_status: ctx.payment_status || "paid",
      subtotal: ctx.subtotal,
      tax_amount: ctx.tax_amount || 0,
      discount_amount: 0,
      total_amount: ctx.total_amount,
      currency: ctx.currency || "CLP",
      mp_payment_method: ctx.payment_method_type,
      branch_id: ctx.effectiveBranchId,
      organization_id: ctx.orderOrganizationId,
      field_operation_id: ctx.fieldOperationId,
      customer_notes: null,
      is_pos_sale: true,
      pos_session_id: ctx.posSessionId || null,
      customer_name: ctx.customerName,
      billing_first_name: ctx.billingFirstName,
      billing_last_name: ctx.billingLastName,
      sii_rut:
        ctx.customer_rut ||
        ctx.sii_rut ||
        (ctx.customer?.rut as string) ||
        null,
      sii_business_name: ctx.sii_business_name || null,
      customer_id: ctx.customer_id || null,
      agreement_id: ctx.agreement_id || null,
      purchase_order_id: ctx.purchase_order_id || null,
      copago_amount: ctx.copagoAmount ?? null,
      institutional_amount: ctx.institutionalAmount ?? null,
    })
    .select()
    .single();

  if (orderError) {
    logger.error("Error creating order", orderError);
    return null;
  }

  const newOrder = newOrderData as Record<string, unknown>;

  // Insert order_items
  if (ctx.orderItems.length > 0) {
    const { error: itemsError } = await ctx.supabase.from("order_items").insert(
      ctx.orderItems.map((item: Record<string, unknown>) => ({
        order_id: newOrder.id,
        product_id: (item.product_id as string) || null,
        product_name: (item.product_name as string) || "Producto",
        quantity: item.quantity as number,
        unit_price: item.unit_price as number,
        total_price: (item.unit_price as number) * (item.quantity as number),
        sku: (item as Record<string, unknown>).sku as string | null,
      })),
    );

    if (itemsError) {
      logger.error("Error creating order items", itemsError);
    }
  }

  // Register payment(s)
  if (ctx.agreement_id && ctx.copagoAmount != null) {
    await registerAgreementPayment(ctx, newOrder);
  } else if (ctx.paymentsArray && ctx.paymentsArray.length > 0) {
    await registerSplitPayments(ctx, newOrder);
  } else {
    await registerSinglePayment(ctx, newOrder);
  }

  // Create POS transaction
  if (ctx.posSessionId) {
    const { error: txError } = await ctx.supabase
      .from("pos_transactions")
      .insert({
        order_id: newOrder.id,
        pos_session_id: ctx.posSessionId,
        transaction_type: "sale",
        payment_method: ctx.dbPaymentMethod,
        amount: ctx.total_amount,
        change_amount: ctx.change_amount ?? null,
        notes: `Venta POS - ${newOrder.order_number as string}`,
      });

    if (txError) {
      logger.warn("Could not create pos_transaction for sale", {
        txError,
        order_id: newOrder.id,
      });
    }
  }

  // Update order's mp_payment_method
  const { error: updatePaymentMethodError } = await ctx.supabase
    .from("orders")
    .update({ mp_payment_method: ctx.dbPaymentMethod })
    .eq("id", newOrder.id);

  if (updatePaymentMethodError) {
    logger.error("Error updating payment method", updatePaymentMethodError);
  }

  return newOrder;
}

async function registerAgreementPayment(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
): Promise<void> {
  const { error: paymentError } = await ctx.supabase
    .from("order_payments")
    .insert({
      order_id: newOrder.id,
      amount: ctx.copagoAmount,
      payment_method: ctx.dbPaymentMethod,
      pos_session_id: ctx.posSessionId || null,
      payment_reference:
        ctx.fiscal_reference?.trim() || ctx.siiInvoiceNumber || null,
      created_by: ctx.user.id,
      notes: `Copago convenio - ${ctx.payment_method_type}`,
    });

  if (paymentError) {
    logger.error("Error creating payment record", paymentError);
  }

  if (ctx.institutionalAmount != null && ctx.institutionalAmount > 0) {
    const { error: balanceErr } = await ctx.supabase
      .from("agreement_institutional_balances")
      .insert({
        agreement_id: ctx.agreement_id,
        order_id: newOrder.id,
        purchase_order_id: ctx.purchase_order_id || null,
        amount: ctx.institutionalAmount,
        status: "pending",
      });

    if (balanceErr) {
      logger.error("Error creating institutional balance", balanceErr);
    }

    if (ctx.purchase_order_id) {
      await ctx.supabase
        .from("agreement_purchase_orders")
        .update({
          used_amount:
            ((ctx.purchaseOrder?.used_amount as number) || 0) +
            ctx.institutionalAmount,
        })
        .eq("id", ctx.purchase_order_id);
    }
  }
}

async function registerSplitPayments(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
): Promise<void> {
  for (let i = 0; i < ctx.paymentsArray.length; i++) {
    const p = ctx.paymentsArray[i] as Record<string, unknown>;
    const dbMethod =
      PAYMENT_METHOD_MAP[p.method as keyof typeof PAYMENT_METHOD_MAP] ||
      p.method;
    const { error: payErr } = await ctx.supabase.from("order_payments").insert({
      order_id: newOrder.id,
      amount: p.amount as number,
      payment_method: dbMethod,
      pos_session_id: ctx.posSessionId || null,
      payment_reference:
        i === 0
          ? ctx.fiscal_reference?.trim() || ctx.siiInvoiceNumber || null
          : null,
      created_by: ctx.user.id,
      notes:
        ctx.paymentsArray.length > 1
          ? `Pago ${i + 1}/${ctx.paymentsArray.length} - ${dbMethod}`
          : `Pago - ${dbMethod}`,
    });
    if (payErr) {
      logger.error("Error creating payment record", payErr);
    }
  }
}

async function registerSinglePayment(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
): Promise<void> {
  const { error: paymentError } = await ctx.supabase
    .from("order_payments")
    .insert({
      order_id: newOrder.id,
      amount: ctx.paymentAmount,
      payment_method: ctx.dbPaymentMethod,
      pos_session_id: ctx.posSessionId || null,
      payment_reference:
        ctx.fiscal_reference?.trim() || ctx.siiInvoiceNumber || null,
      created_by: ctx.user.id,
      notes: `Pago inicial - Método: ${ctx.payment_method_type}`,
    });

  if (paymentError) {
    logger.error("Error creating payment record", paymentError);
  }
}

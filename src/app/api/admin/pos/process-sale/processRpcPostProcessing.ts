/**
 * Post-RPC processing for the process-sale RPC handler.
 *
 * Extracted from processRpcHandler.ts to reduce module size.
 * Handles agreement balances, billing, cash updates, notifications, and quote status.
 */
import { BillingFactory } from "@/lib/billing/BillingFactory";
import { appLogger as logger } from "@/lib/logger";

import {
  buildBillingOrder,
  buildBillingResponse,
  buildFullOrderResponse,
  buildWorkOrderResponse,
} from "./processResponseBuilder";
import type { ProcessSaleContext } from "./processSaleTypes";

export async function handlePostRpcProcessing(
  ctx: ProcessSaleContext,
  orderId: string,
  rpcResult: Record<string, unknown> | null,
  fetchedOrder: Record<string, unknown> | null,
  workOrderId: string | undefined,
): Promise<Record<string, unknown> | null> {
  // Agreement post-processing
  if (
    ctx.agreement_id &&
    ctx.institutionalAmount != null &&
    ctx.institutionalAmount > 0
  ) {
    await ctx.supabase.from("agreement_institutional_balances").insert({
      agreement_id: ctx.agreement_id,
      order_id: orderId,
      purchase_order_id: ctx.purchase_order_id || null,
      amount: ctx.institutionalAmount,
      status: "pending",
    });
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

  // Billing
  let billingResult: Record<string, unknown> | null = null;
  try {
    const billingConfig = await BillingFactory.getBillingConfig(
      ctx.effectiveBranchId || "",
    );
    const billingAdapter = BillingFactory.createAdapter(billingConfig);
    let ocNumber: string | null = null;
    if (ctx.purchase_order_id && ctx.purchaseOrder) {
      const { data: po } = await ctx.supabase
        .from("agreement_purchase_orders")
        .select("oc_number")
        .eq("id", ctx.purchase_order_id)
        .single();
      ocNumber = (po as Record<string, unknown> | null)?.oc_number as
        | string
        | null;
    }
    const billingOrder = buildBillingOrder({
      orderId,
      orderNumber:
        ((rpcResult as Record<string, unknown>)?.order_number as string) || "",
      customerId: ctx.customer_id,
      branchId: ctx.effectiveBranchId ?? "",
      totalAmount: ctx.total_amount,
      subtotal: ctx.subtotal,
      taxAmount: ctx.tax_amount || 0,
      items: ctx.orderItems,
      customer: ctx.customer as Record<string, unknown> | null,
      createdAt: (fetchedOrder as Record<string, unknown> | null)
        ?.created_at as string,
      ocNumber,
      purchaseOrderId: ctx.purchase_order_id,
      agreementId: ctx.agreement_id,
      customerName: ctx.customer_name,
      email: ctx.email,
      customerRut: ctx.customer_rut,
      siiBusinessName: ctx.sii_business_name,
    });
    billingResult = (await billingAdapter.emitDocument(billingOrder)) as Record<
      string,
      unknown
    >;
  } catch (billingError) {
    logger.error("Error emitting billing document (RPC path)", billingError);
  }

  // Cash update
  const { computeCashAmount } = await import("./processPaymentUtils");
  const cashAmount = computeCashAmount(
    ctx.paymentsArray || [],
    ctx.payment_method_type,
    ctx.cash_received,
    ctx.total_amount,
  );
  if (cashAmount > 0 && ctx.posSessionId) {
    await ctx.supabase.rpc("update_pos_session_cash", {
      session_id: ctx.posSessionId,
      cash_amount: cashAmount,
    });
  }

  // Notifications
  const { NotificationService } = await import(
    "@/lib/notifications/notification-service"
  );
  NotificationService.notifyNewSale(
    orderId,
    ((rpcResult as Record<string, unknown>)?.order_number as string) || "",
    ctx.email || "venta@pos.local",
    ctx.total_amount,
    ctx.effectiveBranchId ?? undefined,
  ).catch((err: unknown) =>
    logger.error("Error creating sale notification", err),
  );

  if (workOrderId) {
    const customerNameForNotif = ctx.customer
      ? `${(ctx.customer.first_name as string) || ""} ${(ctx.customer.last_name as string) || ""}`.trim() ||
        (ctx.customer.email as string) ||
        "Cliente"
      : "Cliente";
    NotificationService.notifyNewWorkOrder(
      workOrderId,
      ((rpcResult as Record<string, unknown>)?.work_order_number as string) ||
        "",
      customerNameForNotif,
      ctx.total_amount,
      ctx.effectiveBranchId ?? undefined,
    ).catch((err: unknown) =>
      logger.error("Error creating work order notification", err),
    );
  }

  // Quote status update
  if (ctx.quote_id && ctx.quote) {
    await ctx.supabase
      .from("quotes")
      .update({
        status: "accepted",
        converted_to_work_order_id: workOrderId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.quote_id);
  }

  return billingResult;
}

export function buildRpcSuccessResponse(
  ctx: ProcessSaleContext,
  orderId: string,
  rpcResult: Record<string, unknown> | null,
  fetchedOrder: Record<string, unknown> | null,
  workOrderId: string | undefined,
  billingResult: Record<string, unknown> | null,
): Record<string, unknown> {
  const newOrder = {
    ...(fetchedOrder as Record<string, unknown>),
    id: orderId,
    order_number:
      ((rpcResult as Record<string, unknown>)?.order_number as string) ||
      ((fetchedOrder as Record<string, unknown> | null)
        ?.order_number as string),
  };
  const fullOrder = buildFullOrderResponse(
    newOrder,
    ctx.orderItems,
    ctx.paymentAmount,
    ctx.dbPaymentMethod,
    ctx.siiInvoiceNumber,
    ctx.customerName,
    ctx.billingFirstName,
    ctx.billingLastName,
  );
  return {
    order: fullOrder,
    work_order: buildWorkOrderResponse(
      workOrderId || null,
      (rpcResult as Record<string, unknown>)?.work_order_number as
        | string
        | null,
      ctx.siiInvoiceNumber,
    ),
    billing: buildBillingResponse(billingResult),
  };
}

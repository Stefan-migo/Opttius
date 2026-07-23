/**
 * Legacy path handler for process-sale.
 *
 * Extracted from route.ts `else` branch. Uses sequential inserts for
 * operativo/mobile-stock sales. Now delegates to focused sub-modules:
 * - processLegacyOrderCreate.ts  → order, items, payments, POS transaction
 * - processLegacyWorkOrder.ts    → work order creation, billing, notifications
 * - processResponseBuilder.ts    → response construction
 * - processPaymentUtils.ts       → amount/status computation
 */
import { NextResponse } from "next/server";

import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { BillingFactory } from "@/lib/billing/BillingFactory";
import { appLogger as logger } from "@/lib/logger";

import { createLegacyOrder } from "./processLegacyOrderCreate";
import {
  createLegacyWorkOrder,
  handleNonWorkOrderPath,
  sendWorkOrderNotifications,
  updateQuoteStatus,
} from "./processLegacyWorkOrder";
import type { OrderItem } from "./processResponseBuilder";
import { buildBillingOrder, buildBillingResponse, buildFullOrderResponse } from "./processResponseBuilder";
import type { ProcessSaleContext } from "./processSaleTypes";
import { reduceContactLensStock,reduceStock } from "./processStockReduction";

export async function handleLegacyPath(
  ctx: ProcessSaleContext,
): Promise<NextResponse> {
  // 1. Create order + items + payments + POS transaction
  const newOrder = await createLegacyOrder(ctx);
  if (!newOrder) {
    return NextResponse.json(
      { error: "Failed to create order", details: "Order creation returned null" },
      { status: 500 },
    );
  }

  // 2. Emit billing document
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
      ocNumber = (po as Record<string, unknown> | null)?.oc_number as string | null;
    }

    const billingOrder = buildBillingOrder({
      orderId: newOrder.id as string,
      orderNumber: newOrder.order_number as string,
      customerId: ctx.customer_id,
      branchId: ctx.effectiveBranchId ?? "",
      totalAmount: ctx.total_amount,
      subtotal: ctx.subtotal,
      taxAmount: ctx.tax_amount || 0,
      items: ctx.orderItems as unknown as OrderItem[],
      customer: ctx.customer as Record<string, unknown> | null,
      createdAt: newOrder.created_at as string,
      ocNumber,
      purchaseOrderId: ctx.purchase_order_id,
      agreementId: ctx.agreement_id,
      customerName: ctx.customer_name,
      email: ctx.email,
      customerRut: ctx.customer_rut,
      siiBusinessName: ctx.sii_business_name,
    });

    billingResult = (await billingAdapter.emitDocument(billingOrder)) as unknown as Record<string, unknown>;
    logger.info("Billing document emitted", {
      folio: billingResult?.folio,
      type: billingResult?.type,
    });
  } catch (billingError) {
    logger.error("Error emitting billing document", billingError);
  }

  // 3. Stock reduction
  const stockOk = await reduceStock(ctx, newOrder.id as string);
  if (!stockOk) {
    return createApiErrorResponse(
      new (await import("@/lib/api/errors")).APIError(
        "Error al actualizar stock",
        400,
        "INSUFFICIENT_STOCK",
      ),
    );
  }
  await reduceContactLensStock(ctx);

  // 4. Non-work-order path (no lab work needed)
  if (!ctx.actuallyRequiresWorkOrder) {
    await handleNonWorkOrderPath(ctx, newOrder, billingResult, {});

    const successResponse = {
      order: { ...newOrder, order_items: ctx.orderItems },
      work_order: null,
      billing: billingResult
        ? { folio: billingResult.folio, pdfUrl: billingResult.pdfUrl, type: billingResult.type }
        : null,
    };

    await saveIdempotency(ctx, newOrder.id as string, null, successResponse);
    return createApiSuccessResponse(successResponse);
  }

  // 5. Work order path (Cash-First)
  const woResult = await createLegacyWorkOrder(ctx, newOrder);

  if ("error" in woResult) {
    return NextResponse.json(
      { error: woResult.error },
      { status: woResult.status },
    );
  }

  const { workOrder, balance } = woResult;
  billingResult = woResult.billingResult || billingResult;

  // 6. Notifications
  await sendWorkOrderNotifications(ctx, newOrder, workOrder!);

  // 7. Update quote status
  await updateQuoteStatus(ctx, newOrder, workOrder?.id as string | null);

  // 8. Build response
  const fullOrder = buildFullOrderResponse(
    newOrder as Parameters<typeof buildFullOrderResponse>[0],
    ctx.orderItems as unknown as OrderItem[],
    ctx.paymentAmount,
    ctx.dbPaymentMethod,
    ctx.siiInvoiceNumber,
    ctx.customerName,
    ctx.billingFirstName,
    ctx.billingLastName,
  );

  const successResponse = {
    order: fullOrder,
    work_order: {
      ...workOrder,
      sii_invoice_number: ctx.siiInvoiceNumber,
    },
    billing: buildBillingResponse(billingResult),
  };

  await saveIdempotency(ctx, newOrder.id as string, workOrder?.id as string | null, successResponse);
  return createApiSuccessResponse(successResponse);
}

async function saveIdempotency(
  ctx: ProcessSaleContext,
  orderId: string,
  workOrderId: string | null,
  response: Record<string, unknown>,
): Promise<void> {
  if (!ctx.idempotency_key) return;

  await ctx.supabase.from("pos_sale_idempotency").upsert(
    {
      idempotency_key: ctx.idempotency_key,
      order_id: orderId,
      work_order_id: workOrderId,
      response_snapshot: response,
    },
    { onConflict: "idempotency_key" },
  );
}

/**
 * RPC path handler for process-sale.
 *
 * Extracted from route.ts `if (useRpc)` branch (lines 919-1324).
 * Uses the transactional process_pos_sale RPC for branch-mode sales.
 */
import { NextResponse } from "next/server";
import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { BillingFactory } from "@/lib/billing/BillingFactory";
import { appLogger as logger } from "@/lib/logger";
import { computeMinDepositFallback } from "./processSaleValidation";
import {
  computeWorkOrderStatus,
  computeLensCost,
  computeCashAmount,
  buildOrderPaymentsPayload,
  buildStockReductionItems,
} from "./processPaymentUtils";
import {
  buildFullOrderResponse,
  buildWorkOrderResponse,
  buildBillingResponse,
  buildBillingOrder,
} from "./processResponseBuilder";
import type { ProcessSaleContext } from "./processSaleTypes";

export async function handleRpcPath(
  ctx: ProcessSaleContext,
): Promise<NextResponse> {
  const { data: minDepositData } = await ctx.supabaseServiceRole.rpc(
    "get_min_deposit",
    {
      p_order_total: ctx.total_amount,
      p_branch_id: ctx.effectiveBranchId,
    },
  );
  const minDeposit =
    minDepositData ?? computeMinDepositFallback(ctx.total_amount);
  const { status: workOrderStatus, paymentStatus: workOrderPaymentStatus } =
    computeWorkOrderStatus(
      ctx.paymentAmount,
      minDeposit,
      ctx.total_amount,
      ctx.balance,
    );

  const orderPayload: Record<string, unknown> = {
    order_number: ctx.orderNumber,
    email: ctx.email || (ctx.customer?.email as string) || "venta@pos.local",
    status: "processing",
    payment_status: ctx.payment_status || "paid",
    subtotal: ctx.subtotal,
    tax_amount: ctx.tax_amount || 0,
    discount_amount: 0,
    total_amount: ctx.total_amount,
    currency: ctx.currency || "CLP",
    mp_payment_method: ctx.dbPaymentMethod,
    branch_id: ctx.effectiveBranchId,
    organization_id: ctx.orderOrganizationId,
    field_operation_id: ctx.fieldOperationId,
    pos_session_id: ctx.posSessionId,
    customer_name: ctx.customerName,
    billing_first_name: ctx.billingFirstName,
    billing_last_name: ctx.billingLastName,
    sii_rut:
      ctx.customer_rut || ctx.sii_rut || (ctx.customer?.rut as string) || null,
    sii_business_name: ctx.sii_business_name || null,
    customer_id: ctx.customer_id || null,
    agreement_id: ctx.agreement_id || null,
    purchase_order_id: ctx.purchase_order_id || null,
    copago_amount: ctx.copagoAmount ?? null,
    institutional_amount: ctx.institutionalAmount ?? null,
  };

  const orderItemsPayload = ctx.items.map((item: Record<string, unknown>) => ({
    product_id: (item.product_id as string) || null,
    product_name: (item.product_name as string) || "Producto",
    quantity: item.quantity as number,
    unit_price: item.unit_price as number,
    total_price: (item.unit_price as number) * (item.quantity as number),
    sku: (item as Record<string, unknown>).sku as string | null,
  }));

  const orderPaymentsPayload = buildOrderPaymentsPayload({
    agreementId: ctx.agreement_id,
    copagoAmount: ctx.copagoAmount,
    dbPaymentMethod: ctx.dbPaymentMethod,
    paymentsArray: ctx.paymentsArray || [],
    paymentMethodType: ctx.payment_method_type,
    fiscalReference: ctx.fiscal_reference?.trim() || null,
    siiInvoiceNumber: ctx.siiInvoiceNumber,
  });

  let stockReductionsPayload = buildStockReductionItems(
    ctx.items,
    ctx.productsForStockCheck,
    ctx.effectiveBranchId,
  );

  // Ensure frame from work order is reduced when not already in items
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    ctx.actuallyRequiresWorkOrder &&
    ctx.frameInfo.frame_product_id &&
    uuidRegex.test(ctx.frameInfo.frame_product_id) &&
    !ctx.frameInfo.frame_product_id.includes("frame-manual") &&
    !stockReductionsPayload.some(
      (r: { product_id: string }) =>
        r.product_id === ctx.frameInfo.frame_product_id,
    )
  ) {
    const frameProduct = ctx.productsForStockCheck.find(
      (p: Record<string, unknown>) => p.id === ctx.frameInfo.frame_product_id,
    );
    if (
      (frameProduct as Record<string, unknown> | undefined)?.product_type !==
      "service"
    ) {
      stockReductionsPayload = [
        ...stockReductionsPayload,
        {
          product_id: ctx.frameInfo.frame_product_id,
          branch_id: ctx.effectiveBranchId,
          quantity: 1,
        },
      ];
    }
  }

  const lensCost = computeLensCost(
    ctx.presbyopia_solution,
    ctx.far_lens_cost,
    ctx.near_lens_cost,
    ctx.contact_lens_cost,
    ctx.lensInfo.lens_cost,
  );

  const workOrderPayload = ctx.actuallyRequiresWorkOrder
    ? {
        field_operation_id: ctx.fieldOperationId,
        customer_id: ctx.customer_id || null,
        prescription_id: ctx.lensInfo.prescription_id || null,
        quote_id: ctx.quote_id || null,
        frame_product_id: ctx.frameInfo.frame_product_id,
        frame_name: ctx.frameInfo.frame_name,
        frame_brand: ctx.frameInfo.frame_brand,
        frame_model: ctx.frameInfo.frame_model,
        frame_color: ctx.frameInfo.frame_color,
        frame_size: ctx.frameInfo.frame_size,
        frame_sku: ctx.frameInfo.frame_sku,
        lens_family_id:
          ctx.presbyopia_solution === "two_separate"
            ? null
            : ctx.lensInfo.lens_family_id || null,
        lens_type: ctx.lensInfo.lens_type,
        lens_material: ctx.lensInfo.lens_material,
        lens_index: ctx.lensInfo.lens_index,
        lens_treatments: ctx.lensInfo.lens_treatments,
        lens_tint_color: ctx.lensInfo.lens_tint_color,
        lens_tint_percentage: ctx.lensInfo.lens_tint_percentage,
        presbyopia_solution: ctx.presbyopia_solution || "none",
        far_lens_family_id:
          ctx.presbyopia_solution === "two_separate"
            ? ctx.far_lens_family_id || null
            : null,
        near_lens_family_id:
          ctx.presbyopia_solution === "two_separate"
            ? ctx.near_lens_family_id || null
            : null,
        far_lens_cost:
          ctx.presbyopia_solution === "two_separate"
            ? ctx.far_lens_cost || 0
            : null,
        near_lens_cost:
          ctx.presbyopia_solution === "two_separate"
            ? ctx.near_lens_cost || 0
            : null,
        contact_lens_family_id: ctx.contact_lens_family_id || null,
        contact_lens_quantity: ctx.contact_lens_family_id
          ? ctx.contact_lens_quantity || 1
          : null,
        contact_lens_cost: ctx.contact_lens_cost || null,
        frame_cost: ctx.frameInfo.frame_cost,
        lens_cost: lensCost,
        treatments_cost: ctx.treatmentsCost,
        labor_cost: ctx.laborCost,
        lab_cost: 0,
        subtotal: ctx.subtotal,
        tax_amount: ctx.tax_amount || 0,
        discount_amount: 0,
        total_amount: ctx.total_amount,
        currency: ctx.currency || "CLP",
        status: workOrderStatus,
        payment_status: workOrderPaymentStatus,
        deposit_amount: ctx.paymentAmount,
        balance_amount: ctx.balance,
        agreement_id: ctx.agreement_id || null,
        internal_notes: `Venta POS - Método: ${ctx.payment_method_type}`,
      }
    : null;

  const posTransactionPayload = ctx.posSessionId
    ? {
        payment_method: ctx.dbPaymentMethod,
        amount: ctx.total_amount,
        change_amount: ctx.change_amount ?? 0,
        notes: `Venta POS - ${ctx.orderNumber}`,
      }
    : null;

  const rpcPayload = {
    order: orderPayload,
    order_items: orderItemsPayload,
    order_payments: orderPaymentsPayload,
    stock_reductions: stockReductionsPayload,
    work_order: workOrderPayload,
    pos_transaction: posTransactionPayload,
  };

  const { data: rpcResult, error: rpcError } =
    await ctx.supabaseServiceRole.rpc("process_pos_sale", {
      p_payload: JSON.stringify(rpcPayload),
      p_user_id: ctx.user.id,
    });

  if (rpcError) {
    logger.error("process_pos_sale RPC error", rpcError);
    return createApiErrorResponse(
      new APIError(
        `Error al procesar la venta: ${rpcError.message}`,
        500,
        "RPC_ERROR",
      ),
    );
  }

  const orderId = (rpcResult as Record<string, unknown> | null)?.order_id as
    | string
    | undefined;
  const workOrderId = (rpcResult as Record<string, unknown> | null)
    ?.work_order_id as string | undefined;
  if (!orderId) {
    logger.error("RPC returned no order_id", rpcResult);
    return createApiErrorResponse(
      new APIError(
        "Error al procesar la venta: la operación no devolvió un ID de orden",
        500,
        "RPC_ERROR",
      ),
    );
  }

  const { data: fetchedOrder } = await ctx.supabaseServiceRole
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  const newOrder = {
    ...(fetchedOrder as Record<string, unknown>),
    id: orderId,
    order_number:
      ((rpcResult as Record<string, unknown>)?.order_number as string) ||
      ((fetchedOrder as Record<string, unknown> | null)
        ?.order_number as string),
  };

  // RPC post-processing: agreement, billing, update_pos_session_cash, notifications
  if (
    ctx.agreement_id &&
    ctx.institutionalAmount != null &&
    ctx.institutionalAmount > 0
  ) {
    await ctx.supabaseServiceRole
      .from("agreement_institutional_balances")
      .insert({
        agreement_id: ctx.agreement_id,
        order_id: orderId,
        purchase_order_id: ctx.purchase_order_id || null,
        amount: ctx.institutionalAmount,
        status: "pending",
      });
    if (ctx.purchase_order_id) {
      await ctx.supabaseServiceRole
        .from("agreement_purchase_orders")
        .update({
          used_amount:
            ((ctx.purchaseOrder?.used_amount as number) || 0) +
            ctx.institutionalAmount,
        })
        .eq("id", ctx.purchase_order_id);
    }
  }

  let billingResult: Record<string, unknown> | null = null;
  try {
    const billingConfig = await BillingFactory.getBillingConfig(
      ctx.effectiveBranchId || "",
    );
    const billingAdapter = BillingFactory.createAdapter(billingConfig);
    let ocNumber: string | null = null;
    if (ctx.purchase_order_id && ctx.purchaseOrder) {
      const { data: po } = await ctx.supabaseServiceRole
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

  if (ctx.quote_id && ctx.quote) {
    await ctx.supabaseServiceRole
      .from("quotes")
      .update({
        status: "accepted",
        converted_to_work_order_id: workOrderId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.quote_id);
  }

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

  const successResponse = {
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

  if (ctx.idempotency_key) {
    await ctx.supabaseServiceRole.from("pos_sale_idempotency").upsert(
      {
        idempotency_key: ctx.idempotency_key,
        order_id: orderId,
        work_order_id: workOrderId || null,
        response_snapshot: successResponse,
      },
      { onConflict: "idempotency_key" },
    );
  }

  return createApiSuccessResponse(successResponse);
}

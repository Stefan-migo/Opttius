/**
 * processLegacyWorkOrder — creates work order, notifications, and updates quote.
 *
 * Extracted from processLegacyHandler.ts to reduce file size.
 * Handles the Cash-First work order creation path.
 */

import { appLogger as logger } from "@/lib/logger";

import { computeCashAmount, computeWorkOrderStatus, type PaymentEntry } from "./processPaymentUtils";
import { type OrderItem } from "./processResponseBuilder";
import type { ProcessSaleContext } from "./processSaleTypes";
import { computeMinDepositFallback } from "./processSaleValidation";
import { reduceContactLensStock,reduceStock } from "./processStockReduction";

export interface LegacyWorkOrderResult {
  workOrder: Record<string, unknown> | null;
  balance: number;
  billingResult: Record<string, unknown> | null;
}

export async function createLegacyWorkOrder(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
): Promise<LegacyWorkOrderResult | { error: string; status: number }> {
  // Calculate balance
  const { data: balanceData, error: balanceError } = await ctx.supabase.rpc(
    "calculate_order_balance",
    { p_order_id: newOrder.id as string },
  );
  const balance = balanceError
    ? ctx.total_amount - ctx.paymentAmount
    : (balanceData as number) || 0;

  // Emit billing document
  const billingResult = await emitBilling(ctx, newOrder);

  // Stock reduction
  const stockOk = await reduceStock(ctx, newOrder.id as string);
  if (!stockOk) {
    const { APIError } = await import("@/lib/api/errors");
    return {
      error: "Error al actualizar stock",
      status: 400,
    };
  }
  await reduceContactLensStock(ctx);

  // Cash-First: determine work order status
  const { data: minDepositData } = await ctx.supabase.rpc("get_min_deposit", {
    p_order_total: ctx.total_amount,
    p_branch_id: ctx.effectiveBranchId,
  });
  const minDeposit =
    minDepositData ?? computeMinDepositFallback(ctx.total_amount);

  const { status: workOrderStatus, paymentStatus: workOrderPaymentStatus } =
    computeWorkOrderStatus(
      ctx.paymentAmount,
      minDeposit,
      ctx.total_amount,
      balance,
    );

  if (ctx.paymentAmount < minDeposit) {
    logger.info("Insufficient deposit", {
      paid: ctx.paymentAmount,
      required: minDeposit,
      total: ctx.total_amount,
    });
  }

  // Generate work order number
  const { data: workOrderNumber, error: workOrderNumberError } =
    await ctx.supabase.rpc("generate_work_order_number");

  if (workOrderNumberError || !workOrderNumber) {
    logger.error("Error generating work order number", workOrderNumberError);
    await ctx.supabase.from("orders").delete().eq("id", newOrder.id);
    return { error: "Failed to generate work order number", status: 500 };
  }

  // Build and create work order
  const lensCost =
    ctx.presbyopia_solution === "two_separate"
      ? (ctx.far_lens_cost || 0) + (ctx.near_lens_cost || 0)
      : ctx.contact_lens_cost || ctx.lensInfo.lens_cost || 0;

  const workOrderData: Record<string, unknown> = {
    work_order_number: workOrderNumber,
    branch_id: ctx.effectiveBranchId,
    field_operation_id: ctx.fieldOperationId,
    operativo_batch_id: ctx.fieldOperationId,
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
    frame_serial_number: null,
    lens_family_id:
      ctx.presbyopia_solution === "two_separate"
        ? null
        : ctx.lensInfo.lens_family_id || null,
    lens_type: ctx.lensInfo.lens_type,
    lens_sourcing_type:
      (ctx.lensInfo as unknown as Record<string, unknown>).lens_sourcing_type ||
      "surfaced",
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
      ctx.presbyopia_solution === "two_separate" ? ctx.far_lens_cost || 0 : null,
    near_lens_cost:
      ctx.presbyopia_solution === "two_separate" ? ctx.near_lens_cost || 0 : null,
    contact_lens_family_id: ctx.contact_lens_family_id || null,
    contact_lens_rx_sphere_od: ctx.contact_lens_rx_sphere_od || null,
    contact_lens_rx_cylinder_od: ctx.contact_lens_rx_cylinder_od || null,
    contact_lens_rx_axis_od: ctx.contact_lens_rx_axis_od || null,
    contact_lens_rx_add_od: ctx.contact_lens_rx_add_od || null,
    contact_lens_rx_base_curve_od: ctx.contact_lens_rx_base_curve_od || null,
    contact_lens_rx_diameter_od: ctx.contact_lens_rx_diameter_od || null,
    contact_lens_rx_sphere_os: ctx.contact_lens_rx_sphere_os || null,
    contact_lens_rx_cylinder_os: ctx.contact_lens_rx_cylinder_os || null,
    contact_lens_rx_axis_os: ctx.contact_lens_rx_axis_os || null,
    contact_lens_rx_add_os: ctx.contact_lens_rx_add_os || null,
    contact_lens_rx_base_curve_os: ctx.contact_lens_rx_base_curve_os || null,
    contact_lens_rx_diameter_os: ctx.contact_lens_rx_diameter_os || null,
    contact_lens_quantity: ctx.contact_lens_family_id
      ? ctx.contact_lens_quantity || 1
      : null,
    contact_lens_cost: ctx.contact_lens_cost || null,
    prescription_snapshot: null,
    lab_name: null,
    lab_contact: null,
    lab_order_number: null,
    lab_estimated_delivery_date: null,
    status: workOrderStatus,
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
    payment_status: workOrderPaymentStatus,
    payment_method: ctx.payment_method_type,
    deposit_amount: ctx.paymentAmount,
    balance_amount: balance,
    pos_order_id: newOrder.id,
    agreement_id: ctx.agreement_id || null,
    internal_notes: `Venta POS - Método: ${ctx.payment_method_type}${billingResult ? ` - Folio: ${billingResult.folio}` : ""} - Depósito: ${ctx.paymentAmount}/${ctx.total_amount} - Saldo: ${balance}${ctx.presbyopia_solution && ctx.presbyopia_solution !== "none" ? ` - Presbicia: ${ctx.presbyopia_solution}` : ""}${ctx.lensInfo.lens_family_id ? ` - Familia: ${(ctx.lensFamily?.name as string) || ctx.lensInfo.lens_family_id}` : ""}`,
    customer_notes: null,
    assigned_to: ctx.user.id,
    created_by: ctx.user.id,
  };

  const { data: newWorkOrder, error: workOrderError } = await ctx.supabase
    .from("lab_work_orders")
    .insert(workOrderData)
    .select()
    .single();

  if (workOrderError) {
    logger.error("Error creating work order", workOrderError);
    return { error: "Failed to create work order", status: 500 };
  }

  // Update status dates
  if (workOrderData.status && workOrderData.status !== "quote") {
    await ctx.supabase.rpc("update_work_order_status", {
      p_work_order_id: (newWorkOrder as Record<string, unknown>).id,
      p_new_status: workOrderData.status as string,
      p_changed_by: ctx.user.id,
      p_notes: "Work order created from POS sale",
    });
  }

  // Update POS session cash
  const cashAmount = computeCashAmount(
    (ctx.paymentsArray || []) as PaymentEntry[],
    ctx.payment_method_type,
    ctx.cash_received,
    ctx.total_amount,
  );
  if (cashAmount > 0 && ctx.posSessionId) {
    const { error: cashError } = await ctx.supabase.rpc(
      "update_pos_session_cash",
      { session_id: ctx.posSessionId, cash_amount: cashAmount },
    );
    if (cashError) {
      logger.error("Error updating POS session cash", cashError);
    }
  }

  return {
    workOrder: newWorkOrder as Record<string, unknown>,
    balance,
    billingResult,
  };
}

export async function handleNonWorkOrderPath(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
  billingResult: Record<string, unknown> | null,
  successResponse: Record<string, unknown>,
): Promise<void> {
  const { NotificationService } = await import(
    "@/lib/notifications/notification-service"
  );
  NotificationService.notifyNewSale(
    newOrder.id as string,
    newOrder.order_number as string,
    (newOrder.email as string) || "venta@pos.local",
    newOrder.total_amount as number,
    (newOrder.branch_id as string) ?? ctx.effectiveBranchId ?? undefined,
  ).catch((err: unknown) =>
    logger.error("Error creating sale notification", err),
  );
}

export async function sendWorkOrderNotifications(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
  newWorkOrder: Record<string, unknown>,
): Promise<void> {
  const { NotificationService } = await import(
    "@/lib/notifications/notification-service"
  );

  NotificationService.notifyNewSale(
    newOrder.id as string,
    newOrder.order_number as string,
    (newOrder.email as string) || "venta@pos.local",
    newOrder.total_amount as number,
    (newOrder.branch_id as string) ?? ctx.effectiveBranchId ?? undefined,
  ).catch((err: unknown) =>
    logger.error("Error creating sale notification", err),
  );

  const customerName = ctx.customer
    ? `${(ctx.customer.first_name as string) || ""} ${(ctx.customer.last_name as string) || ""}`.trim() ||
      (ctx.customer.email as string) || "Cliente"
    : "Cliente";

  NotificationService.notifyNewWorkOrder(
    newWorkOrder.id as string,
    newWorkOrder.work_order_number as string,
    customerName,
    newWorkOrder.total_amount as number,
    (newWorkOrder.branch_id as string) ?? ctx.effectiveBranchId ?? undefined,
  ).catch((err: unknown) =>
    logger.error("Error creating work order notification", err),
  );
}

export async function updateQuoteStatus(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
  workOrderId: string | null,
): Promise<void> {
  if (!ctx.quote_id || !ctx.quote) return;

  const { error: quoteUpdateError } = await ctx.supabase
    .from("quotes")
    .update({
      status: "accepted",
      converted_to_work_order_id: workOrderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.quote_id);

  if (quoteUpdateError) {
    logger.error("Error updating quote status", quoteUpdateError);
  } else {
    logger.info("Quote marked as accepted", {
      quote_id: ctx.quote_id,
      work_order_id: workOrderId,
      order_id: newOrder.id,
    });
  }
}

async function emitBilling(
  ctx: ProcessSaleContext,
  newOrder: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  let billingResult: Record<string, unknown> | null = null;
  try {
    const { BillingFactory } = await import("@/lib/billing/BillingFactory");
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

    const { buildBillingOrder } = await import("./processResponseBuilder");
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

    billingResult = (await billingAdapter.emitDocument(billingOrder)) as unknown as Record<
      string,
      unknown
    >;
    logger.info("Billing document emitted", {
      folio: billingResult?.folio,
      type: billingResult?.type,
    });
  } catch (billingError) {
    logger.error("Error emitting billing document", billingError);
  }
  return billingResult;
}

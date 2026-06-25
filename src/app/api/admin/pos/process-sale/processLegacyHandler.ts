/**
 * Legacy path handler for process-sale.
 *
 * Extracted from route.ts `else` branch (lines 1326-2147).
 * Uses sequential inserts for operativo/mobile-stock sales.
 */
import { NextResponse } from "next/server";
import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { BillingFactory } from "@/lib/billing/BillingFactory";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/constants";
import {
  getOperativoMobileAvailableQuantity,
  reduceOperativoMobileStock,
} from "@/lib/inventory/operativo-mobile-stock-helpers";
import { getAvailableQuantity } from "@/lib/inventory/stock-helpers";
import { appLogger as logger } from "@/lib/logger";
import { PAYMENT_METHOD_MAP } from "@/lib/payments/constants";
import { computeMinDepositFallback } from "./processSaleValidation";
import {
  computeWorkOrderStatus,
  computeLensCost,
  computeCashAmount,
} from "./processPaymentUtils";
import {
  buildFullOrderResponse,
  buildBillingResponse,
  buildBillingOrder,
} from "./processResponseBuilder";
import type { ProcessSaleContext } from "./processSaleTypes";

export async function handleLegacyPath(
  ctx: ProcessSaleContext,
): Promise<NextResponse> {
  // Legacy path: sequential inserts (operativos with mobile stock)
  const { data: newOrderData, error: orderError } =
    await ctx.supabaseServiceRole
      .from("orders")
      .insert({
        order_number: ctx.orderNumber,
        email:
          ctx.email || (ctx.customer?.email as string) || "venta@pos.local",
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
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: orderError.message,
      },
      { status: 500 },
    );
  }
  const newOrder = newOrderData as Record<string, unknown>;

  // Insert order_items for persistence
  if (ctx.orderItems.length > 0) {
    const { error: itemsError } = await ctx.supabaseServiceRole
      .from("order_items")
      .insert(
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

  // Register payment(s) in order_payments
  if (ctx.agreement_id && ctx.copagoAmount != null) {
    const { error: paymentError } = await ctx.supabaseServiceRole
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
      const { error: balanceErr } = await ctx.supabaseServiceRole
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
  } else if (ctx.paymentsArray && ctx.paymentsArray.length > 0) {
    for (let i = 0; i < ctx.paymentsArray.length; i++) {
      const p = ctx.paymentsArray[i] as Record<string, unknown>;
      const dbMethod =
        PAYMENT_METHOD_MAP[p.method as keyof typeof PAYMENT_METHOD_MAP] ||
        p.method;
      const { error: payErr } = await ctx.supabaseServiceRole
        .from("order_payments")
        .insert({
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
  } else {
    const { error: paymentError } = await ctx.supabaseServiceRole
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

  // Create POS transaction
  if (ctx.posSessionId) {
    const { error: txError } = await ctx.supabaseServiceRole
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
  const { error: updatePaymentMethodError } = await ctx.supabaseServiceRole
    .from("orders")
    .update({ mp_payment_method: ctx.dbPaymentMethod })
    .eq("id", newOrder.id);

  if (updatePaymentMethodError) {
    logger.error("Error updating payment method", updatePaymentMethodError);
  }

  // Calculate order balance
  const { data: balanceData, error: balanceError } =
    await ctx.supabaseServiceRole.rpc("calculate_order_balance", {
      p_order_id: newOrder.id as string,
    });

  const balance = balanceError
    ? ctx.total_amount - ctx.paymentAmount
    : (balanceData as number) || 0;

  // Emit billing document
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
      orderId: newOrder.id as string,
      orderNumber: newOrder.order_number as string,
      customerId: ctx.customer_id,
      branchId: ctx.effectiveBranchId ?? "",
      totalAmount: ctx.total_amount,
      subtotal: ctx.subtotal,
      taxAmount: ctx.tax_amount || 0,
      items: ctx.orderItems,
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

    billingResult = (await billingAdapter.emitDocument(billingOrder)) as Record<
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

  // Stock reduction loop
  const useMobileStock = !!ctx.fieldOperationId;
  for (const item of ctx.items) {
    const pid = item.product_id as string | undefined;
    if (
      pid &&
      !pid.includes("frame-manual") &&
      !pid.includes("lens-") &&
      !pid.includes("treatments-") &&
      !pid.includes("labor-") &&
      !pid.includes("discount-")
    ) {
      const product = ctx.productsForStockCheck.find(
        (p: Record<string, unknown>) => p.id === pid,
      );
      if (
        (product as Record<string, unknown> | undefined)?.product_type ===
        "service"
      ) {
        logger.info("Skipping stock update for service product", {
          product_id: pid,
        });
        continue;
      }

      if (useMobileStock && ctx.fieldOperationId) {
        const reduceResult = await reduceOperativoMobileStock(
          pid,
          ctx.fieldOperationId,
          item.quantity as number,
          ctx.supabaseServiceRole,
        );
        if (!reduceResult.success) {
          logger.error(
            `Error reducing operativo mobile stock for product ${pid}`,
            { error: reduceResult.error },
          );
          return createApiErrorResponse(
            new APIError(
              reduceResult.error || "Error al actualizar stock móvil",
              400,
              "INSUFFICIENT_STOCK",
            ),
          );
        }
        logger.info("Operativo mobile stock reduced", {
          product_id: pid,
          quantity_decreased: item.quantity,
        });
      } else {
        const branchId = ctx.effectiveBranchId;
        if (!branchId) {
          logger.warn(
            `Cannot update inventory: no branch_id for product ${pid}`,
          );
          continue;
        }

        const { data: currentStock } = await ctx.supabaseServiceRole
          .from("product_branch_stock")
          .select("quantity")
          .eq("product_id", pid)
          .eq("branch_id", branchId)
          .maybeSingle();

        const currentQuantity =
          (currentStock as { quantity?: number } | null)?.quantity || 0;

        if (!currentStock && currentQuantity === 0) {
          logger.info("Creating initial stock record for product", {
            product_id: pid,
            branch_id: branchId,
          });

          const { error: createError } = await ctx.supabaseServiceRole
            .from("product_branch_stock")
            .insert({
              product_id: pid,
              branch_id: branchId,
              quantity: 0,
              reserved_quantity: 0,
              low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
            });

          if (createError) {
            logger.error(
              `Error creating initial stock record for product ${pid}`,
              { error: createError, product_id: pid, branch_id: branchId },
            );
          }
        }

        const { error: inventoryError } = await ctx.supabaseServiceRole.rpc(
          "update_product_stock",
          {
            p_product_id: pid,
            p_branch_id: branchId,
            p_quantity_change: -(item.quantity as number),
            p_reserve: false,
            p_movement_type: "sale",
            p_reference_type: "order",
            p_reference_id: newOrder.id,
            p_created_by: ctx.user.id,
          },
        );

        if (inventoryError) {
          logger.error(`Error updating inventory for product ${pid}`, {
            error: inventoryError,
            product_id: pid,
            branch_id: branchId,
            quantity: item.quantity,
          });
        } else {
          logger.info("Inventory updated successfully", {
            product_id: pid,
            branch_id: branchId,
            quantity_decreased: item.quantity,
          });
        }
      }
    }
  }

  // Reduce contact lens inventory
  if (ctx.contact_lens_family_id && (ctx.contact_lens_quantity || 0) > 0) {
    const branchId = ctx.effectiveBranchId;

    if (ctx.contact_lens_rx_sphere_od != null) {
      const odReduction = await ctx.supabaseServiceRole.rpc(
        "reduce_contact_lens_stock",
        {
          p_contact_lens_family_id: ctx.contact_lens_family_id,
          p_branch_id: branchId,
          p_sphere: ctx.contact_lens_rx_sphere_od,
          p_cylinder: ctx.contact_lens_rx_cylinder_od || 0,
          p_quantity: ctx.contact_lens_quantity,
        },
      );
      if (odReduction.error) {
        logger.error("Error reducing contact lens stock (OD)", {
          family_id: ctx.contact_lens_family_id,
          error: odReduction.error,
        });
      }
    }

    if (ctx.contact_lens_rx_sphere_os != null) {
      const osReduction = await ctx.supabaseServiceRole.rpc(
        "reduce_contact_lens_stock",
        {
          p_contact_lens_family_id: ctx.contact_lens_family_id,
          p_branch_id: branchId,
          p_sphere: ctx.contact_lens_rx_sphere_os,
          p_cylinder: ctx.contact_lens_rx_cylinder_os || 0,
          p_quantity: ctx.contact_lens_quantity,
        },
      );
      if (osReduction.error) {
        logger.error("Error reducing contact lens stock (OS)", {
          family_id: ctx.contact_lens_family_id,
          error: osReduction.error,
        });
      }
    }
  }

  // Create work order if needed
  if (!ctx.actuallyRequiresWorkOrder) {
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

    const successResponse = {
      order: { ...newOrder, order_items: ctx.orderItems },
      work_order: null,
      billing: billingResult
        ? {
            folio: billingResult.folio,
            pdfUrl: billingResult.pdfUrl,
            type: billingResult.type,
          }
        : null,
    };
    if (ctx.idempotency_key) {
      await ctx.supabaseServiceRole.from("pos_sale_idempotency").upsert(
        {
          idempotency_key: ctx.idempotency_key,
          order_id: newOrder.id,
          work_order_id: null,
          response_snapshot: successResponse,
        },
        { onConflict: "idempotency_key" },
      );
    }
    return createApiSuccessResponse(successResponse);
  }

  // Cash-First Logic: Determine work order status based on payment
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
    await ctx.supabaseServiceRole.rpc("generate_work_order_number");

  if (workOrderNumberError || !workOrderNumber) {
    logger.error("Error generating work order number", workOrderNumberError);
    await ctx.supabaseServiceRole.from("orders").delete().eq("id", newOrder.id);
    return NextResponse.json(
      { error: "Failed to generate work order number" },
      { status: 500 },
    );
  }

  // Create work order
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
      (ctx.lensInfo as Record<string, unknown>).lens_sourcing_type ||
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
      ctx.presbyopia_solution === "two_separate"
        ? ctx.far_lens_cost || 0
        : null,
    near_lens_cost:
      ctx.presbyopia_solution === "two_separate"
        ? ctx.near_lens_cost || 0
        : null,
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

  const { data: newWorkOrder, error: workOrderError } =
    await ctx.supabaseServiceRole
      .from("lab_work_orders")
      .insert(workOrderData)
      .select()
      .single();

  if (workOrderError) {
    logger.error("Error creating work order", workOrderError);
    return NextResponse.json(
      {
        error: "Failed to create work order",
        details: workOrderError.message,
        code: workOrderError.code,
        hint: workOrderError.hint,
      },
      { status: 500 },
    );
  }

  // Update status dates
  if (workOrderData.status && workOrderData.status !== "quote") {
    await ctx.supabaseServiceRole.rpc("update_work_order_status", {
      p_work_order_id: (newWorkOrder as Record<string, unknown>).id,
      p_new_status: workOrderData.status as string,
      p_changed_by: ctx.user.id,
      p_notes: "Work order created from POS sale",
    });
  }

  // Update POS session cash amount
  const cashAmount = computeCashAmount(
    ctx.paymentsArray || [],
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

  // Notifications
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

  if (newWorkOrder) {
    const customerName = ctx.customer
      ? `${(ctx.customer.first_name as string) || ""} ${(ctx.customer.last_name as string) || ""}`.trim() ||
        (ctx.customer.email as string) ||
        "Cliente"
      : "Cliente";

    NotificationService.notifyNewWorkOrder(
      (newWorkOrder as Record<string, unknown>).id as string,
      (newWorkOrder as Record<string, unknown>).work_order_number as string,
      customerName,
      (newWorkOrder as Record<string, unknown>).total_amount as number,
      ((newWorkOrder as Record<string, unknown>).branch_id as string) ??
        ctx.effectiveBranchId ??
        undefined,
    ).catch((err: unknown) =>
      logger.error("Error creating work order notification", err),
    );
  }

  // Update quote status
  if (ctx.quote_id && ctx.quote) {
    const woId = (newWorkOrder as Record<string, unknown> | null)?.id || null;
    const { error: quoteUpdateError } = await ctx.supabaseServiceRole
      .from("quotes")
      .update({
        status: "accepted",
        converted_to_work_order_id: woId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.quote_id);

    if (quoteUpdateError) {
      logger.error("Error updating quote status", quoteUpdateError);
    } else {
      logger.info("Quote marked as accepted", {
        quote_id: ctx.quote_id,
        work_order_id: woId,
        order_id: newOrder.id,
      });
    }
  }

  // Build response
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
    work_order: {
      ...newWorkOrder,
      sii_invoice_number: ctx.siiInvoiceNumber,
    },
    billing: buildBillingResponse(billingResult),
  };

  if (ctx.idempotency_key) {
    await ctx.supabaseServiceRole.from("pos_sale_idempotency").upsert(
      {
        idempotency_key: ctx.idempotency_key,
        order_id: newOrder.id,
        work_order_id:
          (newWorkOrder as Record<string, unknown> | null)?.id || null,
        response_snapshot: successResponse,
      },
      { onConflict: "idempotency_key" },
    );
  }

  return createApiSuccessResponse(successResponse);
}

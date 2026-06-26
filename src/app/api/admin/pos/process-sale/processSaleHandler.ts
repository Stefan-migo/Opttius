/**
 * Process Sale Handler — common validation, pre-computation, and dispatch.
 *
 * Consolidates the shared validation logic from process-sale/route.ts:
 * - Field operation context
 * - Customer / Agreement / Quote lookups
 * - Lens family & prescription validation
 * - Stock validation
 * - Work order decision
 *
 * Dispatches to handleRpcPath or handleLegacyPath based on context.
 * No behavioral changes — pure extraction.
 */

import { NextRequest, NextResponse } from "next/server";
import { APIError, ValidationError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { processSaleSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import {
  getBranchContext,
  getFieldOperationFromRequest,
} from "@/lib/api/branch-middleware";
import { getOperativoMobileAvailableQuantity } from "@/lib/inventory/operativo-mobile-stock-helpers";
import { getAvailableQuantity } from "@/lib/inventory/stock-helpers";
import {
  extractFrameInfo,
  extractLensInfo,
  extractTreatmentsCost,
  extractLaborCost,
  computeOrderNumber,
  computeWorkOrderDecision,
  haveOnlyNonWorkOrderProducts,
  hasLensDataForMounting,
} from "./processSaleValidation";
import {
  computePaymentAmount,
  computeDbPaymentMethod,
} from "./processPaymentUtils";
import { buildOrderItems, buildCustomerName } from "./processResponseBuilder";
import { handleRpcPath } from "./processRpcHandler";
import { handleLegacyPath } from "./processLegacyHandler";
import type { ProcessSaleContext } from "./processSaleTypes";

export async function handleProcessSale(
  request: NextRequest,
): Promise<NextResponse> {
  logger.info("POS Process Sale API called");
  const supabase = await createClient();

  // Check admin authorization
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as Record<string, unknown>)) as {
    data: boolean | null;
    error: Error | null;
  };
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  // Branch context
  const branchContext = await getBranchContext(request, user.id);
  const fieldOperationId: string | null = getFieldOperationFromRequest(request);
  let effectiveBranchId = branchContext.branchId;

  if (fieldOperationId) {
    const { data: fieldOp, error: fieldOpError } = await supabase
      .from("field_operations")
      .select("id, branch_id, organization_id")
      .eq("id", fieldOperationId)
      .single();

    if (fieldOpError || !fieldOp) {
      return NextResponse.json(
        { error: "Operativo no encontrado" },
        { status: 404 },
      );
    }
    if (
      branchContext.organizationId &&
      fieldOp.organization_id !== branchContext.organizationId
    ) {
      return NextResponse.json(
        { error: "No tiene acceso a este operativo" },
        { status: 403 },
      );
    }
    effectiveBranchId = fieldOp.branch_id;
    if (
      !branchContext.isSuperAdmin &&
      !branchContext.accessibleBranches.some(
        (b: { id: string }) => b.id === fieldOp.branch_id,
      )
    ) {
      return NextResponse.json(
        { error: "No tiene acceso a la sucursal del operativo" },
        { status: 403 },
      );
    }
  }

  if (!branchContext.isSuperAdmin && !effectiveBranchId) {
    return NextResponse.json(
      { error: "Debe seleccionar una sucursal para realizar ventas POS" },
      { status: 400 },
    );
  }

  // Validate request body
  let validatedBody: Record<string, unknown>;
  try {
    validatedBody = await parseAndValidateBody(request, processSaleSchema);
  } catch (error) {
    if (error instanceof ValidationError) return validationErrorResponse(error);
    throw error;
  }

  const {
    email,
    customer_id,
    customer_name,
    customer_rut,
    payment_method_type,
    payment_status,
    status,
    subtotal,
    tax_amount,
    total_amount,
    currency,
    installments_count,
    sii_invoice_type,
    sii_rut,
    sii_business_name,
    items,
    cash_received,
    change_amount,
    deposit_amount,
    fiscal_reference,
    lens_data,
    frame_data,
    presbyopia_solution,
    far_lens_family_id,
    near_lens_family_id,
    far_lens_cost,
    near_lens_cost,
    contact_lens_family_id,
    contact_lens_rx_sphere_od,
    contact_lens_rx_cylinder_od,
    contact_lens_rx_axis_od,
    contact_lens_rx_add_od,
    contact_lens_rx_base_curve_od,
    contact_lens_rx_diameter_od,
    contact_lens_rx_sphere_os,
    contact_lens_rx_cylinder_os,
    contact_lens_rx_axis_os,
    contact_lens_rx_add_os,
    contact_lens_rx_base_curve_os,
    contact_lens_rx_diameter_os,
    contact_lens_quantity,
    agreement_id,
    purchase_order_id,
    contact_lens_cost,
    contact_lens_price,
    quote_id,
    payments: paymentsArray,
  } = validatedBody as Record<string, unknown>;

  const idempotency_key = (validatedBody as Record<string, unknown>)
    .idempotency_key as string | undefined;
  const supabaseServiceRole = createServiceRoleClient();

  // Idempotency check
  if (idempotency_key) {
    const { data: existing } = await supabaseServiceRole
      .from("pos_sale_idempotency")
      .select("response_snapshot")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();
    if (existing?.response_snapshot) {
      logger.info("Idempotency hit", {
        idempotency_key,
        order_id: existing.response_snapshot?.order?.id,
      });
      return createApiSuccessResponse(existing.response_snapshot);
    }
  }

  // SII invoice number
  let siiInvoiceNumber: string | null = null;
  if (sii_invoice_type && sii_invoice_type !== "none") {
    const { data: invoiceNum } = await supabase.rpc(
      "generate_sii_invoice_number",
      {
        invoice_type: sii_invoice_type,
      },
    );
    if (invoiceNum) siiInvoiceNumber = invoiceNum as string;
  }

  // POS session validation
  let posSessionId: string | null = null;
  if (!branchContext.isSuperAdmin && effectiveBranchId) {
    const todayStart = new Date().toISOString().slice(0, 10);
    let sessionQuery = supabaseServiceRole
      .from("pos_sessions")
      .select("id")
      .eq("branch_id", effectiveBranchId)
      .eq("status", "open")
      .gte("opening_time", todayStart);
    if (fieldOperationId) {
      sessionQuery = sessionQuery.eq("field_operation_id", fieldOperationId);
    } else {
      sessionQuery = sessionQuery.is("field_operation_id", null);
    }
    const { data: openSession } = await sessionQuery.maybeSingle();
    if (!openSession) {
      return NextResponse.json(
        {
          error: fieldOperationId
            ? "Debe abrir la caja del operativo antes de realizar ventas. Abra la caja desde la página del operativo."
            : "Debe abrir la caja antes de realizar ventas. Por favor, abra la caja desde la sección Caja.",
        },
        { status: 400 },
      );
    }
    posSessionId = openSession.id;
  } else {
    let query = supabase
      .from("pos_sessions")
      .select("id")
      .eq("cashier_id", user.id)
      .eq("status", "open");
    query = effectiveBranchId
      ? query
          .eq("branch_id", effectiveBranchId)
          .eq("field_operation_id", fieldOperationId || null)
      : query.is("branch_id", null);
    const { data: activeSession } = await query
      .order("opening_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeSession) {
      posSessionId = activeSession.id;
    } else if (branchContext.isSuperAdmin) {
      const { data: newSession } = await supabase
        .from("pos_sessions")
        .insert({
          cashier_id: user.id,
          branch_id: effectiveBranchId,
          opening_cash_amount: 0,
          status: "open",
        })
        .select()
        .single();
      if (newSession) posSessionId = newSession.id;
    }
  }

  // Frame and lens info
  const itemsArr = (items || []) as Array<Record<string, unknown>>;
  const frameInfo = extractFrameInfo(
    frame_data as Record<string, unknown> | null | undefined,
    itemsArr as unknown as Parameters<typeof extractFrameInfo>[1],
  );
  const lensInfo = extractLensInfo(
    lens_data as Record<string, unknown> | null | undefined,
    itemsArr as unknown as Parameters<typeof extractLensInfo>[1],
  );
  const treatmentsCost = extractTreatmentsCost(
    itemsArr as unknown as Parameters<typeof extractTreatmentsCost>[0],
  );
  const laborCost = extractLaborCost(
    itemsArr as unknown as Parameters<typeof extractLaborCost>[0],
  );

  // Customer lookup
  let customer: Record<string, unknown> | null = null;
  if (customer_id) {
    const { data: customerData } = await supabaseServiceRole
      .from("customers")
      .select("id, first_name, last_name, email, phone, rut")
      .eq("id", customer_id)
      .single();
    if (!customerData) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }
    customer = customerData as Record<string, unknown>;
  } else {
    customer = {
      id: null,
      first_name: ((customer_name as string) || "").split(" ")[0] || null,
      last_name:
        ((customer_name as string) || "").split(" ").slice(1).join(" ") || null,
      email: email || null,
      phone: null,
      rut: customer_rut || null,
    };
  }

  // Agreement + purchase order validation
  let agreement: Record<string, unknown> | null = null;
  let purchaseOrder: Record<string, unknown> | null = null;
  let copagoAmount: number | null = null;
  let institutionalAmount: number | null = null;

  if (agreement_id) {
    const { data: agreementData } = await supabaseServiceRole
      .from("agreements")
      .select("id, status, valid_from, valid_until, billing_rules")
      .eq("id", agreement_id)
      .single();
    if (!agreementData)
      return NextResponse.json(
        { error: "Convenio no encontrado" },
        { status: 404 },
      );
    agreement = agreementData as Record<string, unknown>;

    if (agreement.status !== "active")
      return NextResponse.json(
        { error: "El convenio no está activo" },
        { status: 400 },
      );
    const today = new Date().toISOString().split("T")[0];
    const validFrom = agreement.valid_from as string;
    const validUntil = agreement.valid_until as string | undefined;
    if (validFrom > today)
      return NextResponse.json(
        { error: "El convenio aún no está vigente" },
        { status: 400 },
      );
    if (validUntil && validUntil < today)
      return NextResponse.json(
        { error: "El convenio ha expirado" },
        { status: 400 },
      );

    if (!purchase_order_id)
      return NextResponse.json(
        {
          error:
            "La orden de compra (OC) es obligatoria para ventas bajo convenio",
        },
        { status: 400 },
      );

    const { data: poData } = await supabaseServiceRole
      .from("agreement_purchase_orders")
      .select("id, status, max_amount, used_amount")
      .eq("id", purchase_order_id)
      .eq("agreement_id", agreement_id)
      .single();
    if (!poData)
      return NextResponse.json(
        { error: "Orden de compra no encontrada o no pertenece al convenio" },
        { status: 404 },
      );
    purchaseOrder = poData as Record<string, unknown>;
    if (purchaseOrder.status !== "active")
      return NextResponse.json(
        { error: "La orden de compra no está activa" },
        { status: 400 },
      );

    const rules = (agreement.billing_rules || {}) as Record<string, unknown>;
    const copagoPercent = (rules.copago_percent as number) ?? 20;
    const institutionalPercent = (rules.institutional_percent as number) ?? 80;
    copagoAmount =
      Math.round((total_amount as number) * (copagoPercent / 100) * 100) / 100;
    institutionalAmount =
      Math.round(((total_amount as number) - copagoAmount) * 100) / 100;

    if (purchaseOrder.max_amount != null) {
      const newUsed =
        ((purchaseOrder.used_amount as number) || 0) + institutionalAmount;
      if (newUsed > (purchaseOrder.max_amount as number)) {
        return NextResponse.json(
          { error: "La OC excede el monto máximo autorizado" },
          { status: 400 },
        );
      }
    }
  }

  // Quote validation
  let quote: Record<string, unknown> | null = null;
  if (quote_id) {
    const { data: quoteData } = await supabaseServiceRole
      .from("quotes")
      .select("id, status, converted_to_work_order_id, customer_id")
      .eq("id", quote_id)
      .single();
    if (!quoteData)
      return NextResponse.json(
        { error: "Presupuesto no encontrado" },
        { status: 404 },
      );
    quote = quoteData as Record<string, unknown>;
    if (
      quote.status === "converted_to_work" ||
      quote.converted_to_work_order_id
    ) {
      return NextResponse.json(
        { error: "Este presupuesto ya fue utilizado" },
        { status: 400 },
      );
    }
  }

  // Lens family validation
  let lensFamily: Record<string, unknown> | null = null;
  if (lensInfo.lens_family_id) {
    const { data: family } = await supabaseServiceRole
      .from("lens_families")
      .select("id, name, lens_type, lens_material, is_active")
      .eq("id", lensInfo.lens_family_id)
      .single();
    if (!family)
      return NextResponse.json(
        { error: "Familia de lentes no encontrada" },
        { status: 400 },
      );
    lensFamily = family as Record<string, unknown>;
    if (!lensFamily.is_active)
      return NextResponse.json(
        { error: "La familia de lentes está desactivada" },
        { status: 400 },
      );

    if (lensInfo.lens_type && lensInfo.lens_type !== lensFamily.lens_type) {
      lensInfo.lens_type = lensFamily.lens_type as string;
    }
    if (
      lensInfo.lens_material &&
      lensInfo.lens_material !== lensFamily.lens_material
    ) {
      lensInfo.lens_material = lensFamily.lens_material as string;
    }
  }

  // Prescription validation
  if (lensInfo.prescription_id) {
    const { data: prescription } = await supabaseServiceRole
      .from("prescriptions")
      .select("id, customer_id, od_sphere, od_cylinder, os_sphere, os_cylinder")
      .eq("id", lensInfo.prescription_id)
      .single();
    if (!prescription)
      return NextResponse.json(
        { error: "Receta no encontrada" },
        { status: 400 },
      );
    if (customer_id && prescription.customer_id !== customer_id) {
      return NextResponse.json(
        { error: "La receta no pertenece al cliente seleccionado" },
        { status: 400 },
      );
    }

    if (lensInfo.lens_family_id) {
      const sphere =
        Math.abs(prescription.od_sphere || 0) >=
        Math.abs(prescription.os_sphere || 0)
          ? prescription.od_sphere || 0
          : prescription.os_sphere || 0;
      const cylinder =
        Math.abs(prescription.od_cylinder || 0) >=
        Math.abs(prescription.os_cylinder || 0)
          ? prescription.od_cylinder || 0
          : prescription.os_cylinder || 0;

      const { data: priceMatrix } = await supabaseServiceRole.rpc(
        "calculate_lens_price",
        {
          p_lens_family_id: lensInfo.lens_family_id,
          p_sphere: sphere,
          p_cylinder: cylinder || 0,
        },
      );
      if (
        priceMatrix &&
        (priceMatrix as Array<unknown>).length > 0 &&
        lensInfo.lens_cost > 0
      ) {
        const expectedPrice = (priceMatrix as Array<Record<string, unknown>>)[0]
          .price as number;
        const diff = Math.abs(lensInfo.lens_cost - expectedPrice);
        if (diff > expectedPrice * 0.05) {
          logger.warn("Lens price differs significantly from matrix", {
            expected: expectedPrice,
            actual: lensInfo.lens_cost,
          });
        }
      }
    }
  }

  // Order number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { data: lastOrder } = await supabaseServiceRole
    .from("orders")
    .select("order_number")
    .like("order_number", `ORD-${dateStr}-%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orderNumber = computeOrderNumber(
    (lastOrder as Record<string, unknown> | null)?.order_number as
      | string
      | null,
  );

  const orderItems = buildOrderItems(
    itemsArr as unknown as Parameters<typeof buildOrderItems>[0],
  );

  const { customerName, billingFirstName, billingLastName } = buildCustomerName(
    {
      customer: customer as Record<string, unknown> | null,
      customerName: customer_name as string | null,
      siiBusinessName: sii_business_name as string | null,
      customerId: customer_id as string | null,
    },
  );

  // Organization ID resolution
  let orderOrganizationId: string | null = null;
  if (effectiveBranchId) {
    const { data: branchRow } = await supabaseServiceRole
      .from("branches")
      .select("organization_id")
      .eq("id", effectiveBranchId)
      .single();
    orderOrganizationId = (branchRow as Record<string, unknown> | null)
      ?.organization_id as string | null;
  }
  if (!orderOrganizationId) {
    const { data: adminRow } = await supabaseServiceRole
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    orderOrganizationId = (adminRow as Record<string, unknown> | null)
      ?.organization_id as string | null;
  }

  // Payment amount and method
  const paymentAmount = computePaymentAmount({
    agreementId: agreement_id as string | null,
    copagoAmount,
    paymentsArray: (paymentsArray || []) as Array<{
      amount: number;
      method: string;
    }>,
    depositAmount: deposit_amount as number | null,
    cashReceived: cash_received as number | null,
    totalAmount: total_amount as number,
  });
  const dbPaymentMethod = computeDbPaymentMethod({
    agreementId: agreement_id as string | null,
    copagoAmount,
    paymentMethodType: payment_method_type as string,
    paymentsArray: (paymentsArray || []) as Array<{
      amount: number;
      method: string;
    }>,
  });

  const balance = (total_amount as number) - paymentAmount;

  // Products for stock
  const productIdsForStock = (items as Array<Record<string, unknown>>)
    .map((item) => item.product_id as string)
    .filter(
      (id) =>
        !!id &&
        !id.includes("frame-manual") &&
        !id.includes("lens-") &&
        !id.includes("treatments-") &&
        !id.includes("labor-") &&
        !id.includes("discount-"),
    );

  let productsForStockCheck: Array<Record<string, unknown>> = [];
  if (productIdsForStock.length > 0) {
    const { data: products } = await supabaseServiceRole
      .from("products")
      .select("id, name, product_type")
      .in("id", productIdsForStock);
    productsForStockCheck = (products || []) as Array<Record<string, unknown>>;
  }

  const useMobileStock = !!fieldOperationId;

  // Stock validation
  if (effectiveBranchId || (useMobileStock && fieldOperationId)) {
    for (const item of (items || []) as Array<Record<string, unknown>>) {
      const pid = item.product_id as string | undefined;
      if (
        pid &&
        !pid.includes("frame-manual") &&
        !pid.includes("lens-") &&
        !pid.includes("treatments-") &&
        !pid.includes("labor-") &&
        !pid.includes("discount-")
      ) {
        const product = productsForStockCheck.find((p) => p.id === pid);
        if (
          (product as Record<string, unknown> | undefined)?.product_type ===
          "service"
        )
          continue;

        const availableQty = useMobileStock
          ? await getOperativoMobileAvailableQuantity(
              pid,
              fieldOperationId!,
              supabaseServiceRole,
            )
          : await getAvailableQuantity(
              pid,
              effectiveBranchId!,
              supabaseServiceRole,
            );

        if (availableQty < (item.quantity as number)) {
          const productName =
            (product as Record<string, unknown> | undefined)?.name || pid;
          const msg = useMobileStock
            ? `Stock insuficiente en bodega móvil para ${productName}. Disponible: ${availableQty}, solicitado: ${item.quantity}`
            : `Stock insuficiente para ${productName}. Disponible: ${availableQty}, solicitado: ${item.quantity}`;
          return createApiErrorResponse(
            new APIError(msg, 400, "INSUFFICIENT_STOCK"),
          );
        }
      }
    }
  }

  // Work order decision
  const hasTemporaryLensItems = (items as Array<Record<string, unknown>>).some(
    (item) =>
      !item.product_id ||
      (item.product_id as string).includes("lens-") ||
      (item.product_id as string).includes("treatments-") ||
      (item.product_id as string).includes("labor-") ||
      (item.product_id as string).includes("frame-manual-"),
  );

  let hasFrameInItems = false;
  let productTypesInItems: string[] = [];
  let productCategories: Array<Record<string, unknown>> = [];
  const productIds = (items as Array<Record<string, unknown>>)
    .map((item) => item.product_id as string)
    .filter(
      (id) =>
        !!id &&
        !id.includes("lens-") &&
        !id.includes("treatments-") &&
        !id.includes("labor-") &&
        !id.includes("frame-manual-") &&
        !id.includes("discount-"),
    );
  if (productIds.length > 0) {
    const { data: products } = await supabaseServiceRole
      .from("products")
      .select("id, product_type, category_id, categories:category_id(name)")
      .in("id", productIds);
    const typedProducts = (products || []) as Array<Record<string, unknown>>;
    hasFrameInItems = typedProducts.some((p) => p.product_type === "frame");
    productTypesInItems = typedProducts.map(
      (p) => (p.product_type as string) || "",
    );
    productCategories = typedProducts.map((p) => {
      const cat = Array.isArray(p.categories)
        ? (p.categories as Array<Record<string, unknown>>)[0]
        : (p.categories as Record<string, unknown>);
      return { id: p.id, category_name: cat?.name ?? null };
    });
  }

  const hasOnlyNonWorkOrderProductTypes =
    haveOnlyNonWorkOrderProducts(productTypesInItems);
  const nonWorkOrderCategoryNames = [
    "accesorio",
    "accesorios",
    "lente de sol",
    "lentes de sol",
    "servicio",
    "servicios",
  ];
  const hasOnlyNonWorkOrderProductCategories =
    productCategories.length > 0 &&
    productCategories.every((cat) => {
      if (!cat.category_name) return false;
      return nonWorkOrderCategoryNames.some((n) =>
        (cat.category_name as string).toLowerCase().includes(n),
      );
    });
  const hasOnlyNonWorkOrderProducts =
    hasOnlyNonWorkOrderProductTypes || hasOnlyNonWorkOrderProductCategories;
  const lensDataForMounting = hasLensDataForMounting(
    lens_data as Record<string, unknown> | null | undefined,
    contact_lens_family_id as string | null,
    contact_lens_cost as number | null,
    presbyopia_solution as string | null,
  );
  const actuallyRequiresWorkOrder = computeWorkOrderDecision({
    hasTemporaryLensItems,
    hasFrameInItems,
    hasLensDataForMounting: lensDataForMounting,
    customerId: customer_id as string | null,
    hasOnlyNonWorkOrderProducts,
  });

  if (actuallyRequiresWorkOrder && !customer_id) {
    return NextResponse.json(
      {
        error:
          "Se requiere un cliente registrado para crear trabajos de laboratorio",
      },
      { status: 400 },
    );
  }

  // Build context and dispatch
  const ctx: ProcessSaleContext = {
    supabase,
    supabaseServiceRole,
    user,
    effectiveBranchId,
    fieldOperationId,
    posSessionId,
    orderOrganizationId,
    orderNumber,
    subtotal: subtotal as number,
    tax_amount: tax_amount as number | null,
    total_amount: total_amount as number,
    currency: currency as string,
    payment_status: payment_status as string,
    payment_method_type: payment_method_type as string,
    email: email as string | null,
    customer_id: customer_id as string | null,
    customer_name: customer_name as string | null,
    customer_rut: customer_rut as string | null,
    sii_rut: sii_rut as string | null,
    sii_business_name: sii_business_name as string | null,
    customer,
    items: items as Array<Record<string, unknown>>,
    productsForStockCheck,
    agreement_id: agreement_id as string | null,
    purchase_order_id: purchase_order_id as string | null,
    copagoAmount,
    institutionalAmount,
    purchaseOrder,
    paymentsArray: paymentsArray as Array<Record<string, unknown>>,
    deposit_amount: deposit_amount as number | null,
    cash_received: cash_received as number | null,
    fiscal_reference: fiscal_reference as string | null,
    change_amount: change_amount as number | null,
    siiInvoiceNumber,
    actuallyRequiresWorkOrder,
    frameInfo,
    lensInfo,
    presbyopia_solution: presbyopia_solution as string | null,
    far_lens_family_id: far_lens_family_id as string | null,
    near_lens_family_id: near_lens_family_id as string | null,
    far_lens_cost: far_lens_cost as number | null,
    near_lens_cost: near_lens_cost as number | null,
    contact_lens_family_id: contact_lens_family_id as string | null,
    contact_lens_quantity: contact_lens_quantity as number | null,
    contact_lens_cost: contact_lens_cost as number | null,
    treatmentsCost,
    laborCost,
    lensFamily,
    paymentAmount,
    dbPaymentMethod,
    balance,
    orderItems,
    customerName,
    billingFirstName,
    billingLastName,
    quote_id: quote_id as string | null,
    quote,
    idempotency_key,
    contact_lens_rx_sphere_od: contact_lens_rx_sphere_od as number | null,
    contact_lens_rx_cylinder_od: contact_lens_rx_cylinder_od as number | null,
    contact_lens_rx_axis_od: contact_lens_rx_axis_od as number | null,
    contact_lens_rx_add_od: contact_lens_rx_add_od as number | null,
    contact_lens_rx_base_curve_od: contact_lens_rx_base_curve_od as
      | number
      | null,
    contact_lens_rx_diameter_od: contact_lens_rx_diameter_od as number | null,
    contact_lens_rx_sphere_os: contact_lens_rx_sphere_os as number | null,
    contact_lens_rx_cylinder_os: contact_lens_rx_cylinder_os as number | null,
    contact_lens_rx_axis_os: contact_lens_rx_axis_os as number | null,
    contact_lens_rx_add_os: contact_lens_rx_add_os as number | null,
    contact_lens_rx_base_curve_os: contact_lens_rx_base_curve_os as
      | number
      | null,
    contact_lens_rx_diameter_os: contact_lens_rx_diameter_os as number | null,
  };

  if (!useMobileStock) {
    return handleRpcPath(ctx);
  }
  return handleLegacyPath(ctx);
}

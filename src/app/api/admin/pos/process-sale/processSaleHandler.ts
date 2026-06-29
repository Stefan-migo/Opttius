/**
 * Process Sale Handler — orchestrates validation, lookups, stock, and dispatch.
 *
 * Thin composer: delegates to extracted services for auth/session, business
 * lookups, stock/work-order, and payment computation. Pure extraction —
 * no behavioral changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "@/lib/api/errors";
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
import { createServiceRoleClient } from "@/utils/supabase/server";
import { handleAuthSession } from "./processAuthSession";
import { handleBusinessLookups } from "./processSaleBusinessLookups";
import { handleStockAndWorkOrder } from "./processSaleStockAndWorkOrder";
import {
  computePaymentAmount,
  computeDbPaymentMethod,
} from "./processPaymentUtils";
import { handleRpcPath } from "./processRpcHandler";
import { handleLegacyPath } from "./processLegacyHandler";
import type { ProcessSaleContext } from "./processSaleTypes";

export async function handleProcessSale(
  request: NextRequest,
): Promise<NextResponse> {
  logger.info("POS Process Sale API called");

  // Validate request body
  let validatedBody: Record<string, unknown>;
  try {
    validatedBody = await parseAndValidateBody(request, processSaleSchema);
  } catch (error) {
    if (error instanceof ValidationError) return validationErrorResponse(error);
    throw error;
  }

  // 1. Auth + Session
  const authResult = await handleAuthSession(request, validatedBody);
  if (authResult instanceof NextResponse) return authResult;

  const {
    user,
    effectiveBranchId,
    fieldOperationId,
    posSessionId,
    siiInvoiceNumber,
  } = authResult;

  const supabaseServiceRole = createServiceRoleClient();

  // Idempotency check
  const idempotency_key = validatedBody.idempotency_key as string | undefined;
  if (idempotency_key) {
    const { data: existing } = await supabaseServiceRole
      .from("pos_sale_idempotency")
      .select("response_snapshot")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();
    if ((existing as Record<string, unknown> | null)?.response_snapshot) {
      const existingRecord = existing as Record<string, unknown>;
      logger.info("Idempotency hit", { idempotency_key });
      return createApiSuccessResponse(existingRecord.response_snapshot);
    }
  }

  // 2. Business lookups
  const lookupResult = await handleBusinessLookups({
    supabaseServiceRole,
    validatedBody,
    effectiveBranchId,
    user,
  });
  if (lookupResult instanceof NextResponse) return lookupResult;

  const {
    customer,
    purchaseOrder,
    copagoAmount,
    institutionalAmount,
    quote,
    lensFamily,
    lensInfo,
    orderNumber,
    orderItems,
    customerName,
    billingFirstName,
    billingLastName,
    orderOrganizationId,
    frameInfo,
    treatmentsCost,
    laborCost,
    productsForStockCheck,
  } = lookupResult;

  // 3. Stock + Work order
  const stockResult = await handleStockAndWorkOrder({
    validatedBody,
    effectiveBranchId,
    fieldOperationId,
    productsForStockCheck,
  });
  if (stockResult instanceof NextResponse) return stockResult;

  const { actuallyRequiresWorkOrder } = stockResult;

  // Payment computation
  const {
    agreement_id,
    deposit_amount,
    cash_received,
    total_amount,
    payment_method_type,
    payments: paymentsArray,
    subtotal,
    tax_amount,
    currency,
    payment_status,
    email,
    customer_id,
    customer_name,
    customer_rut,
    sii_rut,
    sii_business_name,
    fiscal_reference,
    change_amount,
    quote_id,
    presbyopia_solution,
    far_lens_family_id,
    near_lens_family_id,
    far_lens_cost,
    near_lens_cost,
    contact_lens_family_id,
    contact_lens_quantity,
    contact_lens_cost,
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
  } = validatedBody as Record<string, unknown>;

  const paymentAmount = computePaymentAmount({
    agreementId: agreement_id as string | null,
    copagoAmount,
    paymentsArray: (paymentsArray || []) as Array<{ amount: number; method: string }>,
    depositAmount: deposit_amount as number | null,
    cashReceived: cash_received as number | null,
    totalAmount: total_amount as number,
  });
  const dbPaymentMethod = computeDbPaymentMethod({
    agreementId: agreement_id as string | null,
    copagoAmount,
    paymentMethodType: payment_method_type as string,
    paymentsArray: (paymentsArray || []) as Array<{ amount: number; method: string }>,
  });
  const balance = (total_amount as number) - paymentAmount;

  // Build context and dispatch
  const { createClient: createServerClient } = await import("@/utils/supabase/server");
  const ctx: ProcessSaleContext = {
    supabase: await createServerClient(),
    supabaseServiceRole,
    user: user as any,
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
    items: (validatedBody.items || []) as Array<Record<string, unknown>>,
    productsForStockCheck,
    agreement_id: agreement_id as string | null,
    purchase_order_id: validatedBody.purchase_order_id as string | null,
    copagoAmount,
    institutionalAmount,
    purchaseOrder,
    paymentsArray: (paymentsArray || []) as Array<Record<string, unknown>>,
    deposit_amount: deposit_amount as number | null,
    cash_received: cash_received as number | null,
    fiscal_reference: fiscal_reference as string | null,
    change_amount: change_amount as number | null,
    siiInvoiceNumber,
    actuallyRequiresWorkOrder,
    frameInfo: frameInfo as any,
    lensInfo: lensInfo as any,
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
    contact_lens_rx_base_curve_od: contact_lens_rx_base_curve_od as number | null,
    contact_lens_rx_diameter_od: contact_lens_rx_diameter_od as number | null,
    contact_lens_rx_sphere_os: contact_lens_rx_sphere_os as number | null,
    contact_lens_rx_cylinder_os: contact_lens_rx_cylinder_os as number | null,
    contact_lens_rx_axis_os: contact_lens_rx_axis_os as number | null,
    contact_lens_rx_add_os: contact_lens_rx_add_os as number | null,
    contact_lens_rx_base_curve_os: contact_lens_rx_base_curve_os as number | null,
    contact_lens_rx_diameter_os: contact_lens_rx_diameter_os as number | null,
  };

  if (!fieldOperationId) return handleRpcPath(ctx);
  return handleLegacyPath(ctx);
}

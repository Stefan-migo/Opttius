/**
 * Process Sale Business Lookups — customer, agreement, quote, lens, prescription, order number.
 *
 * Extracted from processSaleHandler.ts. No behavioral changes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { buildCustomerName,buildOrderItems } from "./processResponseBuilder";
import { handleAgreementLookups } from "./processSaleAgreementLookups";
import { computeOrderNumber } from "./processSaleValidation";

export interface BusinessLookupParams {
  supabase: SupabaseClient;
  validatedBody: Record<string, unknown>;
  effectiveBranchId: string | null;
  user: { id: string };
}

export interface BusinessLookupResult {
  customer: Record<string, unknown> | null;
  agreement: Record<string, unknown> | null;
  purchaseOrder: Record<string, unknown> | null;
  copagoAmount: number | null;
  institutionalAmount: number | null;
  quote: Record<string, unknown> | null;
  lensFamily: Record<string, unknown> | null;
  lensInfo: Record<string, unknown>;
  orderNumber: string;
  orderItems: Array<Record<string, unknown>>;
  customerName: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
  orderOrganizationId: string | null;
  frameInfo: Record<string, unknown>;
  treatmentsCost: number;
  laborCost: number;
  productsForStockCheck: Array<Record<string, unknown>>;
}

export async function handleBusinessLookups(
  params: BusinessLookupParams,
): Promise<BusinessLookupResult | NextResponse> {
  const { supabase, validatedBody, effectiveBranchId, user } = params;

  const {
    email,
    customer_id,
    customer_name,
    customer_rut,
    sii_business_name,
    items,
    lens_data,
    frame_data,
    agreement_id,
    purchase_order_id,
    quote_id,
    total_amount,
  } = validatedBody as Record<string, unknown>;

  const itemsArr = (items || []) as Array<Record<string, unknown>>;

  // Frame and lens info
  const validationModule = await import("./processSaleValidation");
  const frameInfo = validationModule.extractFrameInfo(
    frame_data as Record<string, unknown> | null | undefined,
    itemsArr as unknown,
  );
  const lensInfo = validationModule.extractLensInfo(
    lens_data as Record<string, unknown> | null | undefined,
    itemsArr as unknown,
  );
  const treatmentsCost = validationModule.extractTreatmentsCost(itemsArr as unknown);
  const laborCost = validationModule.extractLaborCost(itemsArr as unknown);

  // Customer lookup
  let customer: Record<string, unknown> | null = null;
  if (customer_id) {
    const { data: customerData } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone, rut")
      .eq("id", customer_id as string)
      .single();
    if (!customerData) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 }) as NextResponse;
    }
    customer = customerData as Record<string, unknown>;
  } else {
    customer = {
      id: null,
      first_name: ((customer_name as string) || "").split(" ")[0] || null,
      last_name: ((customer_name as string) || "").split(" ").slice(1).join(" ") || null,
      email: email || null,
      phone: null,
      rut: customer_rut || null,
    };
  }

  // Agreement + purchase order validation
  const agreementResult = await handleAgreementLookups(
    supabase,
    agreement_id as string | undefined,
    purchase_order_id as string | undefined,
    total_amount as number | undefined,
  );
  if (agreementResult instanceof NextResponse) {
    return agreementResult;
  }
  const { agreement, purchaseOrder, copagoAmount, institutionalAmount } = agreementResult;

  // Quote validation
  let quote: Record<string, unknown> | null = null;
  if (quote_id) {
    const { data: quoteData } = await supabase
      .from("quotes")
      .select("id, status, converted_to_work_order_id, customer_id")
      .eq("id", quote_id as string)
      .single();
    if (!quoteData) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 }) as NextResponse;
    }
    quote = quoteData as Record<string, unknown>;
    if (quote.status === "converted_to_work" || quote.converted_to_work_order_id) {
      return NextResponse.json({ error: "Este presupuesto ya fue utilizado" }, { status: 400 }) as NextResponse;
    }
  }

  // Lens family validation
  let lensFamily: Record<string, unknown> | null = null;
  if (lensInfo.lens_family_id) {
    const { data: family } = await supabase
      .from("lens_families")
      .select("id, name, lens_type, lens_material, is_active")
      .eq("id", lensInfo.lens_family_id as string)
      .single();
    if (!family) {
      return NextResponse.json({ error: "Familia de lentes no encontrada" }, { status: 400 }) as NextResponse;
    }
    lensFamily = family as Record<string, unknown>;
    if (!lensFamily.is_active) {
      return NextResponse.json({ error: "La familia de lentes está desactivada" }, { status: 400 }) as NextResponse;
    }
    if (lensInfo.lens_type && lensInfo.lens_type !== lensFamily.lens_type) {
      lensInfo.lens_type = lensFamily.lens_type;
    }
    if (lensInfo.lens_material && lensInfo.lens_material !== lensFamily.lens_material) {
      lensInfo.lens_material = lensFamily.lens_material;
    }
  }

  // Prescription validation
  if (lensInfo.prescription_id) {
    const { data: prescription } = await supabase
      .from("prescriptions")
      .select("id, customer_id, od_sphere, od_cylinder, os_sphere, os_cylinder")
      .eq("id", lensInfo.prescription_id as string)
      .single();
    if (!prescription) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 400 }) as NextResponse;
    }
    const prescRecord = prescription as Record<string, unknown>;
    if (customer_id && prescRecord.customer_id !== customer_id) {
      return NextResponse.json(
        { error: "La receta no pertenece al cliente seleccionado" },
        { status: 400 },
      ) as NextResponse;
    }

    if (lensInfo.lens_family_id) {
      const sphere =
        Math.abs(prescRecord.od_sphere as number || 0) >=
        Math.abs(prescRecord.os_sphere as number || 0)
          ? prescRecord.od_sphere || 0
          : prescRecord.os_sphere || 0;
      const cylinder =
        Math.abs(prescRecord.od_cylinder as number || 0) >=
        Math.abs(prescRecord.os_cylinder as number || 0)
          ? prescRecord.od_cylinder || 0
          : prescRecord.os_cylinder || 0;

      const { data: priceMatrix } = await supabase.rpc(
        "calculate_lens_price",
        { p_lens_family_id: lensInfo.lens_family_id, p_sphere: sphere, p_cylinder: cylinder || 0 },
      );
      if (priceMatrix && (priceMatrix as Array<unknown>).length > 0 && (lensInfo.lens_cost as number) > 0) {
        const expectedPrice = (priceMatrix as Array<Record<string, unknown>>)[0].price as number;
        const diff = Math.abs((lensInfo.lens_cost as number) - expectedPrice);
        if (diff > expectedPrice * 0.05) {
          const { appLogger } = await import("@/lib/logger");
          appLogger.warn("Lens price differs significantly from matrix", { expected: expectedPrice, actual: lensInfo.lens_cost });
        }
      }
    }
  }

  // Order number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("order_number")
    .like("order_number", `ORD-${dateStr}-%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orderNumber = computeOrderNumber(
    (lastOrder as Record<string, unknown> | null)?.order_number as string | null,
  );

  const orderItems = buildOrderItems(itemsArr as unknown) as Array<Record<string, unknown>>;

  const { customerName, billingFirstName, billingLastName } = buildCustomerName({
    customer: customer as Record<string, unknown> | null,
    customerName: customer_name as string | null,
    siiBusinessName: sii_business_name as string | null,
    customerId: customer_id as string | null,
  });

  // Organization ID resolution
  let orderOrganizationId: string | null = null;
  if (effectiveBranchId) {
    const { data: branchRow } = await supabase
      .from("branches")
      .select("organization_id")
      .eq("id", effectiveBranchId)
      .single();
    orderOrganizationId = (branchRow as Record<string, unknown> | null)?.organization_id as string | null;
  }
  if (!orderOrganizationId) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    orderOrganizationId = (adminRow as Record<string, unknown> | null)?.organization_id as string | null;
  }

  // Products for stock
  const productIdsForStock = itemsArr
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
    const { data: products } = await supabase
      .from("products")
      .select("id, name, product_type")
      .in("id", productIdsForStock);
    productsForStockCheck = (products || []) as Array<Record<string, unknown>>;
  }

  return {
    customer,
    agreement,
    purchaseOrder,
    copagoAmount,
    institutionalAmount,
    quote,
    lensFamily,
    lensInfo: lensInfo as Record<string, unknown>,
    orderNumber,
    orderItems,
    customerName,
    billingFirstName,
    billingLastName,
    orderOrganizationId,
    frameInfo: frameInfo as Record<string, unknown>,
    treatmentsCost,
    laborCost,
    productsForStockCheck,
  };
}

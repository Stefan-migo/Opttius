/* eslint max-lines: off */
/**
 * Process Sale Business Lookups — customer, agreement, quote, lens, prescription, order number.
 *
 * Extracted from processSaleHandler.ts. No behavioral changes.
 */

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { createApiErrorResponse } from "@/lib/api/response";
import { APIError } from "@/lib/api/errors";
import { computeOrderNumber } from "./processSaleValidation";
import { buildOrderItems, buildCustomerName } from "./processResponseBuilder";
import type { ProcessSaleContext } from "./processSaleTypes";

export interface BusinessLookupParams {
  supabaseServiceRole: ReturnType<typeof createServiceRoleClient>;
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
  const { supabaseServiceRole, validatedBody, effectiveBranchId, user } = params;

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
    itemsArr as any,
  );
  const lensInfo = validationModule.extractLensInfo(
    lens_data as Record<string, unknown> | null | undefined,
    itemsArr as any,
  );
  const treatmentsCost = validationModule.extractTreatmentsCost(itemsArr as any);
  const laborCost = validationModule.extractLaborCost(itemsArr as any);

  // Customer lookup
  let customer: Record<string, unknown> | null = null;
  if (customer_id) {
    const { data: customerData } = await supabaseServiceRole
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
  let agreement: Record<string, unknown> | null = null;
  let purchaseOrder: Record<string, unknown> | null = null;
  let copagoAmount: number | null = null;
  let institutionalAmount: number | null = null;

  if (agreement_id) {
    const { data: agreementData } = await supabaseServiceRole
      .from("agreements")
      .select("id, status, valid_from, valid_until, billing_rules")
      .eq("id", agreement_id as string)
      .single();
    if (!agreementData) {
      return NextResponse.json({ error: "Convenio no encontrado" }, { status: 404 }) as NextResponse;
    }
    agreement = agreementData as Record<string, unknown>;

    if (agreement.status !== "active") {
      return NextResponse.json({ error: "El convenio no está activo" }, { status: 400 }) as NextResponse;
    }
    const today = new Date().toISOString().split("T")[0];
    const validFrom = agreement.valid_from as string;
    const validUntil = agreement.valid_until as string | undefined;
    if (validFrom > today) {
      return NextResponse.json({ error: "El convenio aún no está vigente" }, { status: 400 }) as NextResponse;
    }
    if (validUntil && validUntil < today) {
      return NextResponse.json({ error: "El convenio ha expirado" }, { status: 400 }) as NextResponse;
    }

    if (!purchase_order_id) {
      return NextResponse.json(
        { error: "La orden de compra (OC) es obligatoria para ventas bajo convenio" },
        { status: 400 },
      ) as NextResponse;
    }

    const { data: poData } = await supabaseServiceRole
      .from("agreement_purchase_orders")
      .select("id, status, max_amount, used_amount")
      .eq("id", purchase_order_id as string)
      .eq("agreement_id", agreement_id as string)
      .single();
    if (!poData) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada o no pertenece al convenio" },
        { status: 404 },
      ) as NextResponse;
    }
    purchaseOrder = poData as Record<string, unknown>;
    if (purchaseOrder.status !== "active") {
      return NextResponse.json({ error: "La orden de compra no está activa" }, { status: 400 }) as NextResponse;
    }

    const rules = (agreement.billing_rules || {}) as Record<string, unknown>;
    const copagoPercent = (rules.copago_percent as number) ?? 20;
    const _institutionalPercent = (rules.institutional_percent as number) ?? 80;
    copagoAmount = Math.round((total_amount as number) * (copagoPercent / 100) * 100) / 100;
    institutionalAmount = Math.round(((total_amount as number) - copagoAmount) * 100) / 100;

    if (purchaseOrder.max_amount != null) {
      const newUsed = ((purchaseOrder.used_amount as number) || 0) + institutionalAmount;
      if (newUsed > (purchaseOrder.max_amount as number)) {
        return NextResponse.json(
          { error: "La OC excede el monto máximo autorizado" },
          { status: 400 },
        ) as NextResponse;
      }
    }
  }

  // Quote validation
  let quote: Record<string, unknown> | null = null;
  if (quote_id) {
    const { data: quoteData } = await supabaseServiceRole
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
  const lensInfoRecord = lensInfo as any;
  let lensFamily: Record<string, unknown> | null = null;
  if (lensInfoRecord.lens_family_id) {
    const { data: family } = await supabaseServiceRole
      .from("lens_families")
      .select("id, name, lens_type, lens_material, is_active")
      .eq("id", lensInfoRecord.lens_family_id as string)
      .single();
    if (!family) {
      return NextResponse.json({ error: "Familia de lentes no encontrada" }, { status: 400 }) as NextResponse;
    }
    lensFamily = family as Record<string, unknown>;
    if (!lensFamily.is_active) {
      return NextResponse.json({ error: "La familia de lentes está desactivada" }, { status: 400 }) as NextResponse;
    }
    if (lensInfoRecord.lens_type && lensInfoRecord.lens_type !== lensFamily.lens_type) {
      lensInfoRecord.lens_type = lensFamily.lens_type;
    }
    if (lensInfoRecord.lens_material && lensInfoRecord.lens_material !== lensFamily.lens_material) {
      lensInfoRecord.lens_material = lensFamily.lens_material;
    }
  }

  // Prescription validation
  if (lensInfoRecord.prescription_id) {
    const { data: prescription } = await supabaseServiceRole
      .from("prescriptions")
      .select("id, customer_id, od_sphere, od_cylinder, os_sphere, os_cylinder")
      .eq("id", lensInfoRecord.prescription_id as string)
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

    if (lensInfoRecord.lens_family_id) {
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

      const { data: priceMatrix } = await supabaseServiceRole.rpc(
        "calculate_lens_price",
        { p_lens_family_id: lensInfoRecord.lens_family_id, p_sphere: sphere, p_cylinder: cylinder || 0 },
      );
      if (priceMatrix && (priceMatrix as Array<unknown>).length > 0 && (lensInfoRecord.lens_cost as number) > 0) {
        const expectedPrice = (priceMatrix as Array<Record<string, unknown>>)[0].price as number;
        const diff = Math.abs((lensInfoRecord.lens_cost as number) - expectedPrice);
        if (diff > expectedPrice * 0.05) {
          const { appLogger } = await import("@/lib/logger");
          appLogger.warn("Lens price differs significantly from matrix", { expected: expectedPrice, actual: lensInfoRecord.lens_cost });
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
    (lastOrder as Record<string, unknown> | null)?.order_number as string | null,
  );

  const orderItems = buildOrderItems(itemsArr as any) as unknown as Array<Record<string, unknown>>;

  const { customerName, billingFirstName, billingLastName } = buildCustomerName({
    customer: customer as Record<string, unknown> | null,
    customerName: customer_name as string | null,
    siiBusinessName: sii_business_name as string | null,
    customerId: customer_id as string | null,
  });

  // Organization ID resolution
  let orderOrganizationId: string | null = null;
  if (effectiveBranchId) {
    const { data: branchRow } = await supabaseServiceRole
      .from("branches")
      .select("organization_id")
      .eq("id", effectiveBranchId)
      .single();
    orderOrganizationId = (branchRow as Record<string, unknown> | null)?.organization_id as string | null;
  }
  if (!orderOrganizationId) {
    const { data: adminRow } = await supabaseServiceRole
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
    const { data: products } = await supabaseServiceRole
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
    lensInfo: lensInfoRecord,
    orderNumber,
    orderItems,
    customerName,
    billingFirstName,
    billingLastName,
    orderOrganizationId,
    frameInfo: frameInfo as any,
    treatmentsCost,
    laborCost,
    productsForStockCheck,
  };
}

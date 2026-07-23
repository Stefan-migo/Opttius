/**
 * Agreement and purchase order lookup logic for process-sale.
 *
 * Extracted from processSaleBusinessLookups.ts to reduce file size.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export interface AgreementLookupResult {
  agreement: Record<string, unknown> | null;
  purchaseOrder: Record<string, unknown> | null;
  copagoAmount: number | null;
  institutionalAmount: number | null;
}

export async function handleAgreementLookups(
  supabase: SupabaseClient,
  agreementId: string | undefined,
  purchaseOrderId: string | undefined,
  totalAmount: number | undefined,
): Promise<AgreementLookupResult | NextResponse> {
  if (!agreementId) {
    return {
      agreement: null,
      purchaseOrder: null,
      copagoAmount: null,
      institutionalAmount: null,
    };
  }

  const { data: agreementData } = await supabase
    .from("agreements")
    .select("id, status, valid_from, valid_until, billing_rules")
    .eq("id", agreementId as string)
    .single();
  if (!agreementData) {
    return NextResponse.json(
      { error: "Convenio no encontrado" },
      { status: 404 },
    ) as NextResponse;
  }
  const agreement = agreementData as Record<string, unknown>;

  if (agreement.status !== "active") {
    return NextResponse.json(
      { error: "El convenio no está activo" },
      { status: 400 },
    ) as NextResponse;
  }
  const today = new Date().toISOString().split("T")[0];
  const validFrom = agreement.valid_from as string;
  const validUntil = agreement.valid_until as string | undefined;
  if (validFrom > today) {
    return NextResponse.json(
      { error: "El convenio aún no está vigente" },
      { status: 400 },
    ) as NextResponse;
  }
  if (validUntil && validUntil < today) {
    return NextResponse.json(
      { error: "El convenio ha expirado" },
      { status: 400 },
    ) as NextResponse;
  }

  if (!purchaseOrderId) {
    return NextResponse.json(
      {
        error:
          "La orden de compra (OC) es obligatoria para ventas bajo convenio",
      },
      { status: 400 },
    ) as NextResponse;
  }

  const { data: poData } = await supabase
    .from("agreement_purchase_orders")
    .select("id, status, max_amount, used_amount")
    .eq("id", purchaseOrderId as string)
    .eq("agreement_id", agreementId as string)
    .single();
  if (!poData) {
    return NextResponse.json(
      { error: "Orden de compra no encontrada o no pertenece al convenio" },
      { status: 404 },
    ) as NextResponse;
  }
  const purchaseOrder = poData as Record<string, unknown>;
  if (purchaseOrder.status !== "active") {
    return NextResponse.json(
      { error: "La orden de compra no está activa" },
      { status: 400 },
    ) as NextResponse;
  }

  const rules = (agreement.billing_rules || {}) as Record<string, unknown>;
  const copagoPercent = (rules.copago_percent as number) ?? 20;
  const _institutionalPercent = (rules.institutional_percent as number) ?? 80;
  const copagoAmount =
    Math.round((totalAmount as number) * (copagoPercent / 100) * 100) / 100;
  const institutionalAmount =
    Math.round(((totalAmount as number) - copagoAmount) * 100) / 100;

  if (purchaseOrder.max_amount != null) {
    const newUsed =
      ((purchaseOrder.used_amount as number) || 0) + institutionalAmount;
    if (newUsed > (purchaseOrder.max_amount as number)) {
      return NextResponse.json(
        { error: "La OC excede el monto máximo autorizado" },
        { status: 400 },
      ) as NextResponse;
    }
  }

  return { agreement, purchaseOrder, copagoAmount, institutionalAmount };
}

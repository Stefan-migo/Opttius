import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

import { buildContactLensItem, buildFrameItem, buildLensItems, buildNearFrameItem, buildTreatmentsLaborItems } from "./_helpers/buildItems";


/**
 * Endpoint para cargar un presupuesto al POS
 * Retorna los datos del presupuesto en formato compatible con el carrito del POS
 * Permite que el presupuesto sea editado antes de procesar el pago
 */
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

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
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Build branch filter function
    const applyBranchFilter = (query: ReturnType<typeof supabase.from>) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    // Fetch quote with branch access check
    const { data: quote, error: quoteError } = await applyBranchFilter(
      supabaseServiceRole.from("quotes").select(`
        *,
        customer:customers!quotes_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!quotes_prescription_id_fkey(*),
        frame_product:products!quotes_frame_product_id_fkey(id, name, sku, price, featured_image, barcode)
      `),
    )
      .eq("id", id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado o sin acceso" },
        { status: 404 },
      );
    }

    // Validate that quote is not already used (accepted or converted)
    if (
      quote.status === "accepted" ||
      quote.status === "converted_to_work" ||
      quote.converted_to_work_order_id
    ) {
      return NextResponse.json(
        {
          error:
            "Este presupuesto ya fue utilizado y no puede usarse nuevamente",
          workOrderId: quote.converted_to_work_order_id,
          status: quote.status,
        },
        { status: 400 },
      );
    }

    // Build items array for POS cart
    const items: unknown[] = [];
    const frameItem = buildFrameItem(quote as Record<string, unknown>);
    if (frameItem) items.push(frameItem);
    items.push(...buildLensItems(quote as Record<string, unknown>));
    const nearFrameItem = buildNearFrameItem(quote as Record<string, unknown>);
    if (nearFrameItem) items.push(nearFrameItem);
    items.push(...buildTreatmentsLaborItems(quote as Record<string, unknown>));
    const contactLensItem = buildContactLensItem(quote as Record<string, unknown>);
    if (contactLensItem) items.push(contactLensItem);

    // Return data in format compatible with POS
    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      customerId: quote.customer_id,
      customer: quote.customer,
      prescriptionId: quote.prescription_id,
      prescription: quote.prescription,
      items,
      totals: {
        subtotal: quote.subtotal || 0,
        tax: quote.tax_amount || 0,
        discount: quote.discount_amount || 0,
        discount_percentage: quote.discount_percentage || 0,
        total: quote.total_amount || 0,
      },
      notes: quote.customer_notes || null,
      internalNotes: quote.notes || null,
      // Include original quote data for reference (form pre-fill)
      originalQuote: {
        frame_cost: quote.frame_cost || 0,
        lens_cost: quote.lens_cost || 0,
        treatments_cost: quote.treatments_cost || 0,
        labor_cost: quote.labor_cost || 0,
        contact_lens_family_id: quote.contact_lens_family_id || null,
        contact_lens_quantity: quote.contact_lens_quantity || 1,
        contact_lens_cost: quote.contact_lens_cost || 0,
        contact_lens_price: quote.contact_lens_price || 0,
        presbyopia_solution: quote.presbyopia_solution || "none",
        far_lens_family_id: quote.far_lens_family_id || null,
        near_lens_family_id: quote.near_lens_family_id || null,
        far_lens_cost: quote.far_lens_cost ?? 0,
        near_lens_cost: quote.near_lens_cost ?? 0,
        near_frame_product_id: quote.near_frame_product_id || null,
        near_frame_name: quote.near_frame_name || null,
        near_frame_brand: quote.near_frame_brand || null,
        near_frame_model: quote.near_frame_model || null,
        near_frame_color: quote.near_frame_color || null,
        near_frame_size: quote.near_frame_size || null,
        near_frame_sku: quote.near_frame_sku || null,
        near_frame_price: quote.near_frame_price ?? 0,
        near_frame_cost: quote.near_frame_cost ?? 0,
        customer_own_near_frame: quote.customer_own_near_frame ?? false,
      },
    });
  } catch (error) {
    logger.error("Error loading quote to POS", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

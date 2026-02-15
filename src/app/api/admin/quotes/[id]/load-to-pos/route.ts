import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

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
      `) as any,
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
    const items: any[] = [];

    // Add frame as item if exists
    // Check if there's any frame data (name, brand, model, or product_id)
    const hasFrameData =
      quote.frame_product_id ||
      quote.frame_name ||
      (quote.frame_brand && quote.frame_model) ||
      quote.frame_price !== null;

    if (hasFrameData) {
      if (quote.customer_own_frame) {
        // If customer brings their own frame, we still need to track it but with $0 price
        // This is important for work order creation
        items.push({
          type: "product",
          id: `frame-customer-own-${quote.id}`,
          name: quote.frame_name || "Marco del cliente",
          price: 0,
          sku: "FRAME-CUSTOMER-OWN",
          quantity: 1,
          customer_own_frame: true,
          frame_brand: quote.frame_brand,
          frame_model: quote.frame_model,
          frame_color: quote.frame_color,
          frame_size: quote.frame_size,
        });
      } else {
        // Customer is buying the frame - use frame_price from quote, but fallback to product price
        // Priority: quote.frame_price > quote.frame_product.price > 0
        const framePrice =
          quote.frame_price && quote.frame_price > 0
            ? quote.frame_price
            : quote.frame_product?.price && quote.frame_product.price > 0
              ? quote.frame_product.price
              : 0;
        const frameId = quote.frame_product_id || `frame-manual-${quote.id}`;

        items.push({
          type: "product",
          id: frameId,
          name:
            quote.frame_name ||
            quote.frame_product?.name ||
            (quote.frame_brand && quote.frame_model
              ? `${quote.frame_brand} ${quote.frame_model}`
              : "Marco"),
          price: framePrice,
          sku: quote.frame_sku || quote.frame_product?.sku || "FRAME",
          barcode: quote.frame_product?.barcode,
          featured_image: quote.frame_product?.featured_image,
          inventory_quantity: quote.frame_product?.inventory_quantity || 0,
          quantity: 1,
          // Frame metadata
          frame_brand: quote.frame_brand,
          frame_model: quote.frame_model,
          frame_color: quote.frame_color,
          frame_size: quote.frame_size,
          customer_own_frame: false,
        });
      }
    }

    // Add optical lens as custom item (lens_complete type)
    if (
      quote.lens_type &&
      quote.lens_type !== "Lentes de contacto" &&
      quote.lens_material
    ) {
      items.push({
        type: "lens_complete",
        id: `lens-${quote.id}`,
        name: `Lente ${quote.lens_type} ${quote.lens_material}`,
        price: quote.lens_cost || 0,
        quantity: 1,
        lens_family_id: quote.lens_family_id,
        lens_type: quote.lens_type,
        lens_material: quote.lens_material,
        lens_index: quote.lens_index,
        lens_treatments: quote.lens_treatments || [],
        lens_tint_color: quote.lens_tint_color,
        lens_tint_percentage: quote.lens_tint_percentage,
        treatments_cost: quote.treatments_cost || 0,
        labor_cost: quote.labor_cost || 0,
        prescription_id: quote.prescription_id,
      });
    }

    // Add contact lens as item when quote is for contact lenses
    if (
      quote.lens_type === "Lentes de contacto" ||
      quote.contact_lens_family_id
    ) {
      const contactLensPrice =
        quote.contact_lens_price ?? quote.contact_lens_cost ?? 0;
      items.push({
        type: "contact_lens",
        id: `contact-lens-${quote.id}`,
        name: `Lentes de Contacto${quote.contact_lens_quantity > 1 ? ` - ${quote.contact_lens_quantity} caja(s)` : ""}`,
        price: contactLensPrice,
        quantity: 1,
        contact_lens_family_id: quote.contact_lens_family_id,
        contact_lens_quantity: quote.contact_lens_quantity || 1,
        prescription_id: quote.prescription_id,
      });
    }

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

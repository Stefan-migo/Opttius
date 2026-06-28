import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient , createServiceRoleClient } from "@/utils/supabase/server";


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
      `) as unknown,
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

    // Add optical lens(es) - handle single lens and two_separate presbyopia
    const isTwoSeparate = quote.presbyopia_solution === "two_separate";
    if (
      quote.lens_type &&
      quote.lens_type !== "Lentes de contacto" &&
      quote.lens_material
    ) {
      if (isTwoSeparate && quote.far_lens_family_id) {
        // Far lens (distance)
        items.push({
          type: "lens_complete",
          id: `lens-far-${quote.id}`,
          name: `Lente Lejos ${quote.lens_type} ${quote.lens_material}`,
          price: quote.far_lens_cost || 0,
          quantity: 1,
          lens_family_id: quote.far_lens_family_id,
          lens_type: quote.lens_type,
          lens_material: quote.lens_material,
          lens_index: quote.lens_index,
          lens_treatments: quote.lens_treatments || [],
          lens_tint_color: quote.lens_tint_color,
          lens_tint_percentage: quote.lens_tint_percentage,
          treatments_cost: 0,
          labor_cost: 0,
          prescription_id: quote.prescription_id,
          is_far_lens: true,
        });
      }
      if (isTwoSeparate && quote.near_lens_family_id) {
        // Near lens (reading)
        items.push({
          type: "lens_complete",
          id: `lens-near-${quote.id}`,
          name: `Lente Cerca ${quote.lens_type} ${quote.lens_material}`,
          price: quote.near_lens_cost || 0,
          quantity: 1,
          lens_family_id: quote.near_lens_family_id,
          lens_type: quote.lens_type || "reading",
          lens_material: quote.lens_material,
          lens_index: quote.lens_index,
          lens_treatments: quote.lens_treatments || [],
          lens_tint_color: quote.lens_tint_color,
          lens_tint_percentage: quote.lens_tint_percentage,
          treatments_cost: 0,
          labor_cost: 0,
          prescription_id: quote.prescription_id,
          is_near_lens: true,
        });
      }
      if (!isTwoSeparate) {
        // Single lens
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
      } else if (!quote.far_lens_family_id && !quote.near_lens_family_id) {
        // Fallback: two_separate but no far/near ids - use single lens
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
    }

    // Add near frame for two_separate presbyopia
    if (isTwoSeparate) {
      const hasNearFrameData =
        quote.near_frame_product_id ||
        quote.near_frame_name ||
        (quote.near_frame_brand && quote.near_frame_model) ||
        (quote.near_frame_price !== null && quote.near_frame_price > 0);

      if (hasNearFrameData) {
        if (quote.customer_own_near_frame) {
          items.push({
            type: "product",
            id: `near-frame-customer-own-${quote.id}`,
            name: quote.near_frame_name || "Marco de cerca del cliente",
            price: 0,
            sku: "NEAR-FRAME-CUSTOMER-OWN",
            quantity: 1,
            inventory_quantity: 999,
            customer_own_frame: true,
            customer_own_near_frame: true,
            frame_brand: quote.near_frame_brand,
            frame_model: quote.near_frame_model,
            frame_color: quote.near_frame_color,
            frame_size: quote.near_frame_size,
            is_near_frame: true,
          });
        } else {
          const nearFramePrice =
            quote.near_frame_price && quote.near_frame_price > 0
              ? quote.near_frame_price
              : quote.near_frame_cost || 0;
          items.push({
            type: "product",
            id: quote.near_frame_product_id || `near-frame-manual-${quote.id}`,
            name:
              quote.near_frame_name ||
              (quote.near_frame_brand && quote.near_frame_model
                ? `${quote.near_frame_brand} ${quote.near_frame_model} (Cerca)`
                : "Marco de Cerca"),
            price: nearFramePrice,
            sku: quote.near_frame_sku || "FRAME-NEAR",
            quantity: 1,
            inventory_quantity: 999,
            frame_brand: quote.near_frame_brand,
            frame_model: quote.near_frame_model,
            frame_color: quote.near_frame_color,
            frame_size: quote.near_frame_size,
            customer_own_frame: false,
            is_near_frame: true,
          });
        }
      }
    }

    // Add treatments and labor for two_separate (single items, not per-lens)
    if (isTwoSeparate && (quote.treatments_cost || 0) > 0) {
      items.push({
        type: "product",
        id: `treatments-two-separate-${quote.id}`,
        name: `Tratamientos: ${quote.lens_treatments?.join(", ") || "Varios"}`,
        price: quote.treatments_cost || 0,
        sku: "TREATMENTS",
        quantity: 1,
        inventory_quantity: 999,
      });
    }
    if (isTwoSeparate && (quote.labor_cost || 0) > 0) {
      items.push({
        type: "product",
        id: `labor-two-separate-${quote.id}`,
        name: "Mano de obra (montaje)",
        price: quote.labor_cost || 0,
        sku: "LABOR",
        quantity: 1,
        inventory_quantity: 999,
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

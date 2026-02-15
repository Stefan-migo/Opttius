import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { NotificationService } from "@/lib/notifications/notification-service";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

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
      supabaseServiceRole.from("quotes").select("*") as any,
    )
      .eq("id", id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado o sin acceso" },
        { status: 404 },
      );
    }

    // Generate work order number
    const { data: workOrderNumber, error: workOrderNumberError } =
      await supabaseServiceRole.rpc("generate_work_order_number");

    if (workOrderNumberError || !workOrderNumber) {
      logger.error("Error generating work order number", workOrderNumberError);
      return NextResponse.json(
        { error: "Failed to generate work order number" },
        { status: 500 },
      );
    }

    // Get prescription snapshot if prescription_id is provided
    let prescriptionSnapshot = null;
    if (quote.prescription_id) {
      const { data: prescription } = await supabaseServiceRole
        .from("prescriptions")
        .select("*")
        .eq("id", quote.prescription_id)
        .single();

      if (prescription) {
        prescriptionSnapshot = prescription;
      }
    }

    // Create work order from quote
    const { data: newWorkOrder, error: workOrderError } =
      await supabaseServiceRole
        .from("lab_work_orders")
        .insert({
          work_order_number: workOrderNumber,
          customer_id: quote.customer_id,
          prescription_id: quote.prescription_id || null,
          quote_id: quote.id,
          branch_id: quote.branch_id,
          frame_product_id: quote.frame_product_id || null,
          frame_name: quote.frame_name,
          frame_brand: quote.frame_brand,
          frame_model: quote.frame_model,
          frame_color: quote.frame_color,
          frame_size: quote.frame_size,
          frame_sku: quote.frame_sku,
          lens_type: quote.lens_type,
          lens_material: quote.lens_material,
          lens_index: quote.lens_index,
          lens_treatments: quote.lens_treatments || [],
          lens_tint_color: quote.lens_tint_color,
          lens_tint_percentage: quote.lens_tint_percentage,
          prescription_snapshot: prescriptionSnapshot,
          frame_cost: quote.frame_cost || 0,
          lens_cost: quote.lens_cost || 0,
          treatments_cost: quote.treatments_cost || 0,
          labor_cost: quote.labor_cost || 0,
          lab_cost: 0,
          subtotal: quote.subtotal || 0,
          tax_amount: quote.tax_amount || 0,
          discount_amount: quote.discount_amount || 0,
          total_amount: quote.total_amount,
          currency: quote.currency || "CLP",
          payment_status: "pending",
          deposit_amount: 0,
          balance_amount: quote.total_amount,
          customer_notes: quote.customer_notes,
          status: "ordered",
          created_by: user.id,
        })
        .select(
          `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(*)
      `,
        )
        .single();

    if (workOrderError) {
      logger.error("Error creating work order", workOrderError);
      return NextResponse.json(
        {
          error: "Failed to create work order",
          details: workOrderError.message,
        },
        { status: 500 },
      );
    }

    // Update quote status to accepted (since converting to work order means the quote was accepted)
    // Also preserve original status and link to work order
    await supabaseServiceRole
      .from("quotes")
      .update({
        status: "accepted", // Always change to accepted when converted to work order
        original_status: quote.status, // Preserve original status before conversion
        converted_to_work_order_id: newWorkOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Create notification for quote conversion (non-blocking)
    NotificationService.notifyQuoteConverted(
      id,
      quote.quote_number,
      newWorkOrder.id,
      newWorkOrder.work_order_number,
      quote.branch_id ?? newWorkOrder.branch_id ?? undefined,
    ).catch((err) => logger.warn("Error creating notification", err));

    // Also notify about new work order
    const customerName = newWorkOrder.customer
      ? `${newWorkOrder.customer.first_name || ""} ${newWorkOrder.customer.last_name || ""}`.trim() ||
        newWorkOrder.customer.email ||
        "Cliente"
      : "Cliente";

    NotificationService.notifyNewWorkOrder(
      newWorkOrder.id,
      newWorkOrder.work_order_number,
      customerName,
      newWorkOrder.total_amount,
      newWorkOrder.branch_id ?? undefined,
    ).catch((err) => logger.warn("Error creating notification", err));

    return NextResponse.json({
      success: true,
      workOrder: newWorkOrder,
    });
  } catch (error) {
    logger.error("Error converting quote to work order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

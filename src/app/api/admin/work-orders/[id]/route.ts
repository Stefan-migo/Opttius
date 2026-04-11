import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const supabaseServiceRole = createServiceRoleClient();

    // Use service role client to bypass RLS policies for admin access
    const { data: workOrder, error } = await supabaseServiceRole
      .from("lab_work_orders")
      .select(
        `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(*),
        quote:quotes!lab_work_orders_quote_id_fkey(*),
        frame_product:products!lab_work_orders_frame_product_id_fkey(id, name, price, frame_brand, frame_model),
        lens_family:lens_families!lab_work_orders_lens_family_id_fkey(id, name),
        far_lens_family:lens_families!lab_work_orders_far_lens_family_id_fkey(id, name),
        near_lens_family:lens_families!lab_work_orders_near_lens_family_id_fkey(id, name)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !workOrder) {
      logger.error("Error fetching work order", error);
      return NextResponse.json(
        {
          error: "Work order not found",
          details: error?.message,
        },
        { status: 404 },
      );
    }

    // Validate branch access
    const branchContext = await getBranchContext(request, user.id);
    const hasAccess = await validateBranchAccess(user.id, workOrder.branch_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este trabajo",
        },
        { status: 403 },
      );
    }

    // Get status history using service role client
    // Note: changed_by references auth.users, not profiles, so we can't join directly
    const { data: statusHistory } = await supabaseServiceRole
      .from("lab_work_order_status_history")
      .select("*")
      .eq("work_order_id", id)
      .order("changed_at", { ascending: false });

    return NextResponse.json({
      workOrder,
      statusHistory: statusHistory || [],
    });
  } catch (error) {
    logger.error("Error fetching work order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
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
    const body = await request.json();

    // Get branch context and validate access
    const branchContext = await getBranchContext(request, user.id);

    // First, check if work order exists and get its branch_id
    const { data: existingWorkOrder } = await supabaseServiceRole
      .from("lab_work_orders")
      .select("branch_id")
      .eq("id", id)
      .single();

    if (!existingWorkOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    // Validate branch access
    const hasAccess = await validateBranchAccess(
      user.id,
      existingWorkOrder.branch_id,
    );
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este trabajo",
        },
        { status: 403 },
      );
    }

    const updateData: {
      updated_at: string;
      frame_name?: string;
      frame_brand?: string;
      frame_model?: string;
      frame_color?: string;
      frame_size?: string;
      frame_sku?: string;
      frame_serial_number?: string;
      lens_type?: string;
      lens_material?: string;
      lens_index?: string;
      lens_treatments?: string[];
      lens_tint_color?: string;
      lens_tint_percentage?: number;
      lab_name?: string;
      lab_contact?: string;
      lab_order_number?: string;
      lab_estimated_delivery_date?: string;
      frame_cost?: number;
      lens_cost?: number;
      treatments_cost?: number;
      labor_cost?: number;
      lab_cost?: number;
      subtotal?: number;
      tax_amount?: number;
      discount_amount?: number;
      total_amount?: number;
      payment_status?: string;
      payment_method?: string;
      [key: string]: unknown;
    } = {
      updated_at: new Date().toISOString(),
    };

    // Update fields if provided (similar to quote update)
    if (body.frame_name !== undefined) updateData.frame_name = body.frame_name;
    if (body.frame_brand !== undefined)
      updateData.frame_brand = body.frame_brand;
    if (body.frame_model !== undefined)
      updateData.frame_model = body.frame_model;
    if (body.frame_color !== undefined)
      updateData.frame_color = body.frame_color;
    if (body.frame_size !== undefined) updateData.frame_size = body.frame_size;
    if (body.frame_sku !== undefined) updateData.frame_sku = body.frame_sku;
    if (body.frame_serial_number !== undefined)
      updateData.frame_serial_number = body.frame_serial_number;
    if (body.lens_type !== undefined) updateData.lens_type = body.lens_type;
    if (body.lens_material !== undefined)
      updateData.lens_material = body.lens_material;
    if (body.lens_index !== undefined) updateData.lens_index = body.lens_index;
    if (body.lens_treatments !== undefined)
      updateData.lens_treatments = body.lens_treatments;
    if (body.lens_tint_color !== undefined)
      updateData.lens_tint_color = body.lens_tint_color;
    if (body.lens_tint_percentage !== undefined)
      updateData.lens_tint_percentage = body.lens_tint_percentage;
    if (body.lab_name !== undefined) updateData.lab_name = body.lab_name;
    if (body.lab_contact !== undefined)
      updateData.lab_contact = body.lab_contact;
    if (body.lab_order_number !== undefined)
      updateData.lab_order_number = body.lab_order_number;
    if (body.lab_estimated_delivery_date !== undefined)
      updateData.lab_estimated_delivery_date = body.lab_estimated_delivery_date;
    if (body.frame_cost !== undefined) updateData.frame_cost = body.frame_cost;
    if (body.lens_cost !== undefined) updateData.lens_cost = body.lens_cost;
    if (body.treatments_cost !== undefined)
      updateData.treatments_cost = body.treatments_cost;
    if (body.labor_cost !== undefined) updateData.labor_cost = body.labor_cost;
    if (body.lab_cost !== undefined) updateData.lab_cost = body.lab_cost;
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
    if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
    if (body.discount_amount !== undefined)
      updateData.discount_amount = body.discount_amount;
    if (body.total_amount !== undefined)
      updateData.total_amount = body.total_amount;
    if (body.payment_status !== undefined)
      updateData.payment_status = body.payment_status;
    if (body.payment_method !== undefined)
      updateData.payment_method = body.payment_method;
    if (body.deposit_amount !== undefined)
      updateData.deposit_amount = body.deposit_amount;
    if (body.balance_amount !== undefined)
      updateData.balance_amount = body.balance_amount;
    if (body.internal_notes !== undefined)
      updateData.internal_notes = body.internal_notes;
    if (body.customer_notes !== undefined)
      updateData.customer_notes = body.customer_notes;
    if (body.lab_notes !== undefined) updateData.lab_notes = body.lab_notes;
    if (body.quality_notes !== undefined)
      updateData.quality_notes = body.quality_notes;
    if (body.assigned_to !== undefined)
      updateData.assigned_to = body.assigned_to;
    if (body.lab_contact_person !== undefined)
      updateData.lab_contact_person = body.lab_contact_person;

    const { data: updatedWorkOrder, error } = await supabaseServiceRole
      .from("lab_work_orders")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(*)
      `,
      )
      .single();

    if (error) {
      logger.error("Error updating work order", error);
      return NextResponse.json(
        { error: "Failed to update work order" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      workOrder: updatedWorkOrder,
    });
  } catch (error) {
    logger.error("Error updating work order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    // Check if request body contains allowDelivered flag (for admin deletion from detail page)
    let allowDelivered = false;
    try {
      const body = await request.json();
      allowDelivered = body.allowDelivered === true;
    } catch {
      // If no body or invalid JSON, continue with default behavior (allowDelivered = false)
    }

    // First, check if the work order exists and get quote_id if it exists
    const { data: workOrder, error: fetchError } = await supabaseServiceRole
      .from("lab_work_orders")
      .select("id, status, payment_status, quote_id, branch_id")
      .eq("id", id)
      .single();

    if (fetchError || !workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    // Validate branch access
    const hasAccess = await validateBranchAccess(user.id, workOrder.branch_id);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este trabajo",
        },
        { status: 403 },
      );
    }

    // Prevent deletion of delivered work orders unless allowDelivered is true (from detail page)
    if (workOrder.status === "delivered" && !allowDelivered) {
      return NextResponse.json(
        {
          error: "No se puede eliminar un trabajo que ya ha sido entregado",
        },
        { status: 400 },
      );
    }

    // Prevent deletion of work orders with payments unless allowDelivered is true (from detail page)
    if (
      (workOrder.payment_status === "paid" ||
        workOrder.payment_status === "partial") &&
      !allowDelivered
    ) {
      return NextResponse.json(
        {
          error: "No se puede eliminar un trabajo con pagos registrados",
        },
        { status: 400 },
      );
    }

    // Store quote_id before deletion
    const quoteId = workOrder.quote_id;

    // Delete the work order (this will cascade delete status history due to ON DELETE CASCADE)
    const { error: deleteError } = await supabaseServiceRole
      .from("lab_work_orders")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting work order", deleteError);
      return NextResponse.json(
        { error: "Failed to delete work order" },
        { status: 500 },
      );
    }

    // If the work order was converted from a quote, delete the quote as well
    if (quoteId) {
      const { error: quoteDeleteError } = await supabaseServiceRole
        .from("quotes")
        .delete()
        .eq("id", quoteId);

      if (quoteDeleteError) {
        logger.warn("Error deleting related quote", quoteDeleteError);
        // Don't fail the request if quote deletion fails, just log it
      }
    }

    return NextResponse.json({
      success: true,
      message: "Trabajo eliminado exitosamente",
    });
  } catch (error) {
    logger.error("Error deleting work order", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

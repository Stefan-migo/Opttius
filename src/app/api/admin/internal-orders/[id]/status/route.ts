import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/internal-orders/[id]/status - Update order status
export const dynamic = "force-dynamic";
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get branch context
    const branchContext = await getBranchContext(req, user.id, supabase);
    if (!branchContext.branchId && !branchContext.isGlobalView) {
      return NextResponse.json({ error: "No branch access" }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes } = body;

    // Validation
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "in_transit",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Fetch existing order
    const { data: existingOrder, error: fetchError } = await supabase
      .from("internal_orders")
      .select("origin_branch_id, destination_branch_id, status")
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Internal order not found" },
          { status: 404 },
        );
      }
      logger.error("Failed to fetch internal order for status update", {
        error: fetchError.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch internal order" },
        { status: 500 },
      );
    }

    // Check branch access
    if (!branchContext.isSuperAdmin) {
      const userBranches = await supabase
        .from("admin_branch_access")
        .select("branch_id")
        .eq("admin_user_id", user.id);

      const accessibleBranchIds =
        userBranches.data?.map((b: unknown) => b.branch_id) || [];

      if (
        !accessibleBranchIds.includes(existingOrder.origin_branch_id) &&
        !accessibleBranchIds.includes(existingOrder.destination_branch_id)
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Validate status transitions
    const currentStatus = existingOrder.status;
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["in_transit", "cancelled"],
      in_transit: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };

    if (currentStatus !== "pending" && status === "pending") {
      return NextResponse.json(
        { error: "Cannot revert to pending status" },
        { status: 400 },
      );
    }

    if (!validTransitions[currentStatus].includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentStatus} to ${status}`,
        },
        { status: 400 },
      );
    }

    // Update status
    const updateData: unknown = { status };

    // Set delivery date if transitioning to delivered
    if (status === "delivered") {
      updateData.actual_delivery_date = new Date().toISOString();
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("internal_orders")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update order status", {
        error: updateError.message,
      });
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 },
      );
    }

    // The status history is automatically logged by the database trigger

    logger.info("Internal order status updated", {
      orderId: id,
      fromStatus: currentStatus,
      toStatus: status,
      userId: user.id,
    });

    // Fetch complete updated order
    const { data: completeOrder } = await supabase
      .from("internal_orders")
      .select(
        `
        *,
        origin_branch:branches!internal_orders_origin_branch_id_fkey(name, code),
        destination_branch:branches!internal_orders_destination_branch_id_fkey(name, code),
        created_by_user:admin_users!internal_orders_created_by_fkey(first_name, last_name),
        assigned_driver:drivers(name, license_number),
        assigned_vehicle:vehicles(plate_number, model)
      `,
      )
      .eq("id", id)
      .single();

    return NextResponse.json(completeOrder);
  } catch (error) {
    logger.error("Order status update error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/internal-orders/[id] - Get specific internal order
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: RouteParams) {
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

    // Fetch order with all relations
    const { data: order, error } = await supabase
      .from("internal_orders")
      .select(
        `
        *,
        origin_branch:branches!internal_orders_origin_branch_id_fkey(name, code, address_line_1, phone),
        destination_branch:branches!internal_orders_destination_branch_id_fkey(name, code, address_line_1, phone),
        created_by_user:admin_users!internal_orders_created_by_fkey(first_name, last_name, email),
        assigned_driver:drivers(name, license_number, phone, email),
        assigned_vehicle:vehicles(plate_number, model, capacity),
        items:internal_order_items(
          *,
          product:products(name, sku, description)
        ),
        status_history:internal_order_status_history(
          *,
          changed_by_user:admin_users!internal_order_status_history_changed_by_fkey(first_name, last_name)
        )
      `,
      )
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Internal order not found" },
          { status: 404 },
        );
      }
      logger.error("Failed to fetch internal order", { error: error.message });
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
        !accessibleBranchIds.includes(order.origin_branch_id) &&
        !accessibleBranchIds.includes(order.destination_branch_id)
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    logger.error("Internal order detail error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/internal-orders/[id] - Update internal order
export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    const {
      priority,
      scheduled_date,
      notes,
      assigned_driver_id,
      assigned_vehicle_id,
      items, // Only for adding new items, not updating existing ones
    } = body;

    // Fetch existing order to check access
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
      logger.error("Failed to fetch internal order for update", {
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

    // Prevent updates to delivered/cancelled orders
    if (
      existingOrder.status === "delivered" ||
      existingOrder.status === "cancelled"
    ) {
      return NextResponse.json(
        { error: "Cannot update delivered or cancelled orders" },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateData: unknown = {};

    if (priority !== undefined) updateData.priority = priority;
    if (scheduled_date !== undefined)
      updateData.scheduled_date = scheduled_date;
    if (notes !== undefined) updateData.notes = notes;
    if (assigned_driver_id !== undefined)
      updateData.assigned_driver_id = assigned_driver_id;
    if (assigned_vehicle_id !== undefined)
      updateData.assigned_vehicle_id = assigned_vehicle_id;

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("internal_orders")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update internal order", {
        error: updateError.message,
      });
      return NextResponse.json(
        { error: "Failed to update internal order" },
        { status: 500 },
      );
    }

    // Add new items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((item: unknown) => ({
        internal_order_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from("internal_order_items")
        .insert(orderItems);

      if (itemsError) {
        logger.error("Failed to add order items", {
          error: itemsError.message,
        });
        // Note: We don't rollback the order update as it was successful
        return NextResponse.json(
          { error: "Order updated but failed to add items" },
          { status: 500 },
        );
      }
    }

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
        assigned_vehicle:vehicles(plate_number, model),
        items:internal_order_items(
          *,
          product:products(name, sku)
        )
      `,
      )
      .eq("id", id)
      .single();

    logger.info("Internal order updated", {
      orderId: id,
      userId: user.id,
    });

    return NextResponse.json(completeOrder);
  } catch (error) {
    logger.error("Internal order update error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/internal-orders/[id] - Delete internal order
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    // Fetch existing order to check access and status
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
      logger.error("Failed to fetch internal order for deletion", {
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

    // Only allow deletion of pending orders
    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be deleted" },
        { status: 400 },
      );
    }

    // Delete order (cascades to items and status history)
    const { error: deleteError } = await supabase
      .from("internal_orders")
      .delete()
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId);

    if (deleteError) {
      logger.error("Failed to delete internal order", {
        error: deleteError.message,
      });
      return NextResponse.json(
        { error: "Failed to delete internal order" },
        { status: 500 },
      );
    }

    logger.info("Internal order deleted", {
      orderId: id,
      userId: user.id,
    });

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    logger.error("Internal order deletion error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

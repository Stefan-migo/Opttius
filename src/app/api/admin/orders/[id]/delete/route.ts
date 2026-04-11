import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  GetAdminRoleParams,
  GetAdminRoleResult,
  IsAdminParams,
  IsAdminResult,
} from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

/**
 * DELETE /api/admin/orders/[id]
 * Delete an order permanently (Admin or SuperAdmin, for cancelled orders only)
 */
export const dynamic = "force-dynamic";
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: user.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };
    const canDelete =
      adminRole === "super_admin" ||
      adminRole === "admin" ||
      adminRole === "root" ||
      adminRole === "dev";
    if (!canDelete) {
      return NextResponse.json(
        { error: "Solo administradores pueden eliminar ventas anuladas" },
        { status: 403 },
      );
    }

    // Get branch context (for non-super-admin we validate order's branch access below)
    const branchContext = await getBranchContext(request, user.id);

    // Get order to verify it's cancelled
    const { data: order, error: orderError } = await supabaseServiceRole
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Non-super-admin can only delete orders in their accessible branches
    if (!branchContext.isSuperAdmin && order.branch_id) {
      const hasAccess = branchContext.accessibleBranches.some(
        (b) => b.id === order.branch_id,
      );
      if (!hasAccess) {
        return NextResponse.json(
          { error: "No tienes acceso a la sucursal de esta orden" },
          { status: 403 },
        );
      }
    }

    // Only allow deleting cancelled/refunded orders
    if (order.status !== "cancelled" && order.payment_status !== "refunded") {
      return NextResponse.json(
        {
          error: "Solo se pueden eliminar ventas anuladas",
          current_status: order.status,
        },
        { status: 400 },
      );
    }

    // Delete order items first (foreign key constraint)
    const { error: deleteItemsError } = await supabaseServiceRole
      .from("order_items")
      .delete()
      .eq("order_id", params.id);

    if (deleteItemsError) {
      logger.error("Error deleting order items", deleteItemsError);
      return NextResponse.json(
        {
          error: "Error al eliminar items de la venta",
          details: deleteItemsError.message,
        },
        { status: 500 },
      );
    }

    // Delete order payments
    const { error: deletePaymentsError } = await supabaseServiceRole
      .from("order_payments")
      .delete()
      .eq("order_id", params.id);

    if (deletePaymentsError) {
      logger.error("Error deleting order payments", deletePaymentsError);
      // Don't fail, continue to delete order
    }

    // Delete order
    const { error: deleteError } = await supabaseServiceRole
      .from("orders")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      logger.error("Error deleting order", deleteError);
      return NextResponse.json(
        {
          error: "Error al eliminar la venta",
          details: deleteError.message,
        },
        { status: 500 },
      );
    }

    logger.info("Order deleted permanently", {
      order_id: params.id,
      deleted_by: user.email,
      order_number: order.order_number,
      original_amount: order.total_amount,
    });

    return NextResponse.json({
      success: true,
      message: "Venta eliminada correctamente",
      order_id: params.id,
    });
  } catch (error: unknown) {
    logger.error("Error in delete order API", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

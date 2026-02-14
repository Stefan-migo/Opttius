import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

/**
 * POST /api/admin/pos/pending-balance/pay
 * Record payment for pending balance order
 */
export async function POST(request: NextRequest) {
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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    const body = await request.json();
    const {
      order_id,
      payment_amount,
      payment_method,
      notes,
      fiscal_reference,
    } = body;

    if (!order_id || !payment_amount || !payment_method) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get order with branch filter
    let orderQuery = supabaseServiceRole
      .from("orders")
      .select(
        `
        id,
        order_number,
        total_amount,
        payment_status,
        branch_id,
        order_payments (
          id,
          amount
        )
      `,
      )
      .eq("id", order_id);

    // Apply branch filter if branch is selected
    if (branchContext.branchId) {
      orderQuery = orderQuery.eq("branch_id", branchContext.branchId);
    }

    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      logger.error("Error fetching order", {
        error: orderError,
        order_id,
        branchId: branchContext.branchId,
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate total paid so far
    const totalPaid = (order.order_payments || []).reduce(
      (sum: number, payment: any) => sum + (payment.amount || 0),
      0,
    );
    const newTotal = totalPaid + payment_amount;
    const stillPending = order.total_amount > newTotal;

    // Get current POS session for this branch (simplified to find ANY open session)
    let posSessionId = null;
    if (branchContext.branchId) {
      const { data: openSession } = await supabaseServiceRole
        .from("pos_sessions")
        .select("id")
        .eq("branch_id", branchContext.branchId)
        .eq("status", "open")
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openSession) {
        posSessionId = openSession.id;
      }
    } else if (branchContext.isSuperAdmin) {
      // For super admin in global view, try to find any open session
      // This is a fallback and might not be accurate if multiple branches have open sessions
      const { data: activeSession } = await supabaseServiceRole
        .from("pos_sessions")
        .select("id")
        .eq("status", "open")
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        posSessionId = activeSession.id;
      }
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseServiceRole
      .from("order_payments")
      .insert({
        order_id: order_id,
        amount: payment_amount,
        payment_method: payment_method,
        pos_session_id: posSessionId, // Asociar pago a la sesión de caja actual
        payment_reference: fiscal_reference?.trim() || null,
        paid_at: new Date().toISOString(),
        created_by: user.id,
        notes: notes || "Pago de saldo pendiente",
      })
      .select()
      .single();

    if (paymentError) {
      logger.error("Error creating payment", paymentError);
      return NextResponse.json(
        {
          error: "Error al registrar pago",
          details: paymentError.message,
        },
        { status: 500 },
      );
    }

    // Update order payment status
    let newPaymentStatus = order.payment_status;
    if (!stillPending && newTotal >= order.total_amount) {
      newPaymentStatus = "paid";
    } else if (
      stillPending &&
      newPaymentStatus !== "partial" &&
      newPaymentStatus !== "on_hold_payment"
    ) {
      // Ensure status is partial if there's still pending amount
      newPaymentStatus = "partial";
    }

    const { error: updateOrderError } = await supabaseServiceRole
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (updateOrderError) {
      logger.error("Error updating order", updateOrderError);
      // Don't fail, log the error
    }

    // Update associated work orders if exists (work_orders have pos_order_id that references orders)
    const { data: workOrders } = await supabaseServiceRole
      .from("lab_work_orders")
      .select(
        "id, status, total_amount, deposit_amount, balance_amount, payment_status",
      )
      .eq("pos_order_id", order_id);

    if (workOrders && workOrders.length > 0) {
      // Calculate new values for each work order
      // The work order total should match the order total, so we use the same calculation
      const newPendingAmount = Math.max(0, order.total_amount - newTotal);
      const newDepositAmount = newTotal; // Total paid so far

      // Determine new payment status for work orders
      const newWorkOrderPaymentStatus =
        newPaymentStatus === "paid" ? "paid" : "partial";

      // Update all work orders with new payment information
      for (const workOrder of workOrders) {
        const updateData: any = {
          deposit_amount: newDepositAmount,
          balance_amount: newPendingAmount,
          payment_status: newWorkOrderPaymentStatus,
          updated_at: new Date().toISOString(),
        };

        // Only update status to delivered if payment is complete
        if (newPaymentStatus === "paid") {
          updateData.status = "delivered";
        }

        const { error: updateWorkOrderError } = await supabaseServiceRole
          .from("lab_work_orders")
          .update(updateData)
          .eq("id", workOrder.id);

        if (updateWorkOrderError) {
          logger.error("Error updating work order", {
            error: updateWorkOrderError,
            work_order_id: workOrder.id,
            order_id,
          });
          // Don't fail, log the error and continue with other work orders
        } else {
          logger.info("Work order updated with payment", {
            work_order_id: workOrder.id,
            new_deposit_amount: newDepositAmount,
            new_balance_amount: newPendingAmount,
            new_payment_status: newWorkOrderPaymentStatus,
            order_id,
          });
        }
      }
    }

    logger.info("Pending balance payment recorded", {
      order_id,
      payment_amount,
      payment_method,
      new_status: newPaymentStatus,
    });

    return createApiSuccessResponse({
      payment,
      order_status: newPaymentStatus,
      message: stillPending
        ? "Pago registrado. Saldo aún pendiente"
        : "Pago completado. Orden finalizada",
    });
  } catch (error: any) {
    logger.error("Error in pending balance payment API", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

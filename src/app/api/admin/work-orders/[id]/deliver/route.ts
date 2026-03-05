/**
 * Endpoint para entregar un trabajo
 * Valida que no haya saldo pendiente antes de permitir la entrega
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { NotificationService } from "@/lib/notifications/notification-service";
import { sendDeliveryCompletionEmail } from "@/lib/email/send-delivery-completion-email";

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

    // 1. Get work order by id (no branch filter - same pattern as GET [id])
    const { data: workOrder, error: workOrderError } = await supabaseServiceRole
      .from("lab_work_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (workOrderError || !workOrder) {
      return NextResponse.json(
        { error: "Trabajo no encontrado o sin acceso" },
        { status: 404 },
      );
    }

    // 2. Validate branch access (user must have access to work order's branch)
    const hasAccess = await validateBranchAccess(user.id, workOrder.branch_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tiene acceso a este trabajo" },
        { status: 403 },
      );
    }

    // 3. Check if work order has associated order
    if (!workOrder.pos_order_id) {
      // Work order without order (shouldn't happen with new flow, but handle gracefully)
      logger.warn(`Work order ${id} has no pos_order_id, allowing delivery`);
      // Still allow delivery but log warning
    } else {
      // 4. Get associated order
      const { data: order, error: orderError } = await supabaseServiceRole
        .from("orders")
        .select("id, total_amount, order_number")
        .eq("id", workOrder.pos_order_id)
        .single();

      if (orderError || !order) {
        logger.error("Error fetching order for work order", orderError);
        return NextResponse.json(
          { error: "Error al obtener información de la orden" },
          { status: 500 },
        );
      }

      // 5. Calculate order balance
      const { data: balance, error: balanceError } =
        await supabaseServiceRole.rpc("calculate_order_balance", {
          p_order_id: order.id,
        });

      if (balanceError) {
        logger.error("Error calculating order balance", balanceError);
        return NextResponse.json(
          { error: "Error al calcular saldo pendiente" },
          { status: 500 },
        );
      }

      const balanceAmount = balance || 0;

      // 6. Check if there's outstanding balance
      if (balanceAmount > 0) {
        return NextResponse.json(
          {
            requiresPayment: true,
            balance: balanceAmount,
            orderId: order.id,
            orderNumber: order.order_number,
            message: `El cliente tiene un saldo pendiente de $${balanceAmount.toLocaleString("es-CL")}. Debe pagar antes de entregar.`,
          },
          { status: 400 },
        );
      }
    }

    // 7. If balance is $0 (or no order), allow delivery
    // Update work order status to 'delivered'
    const { error: updateError } = await supabaseServiceRole.rpc(
      "update_work_order_status",
      {
        p_work_order_id: id,
        p_new_status: "delivered",
        p_changed_by: user.id,
        p_notes: "Trabajo entregado al cliente",
      },
    );

    if (updateError) {
      logger.error("Error updating work order status", updateError);
      return NextResponse.json(
        { error: "Error al actualizar estado del trabajo" },
        { status: 500 },
      );
    }

    // 8. Fetch updated work order
    const { data: updatedWorkOrder, error: fetchError } =
      await supabaseServiceRole
        .from("lab_work_orders")
        .select(
          `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone, rut),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(*)
      `,
        )
        .eq("id", id)
        .single();

    if (fetchError) {
      logger.error("Error fetching updated work order", fetchError);
      // El trabajo ya fue actualizado, así que retornamos éxito aunque falle el fetch
      // El frontend puede recargar los datos después
      logger.warn(
        "Work order status updated but failed to fetch updated data, returning success",
      );
      return NextResponse.json({
        success: true,
        workOrder: null, // Frontend deberá recargar
        message: "Trabajo entregado exitosamente",
        note: "Recarga la página para ver los cambios",
      });
    }

    // 9. Create notification and send delivery completion email (non-blocking)
    if (updatedWorkOrder) {
      const customerName = updatedWorkOrder.customer
        ? `${updatedWorkOrder.customer.first_name || ""} ${updatedWorkOrder.customer.last_name || ""}`.trim() ||
          updatedWorkOrder.customer.email ||
          "Cliente"
        : "Cliente";

      NotificationService.notifyWorkOrderCompleted(
        id,
        updatedWorkOrder.work_order_number,
        customerName,
        updatedWorkOrder.branch_id ?? undefined,
      ).catch((err) => logger.warn("Error creating notification", err));

      // Send delivery completion email with survey link
      let orgId = (updatedWorkOrder as { organization_id?: string })
        .organization_id;
      if (!orgId && updatedWorkOrder.branch_id) {
        const { data: branch } = await supabaseServiceRole
          .from("branches")
          .select("organization_id")
          .eq("id", updatedWorkOrder.branch_id)
          .single();
        orgId = branch?.organization_id ?? undefined;
      }
      const customerEmail = (updatedWorkOrder.customer as { email?: string })
        ?.email;
      if (orgId && customerEmail) {
        sendDeliveryCompletionEmail({
          workOrderId: id,
          organizationId: orgId,
          customerId: updatedWorkOrder.customer_id ?? null,
          customerEmail,
          customerName,
          workOrderNumber: updatedWorkOrder.work_order_number || "",
        }).catch((err) =>
          logger.warn("Error sending delivery completion email", err),
        );
      }
    }

    logger.info("Work order delivered", {
      workOrderId: id,
      workOrderNumber: updatedWorkOrder?.work_order_number,
    });

    return NextResponse.json({
      success: true,
      workOrder: updatedWorkOrder,
      message: "Trabajo entregado exitosamente",
    });
  } catch (error) {
    logger.error("Error in deliver work order API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

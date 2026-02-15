import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  IsAdminParams,
  IsAdminResult,
  GetAdminRoleParams,
  GetAdminRoleResult,
} from "@/types/supabase-rpc";

/**
 * POST /api/admin/orders/[id]/cancel
 * Cancel/void an order (Admin or SuperAdmin; Admin only for orders in their branch)
 */
export const dynamic = "force-dynamic";
export async function POST(
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
    const canCancel =
      adminRole === "super_admin" ||
      adminRole === "admin" ||
      adminRole === "root" ||
      adminRole === "dev";
    if (!canCancel) {
      return NextResponse.json(
        { error: "Solo administradores pueden anular ventas" },
        { status: 403 },
      );
    }

    // Get branch context (for non-super-admin we validate order's branch access below)
    const branchContext = await getBranchContext(request, user.id);

    const body = await request.json();
    const { reason, create_credit_note, refund_method } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    if (create_credit_note && !refund_method) {
      return NextResponse.json(
        {
          error:
            "refund_method is required when creating credit note (cash, debit, credit, transfer)",
        },
        { status: 400 },
      );
    }

    const validRefundMethods = ["cash", "debit", "credit", "transfer"];
    if (
      create_credit_note &&
      refund_method &&
      !validRefundMethods.includes(refund_method)
    ) {
      return NextResponse.json(
        {
          error: `refund_method must be one of: ${validRefundMethods.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Get order
    const { data: order, error: orderError } = await supabaseServiceRole
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Non-super-admin can only cancel orders in their accessible branches
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

    // Require open cash register (caja) to cancel orders and create credit notes
    if (order.branch_id) {
      const { data: openSession } = await supabaseServiceRole
        .from("pos_sessions")
        .select("id")
        .eq("branch_id", order.branch_id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      if (!openSession) {
        return NextResponse.json(
          {
            error:
              "La caja debe estar abierta para anular ventas y crear notas de crédito. Abre la caja de esta sucursal e intenta nuevamente.",
          },
          { status: 400 },
        );
      }
    }

    let creditNoteId: string | null = null;
    let posSessionId: string | null = null;

    // If creating credit note, get current POS session and create records
    if (create_credit_note && order.branch_id) {
      // Get open POS session for this branch
      const { data: openSession } = await supabaseServiceRole
        .from("pos_sessions")
        .select("id")
        .eq("branch_id", order.branch_id)
        .eq("status", "open")
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      posSessionId = openSession?.id ?? null;

      // Generate credit note number
      const { data: cnNumber, error: cnNumError } =
        await supabaseServiceRole.rpc("generate_credit_note_number");

      if (cnNumError || !cnNumber) {
        logger.error("Error generating credit note number", cnNumError);
        return NextResponse.json(
          {
            error: "Error al generar número de nota de crédito",
            details: cnNumError?.message,
          },
          { status: 500 },
        );
      }

      // Get organization_id from branch
      const { data: branchRow } = await supabaseServiceRole
        .from("branches")
        .select("organization_id")
        .eq("id", order.branch_id)
        .single();

      const { data: newCreditNote, error: cnError } = await supabaseServiceRole
        .from("credit_notes")
        .insert({
          credit_note_number: cnNumber,
          order_id: params.id,
          branch_id: order.branch_id,
          organization_id: (branchRow as any)?.organization_id ?? null,
          amount: Number(order.total_amount),
          reason,
          refund_method,
          pos_session_id: posSessionId,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (cnError) {
        logger.error("Error creating credit note", cnError);
        return NextResponse.json(
          {
            error: "Error al crear nota de crédito",
            details: cnError.message,
          },
          { status: 500 },
        );
      }
      creditNoteId = newCreditNote?.id ?? null;

      // Create movement only if we have a session (caja abierta)
      if (posSessionId && creditNoteId) {
        const { error: movError } = await supabaseServiceRole
          .from("credit_note_movements")
          .insert({
            credit_note_id: creditNoteId,
            pos_session_id: posSessionId,
            amount: -Number(order.total_amount),
            refund_method,
          });

        if (movError) {
          logger.error("Error creating credit note movement", movError);
          // Don't fail the whole operation - credit note was created
        }
      }
    }

    // Update order status to cancelled
    const { error: updateError } = await supabaseServiceRole
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "refunded",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (updateError) {
      logger.error("Error cancelling order", updateError);
      return NextResponse.json(
        {
          error: "Error al anular la venta",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    logger.info("Order cancelled", {
      order_id: params.id,
      cancelled_by: user.email,
      reason,
      original_amount: order.total_amount,
    });

    return NextResponse.json({
      success: true,
      message: "Venta anulada correctamente",
      order_id: params.id,
      credit_note_id: creditNoteId ?? undefined,
      credit_note_movement_registered: !!posSessionId,
    });
  } catch (error: any) {
    logger.error("Error in cancel order API", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

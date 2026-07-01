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
 * POST /api/admin/orders/[id]/cancel
 * Cancel/void an order (Admin or SuperAdmin; Admin only for orders in their branch)
 */
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
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
    const { reason, refund_method } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    // All cancellations require credit note: revert stock + register in caja
    if (!refund_method) {
      return NextResponse.json(
        {
          error:
            "refund_method is required (cash, debit, credit, transfer) - todas las anulaciones crean nota de crédito para revertir stock y actualizar caja",
        },
        { status: 400 },
      );
    }

    const validRefundMethods = ["cash", "debit", "credit", "transfer"];
    if (!validRefundMethods.includes(refund_method)) {
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
      .eq("id", orderId)
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

    // All cancellations: revert stock + create credit note (for caja consistency)
    if (order.branch_id) {
      try {
        // Get total_paid from order_payments (for partial payments, refund only what was paid)
        const { data: payments } = await supabaseServiceRole
          .from("order_payments")
          .select("amount")
          .eq("order_id", orderId);
        const totalPaid = (payments || []).reduce(
          (sum: number, p: { amount: number }) => sum + Number(p.amount || 0),
          0,
        );
        const refundAmount =
          totalPaid > 0
            ? Math.min(totalPaid, Number(order.total_amount))
            : Number(order.total_amount);

        // Revert stock for order items with product_id
        const { data: orderItems } = await supabaseServiceRole
          .from("order_items")
          .select("id, product_id, quantity")
          .eq("order_id", orderId);
        for (const oi of orderItems || []) {
          if (oi.product_id && order.branch_id) {
            try {
              const { error: stockErr } = await supabaseServiceRole.rpc(
                "update_product_stock",
                {
                  p_product_id: oi.product_id,
                  p_branch_id: order.branch_id,
                  p_quantity_change: parseInt(String(oi.quantity), 10) || 0,
                  p_reserve: false,
                  p_movement_type: "refund",
                  p_reference_type: "order_cancel",
                  p_reference_id: orderId,
                  p_created_by: user.id,
                },
              );
              if (stockErr) {
                logger.warn("Stock revert failed for item, continuing", {
                  order_item_id: oi.id,
                  product_id: oi.product_id,
                  error: stockErr.message,
                });
              }
            } catch (stockEx: unknown) {
              logger.warn("Stock revert exception, continuing", {
                order_item_id: oi.id,
                error: stockEx?.message,
              });
            }
          }
        }

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
        const { data: cnNumberRaw, error: cnNumError } =
          await supabaseServiceRole.rpc("generate_credit_note_number");

        const cnNumber =
          typeof cnNumberRaw === "string"
            ? cnNumberRaw
            : Array.isArray(cnNumberRaw) && cnNumberRaw[0]
              ? cnNumberRaw[0]
              : cnNumberRaw;

        if (cnNumError || !cnNumber || typeof cnNumber !== "string") {
          logger.error("Error generating credit note number", {
            error: cnNumError,
            raw: cnNumberRaw,
          });
          return NextResponse.json(
            {
              error: "Error al generar número de nota de crédito",
              details: cnNumError?.message || "Número de nota inválido",
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

        const { data: newCreditNote, error: cnError } =
          await supabaseServiceRole
            .from("credit_notes")
            .insert({
              credit_note_number: cnNumber,
              order_id: orderId,
              branch_id: order.branch_id,
              organization_id: (branchRow as unknown)?.organization_id ?? null,
              amount: refundAmount,
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
              amount: -refundAmount,
              refund_method,
            });

          if (movError) {
            logger.error("Error creating credit note movement", movError);
            // Don't fail the whole operation - credit note was created
          }
        }
      } catch (creditNoteErr: unknown) {
        logger.error("Error in credit note block", creditNoteErr);
        return NextResponse.json(
          {
            error: "Error al crear nota de crédito",
            details: creditNoteErr?.message ?? String(creditNoteErr),
          },
          { status: 500 },
        );
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
      .eq("id", orderId);

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
      order_id: orderId,
      cancelled_by: user.email,
      reason,
      original_amount: order.total_amount,
    });

    return NextResponse.json({
      success: true,
      message: "Venta anulada correctamente",
      order_id: orderId,
      credit_note_id: creditNoteId ?? undefined,
      credit_note_movement_registered: !!posSessionId,
    });
  } catch (error: unknown) {
    const errMsg = error?.message ?? String(error);
    const errStack = error?.stack;
    logger.error("Error in cancel order API", {
      message: errMsg,
      stack: errStack,
    });
    logger.error("[cancel] Unhandled error:", { message: errMsg, stack: errStack });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: errMsg,
      },
      { status: 500 },
    );
  }
}

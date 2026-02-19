import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import { APIError } from "@/lib/api/errors";
import { z } from "zod";

const refundSchema = z.object({
  order_id: z.string().uuid(),
  items: z.array(
    z.object({
      order_item_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    }),
  ),
  reason: z.string().min(1, "Motivo requerido"),
  refund_type: z.enum(["full", "partial"]),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    logger.info("POS Refund API called");

    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
      );
    }

    const branchContext = await getBranchContext(request, user.id);
    if (!branchContext.isSuperAdmin && !branchContext.branchId) {
      return createApiErrorResponse(
        new APIError(
          "Debe seleccionar una sucursal para realizar devoluciones",
          400,
          "BAD_REQUEST",
        ),
      );
    }

    const body = await request.json();
    const parseResult = refundSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { order_id, items, reason, refund_type } = parseResult.data;

    // Fetch order and validate
    const { data: order, error: orderError } = await supabaseServiceRole
      .from("orders")
      .select("id, branch_id, organization_id, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return createApiErrorResponse(
        new APIError("Orden no encontrada", 404, "NOT_FOUND"),
      );
    }

    // Validate branch access
    if (
      !branchContext.isSuperAdmin &&
      branchContext.branchId &&
      order.branch_id !== branchContext.branchId
    ) {
      return createApiErrorResponse(
        new APIError(
          "La orden no pertenece a la sucursal seleccionada",
          403,
          "FORBIDDEN",
        ),
      );
    }

    const branchId = order.branch_id;
    if (!branchId) {
      return createApiErrorResponse(
        new APIError("La orden no tiene sucursal asociada", 400, "BAD_REQUEST"),
      );
    }

    // Fetch order items to validate and get product_id
    const orderItemIds = items.map((i) => i.order_item_id);
    const { data: orderItems, error: itemsError } = await supabaseServiceRole
      .from("order_items")
      .select("id, product_id, quantity, unit_price, total_price, product_name")
      .eq("order_id", order_id)
      .in("id", orderItemIds);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return createApiErrorResponse(
        new APIError(
          "No se encontraron los ítems de la orden",
          400,
          "BAD_REQUEST",
        ),
      );
    }

    const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]));

    for (const refItem of items) {
      const oi = itemMap.get(refItem.order_item_id);
      if (!oi) {
        return createApiErrorResponse(
          new APIError(
            `Ítem ${refItem.order_item_id} no pertenece a esta orden`,
            400,
            "BAD_REQUEST",
          ),
        );
      }
      if (refItem.quantity > oi.quantity) {
        return createApiErrorResponse(
          new APIError(
            `Cantidad a devolver (${refItem.quantity}) excede la cantidad vendida (${oi.quantity}) para ${oi.product_name}`,
            400,
            "BAD_REQUEST",
          ),
        );
      }
      // Skip services - no stock to reverse
      if (!oi.product_id) continue;
    }

    // Get active pos_session for branch (optional - for pos_transactions)
    const { data: session } = await supabaseServiceRole
      .from("pos_sessions")
      .select("id")
      .eq("branch_id", branchId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .single();

    const posSessionId = session?.id ?? null;

    // Reverse stock for each item
    for (const refItem of items) {
      const oi = itemMap.get(refItem.order_item_id);
      if (!oi?.product_id) continue;

      const { error: stockError } = await supabaseServiceRole.rpc(
        "update_product_stock",
        {
          p_product_id: oi.product_id,
          p_branch_id: branchId,
          p_quantity_change: refItem.quantity,
          p_reserve: false,
        },
      );

      if (stockError) {
        logger.error("Error reversing stock on refund", {
          product_id: oi.product_id,
          quantity: refItem.quantity,
          error: stockError,
        });
        return createApiErrorResponse(
          new APIError(
            `Error al revertir stock para ${oi.product_name}: ${stockError.message}`,
            500,
            "INTERNAL_ERROR",
          ),
        );
      }
    }

    // Calculate refund amount
    let refundAmount = 0;
    for (const refItem of items) {
      const oi = itemMap.get(refItem.order_item_id);
      if (oi) {
        const unitRefund = oi.total_price / oi.quantity;
        refundAmount += unitRefund * refItem.quantity;
      }
    }

    // Create pos_transaction for refund
    const { error: txError } = await supabaseServiceRole
      .from("pos_transactions")
      .insert({
        order_id,
        pos_session_id: posSessionId,
        transaction_type: "refund",
        payment_method: "refund",
        amount: -refundAmount,
        change_amount: null,
        notes: `${reason} | Items: ${items.map((i) => i.order_item_id).join(", ")}`,
      });

    if (txError) {
      logger.warn("Could not create pos_transaction for refund", { txError });
      // Don't fail - stock was already reversed
    }

    logger.info("Refund processed successfully", {
      order_id,
      refund_amount: refundAmount,
      items_count: items.length,
    });

    return createApiSuccessResponse({
      success: true,
      message: "Devolución procesada correctamente",
      refund_amount: refundAmount,
      items_refunded: items.length,
    });
  } catch (error) {
    logger.error("Error in POS Refund API", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

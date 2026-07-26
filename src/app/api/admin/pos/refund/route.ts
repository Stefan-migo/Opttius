import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

import {
  reverseRefundStock,
} from "./refundStockReversal";
import {
  calculateRefundAmount,
  type OrderItemEntry,
  validateRefundItems,
} from "./refundValidation";

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
  refund_method: z
    .enum(["cash", "debit", "credit", "transfer"])
    .optional()
    .default("cash"),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    logger.info("POS Refund API called");

    const supabase = await createClient();

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

    const { order_id, items, reason, refund_type, refund_method } =
      parseResult.data;

    // Fetch order and validate
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, branch_id, organization_id, status, total_amount")
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

    // Fetch order items to validate
    const orderItemIds = items.map((i) => i.order_item_id);
    const { data: rawOrderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, quantity, unit_price, total_price, product_name")
      .eq("order_id", order_id)
      .in("id", orderItemIds);

    if (itemsError || !rawOrderItems || rawOrderItems.length === 0) {
      return createApiErrorResponse(
        new APIError("No se encontraron los ítems de la orden", 400, "BAD_REQUEST"),
      );
    }

    const orderItems = rawOrderItems as OrderItemEntry[];
    const validationError = validateRefundItems(items, orderItems);
    if (validationError) {
      return createApiErrorResponse(new APIError(validationError, 400, "BAD_REQUEST"));
    }

    // Get total_paid and session
    const { data: payments } = await supabase
      .from("order_payments")
      .select("amount")
      .eq("order_id", order_id);
    const totalPaid = (payments || []).reduce(
      (sum: number, p: { amount: number }) => sum + Number(p.amount || 0), 0,
    );
    const orderTotal = Number(order.total_amount) || 0;

    const { data: session } = await supabase
      .from("pos_sessions")
      .select("id")
      .eq("branch_id", branchId)
      .eq("status", "open")
      .order("opening_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    const posSessionId = session?.id ?? null;

    // Reverse stock
    const stockErrorMsg = await reverseRefundStock(
      supabase,
      items,
      orderItems as { id: string; product_id: string | null; product_name: string; quantity: number }[],
      branchId,
      order_id,
      user.id,
    );
    if (stockErrorMsg) {
      return createApiErrorResponse(
        new APIError(stockErrorMsg, 500, "INTERNAL_ERROR"),
      );
    }

    // Calculate refund amount (capped at total_paid)
    const refundAmount = calculateRefundAmount(items, orderItems, totalPaid, orderTotal);

    // Create credit_note and credit_note_movement for caja integration
    let creditNoteId: string | null = null;
    if (posSessionId && refundAmount > 0) {
      const { data: cnNumberRaw, error: cnNumError } =
        await supabase.rpc("generate_credit_note_number");
      const cnNumber =
        typeof cnNumberRaw === "string"
          ? cnNumberRaw
          : Array.isArray(cnNumberRaw) && cnNumberRaw[0]
            ? cnNumberRaw[0]
            : cnNumberRaw;
      if (!cnNumError && cnNumber && typeof cnNumber === "string") {
        const { data: branchRow } = await supabase
          .from("branches")
          .select("organization_id")
          .eq("id", branchId)
          .single();
        const { data: newCreditNote, error: cnError } =
          await supabase
            .from("credit_notes")
            .insert({
              credit_note_number: cnNumber,
              order_id,
              branch_id: branchId,
              organization_id: branchRow?.organization_id ?? null,
              amount: refundAmount,
              reason,
              refund_method: refund_method ?? "cash",
              pos_session_id: posSessionId,
              created_by: user.id,
            })
            .select("id")
            .single();
        if (!cnError && newCreditNote) {
          creditNoteId = newCreditNote.id;
          await supabase.from("credit_note_movements").insert({
            credit_note_id: creditNoteId,
            pos_session_id: posSessionId,
            amount: -refundAmount,
            refund_method: refund_method ?? "cash",
          });
        }
      }
    }

    // Update order status to cancelled/refunded (removes from pending balance)
    await supabase
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "refunded",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    // Create pos_transaction for refund (legacy/traceability)
    const { error: txError } = await supabase
      .from("pos_transactions")
      .insert({
        order_id,
        pos_session_id: posSessionId,
        transaction_type: "refund",
        payment_method: refund_method ?? "cash",
        amount: -refundAmount,
        change_amount: null,
        notes: `${reason} | Items: ${items.map((i) => i.order_item_id).join(", ")}`,
      });

    if (txError) {
      logger.warn("Could not create pos_transaction for refund", { txError });
    }

    logger.info("Refund processed successfully", {
      order_id,
      refund_amount: refundAmount,
      items_count: items.length,
      credit_note_id: creditNoteId,
    });

    return createApiSuccessResponse({
      success: true,
      message: "Devolución procesada correctamente",
      refund_amount: refundAmount,
      items_refunded: items.length,
      credit_note_id: creditNoteId ?? undefined,
    });
  } catch (error) {
    logger.error("Error in POS Refund API", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

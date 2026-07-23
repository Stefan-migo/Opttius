/**
 * Service layer for cash register closure.
 *
 * Extracts shared auth/branch/orders/payments logic used by both
 * GET (daily summary) and POST (create closure) handlers in close/route.ts.
 *
 * The route becomes a thin orchestrator calling these functions.
 * Zero behavioral changes — pure extraction.
 */

import { NextRequest } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import {
  getBranchContext,
  getFieldOperationFromRequest,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import {
  aggregatePayments,
  coerceAmount,
} from "@/lib/cash-register/payment-aggregator";
import type {
  PaymentSummary,
  PaymentAggregatorInput,
  OrderPaymentRow,
  CreditNoteMovementRow,
} from "@/lib/cash-register/payment-aggregator";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

import { ClosureError } from "./_helpers/closure-types";
import type { ClosureContext } from "./_helpers/closure-types";
export { getPreviousClosure, resolveGetSession } from "./_helpers/closure-utils";

// ─── Auth + Branch + Field Op Resolution ────────────────────────────────────

export async function getClosureContext(
  request: NextRequest,
): Promise<ClosureContext> {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new ClosureError("Unauthorized", 401);

  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdmin) throw new ClosureError("Admin access required", 403);

  const branchContext = await getBranchContext(request, user.id);
  const fieldOperationId = getFieldOperationFromRequest(request);

  let effectiveBranchId = branchContext.branchId;
  if (fieldOperationId) {
    const { data: fieldOp } = await supabaseServiceRole
      .from("field_operations")
      .select("id, branch_id")
      .eq("id", fieldOperationId)
      .single();
    if (!fieldOp) throw new ClosureError("Operativo no encontrado", 404);
    const hasAccess = await validateBranchAccess(user.id, fieldOp.branch_id);
    if (!hasAccess)
      throw new ClosureError("No tiene acceso a este operativo", 403);
    effectiveBranchId = fieldOp.branch_id;
  }

  return {
    userId: user.id,
    effectiveBranchId,
    fieldOperationId,
    isSuperAdmin: branchContext.isSuperAdmin,
    supabaseServiceRole,
  };
}

// ─── Open Session Lookup ────────────────────────────────────────────────────

export async function getOpenSession(ctx: ClosureContext): Promise<{
  id: string;
  opening_time?: string;
  status?: string;
  reopen_count?: number;
  opening_cash_amount?: number;
} | null> {
  if (!ctx.effectiveBranchId) return null;

  let query = ctx.supabaseServiceRole
    .from("pos_sessions")
    .select("id, opening_time, status, reopen_count, opening_cash_amount")
    .eq("branch_id", ctx.effectiveBranchId)
    .eq("status", "open");

  if (ctx.fieldOperationId) {
    query = query.eq("field_operation_id", ctx.fieldOperationId);
  } else {
    query = query.is("field_operation_id", null);
  }

  const { data: session } = await query
    .order("opening_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return session;
}

// ─── Orders Query ───────────────────────────────────────────────────────────

export async function getClosureOrders(
  ctx: ClosureContext,
  dateStr: string,
): Promise<any[]> {
  let ordersQuery = ctx.supabaseServiceRole
    .from("orders")
    .select("*")
    .eq("is_pos_sale", true)
    .gte("created_at", `${dateStr}T00:00:00`)
    .lt("created_at", `${dateStr}T23:59:59`);

  if (ctx.effectiveBranchId) {
    ordersQuery = ordersQuery.eq("branch_id", ctx.effectiveBranchId);
    if (ctx.fieldOperationId) {
      ordersQuery = ordersQuery.eq("field_operation_id", ctx.fieldOperationId);
    } else {
      ordersQuery = ordersQuery.is("field_operation_id", null);
    }
  }

  const { data: orders, error: ordersError } = await ordersQuery;

  if (ordersError) {
    logger.error("Error fetching orders:", {
      error: ordersError,
      date: dateStr,
      branchId: ctx.effectiveBranchId,
    });
    throw new ClosureError("Error al obtener ventas del día", 500);
  }

  return orders || [];
}

// ─── Session Payments + Opening Cash ────────────────────────────────────────

export async function getSessionPayments(
  ctx: ClosureContext,
  sessionId: string,
  options?: { includeOrderDetails?: boolean },
): Promise<{
  sessionId: string;
  openingCash: number;
  sessionPayments: PaymentAggregatorInput["sessionPayments"];
}> {
  const data: {
    sessionId: string;
    openingCash: number;
    sessionPayments: PaymentAggregatorInput["sessionPayments"];
  } = {
    sessionId,
    openingCash: 0,
    sessionPayments: [],
  };

  // Get opening_cash from the session itself
  const { data: posSession } = await ctx.supabaseServiceRole
    .from("pos_sessions")
    .select("opening_cash_amount")
    .eq("id", sessionId)
    .single();

  if (posSession) {
    data.openingCash = coerceAmount(posSession.opening_cash_amount);
  }

  // Get payments from this session
  const commonSelect = "id, amount, payment_method, paid_at";
  const detailSelect =
    "id, amount, payment_method, paid_at, order_id, order:orders!inner(id, order_number, total_amount, customer_id, customer:customers(first_name, last_name, email))";

  const { data: payments } = options?.includeOrderDetails
    ? await ctx.supabaseServiceRole
        .from("order_payments")
        .select(detailSelect)
        .eq("pos_session_id", sessionId)
    : await ctx.supabaseServiceRole
        .from("order_payments")
        .select(commonSelect)
        .eq("pos_session_id", sessionId);

  if (payments) data.sessionPayments = payments;

  // Get credit note movements (refunds) — negative amounts
  const { data: creditNoteMovements } = await ctx.supabaseServiceRole
    .from("credit_note_movements")
    .select("amount, refund_method")
    .eq("pos_session_id", sessionId);

  if (creditNoteMovements) {
    data.sessionPayments = [
      ...data.sessionPayments,
      ...creditNoteMovements.map((cnm: CreditNoteMovementRow) => ({
        amount: Number(cnm.amount) || 0,
        payment_method: cnm.refund_method,
      })),
    ];
  }

  return data;
}

// ─── 3-Tier Payment Aggregation ────────────────────────────────────────────

export async function aggregateClosurePayments(
  ctx: ClosureContext,
  sessionPayments: PaymentAggregatorInput["sessionPayments"],
  orders: any[],
): Promise<PaymentSummary> {
  if (sessionPayments.length > 0) {
    return aggregatePayments({ sessionPayments, orders: [] });
  }

  if (orders.length > 0) {
    const orderIds = orders.map((o: any) => o.id);
    const { data: orderPayments } = await ctx.supabaseServiceRole
      .from("order_payments")
      .select("amount, payment_method")
      .in("order_id", orderIds);

    if (orderPayments && orderPayments.length > 0) {
      return aggregatePayments({
        sessionPayments: [],
        orders: [],
        orderPayments: orderPayments as OrderPaymentRow[],
      });
    }

    // Final fallback: use mp_payment_method from orders
    return aggregatePayments({
      sessionPayments: [],
      orders: orders.map((o: any) => ({
        id: o.id,
        total_amount: coerceAmount(o.total_amount),
        mp_payment_method: o.mp_payment_method,
        status: o.status,
      })),
    });
  }

  return {
    cash_sales: 0,
    debit_card_sales: 0,
    credit_card_sales: 0,
    transfer_sales: 0,
    installments_sales: 0,
    other_payment_sales: 0,
    source: "no_payments" as const,
  };
}
// ─── (getPreviousClosure and resolveGetSession moved to _helpers/closure-utils.ts) ───

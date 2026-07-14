/**
 * Service layer for cash register closure.
 *
 * Extracts shared auth/branch/orders/payments logic used by both
 * GET (daily summary) and POST (create closure) handlers in close/route.ts.
 *
 * The route becomes a thin orchestrator calling these functions.
 * Zero behavioral changes — pure extraction.
 */

import { NextRequest, NextResponse } from "next/server";

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
import type { ClosurePayloadParams } from "@/lib/cash-register/closure-builder";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

// ─── Error ───────────────────────────────────────────────────────────────────

export class ClosureError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ClosureError";
    this.statusCode = statusCode;
  }
}

export function handleClosureError(error: unknown): NextResponse {
  if (error instanceof ClosureError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }
  logger.error("Error in cash register closure API:", { error });
  const message = (error as Error)?.message ?? "Unknown error";
  return NextResponse.json(
    { error: "Internal server error", details: message },
    { status: 500 },
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClosureContext {
  userId: string;
  effectiveBranchId: string | null;
  fieldOperationId: string | null;
  isSuperAdmin: boolean;
  supabaseServiceRole: ReturnType<typeof createServiceRoleClient>;
}

export interface SessionData {
  sessionId: string | null;
  openingCash: number;
  sessionPayments: PaymentAggregatorInput["sessionPayments"];
}

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

// ─── Open Session Lookup (no date filter — for date alignment) ─────────────

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

// ─── Date Alignment ─────────────────────────────────────────────────────────

export function alignDateWithSession(
  dateStr: string,
  openSession: { opening_time?: string } | null,
): string {
  if (openSession?.opening_time) {
    const sessionDateStr = openSession.opening_time.split("T")[0];
    if (sessionDateStr !== dateStr) {
      return sessionDateStr;
    }
  }
  return dateStr;
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
): Promise<SessionData> {
  const data: SessionData = {
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

// ─── Cash Inflows/Outflows (GET-only helper) ───────────────────────────────

export function calculateCashInflowsOutflows(
  sessionPayments: PaymentAggregatorInput["sessionPayments"],
): { cashInflows: number; cashOutflows: number } {
  let cashInflows = 0;
  let cashOutflows = 0;

  for (const payment of sessionPayments) {
    const amount = coerceAmount(payment.amount);
    if (payment.payment_method === "cash") {
      if (amount >= 0) cashInflows += amount;
      else cashOutflows += Math.abs(amount);
    }
  }

  return { cashInflows, cashOutflows };
}

// ─── Previous Closure Lookup (GET-only) ────────────────────────────────────

export async function getPreviousClosure(
  ctx: ClosureContext,
  dateStr: string,
): Promise<any | null> {
  if (!ctx.effectiveBranchId) return null;

  let closureQuery = ctx.supabaseServiceRole
    .from("cash_register_closures")
    .select("*")
    .eq("branch_id", ctx.effectiveBranchId)
    .eq("closure_date", dateStr);

  if (ctx.fieldOperationId) {
    closureQuery = closureQuery.eq("field_operation_id", ctx.fieldOperationId);
  } else {
    closureQuery = closureQuery.is("field_operation_id", null);
  }

  const { data: existingClosure } = await closureQuery.maybeSingle();

  if (
    existingClosure &&
    (existingClosure.status === "draft" || existingClosure.reopened_at)
  ) {
    return existingClosure;
  }

  return null;
}

// ─── Order Totals (pure) ────────────────────────────────────────────────────

export interface OrderTotals {
  totalSales: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscounts: number;
}

export function calculateOrderTotals(orders: any[]): OrderTotals {
  let totalSales = 0;
  let totalSubtotal = 0;
  let totalTax = 0;
  let totalDiscounts = 0;

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    totalSales += coerceAmount(order.total_amount);
    totalSubtotal += coerceAmount(order.subtotal);
    totalTax += coerceAmount(order.tax_amount);
    totalDiscounts += coerceAmount(order.discount_amount);
  }

  return { totalSales, totalSubtotal, totalTax, totalDiscounts };
}

// ─── GET Session Fallback ──────────────────────────────────────────────────

export async function resolveGetSession(
  ctx: ClosureContext,
  dateStr: string,
): Promise<{ sessionId: string | null }> {
  if (!ctx.effectiveBranchId) return { sessionId: null };

  // Try open session for this date first
  let openQuery = ctx.supabaseServiceRole
    .from("pos_sessions")
    .select("id, opening_cash_amount, status, reopen_count")
    .eq("branch_id", ctx.effectiveBranchId)
    .eq("status", "open")
    .gte("opening_time", `${dateStr}T00:00:00`)
    .lt("opening_time", `${dateStr}T23:59:59`);

  if (ctx.fieldOperationId) {
    openQuery = openQuery.eq("field_operation_id", ctx.fieldOperationId);
  } else {
    openQuery = openQuery.is("field_operation_id", null);
  }

  const { data: openPosSession } = await openQuery
    .order("opening_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openPosSession) return { sessionId: openPosSession.id };

  // Fallback: any session for this date (even closed — reopened cases)
  let fallbackQuery = ctx.supabaseServiceRole
    .from("pos_sessions")
    .select("id, opening_cash_amount, status, reopen_count")
    .eq("branch_id", ctx.effectiveBranchId)
    .gte("opening_time", `${dateStr}T00:00:00`)
    .lt("opening_time", `${dateStr}T23:59:59`);

  if (ctx.fieldOperationId) {
    fallbackQuery = fallbackQuery.eq("field_operation_id", ctx.fieldOperationId);
  } else {
    fallbackQuery = fallbackQuery.is("field_operation_id", null);
  }

  const { data: lastSession } = await fallbackQuery
    .order("opening_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { sessionId: lastSession?.id || null };
}

// ─── Closure Payload Input Builder ─────────────────────────────────────────

export interface ClosureInputRaw {
  branch_id: string;
  closure_date: string;
  closed_by: string;
  pos_session_id: string | null;
  field_operation_id?: string;
  opening_cash_amount: number;
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  debitCardSales: number;
  creditCardSales: number;
  installmentsSales: number;
  otherPaymentSales: number;
  transferSales: number;
  expectedCash: number;
  actual_cash: number | undefined | null;
  cashDifference: number;
  card_machine_debit_total: number | undefined | null;
  card_machine_credit_total: number | undefined | null;
  cardMachineDifference: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscounts: number;
  notes: string | null | undefined;
  discrepancies: Record<string, unknown> | null | undefined;
  openedAt: string;
}

export function buildClosureInput(raw: ClosureInputRaw): ClosurePayloadParams {
  return {
    branch_id: raw.branch_id,
    closure_date: raw.closure_date,
    closed_by: raw.closed_by,
    pos_session_id: raw.pos_session_id,
    ...(raw.field_operation_id
      ? { field_operation_id: raw.field_operation_id }
      : {}),
    opening_cash_amount: raw.opening_cash_amount,
    total_sales: raw.totalSales,
    total_transactions: raw.totalTransactions,
    cash_sales: raw.cashSales,
    debit_card_sales: raw.debitCardSales,
    credit_card_sales: raw.creditCardSales,
    installments_sales: raw.installmentsSales,
    // PRESERVED: merge transfer_sales into other_payment_sales (POST-only behavior)
    other_payment_sales: raw.otherPaymentSales + raw.transferSales,
    expected_cash: raw.expectedCash,
    actual_cash:
      raw.actual_cash !== undefined && raw.actual_cash !== null
        ? Number(raw.actual_cash)
        : null,
    cash_difference: raw.cashDifference,
    card_machine_debit_total:
      raw.card_machine_debit_total !== undefined &&
      raw.card_machine_debit_total !== null
        ? Number(raw.card_machine_debit_total)
        : 0,
    card_machine_credit_total:
      raw.card_machine_credit_total !== undefined &&
      raw.card_machine_credit_total !== null
        ? Number(raw.card_machine_credit_total)
        : 0,
    card_machine_difference: raw.cardMachineDifference,
    total_subtotal: raw.totalSubtotal,
    total_tax: raw.totalTax,
    total_discounts: raw.totalDiscounts,
    closing_cash_amount:
      raw.actual_cash !== undefined && raw.actual_cash !== null
        ? Number(raw.actual_cash)
        : null,
    notes: raw.notes || null,
    discrepancies: raw.discrepancies || null,
    status: "closed",
    opened_at: raw.openedAt,
  };
}

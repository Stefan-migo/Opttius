import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { buildClosurePayload } from "@/lib/cash-register/closure-builder";
import type { PaymentAggregatorInput } from "@/lib/cash-register/payment-aggregator";
import {
  getClosureContext,
  getOpenSession,
  alignDateWithSession,
  getClosureOrders,
  getSessionPayments,
  aggregateClosurePayments,
  calculateCashInflowsOutflows,
  getPreviousClosure,
  calculateOrderTotals,
  resolveGetSession,
  buildClosureInput,
  handleClosureError,
} from "@/lib/cash-register/closure-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cash-register/close
 * Get daily sales summary for cash register closure
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getClosureContext(request);

    // Parse date from query params (default to today)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const closureDate = dateParam ? new Date(dateParam) : new Date();
    let dateStr = closureDate.toISOString().split("T")[0];

    // Align summary date with the currently open session if it differs
    const openSession = await getOpenSession(ctx);
    const alignedDate = alignDateWithSession(dateStr, openSession);
    if (alignedDate !== dateStr) {
      logger.warn("Summary date does not match open session date", {
        requestedDate: dateStr,
        sessionDate: alignedDate,
        branchId: ctx.effectiveBranchId,
      });
      dateStr = alignedDate;
    }

    // Regular admin without branch selected — return empty summary
    if (!ctx.effectiveBranchId && !ctx.isSuperAdmin) {
      return NextResponse.json({
        summary: {
          date: dateStr,
          branch_id: null,
          total_sales: 0,
          total_transactions: 0,
          cash_sales: 0,
          debit_card_sales: 0,
          credit_card_sales: 0,
          installments_sales: 0,
          other_payment_sales: 0,
          total_subtotal: 0,
          total_tax: 0,
          total_discounts: 0,
          orders: [],
        },
      });
    }

    // Fetch POS orders of the day
    const orders = await getClosureOrders(ctx, dateStr);

    // Session fallback: open → any session for this date
    const { sessionId } = await resolveGetSession(ctx, dateStr);

    // Payments + opening cash for resolved session
    let openingCash = 0;
    let sessionPayments: PaymentAggregatorInput["sessionPayments"] = [];
    if (sessionId) {
      const sd = await getSessionPayments(ctx, sessionId);
      openingCash = sd.openingCash;
      sessionPayments = sd.sessionPayments;
    }

    // Build summary
    const summary = {
      date: dateStr,
      branch_id: ctx.effectiveBranchId,
      field_operation_id: ctx.fieldOperationId || null,
      total_sales: 0,
      total_transactions:
        sessionPayments.length > 0 ? sessionPayments.length : orders.length,
      cash_sales: 0,
      debit_card_sales: 0,
      credit_card_sales: 0,
      transfer_sales: 0,
      installments_sales: 0,
      other_payment_sales: 0,
      total_subtotal: 0,
      total_tax: 0,
      total_discounts: 0,
      orders,
    };

    // Order totals (exclude cancelled)
    const orderTotals = calculateOrderTotals(orders);
    summary.total_sales = orderTotals.totalSales;
    summary.total_subtotal = orderTotals.totalSubtotal;
    summary.total_tax = orderTotals.totalTax;
    summary.total_discounts = orderTotals.totalDiscounts;

    // Cash inflows/outflows tracking
    const { cashInflows, cashOutflows } =
      sessionPayments.length > 0
        ? calculateCashInflowsOutflows(sessionPayments)
        : { cashInflows: 0, cashOutflows: 0 };

    // 3-tier payment aggregation
    const ps = await aggregateClosurePayments(ctx, sessionPayments, orders);
    summary.cash_sales = ps.cash_sales;
    summary.debit_card_sales = ps.debit_card_sales;
    summary.credit_card_sales = ps.credit_card_sales;
    summary.transfer_sales = ps.transfer_sales;
    summary.installments_sales = ps.installments_sales;
    summary.other_payment_sales = ps.other_payment_sales;

    // Previous closure (draft / reopened)
    const previousClosure = await getPreviousClosure(ctx, dateStr);

    return NextResponse.json({
      summary: {
        ...summary,
        opening_cash_amount: openingCash,
        expected_cash: openingCash + summary.cash_sales,
        session_payments_count: sessionPayments.length,
        cash_inflows: cashInflows,
        cash_outflows: cashOutflows,
      },
      previous_closure: previousClosure,
    });
  } catch (error: unknown) {
    return handleClosureError(error);
  }
}

/**
 * POST /api/admin/cash-register/close
 * Create a cash register closure
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getClosureContext(request);

    const body = await request.json();
    const {
      closure_date,
      opening_cash_amount,
      actual_cash,
      card_machine_debit_total,
      card_machine_credit_total,
      notes,
      discrepancies,
    } = body;

    logger.info("Cash register closure request received", {
      opening_cash_amount,
      actual_cash,
      actual_cash_type: typeof actual_cash,
      closure_date,
    });

    // Validate required fields
    if (!closure_date) {
      return NextResponse.json(
        { error: "La fecha de cierre es requerida" },
        { status: 400 },
      );
    }
    if (opening_cash_amount === undefined || opening_cash_amount === null) {
      return NextResponse.json(
        { error: "El monto inicial de caja es requerido" },
        { status: 400 },
      );
    }

    let dateStr = closure_date.split("T")[0];

    // Branch validation
    if (!ctx.effectiveBranchId && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: "Debe seleccionar una sucursal para cerrar la caja" },
        { status: 400 },
      );
    }

    // Open session + date alignment
    const openSession = await getOpenSession(ctx);
    const alignedDate = alignDateWithSession(dateStr, openSession);
    if (alignedDate !== dateStr) {
      logger.warn("Closure date does not match session date", {
        requestedDate: dateStr,
        sessionDate: alignedDate,
        sessionId: openSession?.id,
        branchId: ctx.effectiveBranchId,
      });
      dateStr = alignedDate;
    }

    // Resolve session ID
    let sessionIdForClosure = openSession?.id || null;

    if (!sessionIdForClosure && ctx.effectiveBranchId) {
      let existingClosureQuery = ctx.supabaseServiceRole
        .from("cash_register_closures")
        .select("pos_session_id")
        .eq("branch_id", ctx.effectiveBranchId)
        .eq("closure_date", dateStr);

      if (ctx.fieldOperationId) {
        existingClosureQuery = existingClosureQuery.eq(
          "field_operation_id",
          ctx.fieldOperationId,
        );
      } else {
        existingClosureQuery = existingClosureQuery.is(
          "field_operation_id",
          null,
        );
      }

      const { data: existingClosure } =
        await existingClosureQuery.maybeSingle();

      if (existingClosure?.pos_session_id) {
        sessionIdForClosure = existingClosure.pos_session_id;
        logger.info("Using session from existing closure", {
          sessionId: sessionIdForClosure,
        });
      }
    }

    // Close the open session
    if (openSession) {
      const { error: closeSessionError } = await ctx.supabaseServiceRole
        .from("pos_sessions")
        .update({
          status: "closed",
          closing_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", openSession.id)
        .eq("status", "open");

      if (closeSessionError) {
        logger.error("Error closing POS session", closeSessionError);
      } else {
        logger.info("Closed POS session", {
          sessionId: openSession.id,
          reopenCount: openSession.reopen_count,
        });
      }
    }

    // Orders + payments
    const orders = await getClosureOrders(ctx, dateStr);

    let sessionPayments: PaymentAggregatorInput["sessionPayments"] = [];
    if (sessionIdForClosure) {
      const sd = await getSessionPayments(ctx, sessionIdForClosure, {
        includeOrderDetails: true,
      });
      sessionPayments = sd.sessionPayments;
    }

    // Order totals
    const orderTotals = calculateOrderTotals(orders);

    // Payment aggregation
    const pr = await aggregateClosurePayments(ctx, sessionPayments, orders);
    const cashSales = pr.cash_sales;
    const debitCardSales = pr.debit_card_sales;
    const creditCardSales = pr.credit_card_sales;
    const transferSales = pr.transfer_sales;
    const installmentsSales = pr.installments_sales;
    const otherPaymentSales = pr.other_payment_sales;

    // Differences
    const expectedCash = Number(opening_cash_amount) + cashSales;
    const actualCashValue =
      actual_cash !== undefined && actual_cash !== null
        ? Number(actual_cash)
        : null;
    const cashDifference =
      actualCashValue !== null ? actualCashValue - expectedCash : 0;

    logger.info("Cash difference calculation", {
      opening_cash_amount: Number(opening_cash_amount),
      cashSales,
      expectedCash,
      actual_cash: actualCashValue,
      cashDifference,
    });

    const cardMachineDebitDifference =
      card_machine_debit_total !== undefined &&
      card_machine_debit_total !== null
        ? Number(card_machine_debit_total) - debitCardSales
        : 0;
    const cardMachineCreditDifference =
      card_machine_credit_total !== undefined &&
      card_machine_credit_total !== null
        ? Number(card_machine_credit_total) - creditCardSales
        : 0;
    const cardMachineDifference =
      cardMachineDebitDifference + cardMachineCreditDifference;

    const openedAt = openSession?.opening_time
      ? new Date(openSession.opening_time)
      : new Date(`${dateStr}T00:00:00`);

    // Pre-insert validations
    if (!ctx.effectiveBranchId) {
      logger.error("branch_id is null when trying to create closure", {
        isSuperAdmin: ctx.isSuperAdmin,
        branchId: ctx.effectiveBranchId,
      });
      return NextResponse.json(
        { error: "Debe seleccionar una sucursal para cerrar la caja" },
        { status: 400 },
      );
    }
    if (!ctx.userId) {
      logger.error("user.id is null when trying to create closure");
      return NextResponse.json(
        { error: "Error de autenticación" },
        { status: 401 },
      );
    }

    // Check existing closure
    let existingClosureQuery = ctx.supabaseServiceRole
      .from("cash_register_closures")
      .select("id, status, pos_session_id")
      .eq("branch_id", ctx.effectiveBranchId)
      .eq("closure_date", dateStr);

    if (ctx.fieldOperationId) {
      existingClosureQuery = existingClosureQuery.eq(
        "field_operation_id",
        ctx.fieldOperationId,
      );
    } else {
      existingClosureQuery = existingClosureQuery.is(
        "field_operation_id",
        null,
      );
    }

    const { data: existingClosure, error: existingClosureError } =
      await existingClosureQuery.maybeSingle();

    if (existingClosureError) {
      logger.error("Error checking existing closure:", {
        error: existingClosureError.message || existingClosureError,
        code: existingClosureError.code,
        details: existingClosureError.details,
        branchId: ctx.effectiveBranchId,
        dateStr,
      });
      return NextResponse.json(
        {
          error: "Error al verificar cierres existentes",
          details: existingClosureError.message,
        },
        { status: 500 },
      );
    }

    const canUpdateClosedClosure =
      existingClosure &&
      existingClosure.status === "closed" &&
      openSession &&
      (!existingClosure.pos_session_id ||
        existingClosure.pos_session_id === openSession.id);

    if (existingClosure && existingClosure.status === "closed") {
      if (!canUpdateClosedClosure) {
        return NextResponse.json(
          { error: "Ya existe un cierre de caja para esta fecha y sucursal" },
          { status: 400 },
        );
      }
      logger.warn("Updating a closed closure due to open session", {
        closureId: existingClosure.id,
        sessionId: openSession?.id,
        branchId: ctx.effectiveBranchId,
        dateStr,
      });
    }

    // Build closure payload
    const closureParams = buildClosureInput({
      branch_id: ctx.effectiveBranchId,
      closure_date: dateStr,
      closed_by: ctx.userId,
      pos_session_id: sessionIdForClosure || null,
      field_operation_id: ctx.fieldOperationId || undefined,
      opening_cash_amount: Number(opening_cash_amount),
      totalSales: orderTotals.totalSales,
      totalTransactions:
        sessionPayments.length > 0
          ? sessionPayments.length
          : orders.length,
      cashSales,
      debitCardSales,
      creditCardSales,
      installmentsSales,
      otherPaymentSales,
      transferSales,
      expectedCash,
      actual_cash,
      cashDifference,
      card_machine_debit_total,
      card_machine_credit_total,
      cardMachineDifference,
      totalSubtotal: orderTotals.totalSubtotal,
      totalTax: orderTotals.totalTax,
      totalDiscounts: orderTotals.totalDiscounts,
      notes: notes || null,
      discrepancies: discrepancies || null,
      openedAt: openedAt.toISOString(),
    });
    const closureData = buildClosurePayload(closureParams);

    logger.info("Preparing to create/update closure", {
      existingClosure: existingClosure
        ? { id: existingClosure.id, status: existingClosure.status }
        : null,
      closureData: {
        ...closureData,
        closed_by: ctx.userId.substring(0, 8) + "...",
      },
    });

    // Create or update closure
    let closureResponse;
    if (existingClosure && existingClosure.status !== "closed") {
      logger.info("Updating existing closure", {
        closureId: existingClosure.id,
        currentStatus: existingClosure.status,
        newStatus: "closed",
      });
      closureResponse = await ctx.supabaseServiceRole
        .from("cash_register_closures")
        .update(closureData)
        .eq("id", existingClosure.id)
        .select()
        .single();
    } else if (canUpdateClosedClosure && existingClosure) {
      closureResponse = await ctx.supabaseServiceRole
        .from("cash_register_closures")
        .update(closureData)
        .eq("id", existingClosure.id)
        .select()
        .single();
    } else {
      logger.info("Inserting new closure", {
        branchId: ctx.effectiveBranchId,
        fieldOperationId: ctx.fieldOperationId || undefined,
        closureDate: dateStr,
      });
      closureResponse = await ctx.supabaseServiceRole
        .from("cash_register_closures")
        .insert(closureData)
        .select()
        .single();
    }

    const { data: closure, error: closureError } = closureResponse;

    if (closureError) {
      logger.error("Error creating cash register closure:", {
        error: closureError.message || closureError,
        code: closureError.code,
        details: closureError.details,
        hint: closureError.hint,
        closureDate: closure_date,
        branchId: ctx.effectiveBranchId,
        existingClosure: existingClosure
          ? { id: existingClosure.id, status: existingClosure.status }
          : null,
        closureData: {
          ...closureData,
          closed_by: ctx.userId.substring(0, 8) + "...",
        },
      });
      return NextResponse.json(
        {
          error: "Error al crear el cierre de caja",
          details: closureError.message,
          code: closureError.code,
          hint: closureError.hint,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, closure });
  } catch (error: unknown) {
    logger.error("Error in cash register closure POST API:", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { handleClosureError } from "@/lib/cash-register/_helpers/closure-types";
import {
  alignDateWithSession,
  calculateCashInflowsOutflows,
  calculateOrderTotals,
} from "@/lib/cash-register/_helpers/closure-utils";
import {
  aggregateClosurePayments,
  getClosureContext,
  getClosureOrders,
  getOpenSession,
  getPreviousClosure,
  getSessionPayments,
  resolveGetSession,
} from "@/lib/cash-register/closure-service";
import type { PaymentAggregatorInput } from "@/lib/cash-register/payment-aggregator";
import { appLogger as logger } from "@/lib/logger";

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

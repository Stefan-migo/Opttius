import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  getFieldOperationFromRequest,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
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
import { buildClosurePayload } from "@/lib/cash-register/closure-builder";
import type { ClosurePayloadParams } from "@/lib/cash-register/closure-builder";

/**
 * GET /api/admin/cash-register/close
 * Get daily sales summary for cash register closure
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
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

    // Get branch context and optional operativo context
    const branchContext = await getBranchContext(request, user.id);
    const fieldOperationId = getFieldOperationFromRequest(request);

    let effectiveBranchId = branchContext.branchId;
    if (fieldOperationId) {
      const { data: fieldOp } = await supabaseServiceRole
        .from("field_operations")
        .select("id, branch_id")
        .eq("id", fieldOperationId)
        .single();
      if (!fieldOp) {
        return NextResponse.json(
          { error: "Operativo no encontrado" },
          { status: 404 },
        );
      }
      const hasAccess = await validateBranchAccess(user.id, fieldOp.branch_id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "No tiene acceso a este operativo" },
          { status: 403 },
        );
      }
      effectiveBranchId = fieldOp.branch_id;
    }

    // Validate branch access for non-super admins
    if (!branchContext.isSuperAdmin && !effectiveBranchId) {
      return NextResponse.json(
        {
          error: "Debe seleccionar una sucursal",
        },
        { status: 400 },
      );
    }

    // Get date from query params (default to today)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const closureDate = dateParam ? new Date(dateParam) : new Date();
    let dateStr = closureDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Align summary date with the currently open session if it differs
    if (effectiveBranchId) {
      let sessionQuery = supabaseServiceRole
        .from("pos_sessions")
        .select("id, opening_time")
        .eq("branch_id", effectiveBranchId)
        .eq("status", "open");
      if (fieldOperationId) {
        sessionQuery = sessionQuery.eq("field_operation_id", fieldOperationId);
      } else {
        sessionQuery = sessionQuery.is("field_operation_id", null);
      }
      const { data: openSession } = await sessionQuery
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openSession?.opening_time) {
        const sessionDateStr = openSession.opening_time.split("T")[0];
        if (sessionDateStr !== dateStr) {
          logger.warn("Summary date does not match open session date", {
            requestedDate: dateStr,
            sessionDate: sessionDateStr,
            sessionId: openSession.id,
            branchId: effectiveBranchId,
          });
          dateStr = sessionDateStr;
        }
      }
    }

    // Build query for POS orders of the day
    let ordersQuery = supabaseServiceRole
      .from("orders")
      .select("*")
      .eq("is_pos_sale", true)
      .gte("created_at", `${dateStr}T00:00:00`)
      .lt("created_at", `${dateStr}T23:59:59`);

    // Filter by branch and optional operativo
    if (effectiveBranchId) {
      ordersQuery = ordersQuery.eq("branch_id", effectiveBranchId);
      if (fieldOperationId) {
        ordersQuery = ordersQuery.eq("field_operation_id", fieldOperationId);
      } else {
        ordersQuery = ordersQuery.is("field_operation_id", null);
      }
    } else if (!branchContext.isSuperAdmin) {
      // Regular admin without branch selected - return empty
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

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      logger.error("Error fetching orders:", {
        error: ordersError,
        date: dateStr,
        branchId: effectiveBranchId,
      });
      return NextResponse.json(
        {
          error: "Error al obtener ventas del día",
          details: ordersError.message,
        },
        { status: 500 },
      );
    }

    // Get opening cash amount and session payments from POS session (if exists) for today
    // IMPORTANT: Initialize sessionPayments BEFORE using it in the summary calculation
    // ✅ CORREGIDO: Buscar sesión más reciente (open o la última del día si fue reabierta)
    let openingCash = 0;
    let sessionPayments: PaymentAggregatorInput["sessionPayments"] = [];
    let sessionId: string | null = null;

    if (effectiveBranchId) {
      let sessionQuery = supabaseServiceRole
        .from("pos_sessions")
        .select("id, opening_cash_amount, status, reopen_count")
        .eq("branch_id", effectiveBranchId)
        .eq("status", "open")
        .gte("opening_time", `${dateStr}T00:00:00`)
        .lt("opening_time", `${dateStr}T23:59:59`);
      if (fieldOperationId) {
        sessionQuery = sessionQuery.eq("field_operation_id", fieldOperationId);
      } else {
        sessionQuery = sessionQuery.is("field_operation_id", null);
      }
      const { data: openSession } = await sessionQuery
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      let posSession = openSession;

      if (!posSession) {
        let lastSessionQuery = supabaseServiceRole
          .from("pos_sessions")
          .select("id, opening_cash_amount, status, reopen_count")
          .eq("branch_id", effectiveBranchId)
          .gte("opening_time", `${dateStr}T00:00:00`)
          .lt("opening_time", `${dateStr}T23:59:59`);
        if (fieldOperationId) {
          lastSessionQuery = lastSessionQuery.eq(
            "field_operation_id",
            fieldOperationId,
          );
        } else {
          lastSessionQuery = lastSessionQuery.is("field_operation_id", null);
        }
        const { data: lastSession } = await lastSessionQuery
          .order("opening_time", { ascending: false })
          .limit(1)
          .maybeSingle();

        posSession = lastSession || null;
      }

      if (posSession) {
        openingCash = coerceAmount(posSession.opening_cash_amount);
        sessionId = posSession.id;

        // Get all payments from this session (incluso si está "closed")
        const { data: payments } = await supabaseServiceRole
          .from("order_payments")
          .select(
            `
            id,
            amount,
            payment_method,
            paid_at
          `,
          )
          .eq("pos_session_id", sessionId);

        if (payments) {
          sessionPayments = payments;
        }

        // Get credit note movements (refunds) for this session
        const { data: creditNoteMovements } = await supabaseServiceRole
          .from("credit_note_movements")
          .select("amount, refund_method")
          .eq("pos_session_id", sessionId);

        // Subtract refunds from payment totals (handled below with sessionPayments)
        sessionPayments = [
          ...sessionPayments,
          ...(creditNoteMovements || []).map((cnm: CreditNoteMovementRow) => ({
            amount: Number(cnm.amount) || 0, // negative
            payment_method: cnm.refund_method,
          })),
        ];
      }
    }

    // Calculate summary
    const summary = {
      date: dateStr,
      branch_id: effectiveBranchId,
      field_operation_id: fieldOperationId || null,
      total_sales: 0,
      total_transactions:
        sessionPayments.length > 0
          ? sessionPayments.length
          : orders?.length || 0,
      cash_sales: 0,
      debit_card_sales: 0,
      credit_card_sales: 0,
      transfer_sales: 0,
      installments_sales: 0,
      other_payment_sales: 0,
      total_subtotal: 0,
      total_tax: 0,
      total_discounts: 0,
      orders: orders || [],
    };

    // Process each order (for totals, subtotals, taxes) - exclude cancelled
    (orders || []).forEach((order) => {
      if (order.status === "cancelled") return;
      summary.total_sales += coerceAmount(order.total_amount);
      summary.total_subtotal += coerceAmount(order.subtotal);
      summary.total_tax += coerceAmount(order.tax_amount);
      summary.total_discounts += coerceAmount(order.discount_amount);
    });

    // Track cash inflows vs outflows for clearer reconciliation
    let cash_inflows = 0;
    let cash_outflows = 0;

    // Aggregate payment method totals using extracted pure function
    let paymentSummary: PaymentSummary;
    if (sessionPayments.length > 0) {
      // Track cash inflows/outflows before aggregation
      sessionPayments.forEach((payment) => {
        const amount = coerceAmount(payment.amount);
        if (payment.payment_method === "cash") {
          if (amount >= 0) cash_inflows += amount;
          else cash_outflows += Math.abs(amount);
        }
      });

      paymentSummary = aggregatePayments({
        sessionPayments,
        orders: [],
      });
    } else if (orders && orders.length > 0) {
      // Fallback: Get payments from order_payments table (more accurate than mp_payment_method)
      const orderIds = orders.map((o) => o.id);
      const { data: orderPayments } = await supabaseServiceRole
        .from("order_payments")
        .select("amount, payment_method")
        .in("order_id", orderIds);

      if (orderPayments && orderPayments.length > 0) {
        paymentSummary = aggregatePayments({
          sessionPayments: [],
          orders: [],
          orderPayments: orderPayments as OrderPaymentRow[],
        });
      } else {
        // Final fallback: Use mp_payment_method from orders (normalized values)
        paymentSummary = aggregatePayments({
          sessionPayments: [],
          orders: orders.map((o) => ({
            id: o.id,
            total_amount: coerceAmount(o.total_amount),
            mp_payment_method: o.mp_payment_method,
            status: o.status,
          })),
        });
      }
    } else {
      paymentSummary = {
        cash_sales: 0,
        debit_card_sales: 0,
        credit_card_sales: 0,
        transfer_sales: 0,
        installments_sales: 0,
        other_payment_sales: 0,
        source: "no_payments" as const,
      };
    }

    // Apply payment summary to the main summary
    summary.cash_sales = paymentSummary.cash_sales;
    summary.debit_card_sales = paymentSummary.debit_card_sales;
    summary.credit_card_sales = paymentSummary.credit_card_sales;
    summary.transfer_sales = paymentSummary.transfer_sales;
    summary.installments_sales = paymentSummary.installments_sales;
    summary.other_payment_sales = paymentSummary.other_payment_sales;

    // Calculate expected cash (ONLY cash sales + opening cash, NOT transfers)
    // Transfers are bank transfers, not physical cash
    const expectedCash = openingCash + summary.cash_sales;

    // ✅ NUEVO: Obtener cierre anterior si existe (para reaperturas)
    let previousClosure = null;
    if (effectiveBranchId) {
      let closureQuery = supabaseServiceRole
        .from("cash_register_closures")
        .select("*")
        .eq("branch_id", effectiveBranchId)
        .eq("closure_date", dateStr);
      if (fieldOperationId) {
        closureQuery = closureQuery.eq("field_operation_id", fieldOperationId);
      } else {
        closureQuery = closureQuery.is("field_operation_id", null);
      }
      const { data: existingClosure } = await closureQuery.maybeSingle();

      if (
        existingClosure &&
        (existingClosure.status === "draft" || existingClosure.reopened_at)
      ) {
        previousClosure = existingClosure;
      }
    }

    return NextResponse.json({
      summary: {
        ...summary,
        opening_cash_amount: openingCash,
        expected_cash: expectedCash,
        session_payments_count: sessionPayments.length,
        cash_inflows,
        cash_outflows,
      },
      previous_closure: previousClosure,
    });
  } catch (error: unknown) {
    logger.error("Error in cash register closure API:", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/cash-register/close
 * Create a cash register closure
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

    // Get branch context and optional operativo context
    const branchContext = await getBranchContext(request, user.id);
    const fieldOperationId = getFieldOperationFromRequest(request);

    let effectiveBranchId = branchContext.branchId;
    if (fieldOperationId) {
      const { data: fieldOp } = await supabaseServiceRole
        .from("field_operations")
        .select("id, branch_id")
        .eq("id", fieldOperationId)
        .single();
      if (!fieldOp) {
        return NextResponse.json(
          { error: "Operativo no encontrado" },
          { status: 404 },
        );
      }
      const hasAccess = await validateBranchAccess(user.id, fieldOp.branch_id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "No tiene acceso a este operativo" },
          { status: 403 },
        );
      }
      effectiveBranchId = fieldOp.branch_id;
    }

    // Validate branch access for non-super admins
    if (!branchContext.isSuperAdmin && !effectiveBranchId) {
      return NextResponse.json(
        {
          error: "Debe seleccionar una sucursal para cerrar la caja",
        },
        { status: 400 },
      );
    }

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

    // Log para debugging
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

    // Get date string early for use in queries
    let dateStr = closure_date.split("T")[0];

    // Check if there's an open session for this branch/operativo and close it
    let openSessionQuery = supabaseServiceRole
      .from("pos_sessions")
      .select("id, status, reopen_count, opening_time")
      .eq("branch_id", effectiveBranchId!)
      .eq("status", "open");
    if (fieldOperationId) {
      openSessionQuery = openSessionQuery.eq(
        "field_operation_id",
        fieldOperationId,
      );
    } else {
      openSessionQuery = openSessionQuery.is("field_operation_id", null);
    }
    const { data: openSession, error: openSessionError } =
      await openSessionQuery
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (openSessionError && openSessionError.code !== "PGRST116") {
      logger.error("Error checking open session", openSessionError);
      // Continue anyway, but log the error
    }

    // Align closure date with the session opening date if available
    if (openSession?.opening_time) {
      const sessionDateStr = openSession.opening_time.split("T")[0];
      if (sessionDateStr !== dateStr) {
        logger.warn("Closure date does not match session date", {
          requestedDate: dateStr,
          sessionDate: sessionDateStr,
          sessionId: openSession.id,
          branchId: effectiveBranchId,
        });
        dateStr = sessionDateStr;
      }
    }

    // Get the session ID for the closure
    let sessionIdForClosure = openSession?.id || null;

    // If no open session, check if there's a closure with a session_id (reopened case)
    if (!sessionIdForClosure) {
      let existingClosureQuery = supabaseServiceRole
        .from("cash_register_closures")
        .select("pos_session_id")
        .eq("branch_id", effectiveBranchId!)
        .eq("closure_date", dateStr);
      if (fieldOperationId) {
        existingClosureQuery = existingClosureQuery.eq(
          "field_operation_id",
          fieldOperationId,
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

    // Close the open session if it exists
    if (openSession) {
      const { error: closeSessionError } = await supabaseServiceRole
        .from("pos_sessions")
        .update({
          status: "closed",
          closing_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", openSession.id)
        .eq("status", "open"); // Only update if still open (prevent race conditions)

      if (closeSessionError) {
        logger.error("Error closing POS session", closeSessionError);
        // Continue anyway, but log the error
      } else {
        logger.info("Closed POS session", {
          sessionId: openSession.id,
          reopenCount: openSession.reopen_count,
        });
      }
    }

    // Get daily sales summary - ORDERS created during the day
    let ordersQuery = supabaseServiceRole
      .from("orders")
      .select("*")
      .eq("is_pos_sale", true)
      .gte("created_at", `${dateStr}T00:00:00`)
      .lt("created_at", `${dateStr}T23:59:59`);

    if (effectiveBranchId) {
      ordersQuery = ordersQuery.eq("branch_id", effectiveBranchId);
      if (fieldOperationId) {
        ordersQuery = ordersQuery.eq("field_operation_id", fieldOperationId);
      } else {
        ordersQuery = ordersQuery.is("field_operation_id", null);
      }
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      logger.error("Error fetching orders for closure:", {
        error: ordersError,
        closureDate: closure_date,
        branchId: effectiveBranchId,
      });
      return NextResponse.json(
        {
          error: "Error al obtener ventas del día",
          details: ordersError.message,
        },
        { status: 500 },
      );
    }

    // Get ALL payments from the session (including payments for older orders)
    let sessionPayments: PaymentAggregatorInput["sessionPayments"] = [];
    if (sessionIdForClosure) {
      const { data: payments, error: paymentsError } = await supabaseServiceRole
        .from("order_payments")
        .select(
          `
          id,
          amount,
          payment_method,
          paid_at,
          order_id,
          order:orders!inner(
            id,
            order_number,
            total_amount,
            customer_id,
            customer:customers(first_name, last_name, email)
          )
        `,
        )
        .eq("pos_session_id", sessionIdForClosure);

      if (paymentsError) {
        logger.error("Error fetching session payments:", paymentsError);
        // Continue anyway, but log the error
      } else {
        sessionPayments = payments || [];
      }

      // Add credit note movements (refunds) - negative amounts
      if (sessionIdForClosure) {
        const { data: creditNoteMovements } = await supabaseServiceRole
          .from("credit_note_movements")
          .select("amount, refund_method")
          .eq("pos_session_id", sessionIdForClosure);

        sessionPayments = [
          ...sessionPayments,
          ...(creditNoteMovements || []).map((cnm: CreditNoteMovementRow) => ({
            amount: Number(cnm.amount) || 0,
            payment_method: cnm.refund_method,
          })),
        ];
      }
    }

    // Calculate summary from ORDERS (for totals, subtotals, taxes)
    let totalSales = 0;
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    (orders || []).forEach((order) => {
      if (order.status === "cancelled") return;
      totalSales += coerceAmount(order.total_amount);
      totalSubtotal += coerceAmount(order.subtotal);
      totalTax += coerceAmount(order.tax_amount);
      totalDiscounts += coerceAmount(order.discount_amount);
    });

    // Calculate payment method totals from SESSION PAYMENTS (more accurate)
    // This includes payments for orders created today AND payments for older orders made during this session
    let paymentResult: PaymentSummary;
    if (sessionPayments.length > 0) {
      paymentResult = aggregatePayments({
        sessionPayments,
        orders: [],
      });
    } else if (orders && orders.length > 0) {
      // Fall back to order_payments or order-based calculation
      logger.warn("No session payments found, fetching from order_payments", {
        sessionId: sessionIdForClosure,
      });

      const orderIds = orders.map((o) => o.id);
      const { data: orderPayments } = await supabaseServiceRole
        .from("order_payments")
        .select("amount, payment_method")
        .in("order_id", orderIds);

      if (orderPayments && orderPayments.length > 0) {
        paymentResult = aggregatePayments({
          sessionPayments: [],
          orders: [],
          orderPayments: orderPayments as OrderPaymentRow[],
        });
      } else {
        logger.warn(
          "No order_payments found, using mp_payment_method from orders",
          { orderIds },
        );
        paymentResult = aggregatePayments({
          sessionPayments: [],
          orders: orders.map((o) => ({
            id: o.id,
            total_amount: coerceAmount(o.total_amount),
            mp_payment_method: o.mp_payment_method,
            status: o.status,
          })),
        });
      }
    } else {
      paymentResult = {
        cash_sales: 0,
        debit_card_sales: 0,
        credit_card_sales: 0,
        transfer_sales: 0,
        installments_sales: 0,
        other_payment_sales: 0,
        source: "no_payments" as const,
      };
    }

    const cashSales = paymentResult.cash_sales;
    const debitCardSales = paymentResult.debit_card_sales;
    const creditCardSales = paymentResult.credit_card_sales;
    const transferSales = paymentResult.transfer_sales;
    const installmentsSales = paymentResult.installments_sales;
    const otherPaymentSales = paymentResult.other_payment_sales;

    // Calculate expected cash (ONLY cash sales + opening cash, NOT transfers)
    // Transfers are bank transfers, not physical cash - they should NOT be in the cash register
    const expectedCash = Number(opening_cash_amount) + cashSales;

    // Calculate differences
    // IMPORTANTE: actual_cash es el valor que el usuario ingresa físicamente contado
    // cashDifference = actual_cash - expected_cash
    // Si actual_cash es null/undefined, no podemos calcular la diferencia, así que será 0
    const actualCashValue =
      actual_cash !== undefined && actual_cash !== null
        ? Number(actual_cash)
        : null;

    const cashDifference =
      actualCashValue !== null ? actualCashValue - expectedCash : 0;

    // Log para debugging
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

    // Get opening time (start of day or session opening time if available)
    const openedAt = openSession?.opening_time
      ? new Date(openSession.opening_time)
      : new Date(`${dateStr}T00:00:00`);

    // Check if closure already exists for this branch/operativo and date
    let existingClosureQuery = supabaseServiceRole
      .from("cash_register_closures")
      .select("id, status, pos_session_id")
      .eq("branch_id", effectiveBranchId!)
      .eq("closure_date", dateStr);
    if (fieldOperationId) {
      existingClosureQuery = existingClosureQuery.eq(
        "field_operation_id",
        fieldOperationId,
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
        branchId: effectiveBranchId,
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

    // If a closure exists and is "closed", only allow update if it matches the open session
    const canUpdateClosedClosure =
      existingClosure &&
      existingClosure.status === "closed" &&
      openSession &&
      (!existingClosure.pos_session_id ||
        existingClosure.pos_session_id === openSession.id);

    if (existingClosure && existingClosure.status === "closed") {
      if (!canUpdateClosedClosure) {
        return NextResponse.json(
          {
            error: "Ya existe un cierre de caja para esta fecha y sucursal",
          },
          { status: 400 },
        );
      }

      logger.warn("Updating a closed closure due to open session", {
        closureId: existingClosure.id,
        sessionId: openSession?.id,
        branchId: effectiveBranchId,
        dateStr,
      });
    }

    // Validate branch_id is not null before inserting
    if (!effectiveBranchId) {
      logger.error("branch_id is null when trying to create closure", {
        isSuperAdmin: branchContext.isSuperAdmin,
        branchId: effectiveBranchId,
      });
      return NextResponse.json(
        {
          error: "Debe seleccionar una sucursal para cerrar la caja",
        },
        { status: 400 },
      );
    }

    // Validate user.id exists (should always be true if we got here, but double-check)
    if (!user.id) {
      logger.error("user.id is null when trying to create closure");
      return NextResponse.json(
        {
          error: "Error de autenticación",
        },
        { status: 401 },
      );
    }

    // Build closure payload using extracted builder
    const closureParams: ClosurePayloadParams = {
      branch_id: effectiveBranchId,
      closure_date: dateStr,
      closed_by: user.id,
      pos_session_id: sessionIdForClosure || null,
      ...(fieldOperationId && { field_operation_id: fieldOperationId }),
      opening_cash_amount: Number(opening_cash_amount),
      total_sales: totalSales,
      total_transactions:
        sessionPayments.length > 0
          ? sessionPayments.length
          : orders?.length || 0,
      cash_sales: cashSales,
      debit_card_sales: debitCardSales,
      credit_card_sales: creditCardSales,
      installments_sales: installmentsSales,
      // PRESERVED: merge transfer_sales into other_payment_sales (POST-only behavior)
      other_payment_sales: otherPaymentSales + transferSales,
      expected_cash: expectedCash,
      actual_cash:
        actual_cash !== undefined && actual_cash !== null
          ? Number(actual_cash)
          : null,
      cash_difference: cashDifference,
      card_machine_debit_total:
        card_machine_debit_total !== undefined &&
        card_machine_debit_total !== null
          ? Number(card_machine_debit_total)
          : 0,
      card_machine_credit_total:
        card_machine_credit_total !== undefined &&
        card_machine_credit_total !== null
          ? Number(card_machine_credit_total)
          : 0,
      card_machine_difference: cardMachineDifference,
      total_subtotal: totalSubtotal,
      total_tax: totalTax,
      total_discounts: totalDiscounts,
      closing_cash_amount:
        actual_cash !== undefined && actual_cash !== null
          ? Number(actual_cash)
          : null,
      notes: notes || null,
      discrepancies: discrepancies || null,
      status: "closed",
      opened_at: openedAt.toISOString(),
    };
    const closureData = buildClosurePayload(closureParams);

    logger.info("Preparing to create/update closure", {
      existingClosure: existingClosure
        ? { id: existingClosure.id, status: existingClosure.status }
        : null,
      closureData: {
        ...closureData,
        closed_by: user.id.substring(0, 8) + "...", // Log partial user ID for privacy
      },
    });

    // If a closure exists (any status except "closed"), update it instead of inserting
    // This handles draft closures and any other non-closed status
    let closureResponse;
    if (existingClosure && existingClosure.status !== "closed") {
      // Update existing closure (draft, confirmed, reviewed, etc.)
      logger.info("Updating existing closure", {
        closureId: existingClosure.id,
        currentStatus: existingClosure.status,
        newStatus: "closed",
      });
      closureResponse = await supabaseServiceRole
        .from("cash_register_closures")
        .update(closureData)
        .eq("id", existingClosure.id)
        .select()
        .single();
    } else if (canUpdateClosedClosure && existingClosure) {
      // Update closed closure only if it matches the open session (consistency repair)
      closureResponse = await supabaseServiceRole
        .from("cash_register_closures")
        .update(closureData)
        .eq("id", existingClosure.id)
        .select()
        .single();
    } else {
      // Insert new closure (normal case - no existing closure)
      logger.info("Inserting new closure", {
        branchId: effectiveBranchId,
        fieldOperationId: fieldOperationId || undefined,
        closureDate: dateStr,
      });
      closureResponse = await supabaseServiceRole
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
        branchId: effectiveBranchId,
        existingClosure: existingClosure
          ? { id: existingClosure.id, status: existingClosure.status }
          : null,
        closureData: {
          ...closureData,
          closed_by: user.id.substring(0, 8) + "...", // Log partial user ID for privacy
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

    return NextResponse.json({
      success: true,
      closure,
    });
  } catch (error: unknown) {
    logger.error("Error in cash register closure POST API:", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

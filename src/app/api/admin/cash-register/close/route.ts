import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import {
  getBranchContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

/**
 * GET /api/admin/cash-register/close
 * Get daily sales summary for cash register closure
 */
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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Validate branch access for non-super admins
    if (!branchContext.isSuperAdmin && !branchContext.branchId) {
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
    if (branchContext.branchId) {
      const { data: openSession } = await supabaseServiceRole
        .from("pos_sessions")
        .select("id, opening_time")
        .eq("branch_id", branchContext.branchId)
        .eq("status", "open")
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
            branchId: branchContext.branchId,
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

    // Filter by branch
    if (branchContext.branchId) {
      ordersQuery = ordersQuery.eq("branch_id", branchContext.branchId);
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
        branchId: branchContext.branchId,
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
    let sessionPayments: any[] = [];
    let sessionId: string | null = null;

    if (branchContext.branchId) {
      // Primero intentar encontrar sesión "open"
      const { data: openSession } = await supabaseServiceRole
        .from("pos_sessions")
        .select("id, opening_cash_amount, status, reopen_count")
        .eq("branch_id", branchContext.branchId)
        .eq("status", "open")
        .gte("opening_time", `${dateStr}T00:00:00`)
        .lt("opening_time", `${dateStr}T23:59:59`)
        .order("opening_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      let posSession = openSession;

      if (!posSession) {
        // Si no hay sesión "open", buscar la última sesión del día (puede estar "closed" si fue reabierta)
        const { data: lastSession } = await supabaseServiceRole
          .from("pos_sessions")
          .select("id, opening_cash_amount, status, reopen_count")
          .eq("branch_id", branchContext.branchId)
          .gte("opening_time", `${dateStr}T00:00:00`)
          .lt("opening_time", `${dateStr}T23:59:59`)
          .order("opening_time", { ascending: false })
          .limit(1)
          .maybeSingle();

        posSession = lastSession || null;
      }

      if (posSession) {
        openingCash = Number(posSession.opening_cash_amount) || 0;
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
          ...(creditNoteMovements || []).map((cnm: any) => ({
            amount: Number(cnm.amount) || 0, // negative
            payment_method: cnm.refund_method,
          })),
        ];
      }
    }

    // Calculate summary
    const summary = {
      date: dateStr,
      branch_id: branchContext.branchId,
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
    (orders || []).forEach((order: any) => {
      if (order.status === "cancelled") return;
      summary.total_sales += Number(order.total_amount) || 0;
      summary.total_subtotal += Number(order.subtotal) || 0;
      summary.total_tax += Number(order.tax_amount) || 0;
      summary.total_discounts += Number(order.discount_amount) || 0;
    });

    // Calculate payment method totals from session payments if available
    if (sessionPayments.length > 0) {
      sessionPayments.forEach((payment: any) => {
        const amount = Number(payment.amount) || 0;
        switch (payment.payment_method) {
          case "cash":
            summary.cash_sales += amount;
            break;
          case "debit":
            summary.debit_card_sales += amount;
            break;
          case "credit":
            summary.credit_card_sales += amount;
            break;
          case "transfer":
            summary.transfer_sales += amount;
            break;
          case "installments":
            summary.installments_sales += amount;
            break;
          default:
            summary.other_payment_sales += amount;
        }
      });
    } else if (orders && orders.length > 0) {
      // Fallback: Get payments from order_payments table (more accurate than mp_payment_method)
      const orderIds = orders.map((o: any) => o.id);
      const { data: orderPayments } = await supabaseServiceRole
        .from("order_payments")
        .select("amount, payment_method")
        .in("order_id", orderIds);

      if (orderPayments && orderPayments.length > 0) {
        // Use order_payments (most accurate)
        orderPayments.forEach((payment: any) => {
          const amount = Number(payment.amount) || 0;
          const method = payment.payment_method;

          switch (method) {
            case "cash":
              summary.cash_sales += amount;
              break;
            case "debit":
              summary.debit_card_sales += amount;
              break;
            case "credit":
              summary.credit_card_sales += amount;
              break;
            case "transfer":
              summary.transfer_sales += amount;
              break;
            case "installments":
              summary.installments_sales += amount;
              break;
            default:
              summary.other_payment_sales += amount;
          }
        });
      } else {
        // Final fallback: Use mp_payment_method from orders (normalized values)
        (orders || []).forEach((order: any) => {
          const paymentMethod = order.mp_payment_method || "cash";
          switch (paymentMethod) {
            case "cash":
              summary.cash_sales += Number(order.total_amount) || 0;
              break;
            case "debit":
            case "debit_card":
              summary.debit_card_sales += Number(order.total_amount) || 0;
              break;
            case "credit":
            case "credit_card":
              summary.credit_card_sales += Number(order.total_amount) || 0;
              break;
            case "transfer":
              summary.transfer_sales += Number(order.total_amount) || 0;
              break;
            case "installments":
              summary.installments_sales += Number(order.total_amount) || 0;
              break;
            default:
              summary.other_payment_sales += Number(order.total_amount) || 0;
          }
        });
      }
    }

    // Calculate expected cash (ONLY cash sales + opening cash, NOT transfers)
    // Transfers are bank transfers, not physical cash
    const expectedCash = openingCash + summary.cash_sales;

    // ✅ NUEVO: Obtener cierre anterior si existe (para reaperturas)
    let previousClosure = null;
    if (branchContext.branchId) {
      const { data: existingClosure } = await supabaseServiceRole
        .from("cash_register_closures")
        .select("*")
        .eq("branch_id", branchContext.branchId)
        .eq("closure_date", dateStr)
        .maybeSingle();

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
      },
      previous_closure: previousClosure,
    });
  } catch (error: any) {
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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Validate branch access for non-super admins
    if (!branchContext.isSuperAdmin && !branchContext.branchId) {
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

    // Check if there's an open session for this branch and close it
    // (Do not filter by date to avoid mismatches)
    const { data: openSession, error: openSessionError } =
      await supabaseServiceRole
        .from("pos_sessions")
        .select("id, status, reopen_count, opening_time")
        .eq("branch_id", branchContext.branchId!)
        .eq("status", "open")
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
          branchId: branchContext.branchId,
        });
        dateStr = sessionDateStr;
      }
    }

    // Get the session ID for the closure
    let sessionIdForClosure = openSession?.id || null;

    // If no open session, check if there's a closure with a session_id (reopened case)
    if (!sessionIdForClosure) {
      const { data: existingClosure } = await supabaseServiceRole
        .from("cash_register_closures")
        .select("pos_session_id")
        .eq("branch_id", branchContext.branchId!)
        .eq("closure_date", dateStr)
        .maybeSingle();

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

    if (branchContext.branchId) {
      ordersQuery = ordersQuery.eq("branch_id", branchContext.branchId);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      logger.error("Error fetching orders for closure:", {
        error: ordersError,
        closureDate: closure_date,
        branchId: branchContext.branchId,
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
    let sessionPayments: any[] = [];
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
          ...(creditNoteMovements || []).map((cnm: any) => ({
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

    (orders || []).forEach((order: any) => {
      if (order.status === "cancelled") return;
      totalSales += Number(order.total_amount) || 0;
      totalSubtotal += Number(order.subtotal) || 0;
      totalTax += Number(order.tax_amount) || 0;
      totalDiscounts += Number(order.discount_amount) || 0;
    });

    // Calculate payment method totals from SESSION PAYMENTS (more accurate)
    // This includes payments for orders created today AND payments for older orders made during this session
    let cashSales = 0;
    let debitCardSales = 0;
    let creditCardSales = 0;
    let transferSales = 0;
    let installmentsSales = 0;
    let otherPaymentSales = 0;

    sessionPayments.forEach((payment: any) => {
      const amount = Number(payment.amount) || 0;
      const method = payment.payment_method;

      switch (method) {
        case "cash":
          cashSales += amount;
          break;
        case "debit":
          debitCardSales += amount;
          break;
        case "credit":
          creditCardSales += amount;
          break;
        case "transfer":
          transferSales += amount;
          break;
        case "check":
          otherPaymentSales += amount;
          break;
        default:
          otherPaymentSales += amount;
      }
    });

    // If no session payments found, fall back to order_payments or order-based calculation
    if (sessionPayments.length === 0 && orders && orders.length > 0) {
      logger.warn("No session payments found, fetching from order_payments", {
        sessionId: sessionIdForClosure,
      });

      // Try to get payments from order_payments table (more accurate)
      const orderIds = orders.map((o: any) => o.id);
      const { data: orderPayments } = await supabaseServiceRole
        .from("order_payments")
        .select("amount, payment_method")
        .in("order_id", orderIds);

      if (orderPayments && orderPayments.length > 0) {
        // Use order_payments (most accurate - uses normalized payment_method values)
        orderPayments.forEach((payment: any) => {
          const amount = Number(payment.amount) || 0;
          const method = payment.payment_method;

          switch (method) {
            case "cash":
              cashSales += amount;
              break;
            case "debit":
              debitCardSales += amount;
              break;
            case "credit":
              creditCardSales += amount;
              break;
            case "transfer":
              transferSales += amount;
              break;
            case "installments":
              installmentsSales += amount;
              break;
            default:
              otherPaymentSales += amount;
          }
        });
      } else {
        // Final fallback: Use mp_payment_method from orders (normalized values)
        logger.warn(
          "No order_payments found, using mp_payment_method from orders",
          {
            orderIds,
          },
        );
        (orders || []).forEach((order: any) => {
          const paymentMethod = order.mp_payment_method || "cash";
          switch (paymentMethod) {
            case "cash":
              cashSales += Number(order.total_amount) || 0;
              break;
            case "debit":
            case "debit_card":
              debitCardSales += Number(order.total_amount) || 0;
              break;
            case "credit":
            case "credit_card":
              creditCardSales += Number(order.total_amount) || 0;
              break;
            case "transfer":
              transferSales += Number(order.total_amount) || 0;
              break;
            case "installments":
              installmentsSales += Number(order.total_amount) || 0;
              break;
            default:
              otherPaymentSales += Number(order.total_amount) || 0;
          }
        });
      }
    }

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

    // Check if closure already exists for this branch and date
    const { data: existingClosure, error: existingClosureError } =
      await supabaseServiceRole
        .from("cash_register_closures")
        .select("id, status, pos_session_id")
        .eq("branch_id", branchContext.branchId)
        .eq("closure_date", dateStr)
        .maybeSingle();

    if (existingClosureError) {
      logger.error("Error checking existing closure:", {
        error: existingClosureError.message || existingClosureError,
        code: existingClosureError.code,
        details: existingClosureError.details,
        branchId: branchContext.branchId,
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
        branchId: branchContext.branchId,
        dateStr,
      });
    }

    // Validate branch_id is not null before inserting
    if (!branchContext.branchId) {
      logger.error("branch_id is null when trying to create closure", {
        isSuperAdmin: branchContext.isSuperAdmin,
        branchId: branchContext.branchId,
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

    // Log closure data before insert/update
    const closureData = {
      branch_id: branchContext.branchId,
      closure_date: dateStr,
      closed_by: user.id,
      pos_session_id: sessionIdForClosure || null,
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
      updated_at: new Date().toISOString(),
    };

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
        branchId: branchContext.branchId,
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
        branchId: branchContext.branchId,
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
  } catch (error: any) {
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

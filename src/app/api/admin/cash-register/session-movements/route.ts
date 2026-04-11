import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/cash-register/session-movements
 * Get all movements (payments) for a POS session
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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Get session_id from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    // Verify session belongs to user's branch (if not super admin)
    if (!branchContext.isSuperAdmin && branchContext.branchId) {
      const { data: session } = await supabaseServiceRole
        .from("pos_sessions")
        .select("branch_id")
        .eq("id", sessionId)
        .single();

      if (!session || session.branch_id !== branchContext.branchId) {
        return NextResponse.json(
          { error: "Session not found or access denied" },
          { status: 404 },
        );
      }
    }

    // Get all payments for this session with order information
    const { data: payments, error: paymentsError } = await supabaseServiceRole
      .from("order_payments")
      .select(
        `
        id,
        amount,
        payment_method,
        paid_at,
        notes,
        created_at,
        order_id,
        order:orders!inner(
          id,
          order_number,
          total_amount,
          payment_status,
          created_at,
          email,
          billing_first_name,
          billing_last_name,
          sii_business_name,
          sii_rut
        )
      `,
      )
      .eq("pos_session_id", sessionId)
      .order("paid_at", { ascending: true });

    if (paymentsError) {
      logger.error("Error fetching session movements:", paymentsError);
      return NextResponse.json(
        {
          error: "Error al obtener movimientos de la sesión",
          details: paymentsError.message,
        },
        { status: 500 },
      );
    }

    // Get credit note movements (refunds) for this session
    const { data: creditNoteMovements } = await supabaseServiceRole
      .from("credit_note_movements")
      .select(
        `
        id,
        amount,
        refund_method,
        created_at,
        credit_notes(
          id,
          credit_note_number,
          order_id
        )
      `,
      )
      .eq("pos_session_id", sessionId)
      .order("created_at", { ascending: true });

    // Fetch order details for credit notes that have order_id
    const orderIds = (creditNoteMovements || [])
      .map((cnm: unknown) => cnm.credit_notes?.order_id)
      .filter(Boolean);
    let ordersMap: Record<string, unknown> = {};
    if (orderIds.length > 0) {
      const { data: orders } = await supabaseServiceRole
        .from("orders")
        .select(
          "id, order_number, billing_first_name, billing_last_name, sii_business_name, sii_rut, email",
        )
        .in("id", orderIds);
      if (orders) {
        ordersMap = Object.fromEntries(orders.map((o: unknown) => [o.id, o]));
      }
    }

    const paymentMethodMap: Record<string, string> = {
      cash: "Efectivo",
      debit: "Tarjeta Débito",
      credit: "Tarjeta Crédito",
      transfer: "Transferencia",
      check: "Cheque",
    };

    // Transform credit note movements into movement format
    const cnMovements = (creditNoteMovements || []).map((cnm: unknown) => {
      const order = cnm.credit_notes?.order_id
        ? ordersMap[cnm.credit_notes.order_id]
        : null;
      const customerName =
        order?.sii_business_name ||
        (order?.billing_first_name && order?.billing_last_name
          ? `${order.billing_first_name} ${order.billing_last_name}`.trim()
          : null) ||
        order?.email ||
        "Cliente no registrado";
      return {
        id: cnm.id,
        movement_type: "credit_note",
        order_id: order?.id || cnm.credit_notes?.order_id,
        order_number:
          order?.order_number || cnm.credit_notes?.credit_note_number || "N/A",
        customer_name: customerName,
        customer_rut: order?.sii_rut || null,
        payment_method:
          paymentMethodMap[cnm.refund_method] || cnm.refund_method,
        payment_method_code: cnm.refund_method,
        amount: Number(cnm.amount) || 0, // Already negative
        payment_status: "Reembolso",
        paid_at: cnm.created_at,
        notes: `Nota de crédito ${cnm.credit_notes?.credit_note_number || ""}`,
        order_total: Math.abs(Number(cnm.amount)) || 0,
        order_payment_status: null,
      };
    });

    // Transform payments into movements with additional info
    const paymentMovements = (payments || []).map((payment: unknown) => {
      const order = payment.order;

      // Extract customer information from order fields
      const customerName =
        order?.sii_business_name ||
        (order?.billing_first_name && order?.billing_last_name
          ? `${order.billing_first_name} ${order.billing_last_name}`.trim()
          : null) ||
        order?.email ||
        "Cliente no registrado";
      const customerRut = order?.sii_rut || null;

      // Determine movement type
      let movementType = "sale";
      const orderCreatedAt = new Date(order?.created_at);
      const paymentPaidAt = new Date(payment.paid_at);
      const timeDiff = paymentPaidAt.getTime() - orderCreatedAt.getTime();

      // If payment was made more than 5 minutes after order creation, OR notes indicate so, it's likely a pending balance payment
      if (
        timeDiff > 5 * 60 * 1000 ||
        payment.notes?.toLowerCase().includes("saldo pendiente") ||
        payment.notes?.toLowerCase().includes("pending balance") ||
        payment.notes?.toLowerCase().includes("abono")
      ) {
        movementType = "partial_payment";
      }

      // Determine payment status
      const paymentStatus =
        order?.payment_status === "paid" ? "Completo" : "Parcial";

      // Format payment method
      const paymentMethodMap: Record<string, string> = {
        cash: "Efectivo",
        debit: "Tarjeta Débito",
        credit: "Tarjeta Crédito",
        transfer: "Transferencia",
        check: "Cheque",
      };

      return {
        id: payment.id,
        movement_type: movementType,
        order_id: order?.id,
        order_number: order?.order_number || "N/A",
        customer_name: customerName,
        customer_rut: customerRut,
        payment_method:
          paymentMethodMap[payment.payment_method] || payment.payment_method,
        payment_method_code: payment.payment_method,
        amount: Number(payment.amount) || 0,
        payment_status: paymentStatus,
        paid_at: payment.paid_at,
        notes: payment.notes || null,
        order_total: Number(order?.total_amount) || 0,
        order_payment_status: order?.payment_status || null,
      };
    });

    // Merge and sort by date
    const movements = [...paymentMovements, ...cnMovements].sort(
      (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime(),
    );

    return NextResponse.json({
      movements,
      total_movements: movements.length,
      total_amount: movements.reduce((sum, m) => sum + m.amount, 0),
    });
  } catch (error: unknown) {
    logger.error("Error in session movements API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

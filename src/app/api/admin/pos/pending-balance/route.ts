import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/pos/pending-balance
 * Get orders with pending balance for payment collection
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

    // Validate branch access
    if (!branchContext.branchId && !branchContext.isSuperAdmin) {
      return NextResponse.json(
        { error: "Debe seleccionar una sucursal" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("search") || "";
    const limit = parseInt(url.searchParams.get("limit") || "500");

    // Query for orders with pending balance (payment_status = 'partial' or 'on_hold_payment')
    // Exclude cancelled/refunded orders (they should not appear after devolution)
    // NOTE: We don't include customers/work_orders relationships here because they may not exist
    let query = supabaseServiceRole
      .from("orders")
      .select(
        `
        id,
        order_number,
        email,
        user_id,
        branch_id,
        total_amount,
        payment_status,
        status,
        created_at,
        order_payments (
          id,
          amount,
          payment_method
        )
      `,
      )
      .in("payment_status", ["partial", "on_hold_payment"])
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply branch filter
    if (branchContext.branchId) {
      query = query.eq("branch_id", branchContext.branchId);
    }

    // Apply search filter - search across main order fields only
    // NOTE: We don't use Supabase .or() filter - filter in-memory instead for reliability
    // if (searchTerm && searchTerm.trim()) {
    //   query = query.or(
    //     `order_number.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`,
    //   );
    // }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      logger.error("[PENDING-BALANCE-API] Supabase error:", {
        message: ordersError.message,
        code: ordersError.code,
        details: ordersError,
      });
      logger.error("Error fetching pending balance orders", ordersError);
      return NextResponse.json(
        {
          error: "Error al obtener órdenes con saldo pendiente",
          details: ordersError.message,
        },
        { status: 500 },
      );
    }

    // Fetch customer information for search and display
    const uniqueEmails = [
      ...new Set((orders || []).map((o: unknown) => o.email).filter(Boolean)),
    ];
    const customerMapByEmail = new Map();
    const { data: customersByEmail } =
      uniqueEmails.length > 0
        ? await supabaseServiceRole
            .from("customers")
            .select("id, email, first_name, last_name, rut")
            .in("email", uniqueEmails)
        : { data: null };

    (customersByEmail || []).forEach((customer: unknown) => {
      if (customer.email) {
        customerMapByEmail.set(customer.email.toLowerCase(), customer);
      }
    });

    // Filter results by related data if search term is provided
    let filteredOrders = orders || [];
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      try {
        filteredOrders = filteredOrders.filter((order: unknown) => {
          // Check main fields
          if (
            order.order_number?.toLowerCase().includes(searchLower) ||
            order.email?.toLowerCase().includes(searchLower)
          ) {
            return true;
          }

          // Check customer info from map (orders use email, not customer_id)
          const customer =
            (order.email &&
              customerMapByEmail.get(order.email.toLowerCase())) ||
            null;
          if (customer) {
            const fullName =
              `${customer.first_name || ""} ${customer.last_name || ""}`.toLowerCase();
            const rut = (customer.rut || "").toLowerCase();
            if (
              fullName.includes(searchLower) ||
              rut.includes(searchLower) ||
              (customer.email || "").toLowerCase().includes(searchLower)
            ) {
              return true;
            }
          }

          return false;
        });
      } catch (filterError) {
        logger.error("[PENDING-BALANCE-API] Filter error:", filterError);
        throw filterError;
      }
    }

    // Calculate pending amount for each order using customer info already fetched
    let ordersWithBalance: unknown[] = [];
    try {
      ordersWithBalance = filteredOrders.map((order: unknown) => {
        const totalPaid = (order.order_payments || []).reduce(
          (sum: number, payment: unknown) => sum + (payment.amount || 0),
          0,
        );
        const pendingAmount = Math.max(0, order.total_amount - totalPaid);

        // Get customer info from map (orders use email, not customer_id)
        const customer = order.email
          ? customerMapByEmail.get(order.email.toLowerCase())
          : null;
        const customerName = customer
          ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
            order.email
          : order.email || "Sin nombre";
        const customerRUT = customer?.rut || null;

        return {
          id: order.id,
          order_number: order.order_number,
          branch_id: order.branch_id,
          customer_email: order.email,
          customer_name: customerName,
          customer_rut: customerRUT,
          total_amount: order.total_amount,
          total_paid: totalPaid,
          pending_amount: pendingAmount,
          payment_status: order.payment_status,
          created_at: order.created_at,
          work_orders: [],
        };
      });
    } catch (mapError) {
      logger.error("[PENDING-BALANCE-API] Map error:", mapError);
      throw mapError;
    }

    logger.debug("Pending balance orders fetched", {
      count: ordersWithBalance.length,
      branch: branchContext.branchId,
    });

    return createApiSuccessResponse(ordersWithBalance);
  } catch (error: unknown) {
    logger.error("[PENDING-BALANCE-API] Catch block error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    logger.error("Error in pending balance API", {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

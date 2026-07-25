/**
 * Admin Order Service
 * Server-side business logic for admin order operations
 */

import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  getFieldOperationFromRequest,
} from "@/lib/api/branch-middleware";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/api/errors";
import { createPaginatedResponse } from "@/lib/api/response";
import { sendOrderConfirmation } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import { getLocalDateBoundsUTC } from "@/lib/utils/date-timezone";
import type { Database, SupabaseClient } from "@/types/supabase";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClientFromRequest } from "@/utils/supabase/server";

export async function listOrders(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info("Admin Orders API GET called", { requestId });

  const { client: supabase, getUser } = await createClientFromRequest(request);

  const { data, error: userError } = await getUser();
  const user = (data?.user as { id: string; email?: string } | null) ?? null;
  if (userError || !user) throw new AuthenticationError("Unauthorized");

  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdmin) throw new AuthorizationError("Admin access required");

  const branchContext = await getBranchContext(request, user.id, supabase as never);
  const fieldOperationId = getFieldOperationFromRequest(request);

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  const userOrganizationId = (adminUser as { organization_id?: string })?.organization_id;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const paymentStatus = url.searchParams.get("payment_status");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let query = supabase
    .from("orders")
    .select(
      `id, order_number, email, customer_name, status, payment_status, total_amount, currency, created_at, updated_at, mp_payment_id, mp_payment_method, mp_payment_type, organization_id, branch_id, order_items ( id, product_name, variant_title, quantity, unit_price, total_price ), order_payments ( id, amount, payment_method, paid_at )`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userOrganizationId && !branchContext.isSuperAdmin) {
    query = query.eq("organization_id", userOrganizationId);
    if (branchContext.branchId) {
      query = query.eq("branch_id", branchContext.branchId);
      if (fieldOperationId) {
        query = query.eq("field_operation_id", fieldOperationId);
      } else {
        query = query.is("field_operation_id", null);
      }
    }
  } else if (branchContext.isSuperAdmin) {
    if (branchContext.branchId) {
      query = query.eq("branch_id", branchContext.branchId);
      if (fieldOperationId) {
        query = query.eq("field_operation_id", fieldOperationId);
      } else {
        query = query.is("field_operation_id", null);
      }
    } else if (branchContext.organizationId) {
      query = query.eq("organization_id", branchContext.organizationId);
    }
  }

  if (status && status !== "all") query = query.eq("status", status);
  if (paymentStatus && paymentStatus !== "all") query = query.eq("payment_status", paymentStatus);
  if (dateFrom) {
    const { start } = getLocalDateBoundsUTC(dateFrom);
    query = query.gte("created_at", start);
  }
  if (dateTo) {
    const { end } = getLocalDateBoundsUTC(dateTo);
    query = query.lte("created_at", end);
  }

  const { data: orders, error: ordersError, count } = await query;
  if (ordersError) throw new Error(`Failed to fetch orders: ${ordersError.message}`);

  const transformedOrders = (orders || []).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name || "Cliente",
    customer_email: order.email,
    total_amount: order.total_amount,
    status: order.status,
    payment_status: order.payment_status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    mp_payment_id: order.mp_payment_id,
    mp_payment_method: order.mp_payment_method,
    mp_payment_type: order.mp_payment_type,
    order_items: order.order_items || [],
    order_payments: order.order_payments || [],
  }));

  return createPaginatedResponse(
    transformedOrders,
    { page: Math.floor(offset / limit) + 1, limit, total: count || 0 },
    { requestId },
  );
}

async function getOrderStats(
  supabase: SupabaseClient<Database>,
  userOrganizationId: string | undefined,
  branchContext: Awaited<ReturnType<typeof getBranchContext>>,
) {
  if (!userOrganizationId && !branchContext.isSuperAdmin) {
    return { orderCounts: {}, totalRevenue: 0, recentOrders: [] };
  }

  let baseQuery = supabase.from("orders").select("status");
  if (userOrganizationId && !branchContext.isSuperAdmin) {
    baseQuery = baseQuery.eq("organization_id", userOrganizationId);
    if (branchContext.branchId) baseQuery = baseQuery.eq("branch_id", branchContext.branchId);
  } else if (branchContext.isSuperAdmin && branchContext.branchId) {
    baseQuery = baseQuery.eq("branch_id", branchContext.branchId);
  }

  const { data: allOrders, error: statusError } = await baseQuery;
  if (statusError) throw new Error(`Failed to get order statistics: ${statusError.message}`);

  const statusCounts = (allOrders || []).reduce(
    (acc: Record<string, number>, order: { status: string }) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let revenueQuery = supabase.from("orders").select("total_amount");
  if (userOrganizationId && !branchContext.isSuperAdmin) {
    revenueQuery = revenueQuery.eq("organization_id", userOrganizationId);
    if (branchContext.branchId) revenueQuery = revenueQuery.eq("branch_id", branchContext.branchId);
  } else if (branchContext.isSuperAdmin && branchContext.branchId) {
    revenueQuery = revenueQuery.eq("branch_id", branchContext.branchId);
  }

  const { data: revenueData, error: revenueError } = await revenueQuery
    .eq("payment_status", "paid")
    .gte("created_at", startOfMonth.toISOString());
  if (revenueError) throw new Error(`Failed to get revenue statistics: ${revenueError.message}`);

  const totalRevenue = (revenueData || []).reduce(
    (sum: number, order: { total_amount?: number | null }) => sum + (order.total_amount || 0), 0,
  );

  let recentOrdersQuery = supabase
    .from("orders")
    .select("id, order_number, email, status, total_amount, created_at");
  if (userOrganizationId && !branchContext.isSuperAdmin) {
    recentOrdersQuery = recentOrdersQuery.eq("organization_id", userOrganizationId);
    if (branchContext.branchId) recentOrdersQuery = recentOrdersQuery.eq("branch_id", branchContext.branchId);
  } else if (branchContext.isSuperAdmin && branchContext.branchId) {
    recentOrdersQuery = recentOrdersQuery.eq("branch_id", branchContext.branchId);
  }

  const { data: recentOrders, error: recentError } = await recentOrdersQuery
    .order("created_at", { ascending: false })
    .limit(10);
  if (recentError) throw new Error(`Failed to get recent orders: ${recentError.message}`);

  return {
    orderCounts: statusCounts,
    totalRevenue,
    recentOrders: (recentOrders || []).map((order: never) => ({
      id: (order as { id: string }).id,
      order_number: (order as { order_number: string }).order_number,
      customer_name: "Cliente",
      customer_email: (order as { email: string }).email,
      status: (order as { status: string }).status,
      total_amount: (order as { total_amount?: number }).total_amount,
      created_at: (order as { created_at: string }).created_at,
    })),
  };
}

async function createManualOrder(
  supabase: SupabaseClient<Database>,
  user: { id: string },
  body: { orderData?: Record<string, unknown> },
): Promise<{ success: boolean; order: unknown }> {
  const { orderData } = body;
  if (!orderData) throw new Error("Order data is required");
  if (!orderData.email) throw new Error("Email is required");
  if (!orderData.total_amount || Number(orderData.total_amount) <= 0) {
    throw new Error("Total amount must be greater than 0");
  }

  const orderNumber = `DL-${Date.now()}`;
  let dbStatus = (orderData.status as string) || "pending";
  if (dbStatus === "completed") dbStatus = "delivered";

  const { data: newOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      email: orderData.email as string,
      status: dbStatus,
      payment_status: (orderData.payment_status as string) || "paid",
      subtotal: (orderData.subtotal as number) || (orderData.total_amount as number),
      total_amount: orderData.total_amount as number,
      currency: "ARS",
      mp_payment_method: (orderData.payment_method as string) || "manual",
      customer_notes: (orderData.notes as string) || null,
      shipping_first_name: (orderData.shipping as Record<string, unknown>)?.first_name as string,
      shipping_last_name: (orderData.shipping as Record<string, unknown>)?.last_name as string,
      shipping_address_1: (orderData.shipping as Record<string, unknown>)?.address_1 as string,
      shipping_city: (orderData.shipping as Record<string, unknown>)?.city as string,
      shipping_state: (orderData.shipping as Record<string, unknown>)?.state as string,
      shipping_postal_code: (orderData.shipping as Record<string, unknown>)?.postal_code as string,
      shipping_phone: (orderData.shipping as Record<string, unknown>)?.phone as string,
    })
    .select()
    .single();

  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

  if ((orderData.items as Array<unknown>)?.length > 0) {
    const orderItems = (orderData.items as Array<Record<string, unknown>>).map((item) => ({
      order_id: newOrder.id,
      product_id: item.product_id as string,
      quantity: item.quantity as number,
      unit_price: item.unit_price as number,
      total_price: (item.unit_price as number) * (item.quantity as number),
      product_name: item.product_name as string,
      variant_title: (item.variant_title as string) || null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) logger.error("Error creating order items", itemsError);
  }

  // Non-blocking notification
  const { NotificationService } = await import("@/lib/notifications/notification-service");
  NotificationService.notifyNewSale(
    newOrder.id,
    newOrder.order_number,
    newOrder.email,
    newOrder.total_amount,
    (newOrder.branch_id as string) ?? undefined,
  ).catch((err) => logger.error("Error creating notification", err));

  // Non-blocking email
  if (newOrder.email) {
    (async () => {
      try {
        const no = newOrder;
        await sendOrderConfirmation({
          ...no,
          user_email: newOrder.email,
          email: newOrder.email,
          currency: (no.currency as string) || (orderData.currency as string) || "CLP",
          customer_name: (no.customer_name as string) || ((orderData.shipping as Record<string, unknown>)?.first_name
            ? `${(orderData.shipping as Record<string, unknown>).first_name} ${(orderData.shipping as Record<string, unknown>).last_name}`.trim()
            : "Cliente"),
          items: ((orderData.items as Array<Record<string, unknown>>) || []).map((item) => ({
            id: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            variant_title: item.variant_title,
          })),
          payment_method: (no.mp_payment_method as string) || (orderData.payment_method as string) || "manual",
          organization_id: no.organization_id,
        } as never);
      } catch (err) {
        logger.error("Error sending order confirmation email", err);
      }
    })();
  }

  return { success: true, order: newOrder };
}

export async function handleOrderPost(request: NextRequest): Promise<NextResponse> {
  return (withRateLimit(rateLimitConfigs.modification) as unknown)(
    request,
    async () => {
  const { client: supabaseRaw, getUser } = await createClientFromRequest(request);
  const supabase = supabaseRaw;

      const { data: authData2, error: userError2 } = await getUser();
      const user2 = authData2?.user as { id: string } | null;
      if (userError2 || !user2) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user2.id });
      if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

      let branchContext;
      try {
        branchContext = await getBranchContext(request, user2.id, supabase);
      } catch (branchError: unknown) {
        logger.error("Error getting branch context", branchError);
        return NextResponse.json(
          { error: "Failed to get branch context", details: (branchError as Error)?.message || "Unknown error" },
          { status: 500 },
        );
      }

      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user2.id)
        .single();
      const userOrganizationId = (adminUser as { organization_id?: string })?.organization_id;

      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }

      if (!body.action) return NextResponse.json({ error: "Action is required" }, { status: 400 });

      if (body.action === "get_stats") {
        const stats = await getOrderStats(supabase, userOrganizationId, branchContext);
        return NextResponse.json({ success: true, stats });
      }

      if (body.action === "create_manual_order") {
        const result = await createManualOrder(supabase, user2, body);
        return NextResponse.json(result);
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    },
  );
}

export async function deleteAllOrders(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  logger.warn("Admin Orders API DELETE called - Deleting all orders");

  const { client: supabaseRaw, getUser } = await createClientFromRequest(request);
  const supabase = supabaseRaw;

  const { data: authData3, error: userError3 } = await getUser();
  const user3 = authData3?.user as { id: string } | null;
  if (userError3 || !user3) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user3.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { error: itemsError } = await supabase
    .from("order_items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (itemsError) return NextResponse.json({ error: "Failed to delete order items", details: itemsError.message }, { status: 500 });

  const { error: ordersError } = await supabase
    .from("orders")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (ordersError) return NextResponse.json({ error: "Failed to delete orders", details: ordersError.message }, { status: 500 });

  return NextResponse.json({ success: true, message: "All orders have been deleted successfully" });
}

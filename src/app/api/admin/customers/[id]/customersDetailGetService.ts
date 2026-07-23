/**
 * Customer Detail GET service — fetches customer + orders + prescriptions + analytics.
 * Extracted from route.ts to reduce file size. No behavioral changes.
 */
import { NextRequest } from "next/server";

import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";

import {
  authenticateAndGetContext,
  buildBranchFilter,
} from "./customersDetailShared";

export async function handleGetCustomer(
  request: NextRequest,
  params: { id: string },
) {
  try {
    const { context, supabase } = await authenticateAndGetContext(
      request,
      "GET",
    );
    const applyBranchFilter = buildBranchFilter(context);

    // Get customer
    const customerQuery = applyBranchFilter(
      supabase.from("customers").select("*").eq("id", params.id),
    );
    const { data: customer, error: customerError } =
      await customerQuery.single();
    if (customerError || !customer) {
      logger.error("Error fetching customer", customerError);
      return createApiErrorResponse(new Error("Customer not found"));
    }

    // Get orders
    let ordersQuery = applyBranchFilter(
      supabase
        .from("orders")
        .select(
          `*, order_items (*, products:product_id (id, name, featured_image))`,
        ),
    );
    if (customer.email) {
      ordersQuery = ordersQuery.or(
        `customer_id.eq.${params.id},email.eq.${customer.email}`,
      );
    } else {
      ordersQuery = ordersQuery.eq("customer_id", params.id);
    }
    const { data: orders } = await ordersQuery.order("created_at", {
      ascending: false,
    });

    // Get prescriptions
    const { data: prescriptions } = await applyBranchFilter(
      supabase
        .from("prescriptions")
        .select("*")
        .eq("customer_id", params.id)
        .order("is_current", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    );

    // Get appointments
    const { data: appointments } = await applyBranchFilter(
      supabase
        .from("appointments")
        .select("*")
        .eq("customer_id", params.id)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false }),
    );

    // Get lens purchases
    const { data: lensPurchases } = await supabase
      .from("customer_lens_purchases")
      .select("*")
      .eq("customer_id", params.id)
      .order("purchase_date", { ascending: false });

    // Get quotes
    const { data: quotes } = await applyBranchFilter(
      supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", params.id)
        .order("created_at", { ascending: false }),
    );

    // Get agreement usage
    const { data: acRows } = await supabase
      .from("agreement_customers")
      .select(
        "agreement_id, order_count, last_order_at, total_copago, total_institutional, agreements:agreement_id(name)",
      )
      .eq("customer_id", params.id);
    const agreement_usage = (acRows || []).map((r: unknown) => ({
      agreement_id: r.agreement_id,
      agreement_name: r.agreements?.name ?? null,
      order_count: r.order_count,
      last_order_at: r.last_order_at,
      total_copago: Number(r.total_copago ?? 0),
      total_institutional: Number(r.total_institutional ?? 0),
    }));

    // Analytics
    const totalSpent =
      orders?.reduce(
        (sum: number, order: unknown) => sum + (order.total_amount || 0),
        0,
      ) || 0;
    const orderCount = orders?.length || 0;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const lastOrderDate = orders?.[0]?.created_at || null;

    let segment = "new";
    if (orderCount > 10) segment = "vip";
    else if (orderCount > 3) segment = "regular";
    else if (orderCount > 0) segment = "first-time";
    if (
      orderCount > 0 &&
      lastOrderDate &&
      new Date(lastOrderDate) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    ) {
      segment = "at-risk";
    }

    const orderStatusCounts =
      orders?.reduce((acc: Record<string, number>, order: unknown) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

    const productCounts =
      orders?.reduce((acc: Record<string, unknown>, order: unknown) => {
        order.order_items?.forEach((item: unknown) => {
          const product = item.products || item.product;
          if (product) {
            const productId = product.id;
            if (!acc[productId])
              acc[productId] = { product, quantity: 0, totalSpent: 0 };
            acc[productId].quantity += item.quantity;
            acc[productId].totalSpent += item.total_price;
          } else if (item.product_name) {
            const pk = `product_${item.product_id}`;
            if (!acc[pk])
              acc[pk] = {
                product: {
                  id: item.product_id,
                  name: item.product_name,
                  featured_image: null,
                },
                quantity: 0,
                totalSpent: 0,
              };
            acc[pk].quantity += item.quantity;
            acc[pk].totalSpent += item.total_price;
          }
        });
        return acc;
      }, {}) || {};
    const favoriteProducts = Object.values(productCounts)
      .sort((a: unknown, b: unknown) => b.quantity - a.quantity)
      .slice(0, 5);

    // Monthly spending (last 12 months)
    const monthlySpending = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthOrders =
        orders?.filter((order: unknown) => {
          const od = new Date(order.created_at);
          return od >= month && od < nextMonth;
        }) || [];
      monthlySpending.push({
        month: month.toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        }),
        amount: monthOrders.reduce(
          (s: number, o: unknown) => s + (o.total_amount || 0),
          0,
        ),
        orders: monthOrders.length,
      });
    }

    return createApiSuccessResponse({
      ...customer,
      agreement_usage,
      is_convenio_client: agreement_usage.length > 0,
      orders: orders || [],
      prescriptions: prescriptions || [],
      appointments: appointments || [],
      lensPurchases: lensPurchases || [],
      quotes: quotes || [],
      analytics: {
        totalSpent,
        orderCount,
        lastOrderDate,
        avgOrderValue,
        segment,
        lifetimeValue: totalSpent,
        orderStatusCounts,
        favoriteProducts,
        monthlySpending,
      },
    });
  } catch (error) {
    logger.error("Error in customer detail API GET", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

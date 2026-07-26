/**
 * Shared logic for preparing insight data.
 * Used by both the API route (user context) and cron (service role, global view).
 *
 * @module lib/ai/insights/prepare-data
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchContext } from "@/lib/api/branch-middleware";
import {
  addBranchFilter,
  addBranchFilterForBranchScopedTable,
} from "@/lib/api/branch-middleware";

import type { InsightSection } from "./schemas";

export interface PrepareDataResult {
  organizationName: string;
  section: InsightSection | "all";
  data: Record<string, unknown>;
}

/**
 * Prepare real system data for insight generation.
 * Can be called with user's branch context (API) or global context (cron).
 */
export async function prepareInsightData(
  supabase: SupabaseClient,
  organizationId: string,
  organizationName: string,
  section: InsightSection | null,
  branchContext: BranchContext,
): Promise<PrepareDataResult> {
  const data: Record<string, unknown> = {};

  if (!section || section === "dashboard") {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let ordersQuery = supabase
      .from("orders")
      .select("total_amount, created_at, status, payment_status")
      .gte("created_at", thirtyDaysAgo.toISOString());

    ordersQuery = addBranchFilter(
      ordersQuery,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    const { data: orders } = await ordersQuery;

    const yesterdayOrders =
      orders?.filter((o: Record<string, unknown>) => {
        const orderDate = new Date(o.created_at as string);
        return (
          orderDate >= yesterday &&
          orderDate <= yesterdayEnd &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      }) || [];

    const yesterdaySales = yesterdayOrders.reduce(
      (sum: number, o: Record<string, unknown>) => sum + ((o.total_amount as number) || 0),
      0,
    );

    const monthlyOrders =
      orders?.filter((o: Record<string, unknown>) => {
        const orderDate = new Date(o.created_at as string);
        return (
          orderDate >= thirtyDaysAgo &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      }) || [];

    const monthlyRevenue = monthlyOrders.reduce(
      (sum: number, o: Record<string, unknown>) => sum + ((o.total_amount as number) || 0),
      0,
    );
    const monthlyAverage = monthlyRevenue / 30;

    let workOrdersQuery = supabase
      .from("lab_work_orders")
      .select("status, lab_estimated_delivery_date")
      .in("status", ["ordered", "sent_to_lab", "in_progress_lab"]);

    workOrdersQuery = addBranchFilter(
      workOrdersQuery,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    const { data: workOrders } = await workOrdersQuery;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueWorkOrders =
      workOrders?.filter((wo: Record<string, unknown>) => {
        if (!wo.lab_estimated_delivery_date) return false;
        const deliveryDate = new Date(wo.lab_estimated_delivery_date as string);
        return deliveryDate < today;
      }).length || 0;

    let quotesQuery = supabase
      .from("quotes")
      .select("status, converted_to_work_order_id")
      .in("status", ["draft", "sent"])
      .is("converted_to_work_order_id", null);

    quotesQuery = addBranchFilter(
      quotesQuery,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    const { data: quotes } = await quotesQuery;
    const pendingQuotes = quotes?.length || 0;

    data.dashboard = {
      yesterdaySales: Math.round(yesterdaySales),
      monthlyAverage: Math.round(monthlyAverage),
      overdueWorkOrders,
      pendingQuotes,
    };
  }

  if (!section || section === "inventory") {
    let productsQuery = supabase
      .from("products")
      .select("id, name, inventory_quantity, cost_price, price, created_at")
      .eq("status", "active");

    productsQuery = addBranchFilter(
      productsQuery,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    const { data: products } = await productsQuery;

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, created_at, orders!inner(created_at)")
      .order("created_at", { ascending: false })
      .limit(1000);

    const productLastSales = new Map<string, Date>();
    orderItems?.forEach((item: Record<string, unknown>) => {
      const productId = item.product_id as string;
      const orders = item.orders as Record<string, unknown> | undefined;
      const saleDate = new Date((orders?.created_at as string) || (item.created_at as string));
      if (
        !productLastSales.has(productId) ||
        saleDate > productLastSales.get(productId)!
      ) {
        productLastSales.set(productId, saleDate);
      }
    });

    const now = new Date();
    const zombieProducts =
      products
        ?.filter((p: Record<string, unknown>) => {
          const lastSale = productLastSales.get(p.id as string);
          if (!lastSale) {
            const createdDate = new Date(p.created_at as string);
            const daysSinceCreation =
              (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCreation > 90 && (p.inventory_quantity as number) > 0;
          }
          const daysSinceLastSale =
            (now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceLastSale > 180 && (p.inventory_quantity as number) > 0;
        })
        .map((p: Record<string, unknown>) => {
          const lastSale = productLastSales.get(p.id as string);
          const daysSinceLastSale = lastSale
            ? Math.floor(
                (now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24),
              )
            : Math.floor(
                (now.getTime() - new Date(p.created_at as string).getTime()) /
                  (1000 * 60 * 60 * 24),
              );

          return {
            id: p.id as string,
            name: p.name as string,
            stock: (p.inventory_quantity as number) || 0,
            daysSinceLastSale,
            cost: (p.cost_price as number) || 0,
            price: (p.price as number) || 0,
          };
        })
        .slice(0, 10) || [];

    const lowStockProducts =
      products?.filter(
        (p: Record<string, unknown>) =>
          ((p.inventory_quantity as number) || 0) < 5 && ((p.inventory_quantity as number) || 0) > 0,
      ).length || 0;

    data.inventory = {
      zombieProducts,
      lowStockProducts,
    };
  }

  if (!section || section === "clients") {
    let customersQuery = supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone, rut, created_at")
      .eq("is_active", true);

    customersQuery = await addBranchFilterForBranchScopedTable(
      customersQuery,
      branchContext,
      supabase,
    );

    const { data: customers } = await customersQuery;

    const { data: appointments } = await supabase
      .from("appointments")
      .select("customer_id, appointment_date")
      .order("appointment_date", { ascending: false });

    const customerLastVisits = new Map<string, Date>();
    appointments?.forEach((apt: Record<string, unknown>) => {
      if (!apt.customer_id) return;
      const visitDate = new Date(apt.appointment_date as string);
      if (
        !customerLastVisits.has(apt.customer_id as string) ||
        visitDate > customerLastVisits.get(apt.customer_id as string)!
      ) {
        customerLastVisits.set(apt.customer_id as string, visitDate);
      }
    });

    const now = new Date();
    const inactiveClients =
      customers
        ?.filter((c: Record<string, unknown>) => {
          const lastVisit = customerLastVisits.get(c.id as string);
          if (!lastVisit) {
            const createdDate = new Date(c.created_at as string);
            const daysSinceCreation =
              (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCreation > 180;
          }
          const daysSinceLastVisit =
            (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceLastVisit > 180;
        })
        .map((c: Record<string, unknown>) => {
          const lastVisit = customerLastVisits.get(c.id as string);
          const daysSinceLastVisit = lastVisit
            ? Math.floor(
                (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24),
              )
            : Math.floor(
                (now.getTime() - new Date(c.created_at as string).getTime()) /
                  (1000 * 60 * 60 * 24),
              );

          return {
            id: c.id as string,
            name:
              `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Cliente",
            daysSinceLastVisit,
            prescriptionExpired: daysSinceLastVisit > 365,
            contactLensRenewal: daysSinceLastVisit > 180,
          };
        })
        .slice(0, 10) || [];

    data.clients = {
      inactiveClients,
    };
  }

  if (!section || section === "pos") {
    // POS insights use prescription/customerHistory - for bulk regenerate use empty context
    data.pos = data.pos || {
      prescription: {},
      customerHistory: {},
    };
  }

  if (!section || section === "analytics") {
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);

    let ordersQuery = supabase
      .from("orders")
      .select(
        "total_amount, created_at, status, payment_status, order_items(product_name, total_price)",
      )
      .gte("created_at", previousPeriodStart.toISOString());

    ordersQuery = addBranchFilter(
      ordersQuery,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    const { data: orders } = await ordersQuery;

    const currentPeriodOrders =
      orders?.filter((o: Record<string, unknown>) => {
        const orderDate = new Date(o.created_at as string);
        return (
          orderDate >= currentPeriodStart &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      }) || [];

    const previousPeriodOrders =
      orders?.filter((o: Record<string, unknown>) => {
        const orderDate = new Date(o.created_at as string);
        return (
          orderDate >= previousPeriodStart &&
          orderDate < currentPeriodStart &&
          (o.status === "completed" || o.payment_status === "paid")
        );
      }) || [];

    const currentPeriod = currentPeriodOrders.reduce(
      (sum: number, o: Record<string, unknown>) => sum + ((o.total_amount as number) || 0),
      0,
    );

    const previousPeriod = previousPeriodOrders.reduce(
      (sum: number, o: Record<string, unknown>) => sum + ((o.total_amount as number) || 0),
      0,
    );

    const changePercent =
      previousPeriod > 0
        ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
        : 0;

    const breakdown = {
      frames: 0,
      lenses: 0,
      contactLenses: 0,
      accessories: 0,
    };

    currentPeriodOrders.forEach((order: Record<string, unknown>) => {
      const orderItems = order.order_items as Record<string, unknown>[] | undefined;
      orderItems?.forEach((item: Record<string, unknown>) => {
        const productName = ((item.product_name as string) || "").toLowerCase();
        if (productName.includes("marco") || productName.includes("armazon")) {
          breakdown.frames += (item.total_price as number) || 0;
        } else if (
          productName.includes("lente") ||
          productName.includes("cristal")
        ) {
          breakdown.lenses += (item.total_price as number) || 0;
        } else if (productName.includes("contacto")) {
          breakdown.contactLenses += (item.total_price as number) || 0;
        } else {
          breakdown.accessories += (item.total_price as number) || 0;
        }
      });
    });

    data.analytics = {
      salesData: {
        currentPeriod: Math.round(currentPeriod),
        previousPeriod: Math.round(previousPeriod),
        changePercent: Math.round(changePercent * 10) / 10,
        breakdown: {
          frames: Math.round(breakdown.frames),
          lenses: Math.round(breakdown.lenses),
          contactLenses: Math.round(breakdown.contactLenses),
          accessories: Math.round(breakdown.accessories),
        },
      },
      trends: {
        direction:
          changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable",
        factor:
          changePercent > 0 ? "Crecimiento en ventas" : "Disminución en ventas",
      },
    };
  }

  return {
    organizationName,
    section: section || "all",
    data,
  };
}

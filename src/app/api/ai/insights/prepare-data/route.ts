import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import type { InsightSection } from "@/lib/ai/insights/schemas";

/**
 * GET /api/ai/insights/prepare-data
 * Prepare real system data for insight generation
 * This endpoint aggregates data from various sources to prepare it for AI analysis
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.general)(request, async () => {
    try {
      const { client: supabase, getUser } =
        await createClientFromRequest(request);

      // Check authentication
      const { data: userData, error: userError } = await getUser();
      const user = userData?.user;
      if (userError || !user) {
        logger.error("User authentication failed", userError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get user's organization
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .eq("is_active", true)
        .single();

      if (adminError || !adminUser?.organization_id) {
        logger.error("Organization not found", { userId: user.id });
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }

      // Get branch context
      const branchContext = await getBranchContext(request, user.id);

      // Get organization name
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", adminUser.organization_id)
        .single();

      if (orgError || !organization) {
        logger.error("Failed to fetch organization", { error: orgError });
        return NextResponse.json(
          { error: "Failed to fetch organization" },
          { status: 500 },
        );
      }

      const searchParams = request.nextUrl.searchParams;
      const section = searchParams.get("section") as InsightSection | null;

      // Prepare data based on section
      const data: Record<string, any> = {};

      if (!section || section === "dashboard") {
        // Dashboard data
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get orders for revenue calculation
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

        // Calculate yesterday's sales
        const yesterdayOrders =
          orders?.filter((o: any) => {
            const orderDate = new Date(o.created_at);
            return (
              orderDate >= yesterday &&
              orderDate <= yesterdayEnd &&
              (o.status === "completed" || o.payment_status === "paid")
            );
          }) || [];

        const yesterdaySales = yesterdayOrders.reduce(
          (sum: number, o: any) => sum + (o.total_amount || 0),
          0,
        );

        // Calculate monthly average
        const monthlyOrders =
          orders?.filter((o: any) => {
            const orderDate = new Date(o.created_at);
            return (
              orderDate >= thirtyDaysAgo &&
              (o.status === "completed" || o.payment_status === "paid")
            );
          }) || [];

        const monthlyRevenue = monthlyOrders.reduce(
          (sum: number, o: any) => sum + (o.total_amount || 0),
          0,
        );
        const monthlyAverage = monthlyRevenue / 30;

        // Get work orders
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

        // Count overdue work orders (if delivery date exists and is past)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueWorkOrders =
          workOrders?.filter((wo: any) => {
            if (!wo.lab_estimated_delivery_date) return false;
            const deliveryDate = new Date(wo.lab_estimated_delivery_date);
            return deliveryDate < today;
          }).length || 0;

        // Get pending quotes
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
        // Inventory data - get products with low or no sales
        let productsQuery = supabase
          .from("products")
          .select("id, name, inventory_quantity, cost, price, created_at")
          .eq("is_active", true);

        productsQuery = addBranchFilter(
          productsQuery,
          branchContext.branchId,
          branchContext.isSuperAdmin,
          branchContext.organizationId,
        );

        const { data: products } = await productsQuery;

        // Get order items to calculate last sale date
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, created_at, orders!inner(created_at)")
          .order("created_at", { ascending: false })
          .limit(1000);

        // Group by product_id to get last sale date
        const productLastSales = new Map<string, Date>();
        orderItems?.forEach((item: any) => {
          const productId = item.product_id;
          const saleDate = new Date(item.orders?.created_at || item.created_at);
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
            ?.filter((p: any) => {
              const lastSale = productLastSales.get(p.id);
              if (!lastSale) {
                // Product never sold, check if it's old (>90 days)
                const createdDate = new Date(p.created_at);
                const daysSinceCreation =
                  (now.getTime() - createdDate.getTime()) /
                  (1000 * 60 * 60 * 24);
                return daysSinceCreation > 90 && p.inventory_quantity > 0;
              }
              const daysSinceLastSale =
                (now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceLastSale > 180 && p.inventory_quantity > 0; // 6 months
            })
            .map((p: any) => {
              const lastSale = productLastSales.get(p.id);
              const daysSinceLastSale = lastSale
                ? Math.floor(
                    (now.getTime() - lastSale.getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : Math.floor(
                    (now.getTime() - new Date(p.created_at).getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

              return {
                id: p.id,
                name: p.name,
                stock: p.inventory_quantity || 0,
                daysSinceLastSale,
                cost: p.cost || 0,
                price: p.price || 0,
              };
            })
            .slice(0, 10) || []; // Limit to top 10

        const lowStockProducts =
          products?.filter(
            (p: any) =>
              (p.inventory_quantity || 0) < 5 &&
              (p.inventory_quantity || 0) > 0,
          ).length || 0;

        data.inventory = {
          zombieProducts,
          lowStockProducts,
        };
      }

      if (!section || section === "clients") {
        // Clients data - get inactive clients
        let customersQuery = supabase
          .from("profiles")
          .select("id, first_name, last_name, created_at")
          .eq("is_active", true);

        customersQuery = addBranchFilter(
          customersQuery,
          branchContext.branchId,
          branchContext.isSuperAdmin,
          branchContext.organizationId,
        );

        const { data: customers } = await customersQuery;

        // Get last appointments for each customer
        const { data: appointments } = await supabase
          .from("appointments")
          .select("customer_id, appointment_date")
          .order("appointment_date", { ascending: false });

        const customerLastVisits = new Map<string, Date>();
        appointments?.forEach((apt: any) => {
          if (!apt.customer_id) return;
          const visitDate = new Date(apt.appointment_date);
          if (
            !customerLastVisits.has(apt.customer_id) ||
            visitDate > customerLastVisits.get(apt.customer_id)!
          ) {
            customerLastVisits.set(apt.customer_id, visitDate);
          }
        });

        const now = new Date();
        const inactiveClients =
          customers
            ?.filter((c: any) => {
              const lastVisit = customerLastVisits.get(c.id);
              if (!lastVisit) {
                // Never had an appointment, check creation date
                const createdDate = new Date(c.created_at);
                const daysSinceCreation =
                  (now.getTime() - createdDate.getTime()) /
                  (1000 * 60 * 60 * 24);
                return daysSinceCreation > 180; // 6 months
              }
              const daysSinceLastVisit =
                (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceLastVisit > 180; // 6 months inactive
            })
            .map((c: any) => {
              const lastVisit = customerLastVisits.get(c.id);
              const daysSinceLastVisit = lastVisit
                ? Math.floor(
                    (now.getTime() - lastVisit.getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : Math.floor(
                    (now.getTime() - new Date(c.created_at).getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

              return {
                id: c.id,
                name:
                  `${c.first_name || ""} ${c.last_name || ""}`.trim() ||
                  "Cliente",
                daysSinceLastVisit,
                prescriptionExpired: daysSinceLastVisit > 365, // > 12 months
                contactLensRenewal: daysSinceLastVisit > 180, // > 6 months
              };
            })
            .slice(0, 10) || []; // Limit to top 10

        data.clients = {
          inactiveClients,
        };
      }

      if (!section || section === "analytics") {
        // Analytics data - get sales comparison
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
          orders?.filter((o: any) => {
            const orderDate = new Date(o.created_at);
            return (
              orderDate >= currentPeriodStart &&
              (o.status === "completed" || o.payment_status === "paid")
            );
          }) || [];

        const previousPeriodOrders =
          orders?.filter((o: any) => {
            const orderDate = new Date(o.created_at);
            return (
              orderDate >= previousPeriodStart &&
              orderDate < currentPeriodStart &&
              (o.status === "completed" || o.payment_status === "paid")
            );
          }) || [];

        const currentPeriod = currentPeriodOrders.reduce(
          (sum: number, o: any) => sum + (o.total_amount || 0),
          0,
        );

        const previousPeriod = previousPeriodOrders.reduce(
          (sum: number, o: any) => sum + (o.total_amount || 0),
          0,
        );

        const changePercent =
          previousPeriod > 0
            ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
            : 0;

        // Calculate breakdown by category (simplified)
        const breakdown = {
          frames: 0,
          lenses: 0,
          contactLenses: 0,
          accessories: 0,
        };

        currentPeriodOrders.forEach((order: any) => {
          order.order_items?.forEach((item: any) => {
            const productName = (item.product_name || "").toLowerCase();
            if (
              productName.includes("marco") ||
              productName.includes("armazon")
            ) {
              breakdown.frames += item.total_price || 0;
            } else if (
              productName.includes("lente") ||
              productName.includes("cristal")
            ) {
              breakdown.lenses += item.total_price || 0;
            } else if (productName.includes("contacto")) {
              breakdown.contactLenses += item.total_price || 0;
            } else {
              breakdown.accessories += item.total_price || 0;
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
              changePercent > 0
                ? "Crecimiento en ventas"
                : "Disminución en ventas",
          },
        };
      }

      return NextResponse.json({
        success: true,
        organizationName: organization.name,
        section: section || "all",
        data,
      });
    } catch (error: any) {
      logger.error("Prepare data API error", {
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  });
}

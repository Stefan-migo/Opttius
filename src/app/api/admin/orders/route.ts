import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { EmailNotificationService } from "@/lib/email/notifications";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import {
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/api/errors";
import {
  createPaginatedResponse,
  createApiErrorResponse,
  extractPaginationParams,
} from "@/lib/api/response";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Admin Orders API GET called", { requestId });
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check admin authorization
    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      logger.error("User authentication failed", {
        error: userError,
        requestId,
      });
      throw new AuthenticationError("Unauthorized");
    }
    logger.debug("User authenticated", { email: user.email, requestId });

    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      { user_id: user.id } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };
    if (adminError) {
      logger.error("Admin check error", { error: adminError, requestId });
      throw new AuthorizationError("Admin verification failed");
    }
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email, requestId });
      throw new AuthorizationError("Admin access required");
    }
    logger.debug("Admin access confirmed", { email: user.email, requestId });

    // Get branch context for multi-tenancy
    const branchContext = await getBranchContext(request, user.id, supabase);

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("payment_status");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    logger.debug("Query params", {
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      limit,
      offset,
      userOrganizationId,
    });

    // Build query
    let query = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        email,
        customer_name,
        status,
        payment_status,
        total_amount,
        currency,
        created_at,
        updated_at,
        mp_payment_id,
        mp_payment_method,
        mp_payment_type,
        organization_id,
        branch_id,
        order_items (
          id,
          product_name,
          variant_title,
          quantity,
          unit_price,
          total_price
        ),
        order_payments (
          id,
          amount,
          payment_method,
          paid_at
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by organization_id first (multi-tenancy isolation)
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      query = query.eq("organization_id", userOrganizationId);
      logger.debug("Filtering by organization_id", { userOrganizationId });

      // If a specific branch is selected, also filter by branch_id
      if (branchContext.branchId) {
        query = query.eq("branch_id", branchContext.branchId);
        logger.debug("Filtering by branch_id", {
          branchId: branchContext.branchId,
        });
      }
    } else if (branchContext.isSuperAdmin) {
      // Super admin: branch selected = filter by branch; Vision Global = only user's organization
      if (branchContext.branchId) {
        query = query.eq("branch_id", branchContext.branchId);
      } else if (branchContext.organizationId) {
        query = query.eq("organization_id", branchContext.organizationId);
      }
    }

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply payment_status filter
    if (paymentStatus && paymentStatus !== "all") {
      query = query.eq("payment_status", paymentStatus);
    }

    // Apply date range (e.g. from Caja section)
    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
    }

    const { data: orders, error: ordersError, count } = await query;

    if (ordersError) {
      logger.error("Error fetching admin orders", {
        error: ordersError,
        requestId,
      });
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    logger.debug("Orders fetched successfully", {
      ordersCount: orders?.length || 0,
      totalCount: count,
      offset,
      limit,
      requestId,
    });

    // Transform data to include customer names
    const transformedOrders = orders?.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      customer_name: (order as any).customer_name || "Cliente",
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
      order_payments: (order as any).order_payments || [],
    }));

    // Use standardized paginated response
    return createPaginatedResponse(
      transformedOrders || [],
      {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count || 0,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Admin orders API GET error", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

// Create manual order or get statistics
export async function POST(request: NextRequest) {
  return (withRateLimit(rateLimitConfigs.modification) as any)(
    request,
    async () => {
      try {
        logger.info("Admin Orders API POST called");
        const { client: supabase, getUser } =
          await createClientFromRequest(request);

        // Check admin authorization
        const { data, error: userError } = await getUser();
        const user = data?.user;
        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: isAdmin } = await supabase.rpc("is_admin", {
          user_id: user.id,
        });
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        // Get branch context for multi-tenancy
        let branchContext;
        try {
          branchContext = await getBranchContext(request, user.id, supabase);
        } catch (branchError: any) {
          logger.error("Error getting branch context", branchError);
          return NextResponse.json(
            {
              error: "Failed to get branch context",
              details: branchError?.message || "Unknown error",
            },
            { status: 500 },
          );
        }

        // Get user's organization_id for filtering
        const { data: adminUser, error: adminUserError } = await supabase
          .from("admin_users")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (adminUserError && adminUserError.code !== "PGRST116") {
          // PGRST116 is "not found" which is acceptable
          logger.error("Error fetching admin user", adminUserError);
          return NextResponse.json(
            { error: "Failed to fetch user information" },
            { status: 500 },
          );
        }

        const userOrganizationId = (adminUser as { organization_id?: string })
          ?.organization_id;

        let body: any;
        try {
          body = await request.json();
        } catch (jsonError: any) {
          logger.error("Error parsing request body", jsonError);
          return NextResponse.json(
            {
              error: "Invalid request body",
              details: jsonError?.message || "Failed to parse JSON",
            },
            { status: 400 },
          );
        }

        const { action } = body;

        if (!action) {
          return NextResponse.json(
            { error: "Action is required" },
            { status: 400 },
          );
        }

        if (action === "get_stats") {
          try {
            logger.info("Getting order statistics", {
              userOrganizationId,
              isSuperAdmin: branchContext.isSuperAdmin,
              branchId: branchContext.branchId,
            });

            // Filter by organization_id for multi-tenancy
            // IMPORTANT: If user has no organization_id and is not super admin, return empty stats
            if (!userOrganizationId && !branchContext.isSuperAdmin) {
              logger.warn(
                "User has no organization_id and is not super admin",
                {
                  userId: user.id,
                },
              );
              return NextResponse.json({
                success: true,
                stats: {
                  orderCounts: {},
                  totalRevenue: 0,
                  recentOrders: [],
                },
              });
            }

            // Build base query with organization filter
            let baseQuery = supabase.from("orders").select("status");

            // Validate baseQuery is a valid query builder
            if (!baseQuery || typeof baseQuery.eq !== "function") {
              logger.error("Invalid query builder", {
                baseQueryType: typeof baseQuery,
                baseQueryConstructor: baseQuery?.constructor?.name,
                supabaseType: typeof supabase,
                supabaseFromType: typeof supabase?.from,
              });
              return NextResponse.json(
                {
                  error: "Failed to create database query",
                  details: "baseQuery.eq is not a function",
                },
                { status: 500 },
              );
            }

            if (userOrganizationId && !branchContext.isSuperAdmin) {
              baseQuery = baseQuery.eq("organization_id", userOrganizationId);

              // If a specific branch is selected, also filter by branch_id
              if (branchContext.branchId) {
                baseQuery = baseQuery.eq("branch_id", branchContext.branchId);
              }
            } else if (branchContext.isSuperAdmin && branchContext.branchId) {
              baseQuery = baseQuery.eq("branch_id", branchContext.branchId);
            }

            // Get order counts by status
            const { data: allOrders, error: statusError } = await baseQuery;

            if (statusError) {
              logger.error("Error getting order stats", statusError);
              return NextResponse.json(
                {
                  error: "Failed to get order statistics",
                  details: statusError.message,
                },
                { status: 500 },
              );
            }

            // Count by status manually
            const statusCounts =
              allOrders?.reduce(
                (acc: Record<string, number>, order: { status: string }) => {
                  acc[order.status] = (acc[order.status] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ) || {};

            // Get total revenue for current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Build revenue query with organization filter
            let revenueQuery = supabase.from("orders").select("total_amount");

            // Filter by organization_id for multi-tenancy
            if (userOrganizationId && !branchContext.isSuperAdmin) {
              revenueQuery = revenueQuery.eq(
                "organization_id",
                userOrganizationId,
              );

              // If a specific branch is selected, also filter by branch_id
              if (branchContext.branchId) {
                revenueQuery = revenueQuery.eq(
                  "branch_id",
                  branchContext.branchId,
                );
              }
            } else if (branchContext.isSuperAdmin && branchContext.branchId) {
              revenueQuery = revenueQuery.eq(
                "branch_id",
                branchContext.branchId,
              );
            }

            const { data: revenueData, error: revenueError } =
              await revenueQuery
                .eq("payment_status", "paid")
                .gte("created_at", startOfMonth.toISOString());

            if (revenueError) {
              logger.error("Error getting revenue stats", revenueError);
              return NextResponse.json(
                {
                  error: "Failed to get revenue statistics",
                  details: revenueError.message,
                },
                { status: 500 },
              );
            }

            const totalRevenue =
              revenueData?.reduce(
                (sum: number, order: any) => sum + (order.total_amount || 0),
                0,
              ) || 0;

            // Build recent orders query with organization filter
            let recentOrdersQuery = supabase.from("orders").select(
              `
            id,
            order_number,
            email,
            status,
            total_amount,
            created_at
          `,
            );

            // Filter by organization_id for multi-tenancy
            if (userOrganizationId && !branchContext.isSuperAdmin) {
              recentOrdersQuery = recentOrdersQuery.eq(
                "organization_id",
                userOrganizationId,
              );

              // If a specific branch is selected, also filter by branch_id
              if (branchContext.branchId) {
                recentOrdersQuery = recentOrdersQuery.eq(
                  "branch_id",
                  branchContext.branchId,
                );
              }
            } else if (branchContext.isSuperAdmin && branchContext.branchId) {
              recentOrdersQuery = recentOrdersQuery.eq(
                "branch_id",
                branchContext.branchId,
              );
            }

            // Get recent orders
            const { data: recentOrders, error: recentError } =
              await recentOrdersQuery
                .order("created_at", { ascending: false })
                .limit(10);

            if (recentError) {
              logger.error("Error getting recent orders", recentError);
              return NextResponse.json(
                {
                  error: "Failed to get recent orders",
                  details: recentError.message,
                },
                { status: 500 },
              );
            }

            return NextResponse.json({
              success: true,
              stats: {
                orderCounts: statusCounts, // This is an object, not an array
                totalRevenue,
                recentOrders:
                  recentOrders?.map((order: any) => ({
                    id: order.id,
                    order_number: order.order_number,
                    customer_name: "Cliente", // Generic name for now
                    customer_email: order.email,
                    status: order.status,
                    total_amount: order.total_amount,
                    created_at: order.created_at,
                  })) || [],
              },
            });
          } catch (statsError: any) {
            logger.error("Error in get_stats action", statsError);
            return NextResponse.json(
              {
                error: "Failed to get order statistics",
                details: statsError?.message || "Unknown error",
              },
              { status: 500 },
            );
          }
        }

        if (action === "create_manual_order") {
          logger.info("Creating manual order");
          const { orderData } = body;

          logger.debug("Order data received", { orderData });

          // Validate required fields
          if (!orderData.email) {
            return NextResponse.json(
              { error: "Email is required" },
              { status: 400 },
            );
          }

          if (!orderData.total_amount || orderData.total_amount <= 0) {
            return NextResponse.json(
              { error: "Total amount must be greater than 0" },
              { status: 400 },
            );
          }

          // Generate order number
          const orderNumber = `DL-${Date.now()}`;

          // Map status values (frontend uses 'completed', DB uses 'delivered')
          let dbStatus = orderData.status || "pending";
          if (dbStatus === "completed") {
            dbStatus = "delivered";
          }

          // Create the order
          const { data: newOrder, error: orderError } = await supabase
            .from("orders")
            .insert({
              order_number: orderNumber,
              email: orderData.email,
              status: dbStatus,
              payment_status: orderData.payment_status || "paid",
              subtotal: orderData.subtotal || orderData.total_amount,
              total_amount: orderData.total_amount,
              currency: "ARS",
              mp_payment_method: orderData.payment_method || "manual",
              customer_notes: orderData.notes,
              shipping_first_name: orderData.shipping?.first_name,
              shipping_last_name: orderData.shipping?.last_name,
              shipping_address_1: orderData.shipping?.address_1,
              shipping_city: orderData.shipping?.city,
              shipping_state: orderData.shipping?.state,
              shipping_postal_code: orderData.shipping?.postal_code,
              shipping_phone: orderData.shipping?.phone,
            })
            .select()
            .single();

          if (orderError) {
            logger.error("Error creating manual order", orderError, {
              order_number: orderNumber,
              email: orderData.email,
              status: dbStatus,
              payment_status: orderData.payment_status || "paid",
              subtotal: orderData.subtotal || orderData.total_amount,
              total_amount: orderData.total_amount,
            });
            return NextResponse.json(
              { error: "Failed to create order", details: orderError.message },
              { status: 500 },
            );
          }

          // Create order items if provided
          if (orderData.items && orderData.items.length > 0) {
            const orderItems = orderData.items.map(
              (item: {
                product_id: string;
                quantity: number;
                unit_price: number;
                product_name: string;
                variant_title?: string;
              }) => ({
                order_id: newOrder.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.unit_price * item.quantity,
                product_name: item.product_name,
                variant_title: item.variant_title || null,
              }),
            );

            const { error: itemsError } = await supabase
              .from("order_items")
              .insert(orderItems);

            if (itemsError) {
              logger.error("Error creating order items", itemsError);
              // Don't fail the whole operation, just log the error
            }
          }

          logger.info("Manual order created successfully", {
            orderId: newOrder.id,
          });

          // Create notification for new sale (non-blocking)
          const { NotificationService } = await import(
            "@/lib/notifications/notification-service"
          );
          NotificationService.notifyNewSale(
            (newOrder as any).id,
            (newOrder as any).order_number,
            (newOrder as any).email,
            (newOrder as any).total_amount,
            (newOrder as any).branch_id ?? undefined,
          ).catch((err) => logger.error("Error creating notification", err));

          // Send Customer Order Confirmation (non-blocking)
          if ((newOrder as any).email) {
            (async () => {
              try {
                // Prepare order object for email service
                const emailOrder = {
                  ...(newOrder as any),
                  user_email: (newOrder as any).email,
                  email: (newOrder as any).email,
                  currency: (newOrder as any).currency || orderData.currency || "CLP",
                  customer_name:
                    (newOrder as any).customer_name ||
                    orderData.customer_name?.trim() ||
                    (orderData.shipping?.first_name && orderData.shipping?.last_name
                      ? `${orderData.shipping.first_name} ${orderData.shipping.last_name}`.trim()
                      : null) ||
                    "Cliente",
                  items:
                    orderData.items?.map((item: any) => ({
                      id: item.product_id,
                      name: item.product_name,
                      quantity: item.quantity,
                      price: item.unit_price,
                      variant_title: item.variant_title,
                    })) || [],
                  payment_method:
                    (newOrder as any).mp_payment_method ||
                    orderData.payment_method ||
                    "manual",
                  organization_id: (newOrder as any).organization_id,
                };

                await EmailNotificationService.sendOrderConfirmation(
                  emailOrder as any,
                );
              } catch (err) {
                logger.error("Error sending order confirmation email", err);
              }
            })();
          }

          return NextResponse.json({
            success: true,
            order: newOrder,
          });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      } catch (error) {
        if (error instanceof RateLimitError) {
          logger.warn("Rate limit exceeded for order creation", {
            error: error.message,
          });
          return NextResponse.json({ error: error.message }, { status: 429 });
        }
        logger.error("Admin orders POST error", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },
  );
}

// Delete all orders (for testing cleanup)
export async function DELETE(request: NextRequest) {
  try {
    logger.warn("Admin Orders API DELETE called - Deleting all orders");
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check admin authorization
    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      logger.error("User authentication failed", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.debug("User authenticated", { email: user.email });

    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      { user_id: user.id } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };
    if (adminError) {
      logger.error("Admin check error", adminError);
      return NextResponse.json(
        { error: "Admin verification failed" },
        { status: 500 },
      );
    }
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email });
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.debug("Admin access confirmed", { email: user.email });

    // First, delete all order items (due to foreign key constraints)
    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (using a condition that's always true)

    if (itemsError) {
      logger.error("Error deleting order items", itemsError);
      return NextResponse.json(
        { error: "Failed to delete order items", details: itemsError.message },
        { status: 500 },
      );
    }
    logger.debug("Order items deleted successfully");

    // Then, delete all orders
    const { error: ordersError } = await supabase
      .from("orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (using a condition that's always true)

    if (ordersError) {
      logger.error("Error deleting orders", ordersError);
      return NextResponse.json(
        { error: "Failed to delete orders", details: ordersError.message },
        { status: 500 },
      );
    }

    logger.warn("All orders deleted successfully");
    return NextResponse.json({
      success: true,
      message: "All orders have been deleted successfully",
    });
  } catch (error) {
    logger.error("Admin orders DELETE error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  createClientFromRequest,
  createServiceRoleClient,
} from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { EmailNotificationService } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    logger.info("Admin Orders PATCH called for order", { orderId: params.id });
    const supabase = await createClient();

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

    const body = await request.json();
    const { status, payment_status, tracking_number, carrier } = body;

    logger.debug("Updating order with", {
      status,
      payment_status,
      tracking_number,
      carrier,
    });

    // Get current order to check status changes
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status, shipped_at, delivered_at")
      .eq("id", params.id)
      .single();

    // Build update object dynamically to only update provided fields
    const updateData: {
      updated_at: string;
      status?: string;
      shipped_at?: string;
      delivered_at?: string;
      payment_status?: string;
      tracking_number?: string | null;
      carrier?: string | null;
      [key: string]: unknown;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateData.status = status;

      // Set timestamps for status changes
      if (status === "shipped" && !currentOrder?.shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }
      if (status === "delivered" && !currentOrder?.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }
    }

    if (payment_status !== undefined) {
      updateData.payment_status = payment_status;
    }

    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number;
    }

    if (carrier !== undefined) {
      updateData.carrier = carrier;
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", params.id)
      .select(
        `
        *,
        order_items (
          id,
          product_name,
          variant_title,
          quantity,
          unit_price,
          total_price
        )
      `,
      )
      .single();

    if (updateError) {
      logger.error("Error updating order", updateError);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 },
      );
    }

    logger.info("Order updated successfully", { orderId: params.id });

    // Send email notifications based on status changes
    if (status && status !== currentOrder?.status) {
      try {
        const supabaseAdmin = createServiceRoleClient();

        // Get full order details for email
        const { data: fullOrder } = await supabaseAdmin
          .from("orders")
          .select(
            `
            *,
            organization_id,
            order_items (
              id,
              product_name,
              variant_title,
              quantity,
              unit_price,
              total_price
            ),
            profiles (
              id,
              full_name,
              email
            )
          `,
          )
          .eq("id", params.id)
          .single();

        if (fullOrder) {
          // Prepare order data for email service
          const emailOrder = {
            id: fullOrder.id,
            order_number: fullOrder.order_number,
            user_email: fullOrder.email,
            email: fullOrder.email,
            customer_name:
              fullOrder.shipping_first_name && fullOrder.shipping_last_name
                ? `${fullOrder.shipping_first_name} ${fullOrder.shipping_last_name}`
                : fullOrder.profiles?.full_name || "Cliente",
            items:
              fullOrder.order_items?.map(
                (item: {
                  id: string;
                  product_name: string;
                  variant_title?: string | null;
                  quantity: number;
                  unit_price: number;
                  total_price: number;
                }) => ({
                  id: item.id,
                  name: item.product_name,
                  quantity: item.quantity,
                  price: item.unit_price,
                  variant_title: item.variant_title,
                }),
              ) || [],
            total_amount: fullOrder.total_amount,
            payment_method: fullOrder.mp_payment_method || "MercadoPago",
            status: fullOrder.status,
            created_at: fullOrder.created_at,
            payment_id: fullOrder.mp_payment_id,
            tracking_number: fullOrder.tracking_number,
            carrier: fullOrder.carrier,
            shipped_at: fullOrder.shipped_at,
            delivered_at: fullOrder.delivered_at,
            organization_id: fullOrder.organization_id,
            profiles: fullOrder.profiles,
          };

          // Send appropriate email based on status
          // TODO: Habilitar cuando flujo de envío esté implementado
          // if (status === "shipped") {
          //   await EmailNotificationService.sendShippingNotification(emailOrder);
          //   logger.info("Shipping notification email sent", {
          //     orderId: params.id,
          //   });
          // } else if (status === "delivered") {
          //   await EmailNotificationService.sendDeliveryConfirmation(emailOrder);
          //   logger.info("Delivery confirmation email sent", {
          //     orderId: params.id,
          //   });
          // }
        }
      } catch (emailError) {
        logger.warn(
          "Error sending status change email (non-critical)",
          emailError,
        );
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    logger.error("Admin order update error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("Admin Orders GET single order", { orderId: id });
    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check admin authorization
    const { data, error: userError } = await getUser();
    const user = data?.user;
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

    // Get branch context for multi-tenancy
    const branchContext = await getBranchContext(request, user.id, supabase);

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (adminUser as any)?.organization_id;

    // Get order details
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          id,
          product_id,
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
          paid_at,
          notes,
          payment_reference
        )
      `,
      )
      .eq("id", id);

    // Filter by organization_id for multi-tenancy
    if (userOrganizationId && !branchContext.isSuperAdmin) {
      query = query.eq("organization_id", userOrganizationId);
    }

    const { data: order, error: orderError } = await query.single();

    if (orderError) {
      logger.error("Error fetching order", orderError);
      // If order not found or doesn't belong to user's organization, return 404
      if (
        orderError.code === "PGRST116" ||
        orderError.message.includes("No rows")
      ) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 },
      );
    }

    // Additional check: if order exists but doesn't belong to user's organization
    if (
      userOrganizationId &&
      !branchContext.isSuperAdmin &&
      order.organization_id !== userOrganizationId
    ) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: order,
      order, // backward compatibility for pages using data.order
    });
  } catch (error) {
    logger.error("Admin order fetch error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    logger.warn("Admin Orders DELETE called for order", { orderId: params.id });
    const supabase = await createClient();

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

    // First, delete all order items for this order
    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", params.id);

    if (itemsError) {
      logger.error("Error deleting order items", itemsError);
      return NextResponse.json(
        { error: "Failed to delete order items", details: itemsError.message },
        { status: 500 },
      );
    }

    // Then, delete the order
    const { error: orderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", params.id);

    if (orderError) {
      logger.error("Error deleting order", orderError);
      return NextResponse.json(
        { error: "Failed to delete order", details: orderError.message },
        { status: 500 },
      );
    }

    logger.warn("Order deleted successfully", { orderId: params.id });
    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    logger.error("Admin order delete error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

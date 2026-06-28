import { NextRequest, NextResponse } from "next/server";

import { sendOrderConfirmation } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    logger.debug("Sending notification for order", { orderId: params.id });
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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
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
      .eq("id", params.id)
      .single();

    if (orderError || !order) {
      logger.error("Error fetching order", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Customer name: prefer orders.customer_name (POS), fallback to shipping names (e-commerce)
    const customerName =
      order.customer_name?.trim() ||
      (order.shipping_first_name && order.shipping_last_name
        ? `${order.shipping_first_name} ${order.shipping_last_name}`.trim()
        : null) ||
      "Cliente";

    // Payment method: POS uses payment_method_type, e-commerce uses mp_payment_method
    const paymentMethod =
      order.payment_method_type || order.mp_payment_method || "N/A";

    // Prepare order data for email
    const emailOrder = {
      id: order.id,
      order_number: order.order_number,
      user_email: order.email,
      email: order.email,
      customer_name: customerName,
      currency: order.currency,
      items:
        order.order_items?.map((item: unknown) => ({
          id: item.id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          variant_title: item.variant_title,
        })) || [],
      total_amount: order.total_amount,
      payment_method: paymentMethod,
      created_at: order.created_at,
      payment_id: order.mp_payment_id,
      status: order.status,
      organization_id: order.organization_id,
    };

    // Send email notification
    const result =
      await sendOrderConfirmation(emailOrder);

    if (!result.success) {
      logger.error("Error sending email", result.error);
      return NextResponse.json(
        { error: "Failed to send notification", details: result.error },
        { status: 500 },
      );
    }

    logger.info("Notification sent successfully", { orderId: params.id });

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });
  } catch (error) {
    logger.error("Notification API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

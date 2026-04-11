/**
 * NOWPayments IPN (Instant Payment Notification) webhook handler.
 * Processes cryptocurrency payment status updates.
 *
 * @module app/api/webhooks/nowpayments/route
 */

import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { PaymentGatewayFactory } from "@/lib/payments";
import { PaymentService } from "@/lib/payments/services/payment-service";
import { createServiceRoleClient } from "@/utils/supabase/server";

/**
 * POST /api/webhooks/nowpayments
 * Handles IPN callbacks from NOWPayments
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    logger.info("NOWPayments webhook received");

    // Process the webhook event using the gateway
    const gateway = PaymentGatewayFactory.getGateway("nowpayments");
    const webhookEvent = await gateway.processWebhookEvent(request);

    logger.info("NOWPayments webhook event processed", {
      eventId: webhookEvent.gatewayEventId,
      status: webhookEvent.status,
      type: webhookEvent.type,
    });

    // Update payment status in database
    const supabase = createServiceRoleClient();
    const paymentService = new PaymentService(supabase);
    await paymentService.updatePaymentFromWebhook(webhookEvent);

    logger.info("NOWPayments payment updated successfully", {
      eventId: webhookEvent.gatewayEventId,
      status: webhookEvent.status,
    });

    // NOWPayments expects a 200 OK response
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      "Error processing NOWPayments webhook",
      error instanceof Error ? error : new Error(errorMessage),
    );

    // Return 200 to prevent NOWPayments from retrying invalid requests
    // but log the error for investigation
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 200 },
    );
  }
}

/**
 * GET /api/webhooks/nowpayments
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "NOWPayments webhook endpoint is active",
  });
}

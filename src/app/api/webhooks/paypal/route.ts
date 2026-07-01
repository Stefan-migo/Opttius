/**
 * POST /api/webhooks/paypal
 * Recibe eventos de PayPal (CHECKOUT.ORDER.COMPLETED, PAYMENT.CAPTURE.COMPLETED).
 * Valida firma del webhook via PayPal REST API antes de procesar.
 * Sin rate limiting. Idempotencia con webhook_events.
 */

import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import {
  PayPalGateway,
  type PayPalWebhookHeaders,
} from "@/lib/payments/paypal/gateway";
import { PaymentService } from "@/lib/payments/services/payment-service";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Extract PayPal signature headers from request.
 * Returns null if any required header is missing.
 */
function extractPayPalHeaders(
  request: NextRequest,
): PayPalWebhookHeaders | null {
  const authAlgo = request.headers.get("paypal-auth-algo");
  const certUrl = request.headers.get("paypal-cert-url");
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const transmissionTime = request.headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return {
    "paypal-auth-algo": authAlgo,
    "paypal-cert-url": certUrl,
    "paypal-transmission-id": transmissionId,
    "paypal-transmission-sig": transmissionSig,
    "paypal-transmission-time": transmissionTime,
  };
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const paypalGateway = new PayPalGateway();
  const paymentService = new PaymentService(supabase);

  try {
    // Read raw body for signature verification, then let processWebhookEvent parse JSON
    const rawBody = await request.clone().text();

    const headers = extractPayPalHeaders(request);
    if (!headers) {
      logger.warn("PayPal Webhook: missing signature headers");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const isValid = await paypalGateway.validateWebhookSignature(
      headers,
      rawBody,
    );
    if (!isValid) {
      logger.warn("PayPal Webhook: signature validation failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const webhookEvent = await paypalGateway.processWebhookEvent(request);
    logger.info("PayPal Webhook Event processed", {
      gatewayEventId: webhookEvent.gatewayEventId,
      type: webhookEvent.type,
      status: webhookEvent.status,
    });

    const alreadyProcessed = await paymentService.recordWebhookEvent(
      webhookEvent.gateway,
      webhookEvent.gatewayEventId,
      webhookEvent.type,
      null,
      webhookEvent.metadata ?? undefined,
    );

    if (alreadyProcessed) {
      logger.info("PayPal Webhook event already processed, skipping", {
        gatewayEventId: webhookEvent.gatewayEventId,
      });
      return NextResponse.json(
        { received: true, message: "Already processed" },
        { status: 200 },
      );
    }

    const gatewayPaymentIntentId =
      webhookEvent.gatewayPaymentIntentId ?? undefined;
    if (!gatewayPaymentIntentId) {
      logger.warn("PayPal Webhook: no gatewayPaymentIntentId in event", {
        type: webhookEvent.type,
      });
      await paymentService.markWebhookEventAsProcessed(
        webhookEvent.gateway,
        webhookEvent.gatewayEventId,
      );
      return NextResponse.json(
        { received: true, message: "Event has no payment intent ID" },
        { status: 200 },
      );
    }

    const existingPayment =
      await paymentService.getPaymentByGatewayPaymentIntentId(
        gatewayPaymentIntentId,
      );

    if (!existingPayment) {
      logger.warn(
        "PayPal Webhook: No existing payment found for gateway intent ID",
        { gatewayPaymentIntentId },
      );
      await paymentService.markWebhookEventAsProcessed(
        webhookEvent.gateway,
        webhookEvent.gatewayEventId,
      );
      return NextResponse.json(
        { received: true, message: "Payment not found internally" },
        { status: 200 },
      );
    }

    await paymentService.updatePaymentStatus(
      existingPayment.id,
      webhookEvent.status,
      webhookEvent.gatewayTransactionId ?? undefined,
      webhookEvent.metadata ?? undefined,
    );

    await paymentService.markWebhookEventAsProcessed(
      webhookEvent.gateway,
      webhookEvent.gatewayEventId,
    );

    if (webhookEvent.status === "succeeded" && existingPayment.order_id) {
      await paymentService.fulfillOrder(existingPayment.order_id);
      logger.info("Order fulfilled successfully via PayPal Webhook", {
        orderId: existingPayment.order_id,
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    logger.error(
      "Error processing PayPal Webhook",
      error instanceof Error ? error : new Error(message),
      {
        requestHeaders: Object.fromEntries(request.headers.entries()),
      },
    );
    return NextResponse.json(
      { error: "Webhook processing failed internally" },
      { status: 500 },
    );
  }
}

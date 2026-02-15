/**
 * GET/POST /api/webhooks/mercadopago
 * Recibe notificaciones de Mercado Pago (topic=payment, id=payment_id).
 * Valida firma HMAC cuando MERCADOPAGO_WEBHOOK_SECRET está configurado.
 * Idempotencia con webhook_events.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { MercadoPagoGateway } from "@/lib/payments/mercadopago/gateway";
import { MercadoPagoWebhookValidator } from "@/lib/payments/mercadopago/webhook-validator";
import { PaymentService } from "@/lib/payments/services/payment-service";
import { appLogger as logger } from "@/lib/logger";

async function processWebhook(request: NextRequest): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  const mpGateway = new MercadoPagoGateway();
  const paymentService = new PaymentService(supabase);
  const validator = new MercadoPagoWebhookValidator();

  try {
    const searchParams = request.nextUrl.searchParams;
    let dataId = searchParams.get("data.id") ?? searchParams.get("id") ?? null;
    let topicFromBody: string | null = null;
    let bodyParsed: Record<string, unknown> | null = null;

    if (request.method === "POST") {
      try {
        bodyParsed = (await request.json()) as Record<string, unknown>;
        if (bodyParsed && typeof bodyParsed === "object") {
          if (!dataId) {
            const data = bodyParsed.data;
            if (data != null && typeof data === "object" && "id" in data)
              dataId = String((data as { id: unknown }).id);
            else if (typeof data === "string") dataId = data;
            else if (
              typeof bodyParsed.id === "string" ||
              typeof bodyParsed.id === "number"
            )
              dataId = String(bodyParsed.id);
            else if (
              typeof bodyParsed.api_id === "string" ||
              typeof bodyParsed.api_id === "number"
            )
              dataId = String(bodyParsed.api_id);
          }
          topicFromBody =
            (typeof bodyParsed.type === "string" ? bodyParsed.type : null) ??
            (typeof bodyParsed.action === "string"
              ? bodyParsed.action
              : null) ??
            null;
        }
      } catch {
        // body not JSON or empty
      }
    }

    const topic =
      topicFromBody ?? searchParams.get("topic") ?? (dataId ? "payment" : null);
    const id = dataId ?? searchParams.get("id") ?? null;

    if (!id) {
      logger.warn("Mercado Pago Webhook: missing id in query and body", {
        hasBody: !!bodyParsed,
      });
      return NextResponse.json(
        { received: true, message: "Missing id" },
        { status: 200 },
      );
    }

    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    // Phase C: subscription/preapproval notifications (Plans and Subscriptions)
    const subscriptionTopics = ["subscription_preapproval", "preapproval"];
    if (topic && subscriptionTopics.includes(topic)) {
      try {
        if (!("getPreApproval" in mpGateway)) {
          logger.warn("Mercado Pago: getPreApproval not available", { topic });
          return NextResponse.json({ received: true }, { status: 200 });
        }
        const preapproval = await (
          mpGateway as {
            getPreApproval: (id: string) => Promise<{
              id: string;
              status: string;
              external_reference?: string | null;
            } | null>;
          }
        ).getPreApproval(id);
        if (!preapproval?.external_reference) {
          logger.warn(
            "Mercado Pago preapproval webhook: no external_reference",
            { id },
          );
          return NextResponse.json({ received: true }, { status: 200 });
        }
        const orgId = preapproval.external_reference;
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("gateway_subscription_id", id)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (sub) {
          const statusMap: Record<string, string> = {
            authorized: "active",
            pending: "active",
            cancelled: "cancelled",
            paused: "past_due",
          };
          const newStatus =
            statusMap[preapproval.status.toLowerCase()] ?? "active";
          await supabase
            .from("subscriptions")
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
              ...(newStatus === "cancelled"
                ? { canceled_at: new Date().toISOString() }
                : {}),
            })
            .eq("id", sub.id);
          logger.info(
            "Mercado Pago subscription webhook: subscription updated",
            {
              id,
              organizationId: orgId,
              status: preapproval.status,
            },
          );
        }
      } catch (err) {
        logger.error(
          "Error processing subscription/preapproval webhook",
          err instanceof Error ? err : new Error(String(err)),
          { id, topic },
        );
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (topic === "merchant_order") {
      // Process merchant_order without signature: fetch order from MP API and update subscription.
      try {
        const orderInfo = await mpGateway.getMerchantOrder(id);
        if (!orderInfo?.preference_id) {
          logger.warn(
            "Mercado Pago merchant_order: no preference_id in order",
            { id },
          );
          return NextResponse.json({ received: true }, { status: 200 });
        }
        const hasApproved = orderInfo.payments?.some(
          (p) => String(p.status).toLowerCase() === "approved",
        );
        if (!hasApproved) {
          logger.info("Mercado Pago merchant_order: no approved payment yet", {
            id,
            preference_id: orderInfo.preference_id,
          });
          return NextResponse.json({ received: true }, { status: 200 });
        }
        const existingPayment =
          await paymentService.getPaymentByGatewayPaymentIntentId(
            orderInfo.preference_id,
          );
        if (!existingPayment) {
          logger.warn(
            "Mercado Pago merchant_order: no internal payment for preference",
            {
              preference_id: orderInfo.preference_id,
            },
          );
          return NextResponse.json({ received: true }, { status: 200 });
        }
        const gatewayEventId = `merchant_order-${id}`;
        const alreadyProcessed = await paymentService.recordWebhookEvent(
          "mercadopago",
          gatewayEventId,
          "merchant_order",
          null,
          undefined,
        );
        if (alreadyProcessed) {
          logger.info("Mercado Pago merchant_order already processed", { id });
          return NextResponse.json({ received: true }, { status: 200 });
        }
        await paymentService.updatePaymentStatus(
          existingPayment.id,
          "succeeded",
          String(orderInfo.payments?.[0]?.id ?? id),
          undefined,
          orderInfo.preference_id,
        );
        await paymentService.markWebhookEventAsProcessed(
          "mercadopago",
          gatewayEventId,
        );
        if (existingPayment.order_id) {
          await paymentService.fulfillOrder(existingPayment.order_id);
        }
        if (existingPayment.organization_id) {
          await paymentService.applyPaymentSuccessToOrganization(
            existingPayment.organization_id,
            { ...existingPayment, status: "succeeded" },
            orderInfo.preference_id,
            String(orderInfo.payments?.[0]?.id ?? id),
          );
        }
        logger.info(
          "Mercado Pago merchant_order processed, subscription updated",
          {
            id,
            preference_id: orderInfo.preference_id,
            organizationId: existingPayment.organization_id,
          },
        );
      } catch (err) {
        logger.error(
          "Error processing merchant_order webhook",
          err instanceof Error ? err : new Error(String(err)),
          { id },
        );
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const validationResult = validator.validate(xSignature, xRequestId, id);
    if (!validationResult.isValid) {
      logger.error(
        "Webhook signature validation failed",
        new Error(validationResult.error),
        {
          xSignature: xSignature ? "[present]" : "[missing]",
          xRequestId: xRequestId ? "[present]" : "[missing]",
          dataId: id,
        },
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const url = new URL(request.url);
    url.searchParams.set("topic", topic ?? "payment");
    url.searchParams.set("id", id);
    const requestToProcess = new NextRequest(url, {
      method: "GET",
      headers: request.headers,
    });

    const webhookEvent = await mpGateway.processWebhookEvent(requestToProcess);
    logger.info("Mercado Pago Webhook Event processed", {
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
      logger.info("Mercado Pago Webhook event already processed, skipping", {
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
      logger.warn("Mercado Pago Webhook: no gatewayPaymentIntentId in event", {
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
        "Mercado Pago Webhook: No existing payment found for gateway intent ID",
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
      logger.info("Order fulfilled successfully via Mercado Pago Webhook", {
        orderId: existingPayment.order_id,
      });
    }

    if (
      webhookEvent.status === "succeeded" &&
      existingPayment.organization_id
    ) {
      await paymentService.applyPaymentSuccessToOrganization(
        existingPayment.organization_id,
        { ...existingPayment, status: "succeeded" },
        gatewayPaymentIntentId ?? null,
        webhookEvent.gatewayTransactionId ?? null,
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    logger.error(
      "Error processing Mercado Pago Webhook",
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

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return processWebhook(request);
}

export async function POST(request: NextRequest) {
  return processWebhook(request);
}

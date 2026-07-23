/**
 * Mercado Pago Gateway — Webhook processing and merchant order lookup.
 *
 * @module lib/payments/mercadopago/gateway/webhook-handler
 */

import type { NextRequest } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { WebhookEvent } from "@/types/payment";

import type { MerchantOrderInfo } from "./helpers";
import { getMPClient, mapStatus } from "./helpers";

export async function processWebhookEvent(
  request: NextRequest,
): Promise<WebhookEvent> {
  const query = request.nextUrl.searchParams;
  const topic = query.get("topic");
  const id = query.get("id");

  if (topic === "payment" && id) {
    const { payment, merchantOrder: _merchantOrder } = getMPClient();
    try {
      const paymentInfo = await payment.get({ id });
      const paymentData: Record<string, unknown> =
        (paymentInfo as { body?: Record<string, unknown> }).body ??
        (paymentInfo as Record<string, unknown>);

      const orderId =
        typeof paymentData.external_reference === "string"
          ? paymentData.external_reference
          : null;
      const organizationId =
        typeof paymentData.metadata === "object" &&
        paymentData.metadata &&
        "organization_id" in paymentData.metadata &&
        typeof paymentData.metadata.organization_id === "string"
          ? paymentData.metadata.organization_id
          : null;
      const amount =
        typeof paymentData.transaction_amount === "number"
          ? paymentData.transaction_amount
          : 0;
      const currency =
        typeof paymentData.currency_id === "string"
          ? paymentData.currency_id
          : "CLP";
      // We store gateway_payment_intent_id = preference_id (from createPaymentIntent).
      // MP payment response often has order.id = merchant_order id but no top-level preference_id.
      let preferenceId =
        (paymentData as { preference_id?: string }).preference_id ?? null;
      if (
        !preferenceId &&
        (paymentData.order as { id?: string } | undefined)?.id
      ) {
        const merchantOrderId = String(
          (paymentData.order as { id?: string }).id,
        );
        const orderInfo = await getMerchantOrder(merchantOrderId);
        preferenceId = orderInfo?.preference_id ?? null;
      }
      if (!preferenceId) {
        preferenceId =
          (paymentData.order as { id?: string } | undefined)?.id ?? null;
      }

      logger.info("Mercado Pago Payment Webhook received", {
        paymentId: id,
        status: paymentData.status,
        organizationId,
        preferenceId,
      });

      return {
        gateway: "mercadopago",
        gatewayEventId: `${topic}-${id}`,
        type: topic ?? "payment",
        status: mapStatus(
          typeof paymentData.status === "string"
            ? paymentData.status
            : "pending",
        ),
        gatewayTransactionId: String(
          typeof paymentData.id === "number" ||
            typeof paymentData.id === "string"
            ? paymentData.id
            : id,
        ),
        gatewayPaymentIntentId: preferenceId ?? String(id),
        amount,
        currency:
          typeof currency === "string" ? currency.toUpperCase() : "CLP",
        orderId: typeof orderId === "string" ? orderId : null,
        organizationId,
        metadata: paymentData as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        "Error fetching Mercado Pago payment info for webhook",
        error instanceof Error ? error : new Error(errorMessage),
        { id },
      );
      throw new Error(`Mercado Pago Webhook Error: ${errorMessage}`);
    }
  }

  logger.warn(
    "Mercado Pago Webhook received with unhandled topic or missing ID",
    { topic, id },
  );
  throw new Error("Mercado Pago Webhook: Unhandled topic or missing ID");
}

/**
 * Fetches a merchant order by ID (for merchant_order webhook processing).
 * Used to get preference_id and payment statuses without relying on payment-topic webhook.
 */
export async function getMerchantOrder(
  merchantOrderId: string,
): Promise<MerchantOrderInfo | null> {
  try {
    const { merchantOrder } = getMPClient();
    const result = await merchantOrder.get({
      merchantOrderId,
    });
    const body =
      (
        result as {
          body?: {
            preference_id?: string;
            payments?: Array<{ id?: number; status?: string }>;
          };
        }
      ).body ??
      (result as {
        preference_id?: string;
        payments?: Array<{ id?: number; status?: string }>;
      });
    const preference_id =
      typeof body.preference_id === "string" ? body.preference_id : null;
    const payments = Array.isArray(body.payments) ? body.payments : [];
    logger.info("Mercado Pago Merchant Order fetched", {
      merchantOrderId,
      preference_id,
      paymentCount: payments.length,
    });
    return { preference_id, payments };
  } catch (error) {
    logger.error(
      "Error fetching Mercado Pago merchant order",
      error instanceof Error ? error : new Error(String(error)),
      { merchantOrderId },
    );
    return null;
  }
}

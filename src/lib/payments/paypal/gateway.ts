/**
 * PayPal payment gateway implementation (IPaymentGateway).
 *
 * @module lib/payments/paypal/gateway
 */

import type { NextRequest } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { PaymentStatus, WebhookEvent } from "@/types/payment";

import type { IPaymentGateway, PaymentIntentResponse } from "../interfaces";

function getPayPalBaseUrl(): string {
  const base = process.env.PAYPAL_API_BASE_URL;
  if (!base) {
    throw new Error(
      "PAYPAL_API_BASE_URL is not set. Use https://api-m.sandbox.paypal.com for sandbox or https://api-m.paypal.com for production.",
    );
  }
  return base;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set for PayPal.",
    );
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    logger.error("Failed to get PayPal Access Token", undefined, {
      error: data,
    });
    throw new Error(
      `PayPal Auth Error: ${data.error_description ?? response.statusText}`,
    );
  }

  return data.access_token;
}

export class PayPalGateway implements IPaymentGateway {
  async createPaymentIntent(
    orderId: string | null,
    amount: number,
    currency: string,
    _userId: string,
    organizationId: string,
  ): Promise<PaymentIntentResponse> {
    try {
      const accessToken = await getPayPalAccessToken();
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const apiBase = getPayPalBaseUrl();

      const response = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: orderId ?? "",
              amount: {
                currency_code: currency.toUpperCase(),
                value: amount.toFixed(2),
              },
              custom_id: organizationId,
            },
          ],
          application_context: {
            return_url: `${baseUrl}/checkout/result?success=1&orderId=${orderId ?? ""}`,
            cancel_url: `${baseUrl}/checkout/result?success=0&orderId=${orderId ?? ""}`,
            user_action: "PAY_NOW",
          },
        }),
      });

      const orderData = (await response.json()) as {
        id?: string;
        links?: Array<{ rel: string; href: string }>;
        message?: string;
        status?: string;
      };

      if (!response.ok || !orderData.id) {
        logger.error("Error creating PayPal Order", undefined, {
          orderId,
          error: orderData,
        });
        throw new Error(
          `PayPal Order Creation Error: ${orderData.message ?? response.statusText}`,
        );
      }

      const approveLink = orderData.links?.find(
        (link) => link.rel === "approve",
      );
      if (!approveLink) {
        throw new Error("PayPal approval link not found.");
      }

      logger.info("PayPal Order created", {
        orderId: orderData.id,
        amount,
        organizationId,
      });

      return {
        approvalUrl: approveLink.href,
        gatewayPaymentIntentId: orderData.id,
        status: this.mapStatus(orderData.status ?? "CREATED"),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        "Error creating PayPal Order",
        error instanceof Error ? error : new Error(errorMessage),
        { orderId, amount, organizationId },
      );
      throw new Error(`PayPal error: ${errorMessage}`);
    }
  }

  async processWebhookEvent(request: NextRequest): Promise<WebhookEvent> {
    // PayPal webhook signature verification should be added for production
    // (PAYPAL_WEBHOOK_ID and certificate validation). See PayPal docs.
    const event = (await request.json()) as {
      id?: string;
      event_type?: string;
      resource?: {
        id?: string;
        status?: string;
        purchase_units?: Array<{
          reference_id?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
        amount?: { value?: string; currency_code?: string };
      };
    };

    logger.info("PayPal Webhook received", {
      eventType: event.event_type,
      eventId: event.id,
    });

    if (
      event.resource &&
      event.resource.id &&
      (event.event_type === "CHECKOUT.ORDER.COMPLETED" ||
        event.event_type === "PAYMENT.CAPTURE.COMPLETED")
    ) {
      const orderId =
        event.resource.purchase_units?.[0]?.reference_id ??
        event.resource.id ??
        null;
      const amount = parseFloat(
        event.resource.purchase_units?.[0]?.amount?.value ??
          event.resource.amount?.value ??
          "0",
      );
      const currency =
        event.resource.purchase_units?.[0]?.amount?.currency_code ??
        event.resource.amount?.currency_code ??
        "USD";
      const customId = event.resource.purchase_units?.[0]?.reference_id ?? null;

      return {
        gateway: "paypal",
        gatewayEventId: event.id ?? "",
        type: event.event_type ?? "",
        status: this.mapStatus(event.resource.status ?? "COMPLETED"),
        gatewayTransactionId: event.resource.id ?? null,
        gatewayPaymentIntentId: event.resource.id ?? null,
        amount,
        currency: currency.toUpperCase(),
        orderId,
        organizationId: customId,
        metadata: event as unknown as Record<string, unknown>,
      };
    }

    logger.warn(
      "PayPal Webhook received with unhandled event type or missing data",
      { eventType: event.event_type, eventId: event.id },
    );
    throw new Error("PayPal Webhook: Unhandled event type or missing data");
  }

  mapStatus(paypalStatus: string): PaymentStatus {
    switch (paypalStatus) {
      case "CREATED":
      case "SAVED":
      case "APPROVED":
      case "VOIDED":
        return "pending";
      case "COMPLETED":
      case "CAPTURED":
        return "succeeded";
      case "DECLINED":
      case "FAILED":
        return "failed";
      case "REFUNDED":
        return "refunded";
      default:
        logger.warn("Unknown PayPal status mapped to pending", {
          paypalStatus,
        });
        return "pending";
    }
  }
}

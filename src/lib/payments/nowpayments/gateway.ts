/**
 * NOWPayments cryptocurrency payment gateway implementation (IPaymentGateway).
 *
 * @module lib/payments/nowpayments/gateway
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { PaymentStatus, WebhookEvent } from "@/types/payment";

import type { IPaymentGateway, PaymentIntentResponse } from "../interfaces";

/**
 * Get the NOWPayments API base URL based on sandbox mode
 */
function getNowPaymentsBaseUrl(): string {
  const isSandbox = process.env.NOWPAYMENTS_SANDBOX_MODE === "true";
  logger.debug("NOWPayments Gateway Mode", { isSandbox });
  return isSandbox
    ? "https://api-sandbox.nowpayments.io/v1"
    : "https://api.nowpayments.io/v1";
}

/**
 * Get the appropriate API key based on sandbox mode
 */
function getNowPaymentsApiKey(): string {
  const isSandbox = process.env.NOWPAYMENTS_SANDBOX_MODE === "true";
  const apiKeyRaw = isSandbox
    ? process.env.NOWPAYMENTS_SANDBOX_API_KEY
    : process.env.NOWPAYMENTS_API_KEY;

  const apiKey = apiKeyRaw?.trim();

  if (!apiKey) {
    throw new Error(
      `NOWPAYMENTS_${isSandbox ? "SANDBOX_" : ""}API_KEY is not set or is empty.`,
    );
  }

  return apiKey;
}

/**
 * Verify IPN signature from NOWPayments webhook
 */
function verifyIpnSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha512", secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest("hex");
  return calculatedSignature === signature;
}

export class NowPaymentsGateway implements IPaymentGateway {
  /**
   * Creates a payment invoice on NOWPayments and returns the invoice URL
   */
  async createPaymentIntent(
    orderId: string | null,
    amount: number,
    currency: string,
    userId: string,
    organizationId: string,
  ): Promise<PaymentIntentResponse> {
    try {
      const apiKey = getNowPaymentsApiKey();
      const baseUrl = getNowPaymentsBaseUrl();
      const appBaseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

      // Create an invoice for better UX (hosted payment page)
      const response = await fetch(`${baseUrl}/invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          price_amount: amount,
          price_currency: currency.toUpperCase(),
          order_id: orderId ?? `ORG-${organizationId}-${Date.now()}`,
          order_description: "Opttius Pro Subscription",
          ipn_callback_url: `${appBaseUrl}/api/webhooks/nowpayments`,
          success_url: `${appBaseUrl}/checkout/result?success=1&orderId=${orderId ?? ""}`,
          cancel_url: `${appBaseUrl}/checkout/result?success=0&orderId=${orderId ?? ""}`,
          // Optional: specify preferred currency (e.g., btc, eth, usdt)
          // pay_currency: "btc",
        }),
      });

      const data = (await response.json()) as {
        id?: string;
        invoice_url?: string;
        order_id?: string;
        payment_status?: string;
        message?: string;
      };

      if (!response.ok || !data.id) {
        logger.error("Error creating NOWPayments invoice", undefined, {
          orderId,
          status: response.status,
          statusText: response.statusText,
          errorData: data,
        });
        throw new Error(
          `NOWPayments Invoice Creation Error (${response.status}): ${data.message ?? response.statusText}`,
        );
      }

      logger.info("NOWPayments invoice created", {
        invoiceId: data.id,
        amount,
        currency,
        organizationId,
      });

      return {
        invoiceUrl: data.invoice_url,
        gatewayPaymentIntentId: data.id,
        paymentId: data.id,
        status: this.mapStatus(data.payment_status ?? "waiting"),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        "Error creating NOWPayments invoice",
        error instanceof Error ? error : new Error(errorMessage),
        { orderId, amount, organizationId },
      );
      throw new Error(`NOWPayments error: ${errorMessage}`);
    }
  }

  /**
   * Process IPN (Instant Payment Notification) webhook from NOWPayments
   */
  async processWebhookEvent(request: NextRequest): Promise<WebhookEvent> {
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!ipnSecret) {
      throw new Error("NOWPAYMENTS_IPN_SECRET is not configured.");
    }

    // Get the raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-nowpayments-sig");

    // Verify signature
    if (signature && !verifyIpnSignature(rawBody, signature, ipnSecret)) {
      logger.error("NOWPayments IPN signature verification failed", undefined, {
        signature,
      });
      throw new Error("Invalid IPN signature");
    }

    const event = JSON.parse(rawBody) as {
      payment_id?: string | number;
      invoice_id?: string | number;
      payment_status?: string;
      pay_address?: string;
      price_amount?: number;
      price_currency?: string;
      pay_amount?: number;
      pay_currency?: string;
      order_id?: string;
      order_description?: string;
      actually_paid?: number;
      outcome_amount?: number;
    };

    logger.info("NOWPayments IPN received", {
      paymentId: event.payment_id,
      invoiceId: event.invoice_id,
      status: event.payment_status,
    });

    // Extract data from the IPN
    const paymentId = String(event.payment_id ?? event.invoice_id ?? "");
    const status = event.payment_status ?? "waiting";
    const orderId = event.order_id ?? null;
    const amount = event.price_amount ?? 0;
    const currency = event.price_currency ?? "USD";

    return {
      gateway: "nowpayments",
      gatewayEventId: paymentId,
      type: `payment.${status}`,
      status: this.mapStatus(status),
      gatewayTransactionId: paymentId,
      gatewayPaymentIntentId: String(event.invoice_id ?? paymentId),
      amount,
      currency: currency.toUpperCase(),
      orderId,
      organizationId: null, // Will be resolved from the payment record
      metadata: {
        pay_currency: event.pay_currency,
        pay_amount: event.pay_amount,
        pay_address: event.pay_address,
        actually_paid: event.actually_paid,
        outcome_amount: event.outcome_amount,
      },
    };
  }

  /**
   * Map NOWPayments status to application PaymentStatus
   */
  mapStatus(nowpaymentsStatus: string): PaymentStatus {
    switch (nowpaymentsStatus.toLowerCase()) {
      case "waiting":
      case "confirming":
      case "sending":
        return "pending";
      case "finished":
      case "confirmed":
        return "succeeded";
      case "failed":
      case "expired":
      case "refunded":
        return "failed";
      case "partially_paid":
        // Treat partially paid as pending until full payment
        logger.warn("NOWPayments payment is partially paid", {
          nowpaymentsStatus,
        });
        return "pending";
      default:
        logger.warn("Unknown NOWPayments status mapped to pending", {
          nowpaymentsStatus,
        });
        return "pending";
    }
  }
}

/**
 * Mercado Pago Gateway — Create Payment Intent (Preference).
 *
 * @module lib/payments/mercadopago/gateway/create-payment
 */

import { appLogger as logger } from "@/lib/logger";

import type { PaymentIntentResponse } from "../../interfaces";
import { getMPClient, getReadableErrorMessage } from "./helpers";

export async function createPaymentIntent(
  orderId: string | null,
  amount: number,
  currency: string,
  userId: string,
  organizationId: string,
): Promise<PaymentIntentResponse> {
  const { preference } = getMPClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const successUrl = `${baseUrl.replace(/\/$/, "")}/checkout/result?success=1&orderId=${orderId ?? ""}`;
  const failureUrl = `${baseUrl.replace(/\/$/, "")}/checkout/result?success=0&orderId=${orderId ?? ""}`;
  const pendingUrl = `${baseUrl.replace(/\/$/, "")}/checkout/result?success=pending&orderId=${orderId ?? ""}`;
  // MP requires back_urls.success to be defined and valid when auto_return is set; use HTTPS (e.g. ngrok) in dev
  const useAutoReturn = successUrl.startsWith("https://");

  try {
    // Mercado Pago requires unit_price as integer (whole units; CLP has no decimals)
    const unitPriceInteger = Math.round(Number(amount));
    const result = await preference.create({
      body: {
        items: [
          {
            id: orderId || `direct-payment-${Date.now()}`,
            title: `Order ${orderId || "Direct Payment"}`,
            quantity: 1,
            unit_price: unitPriceInteger,
            currency_id: currency.toUpperCase(),
          },
        ],
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        ...(useAutoReturn ? { auto_return: "approved" as const } : {}),
        external_reference: orderId ?? "",
        notification_url: `${baseUrl.replace(/\/$/, "")}/api/webhooks/mercadopago`,
        metadata: {
          user_id: userId,
          organization_id: organizationId,
          order_id: orderId ?? "",
          integration_version: "1.0",
          environment: process.env.NODE_ENV ?? "development",
        },
        statement_descriptor: "OPTTIUS",
      },
    });

    const body =
      (
        result as {
          body?: {
            id?: string;
            init_point?: string;
            sandbox_init_point?: string;
          };
        }
      ).body ??
      (result as {
        id?: string;
        init_point?: string;
        sandbox_init_point?: string;
      });
    const preferenceId = body.id ?? (result as { id?: string }).id;
    const initPoint =
      body.init_point ??
      body.sandbox_init_point ??
      (result as { init_point?: string; sandbox_init_point?: string })
        .init_point ??
      (result as { init_point?: string; sandbox_init_point?: string })
        .sandbox_init_point;

    if (!preferenceId || !initPoint) {
      throw new Error(
        "Mercado Pago preference creation failed or missing id/init_point.",
      );
    }

    logger.info("Mercado Pago Preference created", {
      preferenceId,
      orderId,
      amount,
    });

    return {
      preferenceId,
      approvalUrl: initPoint,
      gatewayPaymentIntentId: preferenceId,
      status: "pending",
    };
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    logger.error(
      "Error creating Mercado Pago Preference",
      error instanceof Error ? error : new Error(errorMessage),
      { orderId, amount },
    );
    throw new Error(`Mercado Pago error: ${errorMessage}`);
  }
}

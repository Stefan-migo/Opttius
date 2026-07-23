/**
 * Mercado Pago Gateway — Token-based payment (Bricks / Checkout API).
 *
 * @module lib/payments/mercadopago/gateway/token-payment
 */

import { appLogger as logger } from "@/lib/logger";
import type { PaymentStatus } from "@/types/payment";

import { getMPClient, getReadableErrorMessage, mapStatus } from "./helpers";

export async function createPaymentWithToken(
  token: string,
  amount: number,
  currency: string,
  userId: string,
  organizationId: string,
  payerEmail: string,
  paymentMethodId: string,
  issuerId?: string,
  description?: string,
  metadata?: Record<string, unknown>,
): Promise<{
  id: string;
  status: PaymentStatus;
  transaction_amount: number;
  currency_id: string;
}> {
  const { payment } = getMPClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  if (!paymentMethodId || paymentMethodId.trim() === "") {
    throw new Error("Invalid payment_method_id");
  }

  try {
    // Mercado Pago requires transaction_amount as integer (whole units; CLP has no decimals)
    const amountInteger = Math.round(Number(amount));
    const result = await payment.create({
      body: {
        transaction_amount: amountInteger,
        token: token,
        description: description || `Suscripción Opttius - ${organizationId}`,
        installments: 1,
        payment_method_id: paymentMethodId,
        ...(issuerId ? { issuer_id: Number(issuerId) } : {}),
        payer: {
          email: payerEmail,
        },
        metadata: {
          user_id: userId,
          organization_id: organizationId,
          integration_version: "1.0",
          environment: process.env.NODE_ENV ?? "development",
          ...metadata,
        },
        notification_url: `${baseUrl.replace(/\/$/, "")}/api/webhooks/mercadopago`,
        statement_descriptor: "OPTTIUS",
      },
    });

    const body =
      (result as { body?: Record<string, unknown> }).body ??
      (result as unknown as Record<string, unknown>);

    const paymentId = String(body.id ?? "");
    const mpStatus = String(body.status ?? "pending");
    const status = mapStatus(mpStatus);
    const transaction_amount = Number(body.transaction_amount ?? amount);
    const currency_id = String(body.currency_id ?? currency).toUpperCase();

    logger.info("Mercado Pago Payment created with token", {
      paymentId,
      status,
      mpStatus,
      amount: transaction_amount,
      organizationId,
    });

    return {
      id: paymentId,
      status,
      transaction_amount,
      currency_id,
    };
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    logger.error(
      "Error creating Mercado Pago Payment with token",
      error instanceof Error ? error : new Error(errorMessage),
      { amount, organizationId },
    );
    throw new Error(`Mercado Pago payment error: ${errorMessage}`);
  }
}

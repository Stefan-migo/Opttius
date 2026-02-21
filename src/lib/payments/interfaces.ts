/**
 * Payment gateway abstraction for Flow, Mercado Pago, PayPal.
 *
 * @module lib/payments/interfaces
 */

import type { NextRequest } from "next/server";
import type { PaymentStatus, WebhookEvent } from "@/types/payment";

export type PaymentIntentResponse = {
  clientSecret?: string;
  preferenceId?: string;
  approvalUrl?: string;
  invoiceUrl?: string;
  paymentId?: string;
  gatewayPaymentIntentId?: string;
  status: PaymentStatus;
};

/** Result of createPaymentWithToken (Bricks/embedded card flow) */
export type CreatePaymentWithTokenResult = {
  id: string;
  status: PaymentStatus;
  transaction_amount: number;
  currency_id: string;
};

export interface IPaymentGateway {
  /**
   * Creates a payment intent and returns data for the frontend (client_secret, preferenceId, approval_url).
   */
  createPaymentIntent(
    orderId: string | null,
    amount: number,
    currency: string,
    userId: string,
    organizationId: string,
  ): Promise<PaymentIntentResponse>;

  /**
   * Processes a webhook event from the gateway (validates signature, returns standardized event).
   */
  processWebhookEvent(request: NextRequest): Promise<WebhookEvent>;

  /**
   * Maps gateway status to application PaymentStatus.
   */
  mapStatus(gatewayStatus: string): PaymentStatus;

  /**
   * Optional: Creates payment with token (Bricks/embedded card flow).
   * Only MercadoPago implements this; Flow, PayPal, NOWPayments use redirect-only.
   */
  createPaymentWithToken?(
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
  ): Promise<CreatePaymentWithTokenResult>;
}

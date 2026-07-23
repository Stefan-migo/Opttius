/**
 * Mercado Pago payment gateway implementation (IPaymentGateway).
 *
 * Façade that delegates to sub-modules in ./gateway/.
 *
 * @module lib/payments/mercadopago/gateway
 */

import type { NextRequest } from "next/server";

import type { PaymentStatus, WebhookEvent } from "@/types/payment";

import type { IPaymentGateway, PaymentIntentResponse } from "../interfaces";
import { createPaymentIntent } from "./gateway/create-payment";
import {
  addCardToCustomer,
  createCustomer,
  createCustomerAndAddCard,
  findCustomerByEmail,
} from "./gateway/customer";
import type { MerchantOrderInfo } from "./gateway/helpers";
import { mapStatus } from "./gateway/helpers";
import {
  createPreApproval,
  createPreApprovalPlan,
  getPreApproval,
} from "./gateway/preapproval";
import { createPaymentWithToken } from "./gateway/token-payment";
import { getMerchantOrder,processWebhookEvent } from "./gateway/webhook-handler";

export type { MerchantOrderInfo };

export class MercadoPagoGateway implements IPaymentGateway {
  createPaymentIntent(
    orderId: string | null,
    amount: number,
    currency: string,
    userId: string,
    organizationId: string,
  ): Promise<PaymentIntentResponse> {
    return createPaymentIntent(orderId, amount, currency, userId, organizationId);
  }

  processWebhookEvent(request: NextRequest): Promise<WebhookEvent> {
    return processWebhookEvent(request);
  }

  getMerchantOrder(merchantOrderId: string): Promise<MerchantOrderInfo | null> {
    return getMerchantOrder(merchantOrderId);
  }

  createPaymentWithToken(
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
    return createPaymentWithToken(
      token,
      amount,
      currency,
      userId,
      organizationId,
      payerEmail,
      paymentMethodId,
      issuerId,
      description,
      metadata,
    );
  }

  createCustomer(email: string): Promise<string> {
    return createCustomer(email);
  }

  findCustomerByEmail(email: string): Promise<string | null> {
    return findCustomerByEmail(email);
  }

  addCardToCustomer(customerId: string, token: string): Promise<string> {
    return addCardToCustomer(customerId, token);
  }

  createCustomerAndAddCard(
    email: string,
    token: string,
  ): Promise<{ customerId: string; cardId: string }> {
    return createCustomerAndAddCard(email, token);
  }

  createPreApprovalPlan(
    reason: string,
    amount: number,
    currency: string,
    backUrl: string,
  ): Promise<{ id: string; init_point?: string }> {
    return createPreApprovalPlan(reason, amount, currency, backUrl);
  }

  createPreApproval(
    preapprovalPlanId: string,
    payerEmail: string,
    cardTokenId: string,
    reason: string,
    externalReference: string,
    backUrl: string,
  ): Promise<{
    id: string;
    status: string;
    init_point?: string;
  }> {
    return createPreApproval(
      preapprovalPlanId,
      payerEmail,
      cardTokenId,
      reason,
      externalReference,
      backUrl,
    );
  }

  getPreApproval(preapprovalId: string): Promise<{
    id: string;
    status: string;
    external_reference?: string | null;
    payer_email?: string;
    reason?: string;
  } | null> {
    return getPreApproval(preapprovalId);
  }

  mapStatus(mpStatus: string): PaymentStatus {
    return mapStatus(mpStatus);
  }
}

/**
 * Mercado Pago payment gateway implementation (IPaymentGateway).
 *
 * @module lib/payments/mercadopago/gateway
 */

import {
  MercadoPagoConfig,
  Preference,
  Payment,
  MerchantOrder,
  Customer,
  PreApprovalPlan,
  PreApproval,
} from "mercadopago";
import type { NextRequest } from "next/server";
import type { IPaymentGateway, PaymentIntentResponse } from "../interfaces";
import type { PaymentStatus, WebhookEvent } from "@/types/payment";
import { appLogger as logger } from "@/lib/logger";

/** Result of fetching a merchant order for webhook processing. */
export interface MerchantOrderInfo {
  preference_id: string | null;
  payments: Array<{ id?: number; status?: string }>;
}

/** Extracts a readable message from SDK errors (Error, { message }, or unknown). */
function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error)
    return String((error as { message: unknown }).message);
  return String(error);
}

function getMPClient(): {
  preference: Preference;
  payment: Payment;
  merchantOrder: MerchantOrder;
  customer: Customer;
  preApprovalPlan: PreApprovalPlan;
  preApproval: PreApproval;
} {
  const sandboxMode = process.env.MERCADOPAGO_SANDBOX_MODE === "true";
  const accessToken = sandboxMode
    ? process.env.MP_ACCESS_TOKEN_SANDBOX ||
      process.env.MERCADOPAGO_ACCESS_TOKEN_SANDBOX ||
      process.env.MP_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN
    : process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      sandboxMode
        ? "Mercado Pago sandbox requires one of: MP_ACCESS_TOKEN_SANDBOX, MERCADOPAGO_ACCESS_TOKEN_SANDBOX, MP_ACCESS_TOKEN, or MERCADOPAGO_ACCESS_TOKEN in .env.local"
        : "Mercado Pago requires MP_ACCESS_TOKEN or MERCADOPAGO_ACCESS_TOKEN in .env.local",
    );
  }
  const config = new MercadoPagoConfig({ accessToken });
  return {
    preference: new Preference(config),
    payment: new Payment(config),
    merchantOrder: new MerchantOrder(config),
    customer: new Customer(config),
    preApprovalPlan: new PreApprovalPlan(config),
    preApproval: new PreApproval(config),
  };
}

export class MercadoPagoGateway implements IPaymentGateway {
  async createPaymentIntent(
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

  async processWebhookEvent(request: NextRequest): Promise<WebhookEvent> {
    const query = request.nextUrl.searchParams;
    const topic = query.get("topic");
    const id = query.get("id");

    if (topic === "payment" && id) {
      const { payment, merchantOrder } = getMPClient();
      try {
        const paymentInfo = await payment.get({ id });
        const paymentData =
          (paymentInfo as { body?: Record<string, unknown> }).body ??
          (paymentInfo as {
            id?: number;
            status?: string;
            external_reference?: string;
            transaction_amount?: number;
            currency_id?: string;
            order?: { id?: string };
            preference_id?: string;
            metadata?: { user_id?: string; organization_id?: string };
          });

        const orderId = typeof paymentData.external_reference === 'string' ? paymentData.external_reference : null;
        const organizationId =
          typeof paymentData.metadata === 'object' && paymentData.metadata && 'organization_id' in paymentData.metadata && typeof (paymentData.metadata as any).organization_id === 'string'
            ? (paymentData.metadata as any).organization_id 
            : null;
        const amount = typeof paymentData.transaction_amount === 'number' ? paymentData.transaction_amount : 0;
        const currency = typeof paymentData.currency_id === 'string' ? paymentData.currency_id : "CLP";
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
          const orderInfo = await this.getMerchantOrder(merchantOrderId);
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
          status: this.mapStatus(typeof paymentData.status === 'string' ? paymentData.status : "pending"),
          gatewayTransactionId: String(typeof paymentData.id === 'number' || typeof paymentData.id === 'string' ? paymentData.id : id),
          gatewayPaymentIntentId: preferenceId ?? String(id),
          amount,
          currency: typeof currency === 'string' ? currency.toUpperCase() : "CLP",
          orderId: typeof orderId === 'string' ? orderId : null,
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
  async getMerchantOrder(
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

  /**
   * Creates a payment directly using MercadoPago Payments API (for Bricks/Checkout API)
   * @param token - Card token from Bricks
   * @param amount - Payment amount
   * @param currency - Currency code
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param payerEmail - Payer email
   * @param paymentMethodId - Payment method ID from Brick (e.g. "visa", "master", "amex")
   * @param issuerId - Issuer ID from Brick (optional)
   * @param description - Payment description
   * @param metadata - Additional metadata
   */
  async createPaymentWithToken(
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
      const status = this.mapStatus(mpStatus);
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

  /**
   * Creates a customer in Mercado Pago (for saved cards / recurring).
   * @param email - Payer email
   * @returns MP customer id
   */
  async createCustomer(email: string): Promise<string> {
    const { customer } = getMPClient();
    try {
      const result = await customer.create({
        body: { email },
      });
      const body =
        (result as { body?: { id?: string } }).body ??
        (result as { id?: string });
      const id = body.id ?? (result as { id?: string }).id;
      if (!id) {
        throw new Error("Mercado Pago customer creation returned no id");
      }
      logger.info("Mercado Pago Customer created", { customerId: id, email });
      return String(id);
    } catch (error) {
      const errorMessage = getReadableErrorMessage(error);
      logger.error(
        "Error creating Mercado Pago Customer",
        error instanceof Error ? error : new Error(errorMessage),
        { email },
      );
      throw new Error(`Mercado Pago customer error: ${errorMessage}`);
    }
  }

  /**
   * Finds a customer by email (MP search).
   * @param email - Payer email
   * @returns MP customer id or null
   */
  async findCustomerByEmail(email: string): Promise<string | null> {
    const { customer } = getMPClient();
    try {
      const result = await customer.search({ options: { email } });
      const results =
        (result as { results?: Array<{ id?: string }> }).results ?? [];
      const first = results[0];
      return first?.id ? String(first.id) : null;
    } catch (error) {
      logger.warn(
        "Mercado Pago customer search failed",
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        }
      );
      return null;
    }
  }

  /**
   * Adds a card to a Mercado Pago customer (token from Bricks).
   * @param customerId - MP customer id
   * @param token - Card token from Bricks
   * @returns MP card id
   */
  async addCardToCustomer(customerId: string, token: string): Promise<string> {
    const { customer } = getMPClient();
    try {
      const result = await customer.createCard({
        customerId,
        body: { token },
      });
      const body =
        (result as { body?: { id?: string } }).body ??
        (result as { id?: string });
      const id = body.id ?? (result as { id?: string }).id;
      if (!id) {
        throw new Error("Mercado Pago card creation returned no id");
      }
      logger.info("Mercado Pago Card added to customer", {
        customerId,
        cardId: id,
      });
      return String(id);
    } catch (error) {
      const errorMessage = getReadableErrorMessage(error);
      logger.error(
        "Error adding card to Mercado Pago Customer",
        error instanceof Error ? error : new Error(errorMessage),
        { customerId },
      );
      throw new Error(`Mercado Pago card error: ${errorMessage}`);
    }
  }

  /**
   * Creates or gets MP customer and adds card (save payment method).
   * @param email - Payer email
   * @param token - Card token from Bricks
   * @returns { customerId, cardId }
   */
  async createCustomerAndAddCard(
    email: string,
    token: string,
  ): Promise<{ customerId: string; cardId: string }> {
    let customerId = await this.findCustomerByEmail(email);
    if (!customerId) {
      customerId = await this.createCustomer(email);
    }
    const cardId = await this.addCardToCustomer(customerId, token);
    return { customerId, cardId };
  }

  /**
   * Creates a Preapproval Plan (recurring plan) in Mercado Pago.
   * @param reason - Plan description
   * @param amount - Monthly amount
   * @param currency - Currency code (e.g. CLP)
   * @param backUrl - Return URL after checkout
   */
  async createPreApprovalPlan(
    reason: string,
    amount: number,
    currency: string,
    backUrl: string,
  ): Promise<{ id: string; init_point?: string }> {
    const { preApprovalPlan } = getMPClient();
    try {
      const amountInteger = Math.round(Number(amount));
      const result = await preApprovalPlan.create({
        body: {
          reason,
          back_url: backUrl,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: amountInteger,
            currency_id: currency.toUpperCase(),
            billing_day: 10,
            billing_day_proportional: false,
          },
          payment_methods_allowed: {
            payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
          },
        },
      });
      const body =
        (result as { body?: { id?: string; init_point?: string } }).body ??
        (result as { id?: string; init_point?: string });
      const id = body.id ?? (result as { id?: string }).id;
      if (!id) {
        throw new Error(
          "Mercado Pago preapproval plan creation returned no id",
        );
      }
      logger.info("Mercado Pago PreApproval Plan created", {
        planId: id,
        reason,
        amount,
      });
      return {
        id: String(id),
        init_point:
          body.init_point ?? (result as { init_point?: string }).init_point,
      };
    } catch (error) {
      const errorMessage = getReadableErrorMessage(error);
      logger.error(
        "Error creating Mercado Pago PreApproval Plan",
        error instanceof Error ? error : new Error(errorMessage),
        { reason, amount },
      );
      throw new Error(`Mercado Pago preapproval plan error: ${errorMessage}`);
    }
  }

  /**
   * Creates a Preapproval (subscription) linked to a plan and payer.
   * @param preapprovalPlanId - MP plan id
   * @param payerEmail - Payer email
   * @param cardTokenId - Card token from Bricks
   * @param reason - Description
   * @param externalReference - Our organization_id or subscription id
   * @param backUrl - Return URL
   */
  async createPreApproval(
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
    const { preApproval } = getMPClient();
    try {
      const result = await preApproval.create({
        body: {
          preapproval_plan_id: preapprovalPlanId,
          payer_email: payerEmail,
          card_token_id: cardTokenId,
          reason,
          external_reference: externalReference,
          back_url: backUrl,
        },
      });
      const body =
        (
          result as {
            body?: { id?: string; status?: string; init_point?: string };
          }
        ).body ??
        (result as { id?: string; status?: string; init_point?: string });
      const id = body.id ?? (result as { id?: string }).id;
      const status =
        body.status ?? (result as { status?: string }).status ?? "pending";
      if (!id) {
        throw new Error("Mercado Pago preapproval creation returned no id");
      }
      logger.info("Mercado Pago PreApproval (subscription) created", {
        preapprovalId: id,
        status,
        externalReference,
      });
      return {
        id: String(id),
        status: String(status),
        init_point:
          body.init_point ?? (result as { init_point?: string }).init_point,
      };
    } catch (error) {
      const errorMessage = getReadableErrorMessage(error);
      logger.error(
        "Error creating Mercado Pago PreApproval",
        error instanceof Error ? error : new Error(errorMessage),
        { preapprovalPlanId, externalReference },
      );
      throw new Error(`Mercado Pago preapproval error: ${errorMessage}`);
    }
  }

  /**
   * Fetches a PreApproval (subscription) by id (for webhook sync).
   */
  async getPreApproval(preapprovalId: string): Promise<{
    id: string;
    status: string;
    external_reference?: string | null;
    payer_email?: string;
    reason?: string;
  } | null> {
    const { preApproval } = getMPClient();
    try {
      const result = await preApproval.get({ id: preapprovalId });
      const body =
        (result as { body?: Record<string, unknown> }).body ??
        (result as unknown as Record<string, unknown>);
      return {
        id: String(body.id ?? preapprovalId),
        status: String(body.status ?? "pending"),
        external_reference:
          (body.external_reference as string | null) ?? undefined,
        payer_email: body.payer_email as string | undefined,
        reason: body.reason as string | undefined,
      };
    } catch (error) {
      logger.error(
        "Error fetching Mercado Pago PreApproval",
        error instanceof Error ? error : new Error(String(error)),
        { preapprovalId },
      );
      return null;
    }
  }

  mapStatus(mpStatus: string): PaymentStatus {
    switch (mpStatus) {
      case "pending":
      case "in_process":
        return "pending";
      case "approved":
        return "succeeded";
      case "rejected":
      case "cancelled":
        return "failed";
      case "refunded":
        return "refunded";
      default:
        logger.warn("Unknown Mercado Pago status mapped to pending", {
          mpStatus,
        });
        return "pending";
    }
  }
}

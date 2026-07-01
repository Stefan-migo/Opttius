/**
 * Flow payment gateway implementation (IPaymentGateway).
 * Flow es una pasarela de pago chilena con soporte completo en Chile.
 *
 * @module lib/payments/flow/gateway
 */

import { createHmac } from "node:crypto";

import type { NextRequest } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { PaymentStatus, WebhookEvent } from "@/types/payment";

import type { IPaymentGateway, PaymentIntentResponse } from "../interfaces";

function getFlowConfig() {
  const sandboxMode = process.env.FLOW_SANDBOX_MODE === "true";
  const apiKey = sandboxMode
    ? process.env.FLOW_API_KEY_SANDBOX || process.env.FLOW_API_KEY
    : process.env.FLOW_API_KEY;
  const secretKey = sandboxMode
    ? process.env.FLOW_SECRET_KEY_SANDBOX || process.env.FLOW_SECRET_KEY
    : process.env.FLOW_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error(
      sandboxMode
        ? "FLOW_API_KEY_SANDBOX and FLOW_SECRET_KEY_SANDBOX (or FLOW_API_KEY/FLOW_SECRET_KEY) must be set for Flow sandbox."
        : "FLOW_API_KEY and FLOW_SECRET_KEY must be set. Configure them in .env.local for Flow payments.",
    );
  }
  return { apiKey, secretKey, sandboxMode };
}

/**
 * Genera la firma HMAC-SHA256 requerida por Flow para crear órdenes.
 */
function generateFlowSignature(
  params: Record<string, string>,
  secretKey: string,
): string {
  const keys = Object.keys(params).sort();
  let toSign = "";
  for (const key of keys) {
    toSign += key + params[key];
  }
  return createHmac("sha256", secretKey).update(toSign).digest("hex");
}

export class FlowGateway implements IPaymentGateway {
  async createPaymentIntent(
    orderId: string | null,
    amount: number,
    currency: string,
    userId: string,
    organizationId: string,
  ): Promise<PaymentIntentResponse> {
    const { apiKey, secretKey, sandboxMode } = getFlowConfig();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const flowApiUrl =
      process.env.FLOW_API_URL ||
      (sandboxMode ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api");

    try {
      // Flow requiere un commerceOrder único (usamos el paymentId que crearemos después, o un UUID temporal)
      const commerceOrder = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const subject = `Pago orden ${orderId || "directo"}`;
      const email = process.env.FLOW_DEFAULT_EMAIL || "test@example.com"; // En producción, obtener del usuario

      const urlConfirmation = `${baseUrl}/api/webhooks/flow`;
      const urlReturn = `${baseUrl}/checkout/result?success=1&orderId=${orderId ?? ""}`;

      const params: Record<string, string> = {
        apiKey,
        commerceOrder,
        subject,
        amount: Math.round(amount).toString(),
        email,
        urlConfirmation,
        urlReturn,
      };

      const signature = generateFlowSignature(params, secretKey);
      params.s = signature;

      const response = await fetch(`${flowApiUrl}/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      });

      const data = (await response.json()) as {
        token?: string;
        url?: string;
        flowOrder?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.token || !data.url) {
        logger.error("Error creating Flow payment order", undefined, {
          orderId,
          error: data,
        });
        throw new Error(
          `Flow error: ${data.message ?? data.error ?? response.statusText}`,
        );
      }

      logger.info("Flow payment order created", {
        flowOrder: data.flowOrder ?? data.token,
        commerceOrder,
        amount,
        organizationId,
      });

      return {
        approvalUrl: data.url,
        gatewayPaymentIntentId: data.flowOrder ?? data.token,
        status: "pending",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        "Error creating Flow payment order",
        error instanceof Error ? error : new Error(errorMessage),
        { orderId, amount, organizationId },
      );
      throw new Error(`Flow error: ${errorMessage}`);
    }
  }

  async processWebhookEvent(request: NextRequest): Promise<WebhookEvent> {
    // Flow envía los datos del callback como parámetros GET o POST
    // Ver: https://developers.flow.cl/docs/api-reference/payment-status
    const formData = await request.formData();
    const token = formData.get("token")?.toString();
    const status = formData.get("status")?.toString();
    const flowOrder = formData.get("flowOrder")?.toString();
    const commerceOrder = formData.get("commerceOrder")?.toString();
    const amount = formData.get("amount")?.toString();

    if (!token || !status) {
      logger.warn("Flow Webhook: missing token or status", {
        token,
        status,
      });
      throw new Error("Flow Webhook: missing required fields");
    }

    // Verificar firma — obligatoria en producción
    const signature = formData.get("s")?.toString();
    if (!signature) {
      if (process.env.NODE_ENV === "production") {
        logger.warn("Flow Webhook: missing signature in production, rejecting");
        throw new Error("Flow Webhook: Missing signature in production");
      }
      logger.warn(
        "Flow Webhook: signature missing, skipping verification in development",
      );
    } else {
      const { secretKey } = getFlowConfig();
      const params: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        if (key !== "s" && typeof value === "string") {
          params[key] = value;
        }
      }
      const expectedSignature = generateFlowSignature(params, secretKey);
      if (signature !== expectedSignature) {
        logger.warn("Flow Webhook signature verification failed", {
          received: signature,
          expected: expectedSignature,
        });
        throw new Error("Flow Webhook: Invalid signature");
      }
    }

    logger.info("Flow Webhook received", {
      token,
      status,
      flowOrder,
      commerceOrder,
    });

    const amountNum = amount ? parseFloat(amount) : 0;

    return {
      gateway: "flow",
      gatewayEventId: token,
      type: "payment_status",
      status: this.mapStatus(status),
      gatewayTransactionId: flowOrder ?? token,
      gatewayPaymentIntentId: flowOrder ?? token,
      amount: amountNum,
      currency: "CLP",
      orderId: commerceOrder ? commerceOrder.replace(/^order_/, "") : null,
      organizationId: null, // Flow no incluye esto directamente, se debe buscar en DB por commerceOrder
      metadata: {
        token,
        flowOrder,
        commerceOrder,
        status,
      },
    };
  }

  mapStatus(flowStatus: string): PaymentStatus {
    switch (flowStatus?.toLowerCase()) {
      case "1":
      case "paid":
      case "pagado":
        return "succeeded";
      case "2":
      case "pending":
      case "pendiente":
        return "pending";
      case "3":
      case "rejected":
      case "rechazado":
      case "failed":
        return "failed";
      case "4":
      case "canceled":
      case "cancelado":
        return "failed";
      default:
        logger.warn("Unknown Flow status mapped to pending", {
          flowStatus,
        });
        return "pending";
    }
  }
}

/**
 * Mercado Pago Gateway — Shared helpers.
 *
 * @module lib/payments/mercadopago/gateway/helpers
 */

import {
  Customer,
  MercadoPagoConfig,
  MerchantOrder,
  Payment,
  PreApproval,
  PreApprovalPlan,
  Preference,
} from "mercadopago";

import { appLogger as logger } from "@/lib/logger";
import type { PaymentStatus } from "@/types/payment";

/** Extracts a readable message from SDK errors (Error, { message }, or unknown). */
export function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error)
    return String((error as { message: unknown }).message);
  return String(error);
}

export function getMPClient(): {
  preference: Preference;
  payment: Payment;
  merchantOrder: MerchantOrder;
  customer: Customer;
  preApprovalPlan: PreApprovalPlan;
  preApproval: PreApproval;
} {
  const sandboxMode = process.env.MERCADOPAGO_SANDBOX_MODE === "true";
  const accessToken = sandboxMode
    ? process.env.MP_ACCESS_TOKEN_SANDBOX || process.env.MP_ACCESS_TOKEN
    : process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      sandboxMode
        ? "Mercado Pago sandbox requires MP_ACCESS_TOKEN_SANDBOX (or MP_ACCESS_TOKEN) in .env.local"
        : "Mercado Pago requires MP_ACCESS_TOKEN (or MERCADOPAGO_ACCESS_TOKEN legacy) in .env.local",
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

export function mapStatus(mpStatus: string): PaymentStatus {
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

/** Result of fetching a merchant order for webhook processing. */
export interface MerchantOrderInfo {
  preference_id: string | null;
  payments: Array<{ id?: number; status?: string }>;
}

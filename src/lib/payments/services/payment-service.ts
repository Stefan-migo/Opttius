/**
 * Business logic for payments and webhook events (DB operations).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";
import type { Payment, PaymentCreationAttributes, PaymentGateway, PaymentStatus, WebhookEvent } from "@/types/payment";

import { fulfillOrder, processSubscriptionUpdate, recordWebhookEventForIdempotency } from "./_helpers/paymentSubHelpers";

export class PaymentService {
  private supabase: SupabaseClient;
  constructor(supabase: SupabaseClient) { this.supabase = supabase; }

  async createPayment(data: PaymentCreationAttributes): Promise<Payment> {
    const { data: payment, error } = await this.supabase.from("payments").insert(data as unknown).select().single();
    if (error) { logger.error("Failed to create payment in DB", error, { data }); throw new Error(`Error creating payment: ${error.message}`); }
    return payment as Payment;
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, gatewayTransactionId?: string | null, metadata?: Record<string, unknown> | null, gatewayPaymentIntentId?: string | null): Promise<Payment> {
    const update: unknown = { status, updated_at: new Date().toISOString() };
    if (gatewayTransactionId != null) update.gateway_transaction_id = gatewayTransactionId;
    if (gatewayPaymentIntentId != null) update.gateway_payment_intent_id = gatewayPaymentIntentId;
    if (metadata != null) update.metadata = metadata;
    const { data: payment, error } = await this.supabase.from("payments").update(update).eq("id", paymentId).select().single();
    if (error) { logger.error("Failed to update payment status in DB", error, { paymentId, status }); throw new Error(`Error updating payment status: ${error.message}`); }
    return payment as Payment;
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase.from("payments").select("*").eq("id", paymentId).single();
    if (error && error.code !== "PGRST116") { logger.error("Error fetching payment by ID", error, { paymentId }); throw new Error(`Error fetching payment: ${error.message}`); }
    return data as Payment | null;
  }

  async getPaymentByGatewayPaymentIntentId(gatewayPaymentIntentId: string): Promise<Payment | null> {
    const { data, error } = await this.supabase.from("payments").select("*").eq("gateway_payment_intent_id", gatewayPaymentIntentId).single();
    if (error && error.code !== "PGRST116") { logger.error("Error fetching payment by gateway intent ID", error, { gatewayPaymentIntentId }); throw new Error(`Error fetching payment: ${error.message}`); }
    return data as Payment | null;
  }

  async updatePaymentFromWebhook(event: WebhookEvent): Promise<void> {
    const paymentIntentId = event.gatewayPaymentIntentId;
    if (!paymentIntentId) { logger.warn("Webhook event missing payment intent ID", { event }); return; }

    const alreadyProcessed = await recordWebhookEventForIdempotency(this.supabase, event.gateway, event.gatewayEventId, event.type, null, event.metadata);
    if (alreadyProcessed) { logger.info("Webhook event already processed", { gateway: event.gateway, eventId: event.gatewayEventId }); return; }

    const payment = await this.getPaymentByGatewayPaymentIntentId(paymentIntentId);
    if (!payment) { logger.warn("No payment found for gateway intent ID", { paymentIntentId }); await this.markWebhookAsProcessed(event.gateway, event.gatewayEventId); return; }

    await this.updatePaymentStatus(payment.id, event.status, event.gatewayTransactionId, event.metadata);

    if (event.status === "succeeded") {
      if (payment.order_id) await fulfillOrder(this.supabase, payment.order_id);
      if (payment.organization_id) await processSubscriptionUpdate(this.supabase, payment.organization_id, { ...payment, status: "succeeded" }, paymentIntentId, event.gatewayTransactionId ?? null);
    }

    await this.markWebhookAsProcessed(event.gateway, event.gatewayEventId);
    logger.info("Payment updated from webhook successfully", { paymentId: payment.id, status: event.status });
  }

  async updateSubscriptionPaymentMethod(organizationId: string, gatewayCustomerId: string, gatewayPaymentMethodId: string): Promise<void> {
    const { data: existing } = await this.supabase.from("subscriptions").select("id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!existing) { logger.warn("No subscription found to update payment method", { organizationId }); return; }
    const { error } = await this.supabase.from("subscriptions").update({ gateway_customer_id: gatewayCustomerId, gateway_payment_method_id: gatewayPaymentMethodId, updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) { logger.error("Failed to update subscription payment method", error, { organizationId }); throw new Error(`Error updating subscription payment method: ${error.message}`); }
  }

  private async markWebhookAsProcessed(gateway: PaymentGateway, gatewayEventId: string): Promise<void> {
    await this.supabase.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("gateway", gateway).eq("gateway_event_id", gatewayEventId);
  }
}

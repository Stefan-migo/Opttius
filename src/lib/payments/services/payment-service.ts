/**
 * Business logic for payments and webhook events (DB operations).
 *
 * @module lib/payments/services/payment-service
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendSaaSNotification } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import { recordTierChange } from "@/lib/saas/tier-change-audit";
import type {
  Payment,
  PaymentCreationAttributes,
  PaymentGateway,
  PaymentStatus,
  WebhookEvent,
} from "@/types/payment";

export class PaymentService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /** Creates a new payment record. */
  async createPayment(data: PaymentCreationAttributes): Promise<Payment> {
    const { data: payment, error } = await this.supabase
      .from("payments")
      .insert(data as Record<string, unknown>)
      .select()
      .single();

    if (error) {
      logger.error("Failed to create payment in DB", error, { data });
      throw new Error(`Error creating payment: ${error.message}`);
    }
    if (!payment) {
      logger.error("Payment creation returned null", undefined, { data });
      throw new Error("Payment creation returned null");
    }
    logger.info("Payment record created", {
      paymentId: payment.id,
      gateway: payment.gateway,
      organizationId: payment.organization_id,
    });
    return payment as Payment;
  }

  /** Updates payment status (and optional gateway_transaction_id, gateway_payment_intent_id, metadata). */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    gatewayTransactionId?: string | null,
    metadata?: Record<string, unknown> | null,
    gatewayPaymentIntentId?: string | null,
  ): Promise<Payment> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (gatewayTransactionId != null)
      updateData.gateway_transaction_id = gatewayTransactionId;
    if (gatewayPaymentIntentId != null)
      updateData.gateway_payment_intent_id = gatewayPaymentIntentId;
    if (metadata != null) updateData.metadata = metadata;

    const { data: payment, error } = await this.supabase
      .from("payments")
      .update(updateData)
      .eq("id", paymentId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update payment status in DB", error, {
        paymentId,
        status,
      });
      throw new Error(`Error updating payment status: ${error.message}`);
    }
    if (!payment) {
      logger.error("Payment update returned null", undefined, {
        paymentId,
        status,
      });
      throw new Error("Payment update returned null");
    }
    logger.info("Payment status updated", {
      paymentId: payment.id,
      newStatus: status,
    });
    return payment as Payment;
  }

  /** Fetches payment by internal ID. */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    const { data: payment, error } = await this.supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching payment by ID", error, { paymentId });
      throw new Error(`Error fetching payment: ${error.message}`);
    }
    return payment as Payment | null;
  }

  /**
   * Processes a webhook event and updates payment status.
   * If payment succeeds, it also updates organization subscription.
   */
  async updatePaymentFromWebhook(event: WebhookEvent): Promise<void> {
    const paymentIntentId = event.gatewayPaymentIntentId;
    if (!paymentIntentId) {
      logger.warn("Webhook event missing payment intent ID", { event });
      return;
    }

    const alreadyProcessed = await this.recordWebhookEvent(
      event.gateway,
      event.gatewayEventId,
      event.type,
      null,
      event.metadata,
    );

    if (alreadyProcessed) {
      logger.info("Webhook event already processed, skipping update", {
        gateway: event.gateway,
        eventId: event.gatewayEventId,
      });
      return;
    }

    const payment =
      await this.getPaymentByGatewayPaymentIntentId(paymentIntentId);
    if (!payment) {
      logger.warn("No payment found for gateway intent ID", {
        paymentIntentId,
        gateway: event.gateway,
      });
      // Mark as processed anyway to avoid retries
      await this.markWebhookEventAsProcessed(
        event.gateway,
        event.gatewayEventId,
      );
      return;
    }

    // Update internal payment status
    await this.updatePaymentStatus(
      payment.id,
      event.status,
      event.gatewayTransactionId,
      event.metadata,
    );

    // If payment succeeded, fulfill order and update organization
    if (event.status === "succeeded") {
      if (payment.order_id) {
        await this.fulfillOrder(payment.order_id);
      }

      if (payment.organization_id) {
        await this.applyPaymentSuccessToOrganization(
          payment.organization_id,
          { ...payment, status: "succeeded" },
          paymentIntentId,
          event.gatewayTransactionId ?? null,
        );
      }
    }

    // Mark webhook as processed
    await this.markWebhookEventAsProcessed(event.gateway, event.gatewayEventId);

    logger.info("Payment updated from webhook successfully", {
      paymentId: payment.id,
      status: event.status,
      gateway: event.gateway,
    });
  }

  /** Fetches payment by gateway payment intent ID (for webhooks). */
  async getPaymentByGatewayPaymentIntentId(
    gatewayPaymentIntentId: string,
  ): Promise<Payment | null> {
    const { data: payment, error } = await this.supabase
      .from("payments")
      .select("*")
      .eq("gateway_payment_intent_id", gatewayPaymentIntentId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching payment by gateway intent ID", error, {
        gatewayPaymentIntentId,
      });
      throw new Error(`Error fetching payment: ${error.message}`);
    }
    return payment as Payment | null;
  }

  /** Records webhook event for idempotency; returns true if already processed. */
  async recordWebhookEvent(
    gateway: PaymentGateway,
    gatewayEventId: string,
    eventType: string,
    paymentId: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<boolean> {
    const { data: existingEvent } = await this.supabase
      .from("webhook_events")
      .select("id, processed")
      .eq("gateway", gateway)
      .eq("gateway_event_id", gatewayEventId)
      .single();

    if (existingEvent) {
      logger.info("Webhook event already processed", {
        gateway,
        gatewayEventId,
        wasProcessed: existingEvent.processed,
      });
      return existingEvent.processed as boolean;
    }

    const { error } = await this.supabase.from("webhook_events").insert({
      gateway,
      gateway_event_id: gatewayEventId,
      payment_id: paymentId,
      event_type: eventType,
      processed: false,
      metadata: metadata ?? {},
    });

    if (error) {
      logger.error("Failed to record webhook event", error, {
        gateway,
        gatewayEventId,
      });
      throw new Error(`Error recording webhook event: ${error.message}`);
    }
    return false;
  }

  /** Marks webhook event as processed. */
  async markWebhookEventAsProcessed(
    gateway: PaymentGateway,
    gatewayEventId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("gateway", gateway)
      .eq("gateway_event_id", gatewayEventId);

    if (error) {
      logger.error("Failed to mark webhook event as processed", error, {
        gateway,
        gatewayEventId,
      });
    }
  }

  /** Marks order as completed after successful payment. */
  async fulfillOrder(orderId: string): Promise<void> {
    logger.info("Order fulfillment logic triggered", { orderId });
    const { data, error } = await this.supabase
      .from("orders")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to fulfill order", error, { orderId });
      throw new Error(`Error fulfilling order: ${error.message}`);
    }
    if (!data) {
      logger.warn("Order not found for fulfillment", { orderId });
      return;
    }
    logger.info("Order fulfilled successfully", { orderId });
  }

  /**
   * On successful payment: update organization subscription_tier (from metadata or by amount)
   * and create/update subscription record. Used by Mercado Pago (and other gateways) webhook.
   */
  async applyPaymentSuccessToOrganization(
    organizationId: string,
    payment: Payment,
    gatewayPaymentIntentId: string | null,
    gatewayTransactionId: string | null,
  ): Promise<void> {
    type TierName = "basic" | "pro" | "premium";
    const validTiers: TierName[] = ["basic", "pro", "premium"];

    let tier: TierName = "basic";
    const metaTier = payment.metadata?.subscription_tier as string | undefined;
    if (metaTier && validTiers.includes(metaTier as TierName)) {
      tier = metaTier as TierName;
    } else {
      const { data: tiers } = await this.supabase
        .from("subscription_tiers")
        .select("name, price_monthly")
        .order("price_monthly", { ascending: false });
      const match = (tiers ?? []).find(
        (t) => Number(t.price_monthly) === payment.amount,
      );
      if (match && validTiers.includes(match.name as TierName)) {
        tier = match.name as TierName;
      }
    }

    const { data: orgBefore } = await this.supabase
      .from("organizations")
      .select("subscription_tier")
      .eq("id", organizationId)
      .single();

    const fromTier = (orgBefore?.subscription_tier as TierName) || "basic";

    const { error: orgError } = await this.supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);

    if (orgError) {
      logger.error("Failed to update organization tier", orgError, {
        organizationId,
        tier,
      });
      throw new Error(`Error updating organization tier: ${orgError.message}`);
    }

    await recordTierChange({
      organizationId,
      fromTier,
      toTier: tier,
      changedByUserId: null,
      source: "checkout",
    });

    logger.info("Organization subscription_tier updated", {
      organizationId,
      tier,
    });

    // Calculate period: 1 full month from payment date (not calendar month)
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setHours(23, 59, 59, 999);

    // Find existing subscription by organization_id (including trial without gateway)
    // This allows converting trial to paid subscription
    const { data: existing } = await this.supabase
      .from("subscriptions")
      .select("id, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Update existing subscription (trial or previous paid subscription)
      await this.supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: periodStart.toISOString().slice(0, 10),
          current_period_end: periodEnd.toISOString().slice(0, 10),
          gateway: payment.gateway,
          gateway_subscription_id:
            gatewayPaymentIntentId ?? gatewayTransactionId ?? undefined,
          cancel_at: null, // Clear any cancellation if reactivating
          canceled_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);
      logger.info(
        "Existing subscription updated (trial converted or renewed)",
        {
          subscriptionId: existing.id,
          previousStatus: existing.status,
        },
      );
    } else {
      // Create new subscription record
      await this.supabase.from("subscriptions").insert({
        organization_id: organizationId,
        gateway: payment.gateway,
        status: "active",
        current_period_start: periodStart.toISOString().slice(0, 10),
        current_period_end: periodEnd.toISOString().slice(0, 10),
        gateway_subscription_id:
          gatewayPaymentIntentId ?? gatewayTransactionId ?? null,
      });
      logger.info("New subscription record created", {
        organizationId,
        gateway: payment.gateway,
      });
    }
    logger.info("Subscription record updated for organization", {
      organizationId,
      gateway: payment.gateway,
    });

    // Send SaaS Subscription Success Email (B2B)
    try {
      // Get organization owner email
      const { data: orgData } = await this.supabase
        .from("organizations")
        .select("name, owner_id")
        .eq("id", organizationId)
        .single();

      if (orgData?.owner_id) {
        const { data: ownerData } = await this.supabase
          .from("profiles")
          .select("email, first_name")
          .eq("id", orgData.owner_id)
          .single();

        if (ownerData?.email) {
          await sendSaaSNotification(
            "saas_subscription_success",
            ownerData.email,
            {
              customer_name: ownerData.first_name || "Admin",
              organization_name: orgData.name,
              plan_name: tier.toUpperCase(),
              amount: payment.amount.toString(),
              currency: payment.currency,
              next_billing_date: periodEnd.toLocaleDateString("es-AR"),
            },
          );
        }
      }
    } catch (emailError) {
      logger.error(
        "Failed to send saas_subscription_success email",
        emailError,
      );
      // Non-blocking
    }
  }

  /**
   * Updates the subscription record with saved payment method (gateway customer + card id).
   * Used after successful payment when user opts to save card (Phase C).
   */
  async updateSubscriptionPaymentMethod(
    organizationId: string,
    gatewayCustomerId: string,
    gatewayPaymentMethodId: string,
  ): Promise<void> {
    const { data: existing } = await this.supabase
      .from("subscriptions")
      .select("id")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      logger.warn("No subscription found to update payment method", {
        organizationId,
      });
      return;
    }

    const { error } = await this.supabase
      .from("subscriptions")
      .update({
        gateway_customer_id: gatewayCustomerId,
        gateway_payment_method_id: gatewayPaymentMethodId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      logger.error("Failed to update subscription payment method", error, {
        organizationId,
      });
      throw new Error(
        `Error updating subscription payment method: ${error.message}`,
      );
    }
    logger.info("Subscription payment method updated", {
      organizationId,
      subscriptionId: existing.id,
    });
  }
}

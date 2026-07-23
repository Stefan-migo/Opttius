import type { SupabaseClient } from "@supabase/supabase-js";

import { sendSaaSNotification } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import { recordTierChange } from "@/lib/saas/tier-change-audit";
import type { Payment, PaymentGateway } from "@/types/payment";

export async function fulfillOrder(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { data, error } = await supabase.from("orders").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", orderId).select().single();
  if (error) { logger.error("Failed to fulfill order", error, { orderId }); throw new Error(`Error fulfilling order: ${error.message}`); }
  logger.info("Order fulfilled successfully", { orderId });
}

export async function recordWebhookEventForIdempotency(supabase: SupabaseClient, gateway: PaymentGateway, gatewayEventId: string, eventType: string, paymentId: string | null, metadata?: Record<string, unknown> | null): Promise<boolean> {
  const { data: existing } = await supabase.from("webhook_events").select("id, processed").eq("gateway", gateway).eq("gateway_event_id", gatewayEventId).single();
  if (existing) return existing.processed as boolean;
  await supabase.from("webhook_events").insert({ gateway, gateway_event_id: gatewayEventId, payment_id: paymentId, event_type: eventType, processed: false, metadata: metadata ?? {} });
  return false;
}

export async function processSubscriptionUpdate(supabase: SupabaseClient, organizationId: string, payment: Payment, gatewayPaymentIntentId: string | null, gatewayTransactionId: string | null): Promise<void> {
  type TierName = "basic" | "pro" | "premium";
  const validTiers: TierName[] = ["basic", "pro", "premium"];
  let tier: TierName = "basic";
  const metaTier = payment.metadata?.subscription_tier as string | undefined;
  if (metaTier && validTiers.includes(metaTier as TierName)) tier = metaTier as TierName;
  else {
    const { data: tiers } = await supabase.from("subscription_tiers").select("name, price_monthly").order("price_monthly", { ascending: false });
    const match = (tiers ?? []).find((t: unknown) => Number(t.price_monthly) === payment.amount);
    if (match && validTiers.includes(match.name as TierName)) tier = match.name as TierName;
  }

  const { data: orgBefore } = await supabase.from("organizations").select("subscription_tier").eq("id", organizationId).single();
  const fromTier = (orgBefore?.subscription_tier as TierName) || "basic";

  await supabase.from("organizations").update({ subscription_tier: tier, updated_at: new Date().toISOString() }).eq("id", organizationId);
  await recordTierChange({ organizationId, fromTier, toTier: tier, changedByUserId: null, source: "checkout" });

  const now = new Date();
  const periodStart = new Date(now); periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + 1); periodEnd.setHours(23, 59, 59, 999);

  const { data: existing } = await supabase.from("subscriptions").select("id, status").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existing) {
    await supabase.from("subscriptions").update({
      status: "active", current_period_start: periodStart.toISOString().slice(0, 10), current_period_end: periodEnd.toISOString().slice(0, 10),
      gateway: payment.gateway, gateway_subscription_id: gatewayPaymentIntentId ?? gatewayTransactionId ?? undefined,
      cancel_at: null, canceled_at: null, updated_at: now.toISOString(),
    }).eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert({
      organization_id: organizationId, gateway: payment.gateway, status: "active",
      current_period_start: periodStart.toISOString().slice(0, 10), current_period_end: periodEnd.toISOString().slice(0, 10),
      gateway_subscription_id: gatewayPaymentIntentId ?? gatewayTransactionId ?? null,
    });
  }

  try {
    const { data: orgData } = await supabase.from("organizations").select("name, owner_id").eq("id", organizationId).single();
    if (orgData?.owner_id) {
      const { data: owner } = await supabase.from("profiles").select("email, first_name").eq("id", orgData.owner_id).single();
      if (owner?.email) await sendSaaSNotification("saas_subscription_success", owner.email, { customer_name: owner.first_name || "Admin", organization_name: orgData.name, plan_name: tier.toUpperCase(), amount: payment.amount.toString(), currency: payment.currency, next_billing_date: periodEnd.toLocaleDateString("es-AR") });
    }
  } catch (e) { logger.error("Failed to send success email", e); }
}

/**
 * GET /api/checkout/current-subscription
 * Get current subscription tier and status for the authenticated user's organization
 */
import { NextResponse } from "next/server";

import { getSubscriptionStatus } from "@/lib/saas/subscription-status";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const organizationId = adminUser?.organization_id;
  if (!organizationId) {
    return NextResponse.json({
      hasSubscription: false,
      currentTier: null,
      subscription: null,
    });
  }

  // Get organization tier
  const { data: organization } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", organizationId)
    .single();

  // Get subscription status
  const subscriptionStatus = await getSubscriptionStatus(organizationId);

  return NextResponse.json({
    hasSubscription: true,
    currentTier: organization?.subscription_tier || "basic",
    subscription: {
      status: subscriptionStatus.status,
      currentPeriodStart:
        subscriptionStatus.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd:
        subscriptionStatus.currentPeriodEnd?.toISOString() ?? null,
      cancelAt: subscriptionStatus.cancelAt?.toISOString() ?? null,
    },
  });
}

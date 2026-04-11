/**
 * GET /api/admin/subscription-status
 * Returns subscription status for the current user's organization
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
      status: "none",
      isExpired: false,
      isTrialExpired: false,
      organizationId: null,
    });
  }

  const result = await getSubscriptionStatus(organizationId);
  // Serialize dates to ISO strings for JSON response
  return NextResponse.json({
    ...result,
    trialEndsAt: result.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: result.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: result.currentPeriodEnd?.toISOString() ?? null,
    cancelAt: result.cancelAt?.toISOString() ?? null,
    canceledAt: result.canceledAt?.toISOString() ?? null,
  });
}

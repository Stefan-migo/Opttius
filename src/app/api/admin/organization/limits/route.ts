/**
 * API Route: Get Organization Tier Limits
 *
 * Returns the current tier limits and usage for an organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/api/middleware";
import { getTierConfig, SubscriptionTier } from "@/lib/saas/tier-config";
import { validateTierLimit } from "@/lib/saas/tier-validator";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await requireAuth(request);

    // Get user's organization
    const supabase = createServiceRoleClient();
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", userId)
      .eq("is_active", true)
      .single();

    if (adminError || !adminUser?.organization_id) {
      return NextResponse.json(
        { error: "User does not belong to an organization" },
        { status: 403 },
      );
    }

    const organizationId = adminUser.organization_id;

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, subscription_tier, status")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const tier = organization.subscription_tier as SubscriptionTier;
    const tierConfig = getTierConfig(tier);

    // Get current usage for each limit type
    const [
      branchesValidation,
      usersValidation,
      customersValidation,
      productsValidation,
    ] = await Promise.all([
      validateTierLimit(organizationId, "branches"),
      validateTierLimit(organizationId, "users"),
      validateTierLimit(organizationId, "customers"),
      validateTierLimit(organizationId, "products"),
    ]);

    // Build response
    const limits = {
      tier: {
        name: tierConfig.name,
        tier: tier,
        price: tierConfig.price,
      },
      limits: {
        branches: {
          current: branchesValidation.currentCount,
          max: branchesValidation.maxAllowed,
          available: branchesValidation.allowed,
        },
        users: {
          current: usersValidation.currentCount,
          max: usersValidation.maxAllowed,
          available: usersValidation.allowed,
        },
        customers: {
          current: customersValidation.currentCount,
          max: customersValidation.maxAllowed,
          available: customersValidation.allowed,
        },
        products: {
          current: productsValidation.currentCount,
          max: productsValidation.maxAllowed,
          available: productsValidation.allowed,
        },
      },
      features: tierConfig.features,
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
    };

    return NextResponse.json(limits);
  } catch (error: any) {
    console.error("Error getting organization limits:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

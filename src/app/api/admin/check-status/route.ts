import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { getOrganizationFeatures } from "@/lib/saas/tier-validator";
import type {
  GetAdminRoleParams,
  GetAdminRoleResult,
  IsAdminParams,
  IsAdminResult,
  IsRootUserParams,
  IsRootUserResult,
  IsSuperAdminParams,
  IsSuperAdminResult,
} from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

const DEMO_ORG_ID =
  process.env.NEXT_PUBLIC_DEMO_ORG_ID || "00000000-0000-0000-0000-000000000001";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: "Not authenticated",
      });
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      {
        user_id: user.id,
      } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };

    // Get admin role
    const { data: adminRole, error: roleError } = (await supabase.rpc(
      "get_admin_role",
      {
        user_id: user.id,
      } as GetAdminRoleParams,
    )) as { data: GetAdminRoleResult | null; error: Error | null };

    // Check if user is super admin (has global branch access)
    const { data: isSuperAdminRPC, error: superAdminError } =
      (await supabase.rpc("is_super_admin", {
        user_id: user.id,
      } as IsSuperAdminParams)) as {
        data: IsSuperAdminResult | null;
        error: Error | null;
      };

    // Check admin_users table directly
    const { data: adminRecord, error: adminRecordError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", user.id)
      .single();

    // Get organization_id from admin_users
    const organizationId = adminRecord?.organization_id || null;
    // isSuperAdmin puede venir del role O de la función is_super_admin (acceso global)
    const isSuperAdmin = adminRole === "super_admin" || !!isSuperAdminRPC;
    // Check if user is root/dev (no necesita organización)
    const { data: isRoot, error: rootError } = (await supabase.rpc(
      "is_root_user",
      {
        user_id: user.id,
      } as IsRootUserParams,
    )) as {
      data: IsRootUserResult | null;
      error: Error | null;
    };
    const isRootUser = !!isRoot;

    let isDemoMode = organizationId === DEMO_ORG_ID;
    let showActivateBanner = isDemoMode;

    if (organizationId && organizationId !== DEMO_ORG_ID) {
      const { data: orgMeta } = await supabase
        .from("organizations")
        .select("metadata")
        .eq("id", organizationId)
        .single();
      const meta = orgMeta?.metadata as Record<string, unknown> | null;
      if (meta?.is_demo === true) {
        isDemoMode = true;
        showActivateBanner = meta?.demo_type !== "organic";
      }
    }

    // Get organization details if exists
    let organizationName = null;
    let organizationLogo = null;
    let organizationSlogan = null;
    let ownerId = null;
    let isOwner = isRootUser;

    if (organizationId) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name, logo_url, slogan, owner_id")
        .eq("id", organizationId)
        .single();
      organizationName = orgData?.name || null;
      organizationLogo = orgData?.logo_url || null;
      organizationSlogan = orgData?.slogan || null;
      ownerId = orgData?.owner_id || null;
      isOwner = ownerId === user.id || isRootUser;
    }

    // Determine if onboarding is required
    const onboardingRequired =
      isAdmin && !organizationId && !isSuperAdmin && !isRootUser;

    // Get tier features for sidebar filtering (root users get all features)
    let tierFeatures: Record<string, boolean> = {};
    if (organizationId && !isRootUser) {
      tierFeatures = await getOrganizationFeatures(organizationId);
    } else if (isRootUser) {
      // Root users see all features
      tierFeatures = {
        field_operations: true,
        agreements: true,
        whatsapp: true,
        chat_ia: true,
        advanced_analytics: true,
        prescriptions: true,
        custom_branding: true,
        pos: true,
        appointments: true,
        quotes: true,
        work_orders: true,
      };
    }

    // Test products query
    const {
      data: products,
      count,
      error: productsError,
    } = await supabase
      .from("products")
      .select("*", { count: "exact" })
      .limit(5);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      adminCheck: {
        isAdmin: isAdmin,
        adminError: adminError?.message,
        role: adminRole,
        roleError: roleError?.message,
        adminRecord: adminRecord,
        adminRecordError: adminRecordError?.message,
        isOwner,
      },
      organization: {
        organizationId,
        organizationName,
        organizationLogo,
        organizationSlogan,
        ownerId,
        hasOrganization: !!organizationId,
        isDemoMode,
        showActivateBanner,
        isSuperAdmin,
        isRootUser,
        isOwner,
        onboardingRequired,
        tierFeatures,
      },
      productsTest: {
        count: count,
        productsReturned: products?.length,
        error: productsError?.message,
        firstProduct: products?.[0],
      },
    });
  } catch (error) {
    logger.error("Check status error", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

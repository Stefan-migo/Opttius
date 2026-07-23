import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { updateOrganizationSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createRootAdminClient } from "@/utils/supabase/root-admin";

export async function handleGET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createRootAdminClient();
    const { id } = params;

    const { data: organization, error } = await supabaseServiceRole
      .from("organizations").select("*").eq("id", id).single();
    if (error || !organization) {
      return NextResponse.json({ error: "Organization not found", details: error?.message }, { status: 404 });
    }

    const { data: subscription } = await supabaseServiceRole
      .from("subscriptions").select("id, status, current_period_start, current_period_end, cancel_at, canceled_at, gateway_subscription_id, gateway_customer_id, created_at, updated_at")
      .eq("organization_id", id).eq("status", "active").maybeSingle();

    let owner = null;
    if (organization.owner_id) {
      const { data: ownerProfile } = await supabaseServiceRole
        .from("profiles").select("id, email, first_name, last_name, phone").eq("id", organization.owner_id).maybeSingle();
      if (ownerProfile) owner = ownerProfile;
    }

    const [usersResult, branchesResult, ordersResult, productsResult] = await Promise.all([
      supabaseServiceRole.from("admin_users").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("branches").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("orders").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("products").select("*", { count: "exact", head: true }).eq("organization_id", id),
    ]);

    const stats = {
      totalUsers: usersResult.count || 0,
      activeUsers: (await supabaseServiceRole.from("admin_users").select("*", { count: "exact", head: true }).eq("organization_id", id).eq("is_active", true)).count || 0,
      branches: branchesResult.count || 0, orders: ordersResult.count || 0, products: productsResult.count || 0,
    };

    const { data: recentUsersData } = await supabaseServiceRole
      .from("admin_users").select("id, email, role, is_active, last_login, created_at")
      .eq("organization_id", id).order("created_at", { ascending: false }).limit(10);

    const recentUsers = await Promise.all(
      (recentUsersData || []).map(async (user: unknown) => {
        const { data: profile } = await supabaseServiceRole
          .from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle();
        return { ...user, profiles: profile || null };
      }),
    );

    const { data: branches } = await supabaseServiceRole
      .from("branches").select("*").eq("organization_id", id).order("created_at", { ascending: false });

    return NextResponse.json({
      organization: { ...organization, subscription: subscription || null, owner, stats, recentUsers: recentUsers || [], branches: branches || [] },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    logger.error("Error fetching organization details", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function handlePATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createRootAdminClient();
    const { id } = params;
    const body = await request.json();
    const parseResult = updateOrganizationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0]?.message || "Datos inválidos" }, { status: 400 });
    }
    const { name, slug, owner_id, subscription_tier, status, metadata } = parseResult.data;

    const { data: existingOrg } = await supabaseServiceRole
      .from("organizations").select("id, slug").eq("id", id).single();
    if (!existingOrg) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const updates: unknown = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) {
      if (slug !== existingOrg.slug) {
        const { data: slugExists } = await supabaseServiceRole
          .from("organizations").select("id").eq("slug", slug).neq("id", id).maybeSingle();
        if (slugExists) return NextResponse.json({ error: "El slug ya está en uso" }, { status: 400 });
      }
      updates.slug = slug;
    }
    if (owner_id !== undefined) updates.owner_id = owner_id;
    if (subscription_tier !== undefined) updates.subscription_tier = subscription_tier;
    if (status !== undefined) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data: updatedOrg, error: updateError } = await supabaseServiceRole
      .from("organizations").update(updates).eq("id", id).select().single();
    if (updateError) {
      logger.error("Error updating organization", updateError);
      return NextResponse.json({ error: "Failed to update organization", details: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ organization: updatedOrg });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    logger.error("Error updating organization", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function handleDELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createRootAdminClient();
    const { id } = params;

    const { data: organization, error: orgError } = await supabaseServiceRole
      .from("organizations").select("id, name, slug").eq("id", id).single();
    if (orgError || !organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    let body: { confirm?: boolean } = {};
    try { const bodyText = await request.text(); if (bodyText) body = JSON.parse(bodyText); } catch {}

    const [usersCount, branchesCount, ordersCount, productsCount, customersCount] = await Promise.all([
      supabaseServiceRole.from("admin_users").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("branches").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("orders").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("products").select("*", { count: "exact", head: true }).eq("organization_id", id),
      supabaseServiceRole.from("customers").select("*", { count: "exact", head: true }).eq("organization_id", id),
    ]);

    const { data: orgUsers } = await supabaseServiceRole
      .from("admin_users").select("id, email, role").eq("organization_id", id);
    const { data: orgData } = await supabaseServiceRole
      .from("organizations").select("owner_id").eq("id", id).single();

    const userIdsToDelete: string[] = [];
    if (orgUsers && orgUsers.length > 0) {
      const userIds = orgUsers.map((u: unknown) => u.id);
      userIdsToDelete.push(...userIds);
      await supabaseServiceRole.from("admin_branch_access").delete().in("admin_user_id", userIds);
      await supabaseServiceRole.from("admin_users").delete().in("id", userIds);
    }
    if (orgData?.owner_id && !userIdsToDelete.includes(orgData.owner_id)) {
      const { data: otherOrgs } = await supabaseServiceRole
        .from("organizations").select("id").eq("owner_id", orgData.owner_id).neq("id", id).limit(1);
      if (!otherOrgs || otherOrgs.length === 0) userIdsToDelete.push(orgData.owner_id);
    }
    if (userIdsToDelete.length > 0) {
      for (const userId of userIdsToDelete) {
        try {
          const { error: deleteAuthError } = await supabaseServiceRole.auth.admin.deleteUser(userId);
          if (deleteAuthError) logger.warn("Failed to delete auth user", deleteAuthError);
        } catch (error) { logger.warn("Error deleting auth user", error); }
      }
    }

    const { error: deleteError } = await supabaseServiceRole.from("organizations").delete().eq("id", id);
    if (deleteError) return NextResponse.json({ error: "Failed to delete organization", details: deleteError.message }, { status: 500 });

    return NextResponse.json({
      success: true, message: "Organización eliminada completamente junto con todos sus datos relacionados",
      deleted: { organization: organization.name, users: usersCount.count || 0, branches: branchesCount.count || 0, orders: ordersCount.count || 0, products: productsCount.count || 0, customers: customersCount.count || 0 },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    logger.error("Error deleting organization", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

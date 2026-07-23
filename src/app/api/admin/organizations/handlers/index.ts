import { NextRequest, NextResponse } from "next/server";

import { createOrganizationSchema } from "@/lib/api/validation/organization-schemas";
import { parseAndValidateBody, ValidationError, validationErrorResponse } from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function handleGET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: adminUser } = await supabaseServiceRole
      .from("admin_users").select("organization_id").eq("id", user.id).maybeSingle();
    if (!adminUser?.organization_id) return NextResponse.json({ error: "No tienes una organización asignada" }, { status: 404 });

    const { data: organization, error: orgError } = await supabaseServiceRole
      .from("organizations").select("id, name, slug, logo_url, slogan, subscription_tier, status")
      .eq("id", adminUser.organization_id).single();
    if (orgError || !organization) return NextResponse.json({ error: "Error al obtener información de la organización" }, { status: 500 });

    return NextResponse.json({ organization: { id: organization.id, name: organization.name, slug: organization.slug, logo_url: organization.logo_url, slogan: organization.slogan, subscription_tier: organization.subscription_tier, status: organization.status } });
  } catch (error) {
    logger.error("Error in GET /api/admin/organizations", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function handlePOST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment && !user.email_confirmed_at) return NextResponse.json({ error: "Debes confirmar tu email antes de continuar" }, { status: 403 });

    let validatedBody;
    try { validatedBody = await parseAndValidateBody(request, createOrganizationSchema); }
    catch (error) { if (error instanceof ValidationError) return validationErrorResponse(error); throw error; }

    const { name, slug, subscription_tier, branchName } = validatedBody;

    const { data: existingAdminUser } = await supabaseServiceRole
      .from("admin_users").select("organization_id").eq("id", user.id).maybeSingle();
    if (existingAdminUser?.organization_id) return NextResponse.json({ error: "Ya tienes una organización asignada", organizationId: existingAdminUser.organization_id }, { status: 400 });

    const { data: existingOrg } = await supabaseServiceRole
      .from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existingOrg) return NextResponse.json({ error: "Ese identificador ya está en uso. Elige otro." }, { status: 400 });

    const { data: newOrganization, error: orgError } = await supabaseServiceRole
      .from("organizations").insert({ name, slug, owner_id: user.id, subscription_tier, status: "active" }).select().single();
    if (orgError || !newOrganization) return NextResponse.json({ error: "Error al crear la organización" }, { status: 500 });

    const organizationId = newOrganization.id;
    const adminUserData = {
      id: user.id, email: user.email, role: "super_admin", organization_id: organizationId, is_active: true,
      permissions: { orders: ["read", "create", "update", "delete"], products: ["read", "create", "update", "delete"], customers: ["read", "create", "update", "delete"], analytics: ["read"], settings: ["read", "create", "update", "delete"], admin_users: ["read", "create", "update", "delete"], support: ["read", "create", "update", "delete"], bulk_operations: ["read", "create", "update", "delete"], branches: ["read", "create", "update", "delete"] },
    };
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users").upsert(adminUserData, { onConflict: "id" }).select().single();
    if (adminError || !adminUser) {
      await supabaseServiceRole.from("organizations").delete().eq("id", organizationId);
      return NextResponse.json({ error: "Error al asignar organización al usuario" }, { status: 500 });
    }

    const finalBranchName = branchName || "Sucursal Principal";
    const branchCode = `${slug.toUpperCase().substring(0, 8)}-001`;
    const { data: newBranch } = await supabaseServiceRole
      .from("branches").insert({ name: finalBranchName, code: branchCode, organization_id: organizationId, is_active: true }).select().single();

    if (newBranch) {
      await supabaseServiceRole.from("admin_branch_access").insert({ admin_user_id: user.id, branch_id: null, role: "manager", is_primary: true });
      await supabaseServiceRole.from("admin_branch_access").insert({ admin_user_id: user.id, branch_id: newBranch.id, role: "manager", is_primary: false });
    }

    let trialDays = 7;
    const { data: trialConfig } = await supabaseServiceRole
      .from("system_config").select("config_value").eq("config_key", "membership_trial_days").maybeSingle();
    if (trialConfig?.config_value != null) { const parsed = parseInt(String(trialConfig.config_value).replace(/"/g, ""), 10); if (!isNaN(parsed) && parsed > 0) trialDays = parsed; }
    const trialEndsAt = new Date(); trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    await supabaseServiceRole.from("subscriptions").insert({ organization_id: organizationId, status: "trialing", trial_ends_at: trialEndsAt.toISOString(), current_period_end: trialEndsAt.toISOString().split("T")[0] });

    return NextResponse.json({ organization: { id: newOrganization.id, name: newOrganization.name, slug: newOrganization.slug, subscription_tier: newOrganization.subscription_tier }, branch: newBranch ? { id: newBranch.id, name: newBranch.name, code: newBranch.code } : null });
  } catch (error) {
    logger.error("Error in POST /api/admin/organizations", { error, message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

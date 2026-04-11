import { NextRequest, NextResponse } from "next/server";

import { createOrganizationSchema } from "@/lib/api/validation/organization-schemas";
import {
  parseAndValidateBody,
  ValidationError,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/organizations
 *
 * Obtiene la información de la organización del usuario actual.
 *
 * Returns:
 * - { organization: { id, name, slug, subscription_tier } }
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener organization_id del usuario
    const { data: adminUser, error: adminUserError } = await supabaseServiceRole
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (adminUserError && adminUserError.code !== "PGRST116") {
      logger.error("Error fetching admin_user", adminUserError);
      return NextResponse.json(
        {
          error: "Error al obtener información del usuario",
          details: adminUserError?.message,
        },
        { status: 500 },
      );
    }

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "No tienes una organización asignada" },
        { status: 404 },
      );
    }

    // Obtener información de la organización
    const { data: organization, error: orgError } = await supabaseServiceRole
      .from("organizations")
      .select("id, name, slug, logo_url, slogan, subscription_tier, status")
      .eq("id", adminUser.organization_id)
      .single();

    if (orgError || !organization) {
      logger.error("Error fetching organization", orgError);
      return NextResponse.json(
        {
          error: "Error al obtener información de la organización",
          details: orgError?.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo_url: organization.logo_url,
        slogan: organization.slogan,
        subscription_tier: organization.subscription_tier,
        status: organization.status,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/admin/organizations", error);
    const isDevelopment = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
        ...(isDevelopment && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/organizations
 *
 * Crea una nueva organización y asigna al usuario actual como owner.
 * También crea la primera sucursal (si se proporciona branchName) y
 * asigna acceso al usuario.
 *
 * Body:
 * - name: string (requerido) - Nombre de la organización
 * - slug: string (requerido) - Identificador único URL-friendly
 * - subscription_tier: 'basic' | 'pro' | 'premium' (opcional, default: 'pro')
 * - branchName: string (opcional) - Nombre de la primera sucursal
 *
 * Returns:
 * - { organization: {...}, branch: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      logger.error("Authentication error in POST /api/admin/organizations", {
        userError: userError?.message,
        hasUser: !!user,
        hasEmail: !!user?.email,
      });
      return NextResponse.json(
        { error: "No autenticado", details: userError?.message },
        { status: 401 },
      );
    }

    // En desarrollo, permitir usuarios no confirmados para facilitar testing
    // En producción, esto debería estar bloqueado por el middleware
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment && !user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Debes confirmar tu email antes de continuar" },
        { status: 403 },
      );
    }

    // Validar body
    let validatedBody;
    try {
      validatedBody = await parseAndValidateBody(
        request,
        createOrganizationSchema,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const { name, slug, subscription_tier, branchName } = validatedBody;

    // Verificar que el usuario no tenga ya una organización asignada
    // Usar maybeSingle() para manejar el caso donde el usuario no existe en admin_users todavía
    const { data: existingAdminUser, error: adminUserCheckError } =
      await supabaseServiceRole
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

    // Si hay un error diferente a "no rows found", loguearlo pero continuar
    if (adminUserCheckError && adminUserCheckError.code !== "PGRST116") {
      logger.warn(
        "Error checking existing admin user (non-critical)",
        adminUserCheckError,
      );
    }

    if (existingAdminUser?.organization_id) {
      return NextResponse.json(
        {
          error: "Ya tienes una organización asignada",
          organizationId: existingAdminUser.organization_id,
        },
        { status: 400 },
      );
    }

    // Verificar que el slug no exista (doble verificación)
    // Usar maybeSingle() para manejar el caso donde no existe
    const { data: existingOrg, error: slugCheckError } =
      await supabaseServiceRole
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    // Si hay un error diferente a "no rows found", loguearlo
    if (slugCheckError && slugCheckError.code !== "PGRST116") {
      logger.warn(
        "Error checking slug availability (non-critical)",
        slugCheckError,
      );
    }

    if (existingOrg) {
      return NextResponse.json(
        { error: "Ese identificador ya está en uso. Elige otro." },
        { status: 400 },
      );
    }

    // Crear organización usando service role para evitar problemas de RLS
    const { data: newOrganization, error: orgError } = await supabaseServiceRole
      .from("organizations")
      .insert({
        name,
        slug,
        owner_id: user.id,
        subscription_tier,
        status: "active",
      })
      .select()
      .single();

    if (orgError || !newOrganization) {
      logger.error("Error creating organization", {
        error: orgError,
        code: orgError?.code,
        message: orgError?.message,
        details: orgError?.details,
        hint: orgError?.hint,
      });
      return NextResponse.json(
        {
          error: "Error al crear la organización",
          details: orgError?.message,
          code: orgError?.code,
          hint: isDevelopment ? orgError?.hint : undefined,
        },
        { status: 500 },
      );
    }

    const organizationId = newOrganization.id;

    // Crear/actualizar admin_users con organization_id
    // El primer usuario creador de la organización es siempre Super Administrador
    const adminUserData = {
      id: user.id,
      email: user.email,
      role: "super_admin",
      organization_id: organizationId,
      is_active: true,
      permissions: {
        orders: ["read", "create", "update", "delete"],
        products: ["read", "create", "update", "delete"],
        customers: ["read", "create", "update", "delete"],
        analytics: ["read"],
        settings: ["read", "create", "update", "delete"],
        admin_users: ["read", "create", "update", "delete"],
        support: ["read", "create", "update", "delete"],
        bulk_operations: ["read", "create", "update", "delete"],
        branches: ["read", "create", "update", "delete"],
      },
    };

    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .upsert(adminUserData, {
        onConflict: "id",
      })
      .select()
      .single();

    if (adminError || !adminUser) {
      logger.error("Error updating admin_users", {
        error: adminError,
        code: adminError?.code,
        message: adminError?.message,
        details: adminError?.details,
        hint: adminError?.hint,
        userId: user.id,
        email: user.email,
      });
      // Rollback: eliminar organización creada
      await supabaseServiceRole
        .from("organizations")
        .delete()
        .eq("id", organizationId);
      return NextResponse.json(
        {
          error: "Error al asignar organización al usuario",
          details: adminError?.message,
          code: adminError?.code,
          hint: isDevelopment ? adminError?.hint : undefined,
        },
        { status: 500 },
      );
    }

    // Crear primera sucursal (siempre se crea una, por defecto "Sucursal Principal")
    const finalBranchName = branchName || "Sucursal Principal";
    const branchCode = `${slug.toUpperCase().substring(0, 8)}-001`;

    const { data: newBranch, error: branchError } = await supabaseServiceRole
      .from("branches")
      .insert({
        name: finalBranchName,
        code: branchCode,
        organization_id: organizationId,
        is_active: true,
      })
      .select()
      .single();

    let branch = null;
    if (branchError || !newBranch) {
      logger.error("Error creating branch", branchError);
      // No hacer rollback aquí, la organización ya está creada
      // El usuario puede crear la sucursal después
    } else {
      branch = newBranch;

      // Super admin: acceso global (branch_id null) para ver todas las sucursales
      const { error: globalAccessError } = await supabaseServiceRole
        .from("admin_branch_access")
        .insert({
          admin_user_id: user.id,
          branch_id: null,
          role: "manager",
          is_primary: true,
        });

      if (globalAccessError) {
        logger.error(
          "Error creating super admin global access",
          globalAccessError,
        );
      }

      // También acceso explícito a la primera sucursal (opcional, para consistencia)
      const { error: accessError } = await supabaseServiceRole
        .from("admin_branch_access")
        .insert({
          admin_user_id: user.id,
          branch_id: newBranch.id,
          role: "manager",
          is_primary: false,
        });

      if (accessError) {
        logger.error("Error creating branch access", accessError);
        // No crítico, el super_admin ya tiene acceso global
      }
    }

    // Siempre iniciar período de prueba (7 días por defecto)
    let trialDays = 7;
    const { data: trialConfig } = await supabaseServiceRole
      .from("system_config")
      .select("config_value")
      .eq("config_key", "membership_trial_days")
      .maybeSingle();
    if (trialConfig?.config_value != null) {
      const parsed = parseInt(
        String(trialConfig.config_value).replace(/"/g, ""),
        10,
      );
      if (!isNaN(parsed) && parsed > 0) trialDays = parsed;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const { error: subscriptionError } = await supabaseServiceRole
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_end: trialEndsAt.toISOString().split("T")[0],
      });

    if (subscriptionError) {
      logger.warn(
        "Error creating subscription (non-critical)",
        subscriptionError,
      );
      // No crítico, se puede crear después
    }

    logger.info("Organization created successfully", {
      organizationId,
      userId: user.id,
      slug,
    });

    return NextResponse.json({
      organization: {
        id: newOrganization.id,
        name: newOrganization.name,
        slug: newOrganization.slug,
        subscription_tier: newOrganization.subscription_tier,
      },
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            code: branch.code,
          }
        : null,
    });
  } catch (error) {
    logger.error("Error in POST /api/admin/organizations", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    const isDevelopment = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
        ...(isDevelopment && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 },
    );
  }
}

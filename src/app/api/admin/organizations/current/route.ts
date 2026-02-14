import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

/**
 * GET /api/admin/organizations/current
 * Obtiene la información completa de la organización del usuario actual
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener organization_id del usuario
    const { data: adminUser } = await supabaseServiceRole
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "No tienes una organización asignada" },
        { status: 404 },
      );
    }

    // Obtener información completa de la organización
    const { data: organization, error: orgError } = await supabaseServiceRole
      .from("organizations")
      .select("id, name, slug, logo_url, slogan, subscription_tier, status")
      .eq("id", adminUser.organization_id)
      .single();

    if (orgError || !organization) {
      logger.error("Error fetching organization", orgError);
      return NextResponse.json(
        { error: "Error al obtener información de la organización" },
        { status: 500 },
      );
    }

    return createApiSuccessResponse(organization);
  } catch (error) {
    logger.error("Error in GET /api/admin/organizations/current", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/organizations/current
 * Actualiza la información de la organización del usuario actual
 * Permite actualizar: name, logo_url, slogan
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar que el usuario es admin
    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Obtener organization_id del usuario
    const { data: adminUser } = await supabaseServiceRole
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "No tienes una organización asignada" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { name, logo_url, slogan } = body;

    // Preparar updates
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (slogan !== undefined) updates.slogan = slogan;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron campos para actualizar" },
        { status: 400 },
      );
    }

    // Actualizar organización
    const { data: updatedOrg, error: updateError } = await supabaseServiceRole
      .from("organizations")
      .update(updates)
      .eq("id", adminUser.organization_id)
      .select("id, name, slug, logo_url, slogan, subscription_tier, status")
      .single();

    if (updateError) {
      logger.error("Error updating organization", updateError);
      return NextResponse.json(
        {
          error: "Error al actualizar la organización",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    logger.info(`Organization updated: ${adminUser.organization_id}`);

    return createApiSuccessResponse(updatedOrg);
  } catch (error) {
    logger.error("Error in PATCH /api/admin/organizations/current", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

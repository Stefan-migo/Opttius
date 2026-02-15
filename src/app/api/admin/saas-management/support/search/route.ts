import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * GET /api/admin/saas-management/support/search
 * Búsqueda rápida de organizaciones y usuarios para soporte
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({
        organizations: [],
        users: [],
      });
    }

    const searchTerm = `%${query}%`;

    // Buscar organizaciones
    const { data: organizations } = await supabaseServiceRole
      .from("organizations")
      .select("id, name, slug, status, subscription_tier")
      .or(`name.ilike.${searchTerm},slug.ilike.${searchTerm}`)
      .limit(10);

    // Buscar usuarios
    const { data: users } = await supabaseServiceRole
      .from("admin_users")
      .select(
        `
        id,
        email,
        role,
        is_active,
        organization_id,
        organization:organizations (
          id,
          name,
          slug
        ),
        profiles (
          first_name,
          last_name
        )
      `,
      )
      .or(`email.ilike.${searchTerm}`)
      .limit(10);

    // Buscar también por nombre en profiles
    const { data: profiles } = await supabaseServiceRole
      .from("profiles")
      .select("id, first_name, last_name, email")
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`,
      )
      .limit(10);

    // Obtener usuarios admin asociados a los profiles encontrados
    const profileIds = profiles?.map((p) => p.id) || [];
    let additionalUsers: any[] = [];
    if (profileIds.length > 0) {
      const { data: usersFromProfiles } = await supabaseServiceRole
        .from("admin_users")
        .select(
          `
          id,
          email,
          role,
          is_active,
          organization_id,
          organization:organizations (
            id,
            name,
            slug
          ),
          profiles (
            first_name,
            last_name
          )
        `,
        )
        .in("id", profileIds);

      additionalUsers = usersFromProfiles || [];
    }

    // Combinar y deduplicar usuarios
    const allUsers = [
      ...(users || []),
      ...additionalUsers.filter(
        (u) => !users?.some((existing) => existing.id === u.id),
      ),
    ];

    return NextResponse.json({
      organizations: organizations || [],
      users: allUsers.slice(0, 10),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in support search", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

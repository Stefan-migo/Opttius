import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

const DEMO_ORG_ID =
  process.env.NEXT_PUBLIC_DEMO_ORG_ID || "00000000-0000-0000-0000-000000000001";

/**
 * POST /api/onboarding/assign-demo
 *
 * Crea una organización demo dedicada (7 días) para el usuario (flujo ópticas conocidas).
 * Clona estructura Mirada Clara. Banner y botón activar visibles.
 *
 * Returns:
 * - { success: boolean, organizationId: string }
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: existingAdminUser, error: adminUserError } =
      await supabaseServiceRole
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

    if (adminUserError && adminUserError.code !== "PGRST116") {
      logger.warn("Error checking existing admin user", adminUserError);
    }

    if (existingAdminUser?.organization_id) {
      const orgId = existingAdminUser.organization_id;

      if (orgId !== DEMO_ORG_ID) {
        const { data: org } = await supabaseServiceRole
          .from("organizations")
          .select("metadata")
          .eq("id", orgId)
          .single();

        const meta = org?.metadata as Record<string, unknown> | null;
        const isOwnDemo =
          meta?.owner_user_id === user.id && meta?.is_demo === true;

        if (isOwnDemo) {
          return NextResponse.json({
            success: true,
            organizationId: orgId,
            alreadyAssigned: true,
          });
        }

        return NextResponse.json(
          {
            error: "Ya tienes una organización asignada",
            organizationId: orgId,
          },
          { status: 400 },
        );
      }
    }

    const { data: newOrgId, error: rpcError } = await supabaseServiceRole.rpc(
      "create_demo_organization_for_user",
      { p_user_id: user.id, p_demo_type: "known_optica" },
    );

    if (rpcError) {
      logger.error("Error creating demo organization", {
        error: rpcError,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: "Error al crear organización demo",
          details: rpcError.message,
        },
        { status: 500 },
      );
    }

    const { data: demoOrg } = await supabaseServiceRole
      .from("organizations")
      .select("id, name")
      .eq("id", newOrgId)
      .single();

    logger.info("Demo organization created and assigned", {
      userId: user.id,
      organizationId: newOrgId,
    });

    return NextResponse.json({
      success: true,
      organizationId: newOrgId,
      organization: {
        id: demoOrg?.id ?? newOrgId,
        name: demoOrg?.name ?? "Óptica Demo",
      },
    });
  } catch (error) {
    logger.error("Error in POST /api/onboarding/assign-demo", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

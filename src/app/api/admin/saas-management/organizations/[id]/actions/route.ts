import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * POST /api/admin/saas-management/organizations/[id]/actions
 * Acciones sobre organizaciones: suspender, activar, cambiar tier
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;
    const body = await request.json();
    const { action, value } = body;

    // Verificar que la organización existe
    const { data: organization } = await supabaseServiceRole
      .from("organizations")
      .select("id, status, subscription_tier")
      .eq("id", id)
      .single();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const updateData: any = {};

    switch (action) {
      case "suspend":
        updateData.status = "suspended";
        break;

      case "activate":
        updateData.status = "active";
        break;

      case "cancel":
        updateData.status = "cancelled";
        break;

      case "change_tier":
        if (!value || !["basic", "pro", "premium"].includes(value)) {
          return NextResponse.json(
            { error: "Tier inválido. Debe ser: basic, pro, o premium" },
            { status: 400 },
          );
        }
        updateData.subscription_tier = value;
        break;

      default:
        return NextResponse.json(
          { error: `Acción inválida: ${action}` },
          { status: 400 },
        );
    }

    const { data: updatedOrg, error: updateError } = await supabaseServiceRole
      .from("organizations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error performing action on organization", updateError);
      return NextResponse.json(
        { error: "Failed to perform action", details: updateError.message },
        { status: 500 },
      );
    }

    logger.info(`Organization action performed: ${action} on ${id}`);

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      action,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in organization action", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * POST /api/admin/saas-management/organizations/bulk-actions
 * Acciones masivas sobre organizaciones
 */
export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const body = await request.json();
    const { action, organization_ids, value } = body;

    if (!action || !organization_ids || !Array.isArray(organization_ids)) {
      return NextResponse.json(
        { error: "action y organization_ids (array) son requeridos" },
        { status: 400 },
      );
    }

    if (organization_ids.length === 0) {
      return NextResponse.json(
        { error: "Debe seleccionar al menos una organización" },
        { status: 400 },
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

    const { data: updatedOrgs, error: updateError } = await supabaseServiceRole
      .from("organizations")
      .update(updateData)
      .in("id", organization_ids)
      .select();

    if (updateError) {
      logger.error("Error performing bulk action", updateError);
      return NextResponse.json(
        {
          error: "Failed to perform bulk action",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    logger.info(
      `Bulk action performed: ${action} on ${organization_ids.length} organizations`,
    );

    return NextResponse.json({
      success: true,
      updated: updatedOrgs?.length || 0,
      organizations: updatedOrgs || [],
      action,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in bulk action", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

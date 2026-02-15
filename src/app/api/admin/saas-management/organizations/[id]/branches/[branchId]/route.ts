import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * PATCH /api/admin/saas-management/organizations/[id]/branches/[branchId]
 * Actualizar sucursal
 */
export const dynamic = "force-dynamic";
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id: organizationId, branchId } = params;
    const body = await request.json();

    // Verificar que la sucursal pertenece a la organización
    const { data: branch } = await supabaseServiceRole
      .from("branches")
      .select("id, organization_id")
      .eq("id", branchId)
      .eq("organization_id", organizationId)
      .single();

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found or does not belong to this organization" },
        { status: 404 },
      );
    }

    // Preparar updates
    const updates: any = {};
    const allowedFields = [
      "name",
      "code",
      "address_line_1",
      "address_line_2",
      "city",
      "state",
      "postal_code",
      "phone",
      "email",
      "is_active",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Actualizar
    const { data: updatedBranch, error: updateError } =
      await supabaseServiceRole
        .from("branches")
        .update(updates)
        .eq("id", branchId)
        .select()
        .single();

    if (updateError) {
      logger.error("Error updating branch", updateError);
      return NextResponse.json(
        {
          error: "Failed to update branch",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    logger.info(`Branch updated: ${branchId}`);

    return NextResponse.json({ branch: updatedBranch });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating branch", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/organizations/[id]/branches/[branchId]
 * Eliminar sucursal (esto activará CASCADE en todas las tablas relacionadas)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id: organizationId, branchId } = params;

    // Verificar que la sucursal pertenece a la organización
    const { data: branch } = await supabaseServiceRole
      .from("branches")
      .select("id, name, organization_id")
      .eq("id", branchId)
      .eq("organization_id", organizationId)
      .single();

    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found or does not belong to this organization" },
        { status: 404 },
      );
    }

    // Verificar confirmación
    let body: { confirm?: boolean } = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch {
      // Continuar sin confirmación
    }

    logger.info(`Deleting branch ${branchId} (${branch.name})`);

    // Eliminar la sucursal (esto activará CASCADE)
    const { error: deleteError } = await supabaseServiceRole
      .from("branches")
      .delete()
      .eq("id", branchId);

    if (deleteError) {
      logger.error("Error deleting branch", deleteError);
      return NextResponse.json(
        {
          error: "Failed to delete branch",
          details: deleteError.message,
        },
        { status: 500 },
      );
    }

    logger.info(`Branch deleted successfully: ${branchId}`);

    return NextResponse.json({
      success: true,
      message: "Sucursal eliminada completamente",
      deleted: {
        branchId,
        branchName: branch.name,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error deleting branch", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

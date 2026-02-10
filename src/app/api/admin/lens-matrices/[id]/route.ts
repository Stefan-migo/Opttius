import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { ValidationError } from "@/lib/api/errors";
import { updateLensPriceMatrixSchemaV2 } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { data: matrix, error } = await supabase
      .from("lens_price_matrices")
      .select(
        `
        *,
        lens_families (
          id,
          name,
          brand,
          lens_type,
          lens_material,
          organization_id
        )
      `,
      )
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Matriz de precios no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error fetching lens price matrix", error);
      return NextResponse.json(
        { error: "Error al cargar matriz de precios" },
        { status: 500 },
      );
    }

    // Enforce organization ownership
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";
    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;
    const familyOrgId = (
      matrix.lens_families as { organization_id?: string } | null
    )?.organization_id;
    if (
      !isSuperAdmin &&
      userOrganizationId &&
      familyOrgId !== userOrganizationId
    ) {
      return NextResponse.json(
        { error: "Matriz de precios no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ matrix });
  } catch (error) {
    logger.error("Error in lens matrices API GET [id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Verify matrix's lens_family belongs to user's organization
    const { data: matrixRow } = await supabase
      .from("lens_price_matrices")
      .select("lens_family_id")
      .eq("id", params.id)
      .single();
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";
    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;
    if (matrixRow && !isSuperAdmin && userOrganizationId) {
      const { data: family } = await supabase
        .from("lens_families")
        .select("id")
        .eq("id", matrixRow.lens_family_id)
        .eq("organization_id", userOrganizationId)
        .maybeSingle();
      if (!family) {
        return NextResponse.json(
          { error: "Matriz de precios no encontrada" },
          { status: 404 },
        );
      }
    }

    // Validate body
    const body = await parseAndValidateBody(
      request,
      updateLensPriceMatrixSchemaV2,
    );

    // Update price matrix
    const { data: matrix, error } = await supabase
      .from("lens_price_matrices")
      .update(body)
      .eq("id", params.id)
      .select(
        `
        *,
        lens_families (
          id,
          name,
          brand,
          lens_type,
          lens_material
        )
      `,
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Matriz de precios no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error updating lens price matrix", error);
      return NextResponse.json(
        { error: "Error al actualizar matriz de precios" },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrix });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    } else {
      logger.error("Error in lens matrices API PUT", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Verify matrix's lens_family belongs to user's organization before delete
    const { data: matrixRow } = await supabase
      .from("lens_price_matrices")
      .select("lens_family_id")
      .eq("id", params.id)
      .single();
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";
    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;
    if (matrixRow && !isSuperAdmin && userOrganizationId) {
      const { data: family } = await supabase
        .from("lens_families")
        .select("id")
        .eq("id", matrixRow.lens_family_id)
        .eq("organization_id", userOrganizationId)
        .maybeSingle();
      if (!family) {
        return NextResponse.json(
          { error: "Matriz de precios no encontrada" },
          { status: 404 },
        );
      }
    }

    // Delete price matrix (hard delete)
    const { error } = await supabase
      .from("lens_price_matrices")
      .delete()
      .eq("id", params.id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Matriz de precios no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error deleting lens price matrix", error);
      return NextResponse.json(
        { error: "Error al eliminar matriz de precios" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in lens matrices API DELETE", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

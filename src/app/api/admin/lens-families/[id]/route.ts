import { NextRequest, NextResponse } from "next/server";

import {
  parseAndValidateBody,
  ValidationError,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { updateLensFamilySchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
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

    const { data: family, error } = await supabase
      .from("lens_families")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Familia de lentes no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error fetching lens family", error);
      return NextResponse.json(
        { error: "Error al cargar familia de lentes" },
        { status: 500 },
      );
    }

    // Enforce organization ownership (super_admin can access any)
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";
    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;
    if (
      !isSuperAdmin &&
      userOrganizationId &&
      family.organization_id !== userOrganizationId
    ) {
      return NextResponse.json(
        { error: "Familia de lentes no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ family });
  } catch (error) {
    logger.error("Error in lens families API GET [id]", error);
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

    // Verify family belongs to user's organization before update
    const { data: existing } = await supabase
      .from("lens_families")
      .select("organization_id")
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
    if (
      existing &&
      !isSuperAdmin &&
      userOrganizationId &&
      existing.organization_id !== userOrganizationId
    ) {
      return NextResponse.json(
        { error: "Familia de lentes no encontrada" },
        { status: 404 },
      );
    }

    // Validate body (do not allow changing organization_id via update)
    const body = await parseAndValidateBody(request, updateLensFamilySchema);

    // Update lens family
    const { data: family, error } = await supabase
      .from("lens_families")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Familia de lentes no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error updating lens family", error);
      return NextResponse.json(
        { error: "Error al actualizar familia de lentes" },
        { status: 500 },
      );
    }

    return NextResponse.json({ family });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    } else {
      logger.error("Error in lens families API PUT", error);
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

    // Verify family belongs to user's organization before delete
    const { data: existing } = await supabase
      .from("lens_families")
      .select("organization_id")
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
    if (
      existing &&
      !isSuperAdmin &&
      userOrganizationId &&
      existing.organization_id !== userOrganizationId
    ) {
      return NextResponse.json(
        { error: "Familia de lentes no encontrada" },
        { status: 404 },
      );
    }

    // Soft delete by setting is_active to false
    const { data: family, error } = await supabase
      .from("lens_families")
      .update({ is_active: false })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Familia de lentes no encontrada" },
          { status: 404 },
        );
      }
      logger.error("Error deleting lens family", error);
      return NextResponse.json(
        { error: "Error al desactivar familia de lentes" },
        { status: 500 },
      );
    }

    return NextResponse.json({ family });
  } catch (error) {
    logger.error("Error in lens families API DELETE", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

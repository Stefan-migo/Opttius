import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { ValidationError } from "@/lib/api/errors";
import { createLensPriceMatrixSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
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

    // Get user's organization_id for multi-tenancy (matrices follow lens_family's org)
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (
      adminUser as { organization_id?: string; role?: string }
    )?.organization_id;
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("family_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    // CRITICAL: Restrict to matrices whose lens_family belongs to user's organization
    // This ensures multi-tenancy isolation - each organization only sees its own matrices
    let allowedFamilyIds: string[] | null = null;
    if (userOrganizationId) {
      // Always filter by organization_id - even super admins should only see their org's families
      const { data: orgFamilies } = await supabase
        .from("lens_families")
        .select("id")
        .eq("organization_id", userOrganizationId);
      allowedFamilyIds = (orgFamilies || []).map((f) => f.id);
      if (allowedFamilyIds.length === 0) {
        // New organizations start with empty lens families - this is correct
        return NextResponse.json({ matrices: [] });
      }
    } else if (!isSuperAdmin) {
      // If no organization_id and not super admin, return empty (no matrices)
      return NextResponse.json({ matrices: [] });
    }
    // Note: Root/dev users (super_admin role) without organization_id can see all matrices
    // This is intentional for platform administration

    // Build query
    let query = supabase
      .from("lens_price_matrices")
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
      .order("created_at", { ascending: false });

    if (allowedFamilyIds !== null) {
      query = query.in("lens_family_id", allowedFamilyIds);
    }

    // Filter by family if provided
    if (familyId && familyId !== "all") {
      query = query.eq("lens_family_id", familyId);
    }

    // Filter by active status if needed
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: matrices, error } = await query;

    if (error) {
      logger.error("Error fetching lens price matrices", error);
      return NextResponse.json(
        { error: "Error al cargar matrices de precios" },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrices: matrices || [] });
  } catch (error) {
    logger.error("Error in lens matrices API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validate body
    const body = await parseAndValidateBody(
      request,
      createLensPriceMatrixSchema,
    );

    // Ensure the lens_family belongs to user's organization
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (
      adminUser as { organization_id?: string; role?: string }
    )?.organization_id;
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";

    if (!isSuperAdmin && userOrganizationId) {
      const { data: family } = await supabase
        .from("lens_families")
        .select("id")
        .eq("id", body.lens_family_id)
        .eq("organization_id", userOrganizationId)
        .maybeSingle();
      if (!family) {
        return NextResponse.json(
          {
            error:
              "La familia de lentes no existe o no pertenece a tu organización",
          },
          { status: 403 },
        );
      }
    }

    // Insert price matrix
    const { data: matrix, error } = await supabase
      .from("lens_price_matrices")
      .insert(body)
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
      logger.error("Error creating lens price matrix", error);
      return NextResponse.json(
        { error: "Error al crear matriz de precios" },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrix }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error as any);
    } else {
      logger.error("Error in lens matrices API POST", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createContactLensPriceMatrixSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { ValidationError } from "@/lib/api/errors";
import { z } from "zod";

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

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (
      adminUser as {
        organization_id?: string;
        role?: string;
      }
    )?.organization_id;
    const isSuperAdmin =
      (adminUser as { role?: string })?.role === "super_admin";

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get("family_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    // Build query
    let query = supabase
      .from("contact_lens_price_matrices")
      .select(
        `
        *,
        contact_lens_families (
          id,
          name,
          brand,
          use_type,
          modality,
          packaging
        )
      `,
      )
      .order("created_at", { ascending: false });

    // Filter by organization_id (multi-tenancy isolation)
    if (!isSuperAdmin && userOrganizationId) {
      query = query.eq("organization_id", userOrganizationId);
    }

    // Filter by family if provided
    if (familyId && familyId !== "all") {
      query = query.eq("contact_lens_family_id", familyId);
    }

    // Filter by active status if needed
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: matrices, error } = await query;

    if (error) {
      logger.error("Error fetching contact lens price matrices", error);
      return NextResponse.json(
        { error: "Error al cargar matrices de precios de lentes de contacto" },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrices: matrices || [] });
  } catch (error) {
    logger.error("Error in contact lens matrices API GET", error);
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

    // Get user's organization_id
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (
      adminUser as {
        organization_id?: string;
      }
    )?.organization_id;

    if (!userOrganizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Validate body
    const body = await parseAndValidateBody(
      request,
      createContactLensPriceMatrixSchema,
    );

    // Insert price matrix with organization_id
    const { data: matrix, error } = await supabase
      .from("contact_lens_price_matrices")
      .insert({
        ...body,
        organization_id: userOrganizationId,
      })
      .select(
        `
        *,
        contact_lens_families (
          id,
          name,
          brand,
          use_type,
          modality,
          packaging
        )
      `,
      )
      .single();

    if (error) {
      logger.error("Error creating contact lens price matrix", error);
      return NextResponse.json(
        { error: "Error al crear matriz de precios de lentes de contacto" },
        { status: 500 },
      );
    }

    return NextResponse.json({ matrix }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return validationErrorResponse(error);
    }
    logger.error("Error in contact lens matrices API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

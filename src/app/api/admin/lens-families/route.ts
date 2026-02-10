import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { ValidationError } from "@/lib/api/errors";
import {
  createLensFamilySchema,
  createLensFamilyFullSchema,
} from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

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

    // Get user's organization_id for multi-tenancy
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
    const includeInactive = searchParams.get("include_inactive") === "true";

    // Build query
    let query = supabase.from("lens_families").select("*").order("created_at", {
      ascending: false,
    });

    // CRITICAL: Filter by organization_id (each organization has its own lens families)
    // Even super admins should only see families from their organization (unless root/dev)
    if (userOrganizationId) {
      // Filter by organization_id - this ensures multi-tenancy isolation
      query = query.eq("organization_id", userOrganizationId);
    } else if (!isSuperAdmin) {
      // If no organization_id and not super admin, return empty (no families)
      return NextResponse.json({ families: [] });
    }
    // Note: Root/dev users (super_admin role) without organization_id can see all families
    // This is intentional for platform administration

    // Filter by active status if needed
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: families, error } = await query;

    if (error) {
      logger.error("Error fetching lens families", error);
      return NextResponse.json(
        { error: "Error al cargar familias de lentes" },
        { status: 500 },
      );
    }

    return NextResponse.json({ families: families || [] });
  } catch (error) {
    logger.error("Error in lens families API GET", error);
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

    // Get user's organization_id (required for new lens families)
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = (adminUser as { organization_id?: string })
      ?.organization_id;

    if (!userOrganizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Parse body as JSON once
    const bodyRaw = await request.json();
    let body: any;

    // Check if we are doing a full creation (with matrices)
    if (
      bodyRaw.matrices &&
      Array.isArray(bodyRaw.matrices) &&
      bodyRaw.matrices.length > 0
    ) {
      // Validate with proper schema
      const validation = createLensFamilyFullSchema.safeParse(bodyRaw);
      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }
      body = validation.data;

      // Extract matrices and family data
      const { matrices, ...familyData } = body;

      // Use RPC for atomic insertion
      const { data: familyId, error } = await supabase.rpc(
        "create_lens_family_full",
        {
          p_family_data: {
            ...familyData,
            organization_id: userOrganizationId, // Enforce organization_id
          },
          p_matrices_data: matrices,
        },
      );

      if (error) {
        logger.error("Error creating lens family full (RPC)", error);
        return NextResponse.json(
          { error: "Error al crear familia de lentes completa" },
          { status: 500 },
        );
      }

      // Fetch the created family to return it (optional, but good practice)
      const { data: createdFamily } = await supabase
        .from("lens_families")
        .select("*")
        .eq("id", (familyId as any).id) // RPC returns object with id
        .single();

      return NextResponse.json({ family: createdFamily }, { status: 201 });
    } else {
      // Legacy/Simple creation (without matrices)
      const validation = createLensFamilySchema.safeParse(bodyRaw);
      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }
      body = validation.data;

      // Insert lens family with organization_id
      const { data: family, error } = await supabase
        .from("lens_families")
        .insert({ ...body, organization_id: userOrganizationId })
        .select()
        .single();

      if (error) {
        logger.error("Error creating lens family", error);
        return NextResponse.json(
          { error: "Error al crear familia de lentes" },
          { status: 500 },
        );
      }

      return NextResponse.json({ family }, { status: 201 });
    }
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error as any);
    } else {
      logger.error("Error in lens families API POST", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }
}

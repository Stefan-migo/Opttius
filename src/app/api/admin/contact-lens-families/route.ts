import { NextRequest } from "next/server";

import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { createContactLensFamilyWithMatricesSchema } from "@/lib/api/validation/zod-schemas";
import { CONTACT_LENS_DEFAULT_MATRICES } from "@/lib/lens-matrices/constants";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

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
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
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
    const includeInactive = searchParams.get("include_inactive") === "true";
    const categorySlug = searchParams.get("category_slug");
    const categoryId = searchParams.get("category_id");
    const modality = searchParams.get("modality");
    const search = searchParams.get("search")?.trim();

    // Build query - include category for display
    let query = supabase
      .from("contact_lens_families")
      .select("*, categories:category_id(id, name, slug)")
      .order("created_at", { ascending: false });

    // Filter by organization_id (multi-tenancy isolation)
    // Even super admins should only see families from their organization (unless root/dev)
    if (userOrganizationId) {
      query = query.eq("organization_id", userOrganizationId);
    } else if (!isSuperAdmin) {
      return createApiSuccessResponse([]);
    }

    // Filter by active status if needed
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Filter by category_id (direct)
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // Filter by category_slug (supports comma-separated)
    if (categorySlug && !categoryId) {
      const slugs = categorySlug
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length > 0) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id")
          .in("slug", slugs);
        const ids = (cats ?? []).map((c) => c.id).filter(Boolean);
        if (ids.length > 0) {
          query = query.in("category_id", ids);
        }
      }
    }

    // Filter by modality (comma-separated: spherical,toric,multifocal)
    if (modality) {
      const modalities = modality
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (modalities.length > 0) {
        query = query.in("modality", modalities);
      }
    }

    // Filter by search (name or brand ILIKE)
    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    const { data: families, error } = await query;

    if (error) {
      logger.error("Error fetching contact lens families", error);
      return createApiErrorResponse(
        new Error("Error al cargar familias de lentes de contacto"),
      );
    }

    return createApiSuccessResponse(families || []);
  } catch (error) {
    logger.error("Error in contact lens families API GET", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
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
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    // Check admin status
    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
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
      return createApiErrorResponse(
        new APIError("Organization not found", 404, "NOT_FOUND"),
      );
    }

    // Validate body (supports optional matrices)
    const body = await parseAndValidateBody(
      request,
      createContactLensFamilyWithMatricesSchema,
    );

    const { matrices: matricesInput, ...familyPayload } = body;

    // Insert contact lens family with organization_id
    const { data: family, error } = await supabase
      .from("contact_lens_families")
      .insert({
        ...familyPayload,
        organization_id: userOrganizationId,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating contact lens family", error);
      return createApiErrorResponse(
        new Error("Error al crear familia de lentes de contacto"),
      );
    }

    // Create price matrices: use provided or defaults (Rango base + Fallback)
    if (family) {
      const matricesToInsert =
        matricesInput && matricesInput.length > 0
          ? matricesInput.map((m) => ({
              contact_lens_family_id: family.id,
              organization_id: userOrganizationId,
              name: m.name ?? null,
              sphere_min: m.sphere_min,
              sphere_max: m.sphere_max,
              cylinder_min: m.cylinder_min,
              cylinder_max: m.cylinder_max,
              axis_min: m.axis_min ?? 0,
              axis_max: m.axis_max ?? 180,
              addition_min: m.addition_min ?? 0,
              addition_max: m.addition_max ?? 4,
              base_price: m.base_price,
              cost: m.cost,
              is_active: m.is_active ?? true,
            }))
          : CONTACT_LENS_DEFAULT_MATRICES.map((m) => ({
              contact_lens_family_id: family.id,
              organization_id: userOrganizationId,
              name: m.name,
              sphere_min: m.sphere_min,
              sphere_max: m.sphere_max,
              cylinder_min: m.cylinder_min,
              cylinder_max: m.cylinder_max,
              axis_min: m.axis_min,
              axis_max: m.axis_max,
              addition_min: m.addition_min,
              addition_max: m.addition_max,
              base_price: m.base_price,
              cost: m.cost,
              is_active: true,
            }));

      const { error: matricesError } = await supabase
        .from("contact_lens_price_matrices")
        .insert(matricesToInsert);

      if (matricesError) {
        logger.error(
          "Error creating contact lens price matrices",
          matricesError,
        );
        return createApiErrorResponse(
          new Error(
            "Familia creada pero error al crear matrices de precios. Edite la familia para agregar matrices.",
          ),
        );
      }
    }

    return createApiSuccessResponse(family, { statusCode: 201 });
  } catch (error) {
    logger.error("Error in contact lens families API POST", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

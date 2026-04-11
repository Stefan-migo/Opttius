import { NextRequest } from "next/server";

import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// GET - List inventory for a family/branch
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const familyId = searchParams.get("contact_lens_family_id");
    const branchId = searchParams.get("branch_id");

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    // Build query
    let query = supabase
      .from("contact_lens_inventory")
      .select("*")
      .order("sphere_min", { ascending: true });

    if (familyId) {
      query = query.eq("contact_lens_family_id", familyId);
    }

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching contact lens inventory:", error);
      return createApiErrorResponse(new Error("Error al cargar inventario"));
    }

    return createApiSuccessResponse(data || []);
  } catch (error) {
    logger.error("Error in contact-lens-inventory GET:", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal error"),
    );
  }
}

// POST - Create inventory entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    // Admin check
    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin required", 403, "FORBIDDEN"),
      );
    }

    const body = await request.json();
    const {
      contact_lens_family_id,
      branch_id,
      sphere_min,
      sphere_max,
      cylinder_min = 0,
      cylinder_max = 0,
      quantity,
      min_stock_threshold = 3,
      notes,
    } = body;

    // Validation
    if (
      !contact_lens_family_id ||
      !branch_id ||
      sphere_min === undefined ||
      sphere_max === undefined ||
      quantity === undefined
    ) {
      return createApiErrorResponse(
        new APIError("Missing required fields", 400, "VALIDATION_ERROR"),
      );
    }

    // Get user org for RLS
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const { data, error } = await supabase
      .from("contact_lens_inventory")
      .insert({
        contact_lens_family_id,
        branch_id,
        sphere_min,
        sphere_max,
        cylinder_min,
        cylinder_max,
        quantity,
        min_stock_threshold,
        notes,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating contact lens inventory:", error);
      return createApiErrorResponse(new Error("Error al crear inventario"));
    }

    return createApiSuccessResponse(data, { statusCode: 201 });
  } catch (error) {
    logger.error("Error in contact-lens-inventory POST:", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal error"),
    );
  }
}

import { NextRequest } from "next/server";

import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// GET - List encargos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const branchId = searchParams.get("branch_id");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customer_id");

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    // Get user's organization and branch access
    const { data: userData } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return createApiErrorResponse(
        new APIError("User not found", 404, "NOT_FOUND"),
      );
    }

    // Build query
    let query = supabase
      .from("contact_lens_encargos")
      .select("*")
      .eq("organization_id", userData.organization_id)
      .order("created_at", { ascending: false });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching encargos:", error);
      return createApiErrorResponse(new Error("Error al cargar encargos"));
    }

    return createApiSuccessResponse(data || []);
  } catch (error) {
    logger.error("Error in contact-lens-encargos GET:", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal error"),
    );
  }
}

// POST - Create encargo
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

    // Get user data and branch access
    const { data: userData } = await supabase
      .from("admin_users")
      .select("id, organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return createApiErrorResponse(
        new APIError("User not found", 404, "NOT_FOUND"),
      );
    }

    // Get branch access
    const { data: branchAccess } = await supabase
      .from("admin_branch_access")
      .select("branch_id")
      .eq("admin_user_id", user.id)
      .limit(1)
      .single();

    if (!branchAccess?.branch_id) {
      return createApiErrorResponse(
        new APIError("No branch access", 403, "FORBIDDEN"),
      );
    }

    const body = await request.json();

    const {
      customer_id,
      customer_name,
      customer_rut,
      customer_phone,
      customer_email,
      contact_lens_family_id,
      family_name,
      family_brand,
      sphere_od,
      cylinder_od,
      axis_od,
      add_od,
      base_curve_od,
      diameter_od,
      sphere_os,
      cylinder_os,
      axis_os,
      add_os,
      base_curve_os,
      diameter_os,
      quantity,
      estimated_price,
      cost,
      notes,
    } = body;

    // Validate required fields
    if (!contact_lens_family_id || !family_name || !sphere_od || !sphere_os) {
      return createApiErrorResponse(
        new APIError("Missing required fields", 400, "BAD_REQUEST"),
      );
    }

    const { data, error } = await supabase
      .from("contact_lens_encargos")
      .insert({
        organization_id: userData.organization_id,
        branch_id: branchAccess.branch_id,
        customer_id,
        customer_name,
        customer_rut,
        customer_phone,
        customer_email,
        contact_lens_family_id,
        family_name,
        family_brand,
        sphere_od,
        cylinder_od: cylinder_od || 0,
        axis_od,
        add_od,
        base_curve_od,
        diameter_od,
        sphere_os,
        cylinder_os: cylinder_os || 0,
        axis_os,
        add_os,
        base_curve_os,
        diameter_os,
        quantity: quantity || 1,
        estimated_price,
        cost,
        notes,
        status: "pending",
        created_by: userData.id,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating encargo:", error);
      return createApiErrorResponse(new Error("Error al crear encargo"));
    }

    return createApiSuccessResponse(data, 201);
  } catch (error) {
    logger.error("Error in contact-lens-encargos POST:", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal error"),
    );
  }
}

// PUT - Update encargo status
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const encargoId = searchParams.get("id");

    if (!encargoId) {
      return createApiErrorResponse(
        new APIError("ID required", 400, "BAD_REQUEST"),
      );
    }

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    const body = await request.json();
    const { status, expected_arrival_date } = body;

    const { data, error } = await supabase
      .from("contact_lens_encargos")
      .update({
        status,
        expected_arrival_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", encargoId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating encargo:", error);
      return createApiErrorResponse(new Error("Error al actualizar encargo"));
    }

    return createApiSuccessResponse(data);
  } catch (error) {
    logger.error("Error in contact-lens-encargos PUT:", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal error"),
    );
  }
}

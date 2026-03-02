import { NextRequest } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { APIError } from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

// GET - Get all prescriptions for a customer
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
      );
    }

    // Verify customer exists and admin has access (customer in same org or super_admin)
    const supabaseServiceRole = createServiceRoleClient();
    const { data: customer, error: custError } = await supabaseServiceRole
      .from("customers")
      .select("id, organization_id")
      .eq("id", id)
      .single();
    if (custError || !customer) {
      return createApiErrorResponse(
        new APIError("Cliente no encontrado", 404, "NOT_FOUND"),
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    const isSuperAdmin = adminUser?.role === "super_admin";
    if (
      !isSuperAdmin &&
      adminUser?.organization_id &&
      customer.organization_id !== adminUser.organization_id
    ) {
      return createApiErrorResponse(
        new APIError("No tiene acceso a este cliente", 403, "FORBIDDEN"),
      );
    }

    // Use service role to bypass RLS - demo/legacy prescriptions may have organization_id=null
    const { data: prescriptions, error } = await supabaseServiceRole
      .from("prescriptions")
      .select("*")
      .eq("customer_id", id)
      .order("prescription_date", { ascending: false });

    if (error) {
      logger.error("Error fetching prescriptions", error);
      return createApiErrorResponse(new Error("Failed to fetch prescriptions"));
    }

    return createApiSuccessResponse(prescriptions || []);
  } catch (error) {
    logger.error("Error in prescriptions API GET", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

// POST - Create a new prescription
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
      );
    }

    const body = await request.json();

    const supabaseServiceRole = createServiceRoleClient();

    // If this is marked as current, unset other current prescriptions
    if (body.is_current) {
      await supabaseServiceRole
        .from("prescriptions")
        .update({ is_current: false })
        .eq("customer_id", id)
        .eq("is_current", true);
    }

    // Get customer's org, branch, and field_operation_id to link prescription correctly
    const { data: customerData } = await supabaseServiceRole
      .from("customers")
      .select("organization_id, branch_id, field_operation_id")
      .eq("id", id)
      .single();

    const { data: prescription, error } = await supabaseServiceRole
      .from("prescriptions")
      .insert({
        customer_id: id,
        organization_id: customerData?.organization_id || null,
        branch_id: customerData?.branch_id || null,
        field_operation_id: customerData?.field_operation_id || null,
        prescription_date:
          body.prescription_date || new Date().toISOString().split("T")[0],
        expiration_date: body.expiration_date || null,
        prescription_number: body.prescription_number || null,
        issued_by: body.issued_by || null,
        issued_by_license: body.issued_by_license || null,
        od_sphere: body.od_sphere || null,
        od_cylinder: body.od_cylinder || null,
        od_axis: body.od_axis || null,
        od_add: body.od_add || null,
        od_pd: body.od_pd || null,
        od_near_pd: body.od_near_pd || null,
        os_sphere: body.os_sphere || null,
        os_cylinder: body.os_cylinder || null,
        os_axis: body.os_axis || null,
        os_add: body.os_add || null,
        os_pd: body.os_pd || null,
        os_near_pd: body.os_near_pd || null,
        frame_pd: body.frame_pd || null,
        height_segmentation: body.height_segmentation || null,
        prescription_type: body.prescription_type || null,
        lens_type: body.lens_type || null,
        lens_material: body.lens_material || null,
        prism_od: body.prism_od || null,
        prism_os: body.prism_os || null,
        tint_od: body.tint_od || null,
        tint_os: body.tint_os || null,
        coatings: body.coatings || [],
        notes: body.notes || null,
        observations: body.observations || null,
        recommendations: body.recommendations || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_current: body.is_current || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating prescription", error);
      return createApiErrorResponse(new Error("Failed to create prescription"));
    }

    return createApiSuccessResponse(prescription, { statusCode: 201 });
  } catch (error) {
    logger.error("Error in create prescription API", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

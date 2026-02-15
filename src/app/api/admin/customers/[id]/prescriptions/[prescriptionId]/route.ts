import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prescriptionId: string }> },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id: customerId, prescriptionId } = await params;

    // Get prescription
    const { data: prescription, error } = await supabaseServiceRole
      .from("prescriptions")
      .select("*")
      .eq("id", prescriptionId)
      .eq("customer_id", customerId)
      .single();

    if (error) {
      logger.error("Error fetching prescription", error);
      return NextResponse.json(
        {
          error: "Prescription not found",
          details: error.message,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      prescription,
    });
  } catch (error) {
    logger.error("Error in prescription get API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prescriptionId: string }> },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id: customerId, prescriptionId } = await params;
    const body = await request.json();

    // If setting as current, unset other current prescriptions
    if (body.is_current) {
      await supabaseServiceRole
        .from("prescriptions")
        .update({ is_current: false })
        .eq("customer_id", customerId)
        .neq("id", prescriptionId);
    }

    // Update prescription
    const { data: updatedPrescription, error } = await supabaseServiceRole
      .from("prescriptions")
      .update({
        prescription_date: body.prescription_date,
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
        is_current: body.is_current !== undefined ? body.is_current : false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prescriptionId)
      .eq("customer_id", customerId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating prescription", error);
      return NextResponse.json(
        {
          error: "Failed to update prescription",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      prescription: updatedPrescription,
    });
  } catch (error) {
    logger.error("Error in prescription update API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prescriptionId: string }> },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id: customerId, prescriptionId } = await params;

    const { error } = await supabaseServiceRole
      .from("prescriptions")
      .delete()
      .eq("id", prescriptionId)
      .eq("customer_id", customerId);

    if (error) {
      logger.error("Error deleting prescription", error);
      return NextResponse.json(
        {
          error: "Failed to delete prescription",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error("Error in prescription delete API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

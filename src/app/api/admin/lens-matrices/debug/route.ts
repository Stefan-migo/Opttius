import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

/**
 * GET /api/admin/lens-matrices/debug
 * Debug endpoint to see what matrices exist for a lens family and prescription parameters
 *
 * Query parameters:
 * - lens_family_id: UUID of the lens family
 * - sphere: Sphere value (required)
 * - cylinder: Cylinder value (default: 0)
 * - addition: Addition value for presbyopia (optional)
 */
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const lensFamilyId = searchParams.get("lens_family_id");
    const sphereParam = searchParams.get("sphere");
    const cylinderParam = searchParams.get("cylinder");
    const additionParam = searchParams.get("addition");

    // Validate required parameters
    if (!lensFamilyId) {
      return NextResponse.json(
        { error: "lens_family_id is required" },
        { status: 400 },
      );
    }

    if (!sphereParam) {
      return NextResponse.json(
        { error: "sphere is required" },
        { status: 400 },
      );
    }

    const sphere = parseFloat(sphereParam);
    if (isNaN(sphere)) {
      return NextResponse.json(
        { error: "sphere must be a valid number" },
        { status: 400 },
      );
    }

    const cylinder = cylinderParam ? parseFloat(cylinderParam) : 0;
    const addition = additionParam ? parseFloat(additionParam) : null;

    // Get lens family info
    const { data: lensFamily, error: familyError } = await supabase
      .from("lens_families")
      .select("*")
      .eq("id", lensFamilyId)
      .single();

    if (familyError || !lensFamily) {
      return NextResponse.json(
        { error: "Lens family not found", details: familyError?.message },
        { status: 404 },
      );
    }

    // Get all matrices for this family
    const { data: allMatrices, error: matricesError } = await supabase
      .from("lens_price_matrices")
      .select("*")
      .eq("lens_family_id", lensFamilyId)
      .eq("is_active", true)
      .order("sphere_min", { ascending: true });

    if (matricesError) {
      logger.error("Error fetching lens matrices", matricesError);
      return NextResponse.json(
        { error: "Error fetching matrices", details: matricesError.message },
        { status: 500 },
      );
    }

    // Find matching matrices based on sphere and cylinder
    const matchingMatrices = (allMatrices || []).filter((matrix) => {
      const sphereMatch =
        sphere >= matrix.sphere_min && sphere <= matrix.sphere_max;
      const cylinderMatch =
        cylinder >= matrix.cylinder_min && cylinder <= matrix.cylinder_max;
      let additionMatch = true;
      if (
        addition !== null &&
        matrix.addition_min !== null &&
        matrix.addition_max !== null
      ) {
        additionMatch =
          addition >= matrix.addition_min && addition <= matrix.addition_max;
      }
      return sphereMatch && cylinderMatch && additionMatch;
    });

    // Try to calculate price using the function
    let calculationResult = null;
    let calculationError = null;
    try {
      const { data: calc, error: calcError } = await supabase.rpc(
        "calculate_lens_price",
        {
          p_lens_family_id: lensFamilyId,
          p_sphere: sphere,
          p_cylinder: cylinder,
          p_addition: addition,
          p_sourcing_type: null,
        },
      );
      if (calcError) {
        calculationError = calcError.message;
      } else {
        calculationResult = Array.isArray(calc) ? calc[0] : calc;
      }
    } catch (err: any) {
      calculationError = err.message;
    }

    return NextResponse.json({
      lens_family: {
        id: lensFamily.id,
        name: lensFamily.name,
        brand: lensFamily.brand,
        lens_type: lensFamily.lens_type,
        lens_material: lensFamily.lens_material,
        is_active: lensFamily.is_active,
      },
      search_params: {
        sphere,
        cylinder,
        addition,
      },
      total_matrices: allMatrices?.length || 0,
      matching_matrices: matchingMatrices.length,
      all_matrices: allMatrices || [],
      matching_matrices_detail: matchingMatrices,
      calculation_result: calculationResult,
      calculation_error: calculationError,
    });
  } catch (error) {
    logger.error("Error in lens price matrix debug API", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

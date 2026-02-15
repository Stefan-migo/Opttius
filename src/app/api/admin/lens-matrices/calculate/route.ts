import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { APIError } from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

/**
 * GET /api/admin/lens-matrices/calculate
 * Calculates lens price based on lens family, sphere, cylinder, and optional addition
 *
 * Query parameters:
 * - lens_family_id: UUID of the lens family
 * - sphere: Sphere value (required)
 * - cylinder: Cylinder value (default: 0)
 * - addition: Addition value for presbyopia (optional)
 * - sourcing_type: 'stock' or 'surfaced' (optional)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const lensFamilyId = searchParams.get("lens_family_id");
    const sphereParam = searchParams.get("sphere");
    const cylinderParam = searchParams.get("cylinder");
    const additionParam = searchParams.get("addition");
    const sourcingType = searchParams.get("sourcing_type") as
      | "stock"
      | "surfaced"
      | null;

    // Validate required parameters
    if (!lensFamilyId) {
      return createApiErrorResponse(
        new APIError("lens_family_id is required", 400, "BAD_REQUEST"),
      );
    }

    if (!sphereParam) {
      return createApiErrorResponse(
        new APIError("sphere is required", 400, "BAD_REQUEST"),
      );
    }

    const sphere = parseFloat(sphereParam);
    if (isNaN(sphere)) {
      return createApiErrorResponse(
        new APIError("sphere must be a valid number", 400, "BAD_REQUEST"),
      );
    }

    const cylinder = cylinderParam ? parseFloat(cylinderParam) : 0;
    if (isNaN(cylinder)) {
      return createApiErrorResponse(
        new APIError("cylinder must be a valid number", 400, "BAD_REQUEST"),
      );
    }

    // For presbyopia (addition), we need to calculate the near sphere
    // The near sphere = far sphere + addition
    // But for the price matrix, we use the sphere value directly (the matrix should account for addition ranges)
    // However, if addition is provided, we might need to adjust the sphere calculation
    // For now, we'll use the sphere as-is and let the matrix handle it
    // Note: The SQL function calculate_lens_price doesn't use addition parameter,
    // so we'll calculate the effective sphere if addition is provided
    let effectiveSphere = sphere;
    if (additionParam) {
      const addition = parseFloat(additionParam);
      if (!isNaN(addition) && addition > 0) {
        // For progressive/bifocal/trifocal lenses, the addition is already accounted for
        // in the lens family type, so we use the far sphere for the matrix lookup
        // The matrix should be set up for the base sphere range
        effectiveSphere = sphere;
      }
    }

    // Parse addition if provided
    const addition = additionParam ? parseFloat(additionParam) : null;
    const validAddition =
      addition !== null && !isNaN(addition) && addition >= 0 ? addition : null;

    // Call the SQL function to calculate lens price
    // The function signature supports: p_lens_family_id, p_sphere, p_cylinder, p_addition, p_sourcing_type
    const { data: calculation, error } = await supabase.rpc(
      "calculate_lens_price",
      {
        p_lens_family_id: lensFamilyId,
        p_sphere: sphere, // Use sphere directly (far sphere for progressive lenses)
        p_cylinder: cylinder,
        p_addition: validAddition,
        p_sourcing_type: sourcingType || null,
      },
    );

    if (error) {
      logger.error("Error calculating lens price", error);
      return createApiErrorResponse(
        new Error(`Error al calcular el precio del lente: ${error.message}`),
      );
    }

    // If no result found, return appropriate error
    if (!calculation || calculation.length === 0) {
      return createApiErrorResponse(
        new APIError(
          "No se encontró una matriz de precios para los parámetros especificados",
          404,
          "NOT_FOUND",
        ),
      );
    }

    // The RPC function returns an array, get the first result
    const result = Array.isArray(calculation) ? calculation[0] : calculation;

    return createApiSuccessResponse({
      calculation: {
        price: parseFloat(result.price),
        sourcing_type: result.sourcing_type,
        cost: parseFloat(result.cost),
      },
    });
  } catch (error) {
    logger.error("Error in lens price calculation API", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

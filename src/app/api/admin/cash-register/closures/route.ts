import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import {
  getBranchContext,
  getFieldOperationFromRequest,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

/**
 * GET /api/admin/cash-register/closures
 * Get list of cash register closures
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
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

    // Get branch context and optional operativo context
    const branchContext = await getBranchContext(request, user.id);
    const fieldOperationId =
      getFieldOperationFromRequest(request) ||
      new URL(request.url).searchParams.get("field_operation_id");

    let effectiveBranchId = branchContext.branchId;
    if (fieldOperationId) {
      const { data: fieldOp } = await supabaseServiceRole
        .from("field_operations")
        .select("id, branch_id")
        .eq("id", fieldOperationId)
        .single();
      if (!fieldOp) {
        return NextResponse.json({
          closures: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        });
      }
      const hasAccess = await validateBranchAccess(user.id, fieldOp.branch_id);
      if (!hasAccess) {
        return NextResponse.json({
          closures: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        });
      }
      effectiveBranchId = fieldOp.branch_id;
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Build query
    let query = supabaseServiceRole
      .from("cash_register_closures")
      .select(
        `
        *,
        branch:branches(id, name, code)
      `,
        { count: "exact" },
      )
      .order("closure_date", { ascending: false })
      .order("closed_at", { ascending: false });

    // Apply branch filter
    if (effectiveBranchId) {
      query = query.eq("branch_id", effectiveBranchId);
      if (fieldOperationId) {
        query = query.eq("field_operation_id", fieldOperationId);
      } else {
        query = query.is("field_operation_id", null);
      }
    } else if (!branchContext.isSuperAdmin) {
      // Regular admin without branch - return empty
      return NextResponse.json({
        closures: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Apply date filters
    if (startDate) {
      query = query.gte("closure_date", startDate);
    }
    if (endDate) {
      query = query.lte("closure_date", endDate);
    }

    const {
      data: closures,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      logger.error("Error fetching closures:", {
        error,
        branchId: branchContext.branchId,
      });
      return NextResponse.json(
        {
          error: "Error al obtener cierres de caja",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Fetch user profiles separately
    const closuresWithUsers = await Promise.all(
      (closures || []).map(async (closure: any) => {
        if (closure.closed_by) {
          const { data: profile } = await supabaseServiceRole
            .from("profiles")
            .select("id, first_name, last_name")
            .eq("id", closure.closed_by)
            .single();

          return {
            ...closure,
            closed_by_user: profile || null,
          };
        }
        return {
          ...closure,
          closed_by_user: null,
        };
      }),
    );

    return NextResponse.json({
      closures: closuresWithUsers,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    logger.error("Error in cash register closures API:", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

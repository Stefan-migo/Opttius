import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createPaginatedResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();

  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthenticationError("Unauthorized");
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      throw new AuthorizationError("Admin access required");
    }

    const { id: fieldOperationId } = await params;

    const { data: operation, error: opError } = await supabaseServiceRole
      .from("field_operations")
      .select("id, branch_id")
      .eq("id", fieldOperationId)
      .single();

    if (opError || !operation) {
      return NextResponse.json(
        { error: "Operativo no encontrado" },
        { status: 404 },
      );
    }

    const hasAccess = await validateBranchAccess(user.id, operation.branch_id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tiene acceso a este operativo" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabaseServiceRole
      .from("lab_work_orders")
      .select(
        `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(id)
      `,
        { count: "exact" },
      )
      .eq("field_operation_id", fieldOperationId)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: workOrders, error, count } = await query.range(from, to);

    if (error) {
      logger.error("Error fetching work orders for field operation", {
        error,
        fieldOperationId,
        requestId,
      });
      throw new Error(`Failed to fetch work orders: ${error.message}`);
    }

    return createPaginatedResponse(
      workOrders || [],
      { page, limit, total: count || 0 },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in field-operations work-orders API GET", {
      error,
      requestId,
    });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

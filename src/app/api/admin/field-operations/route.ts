import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createPaginatedResponse,
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import { createFieldOperationSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { ValidationError } from "@/lib/api/errors";
import { validateFeature } from "@/lib/saas/tier-validator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const supabase = await createClient();

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

    const branchContext = await getBranchContext(request, user.id);
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const orgId = branchContext.organizationId ?? adminUser?.organization_id;
    if (orgId) {
      const hasFieldOps = await validateFeature(orgId, "field_operations");
      if (!hasFieldOps) {
        return NextResponse.json(
          {
            error:
              "Operativos en Terreno requiere el plan Óptica Avanzada. Upgrade para habilitar.",
          },
          { status: 403 },
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("field_operations")
      .select("*", { count: "exact" })
      .order("scheduled_date", { ascending: false });

    query = addBranchFilter(
      query,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: operations, error, count } = await query.range(from, to);

    if (error) {
      logger.error("Error fetching field operations", { error, requestId });
      throw new Error(`Failed to fetch field operations: ${error.message}`);
    }

    return createPaginatedResponse(
      operations || [],
      { page, limit, total: count || 0 },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in field operations API GET", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

export async function POST(request: NextRequest) {
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

    let validatedBody;
    try {
      validatedBody = await parseAndValidateBody(
        request,
        createFieldOperationSchema,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const branchContext = await getBranchContext(request, user.id);

    if (!branchContext.isSuperAdmin && !branchContext.branchId) {
      return NextResponse.json(
        { error: "Debe seleccionar una sucursal para crear operativos" },
        { status: 400 },
      );
    }

    const branchId = validatedBody.branch_id || branchContext.branchId;
    if (!branchId) {
      return NextResponse.json(
        { error: "branch_id es requerido" },
        { status: 400 },
      );
    }

    const { data: branch } = await supabaseServiceRole
      .from("branches")
      .select("organization_id")
      .eq("id", branchId)
      .single();

    if (!branch?.organization_id) {
      return NextResponse.json(
        { error: "Sucursal no encontrada o sin organización" },
        { status: 400 },
      );
    }

    const hasFieldOps = await validateFeature(
      branch.organization_id,
      "field_operations",
    );
    if (!hasFieldOps) {
      return NextResponse.json(
        {
          error:
            "Operativos en Terreno requiere el plan Óptica Avanzada. Upgrade para habilitar.",
        },
        { status: 403 },
      );
    }

    const scheduledDate =
      validatedBody.scheduled_date instanceof Date
        ? validatedBody.scheduled_date.toISOString().slice(0, 10)
        : new Date(validatedBody.scheduled_date).toISOString().slice(0, 10);

    const { data: newOperation, error: insertError } = await supabaseServiceRole
      .from("field_operations")
      .insert({
        name: validatedBody.name,
        scheduled_date: scheduledDate,
        location: validatedBody.location ?? null,
        branch_id: branchId,
        organization_id: branch.organization_id,
        status: "prepared",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("Error creating field operation", {
        insertError,
        requestId,
      });
      return NextResponse.json(
        {
          error: "Error al crear operativo",
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    logger.info("Field operation created", {
      id: newOperation.id,
      name: newOperation.name,
      requestId,
    });

    return createApiSuccessResponse(
      { fieldOperation: newOperation },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in field operations API POST", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

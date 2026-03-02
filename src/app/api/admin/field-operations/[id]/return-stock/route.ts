import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import {
  validateBranchAccess,
  getBranchContext,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import {
  returnStockSchema,
  returnStockBulkSchema,
} from "@/lib/api/validation/zod-schemas";
import {
  validateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { ValidationError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function POST(
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
      .select("id, branch_id, organization_id, status")
      .eq("id", fieldOperationId)
      .single();

    if (opError || !operation) {
      return NextResponse.json(
        { error: "Operativo no encontrado" },
        { status: 404 },
      );
    }

    let hasAccess = await validateBranchAccess(user.id, operation.branch_id);
    if (!hasAccess) {
      const branchContext = await getBranchContext(request, user.id);
      if (
        branchContext.isSuperAdmin &&
        branchContext.organizationId &&
        operation.organization_id === branchContext.organizationId
      ) {
        hasAccess = true;
      }
    }
    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tiene acceso a este operativo" },
        { status: 403 },
      );
    }

    let items: { product_id: string; quantity: number }[];
    try {
      const body = (await request.json()) as unknown;
      if (
        body &&
        typeof body === "object" &&
        "items" in body &&
        Array.isArray((body as { items: unknown }).items)
      ) {
        const validated = validateBody(body, returnStockBulkSchema);
        items = validated.items;
      } else {
        const validated = validateBody(body, returnStockSchema);
        items = [
          { product_id: validated.product_id, quantity: validated.quantity },
        ];
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        return validationErrorResponse(err);
      }
      if (err && typeof err === "object" && "errors" in err) {
        return validationErrorResponse(err as unknown as ValidationError);
      }
      throw err;
    }

    const branchId = operation.branch_id;
    const results: {
      product_id: string;
      quantity: number;
      success: boolean;
      error?: string;
    }[] = [];

    for (const item of items) {
      try {
        const { data: mobileStock } = await supabaseServiceRole
          .from("operativo_mobile_stock")
          .select("id, quantity")
          .eq("field_operation_id", fieldOperationId)
          .eq("product_id", item.product_id)
          .single();

        if (!mobileStock || mobileStock.quantity < item.quantity) {
          results.push({
            product_id: item.product_id,
            quantity: item.quantity,
            success: false,
            error: "Stock insuficiente en bodega móvil",
          });
          continue;
        }

        const { error: stockError } = await supabaseServiceRole.rpc(
          "update_product_stock",
          {
            p_product_id: item.product_id,
            p_branch_id: branchId,
            p_quantity_change: item.quantity,
            p_reserve: false,
            p_movement_type: "receipt",
            p_reference_type: "field_operation_return",
            p_reference_id: fieldOperationId,
            p_created_by: user.id,
          },
        );

        if (stockError) {
          results.push({
            product_id: item.product_id,
            quantity: item.quantity,
            success: false,
            error: stockError.message,
          });
          continue;
        }

        const newQuantity = mobileStock.quantity - item.quantity;
        if (newQuantity <= 0) {
          await supabaseServiceRole
            .from("operativo_mobile_stock")
            .delete()
            .eq("id", mobileStock.id);
        } else {
          await supabaseServiceRole
            .from("operativo_mobile_stock")
            .update({
              quantity: newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", mobileStock.id);
        }

        results.push({
          product_id: item.product_id,
          quantity: item.quantity,
          success: true,
        });
      } catch (err) {
        results.push({
          product_id: item.product_id,
          quantity: item.quantity,
          success: false,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    const { data: remainingStock } = await supabaseServiceRole
      .from("operativo_mobile_stock")
      .select("id")
      .eq("field_operation_id", fieldOperationId);

    const allReturned = !remainingStock || remainingStock.length === 0;
    if (allReturned && results.some((r) => r.success)) {
      await supabaseServiceRole
        .from("field_operations")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", fieldOperationId);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return createApiSuccessResponse(
      {
        results,
        successCount,
        failCount,
        statusUpdated: allReturned && successCount > 0,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in return-stock API", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

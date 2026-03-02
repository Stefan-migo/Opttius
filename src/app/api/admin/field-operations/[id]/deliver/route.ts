import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import { deliverFieldOperationSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
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

    let validatedBody;
    try {
      validatedBody = await parseAndValidateBody(
        request,
        deliverFieldOperationSchema,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const deliveredAt = validatedBody.delivered_at
      ? validatedBody.delivered_at.toISOString()
      : new Date().toISOString();

    const updated: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const workOrderId of validatedBody.work_order_ids) {
      const { data: wo } = await supabaseServiceRole
        .from("lab_work_orders")
        .select("id, field_operation_id, status, pos_order_id")
        .eq("id", workOrderId)
        .single();

      if (!wo || wo.field_operation_id !== fieldOperationId) {
        failed.push({
          id: workOrderId,
          error: "Trabajo no encontrado o no pertenece a este operativo",
        });
        continue;
      }

      if (wo.status === "delivered") {
        failed.push({ id: workOrderId, error: "Trabajo ya entregado" });
        continue;
      }

      if (wo.pos_order_id) {
        const { data: balance } = await supabaseServiceRole.rpc(
          "calculate_order_balance",
          { p_order_id: wo.pos_order_id },
        );
        if ((balance ?? 0) > 0) {
          failed.push({
            id: workOrderId,
            error: `Saldo pendiente: $${(balance as number).toLocaleString("es-CL")}`,
          });
          continue;
        }
      }

      const { error: statusError } = await supabaseServiceRole.rpc(
        "update_work_order_status",
        {
          p_work_order_id: workOrderId,
          p_new_status: "delivered",
          p_changed_by: user.id,
          p_notes: `Entrega en empresa: ${validatedBody.recipient_name}. ${validatedBody.notes || ""}`,
        },
      );

      if (statusError) {
        failed.push({
          id: workOrderId,
          error: statusError.message,
        });
        continue;
      }

      await supabaseServiceRole
        .from("lab_work_orders")
        .update({
          operativo_delivered_at: deliveredAt,
          operativo_recipient_name: validatedBody.recipient_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workOrderId);

      updated.push(workOrderId);
    }

    return createApiSuccessResponse(
      {
        updated,
        failed,
        deliveredAt,
        recipientName: validatedBody.recipient_name,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in field-operations deliver API", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

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
import { updateFieldOperationSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { ValidationError } from "@/lib/api/errors";

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

    const { id } = await params;

    const { data: operation, error: opError } = await supabaseServiceRole
      .from("field_operations")
      .select("*")
      .eq("id", id)
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

    const { data: mobileStock } = await supabaseServiceRole
      .from("operativo_mobile_stock")
      .select(
        `
        id,
        product_id,
        quantity,
        reserved_quantity,
        products(id, name, sku)
      `,
      )
      .eq("field_operation_id", id);

    return createApiSuccessResponse(
      {
        fieldOperation: operation,
        mobileStock: mobileStock || [],
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in field operations API GET [id]", {
      error,
      requestId,
    });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

export async function PUT(
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

    const { id } = await params;

    const { data: existing } = await supabaseServiceRole
      .from("field_operations")
      .select("id, branch_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Operativo no encontrado" },
        { status: 404 },
      );
    }

    const hasAccess = await validateBranchAccess(user.id, existing.branch_id);
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
        updateFieldOperationSchema,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedBody.name !== undefined) updateData.name = validatedBody.name;
    if (validatedBody.location !== undefined)
      updateData.location = validatedBody.location;
    if (validatedBody.status !== undefined)
      updateData.status = validatedBody.status;
    if (validatedBody.scheduled_date !== undefined) {
      updateData.scheduled_date =
        validatedBody.scheduled_date instanceof Date
          ? validatedBody.scheduled_date.toISOString().slice(0, 10)
          : new Date(validatedBody.scheduled_date).toISOString().slice(0, 10);
    }

    const { data: updated, error: updateError } = await supabaseServiceRole
      .from("field_operations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating field operation", {
        updateError,
        requestId,
      });
      return NextResponse.json(
        {
          error: "Error al actualizar operativo",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    return createApiSuccessResponse({ fieldOperation: updated }, { requestId });
  } catch (error) {
    logger.error("Error in field operations API PUT [id]", {
      error,
      requestId,
    });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

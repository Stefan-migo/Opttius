import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { updatePurchaseOrderSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as unknown)(
      request,
      async () => {
        const { id: purchaseOrderId } = await params;
        const supabase = await createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: isAdmin } = (await supabase.rpc("is_admin", {
          user_id: user.id,
        } as IsAdminParams)) as { data: IsAdminResult | null };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        const { data: existing } = await supabase
          .from("agreement_purchase_orders")
          .select("id")
          .eq("id", purchaseOrderId)
          .single();

        if (!existing) {
          return NextResponse.json(
            { error: "Orden de compra no encontrada" },
            { status: 404 },
          );
        }

        let body;
        try {
          body = await parseAndValidateBody(request, updatePurchaseOrderSchema);
        } catch (error) {
          if (error instanceof ValidationError) {
            return validationErrorResponse(error);
          }
          throw error;
        }

        const updateData: Record<string, unknown> = {};
        if (body.oc_number !== undefined)
          updateData.oc_number = body.oc_number.trim();
        if (body.issued_at !== undefined)
          updateData.issued_at =
            body.issued_at == null || body.issued_at === ""
              ? null
              : typeof body.issued_at === "string"
                ? body.issued_at
                : (body.issued_at as Date).toISOString().split("T")[0];
        if (body.valid_until !== undefined)
          updateData.valid_until =
            body.valid_until == null || body.valid_until === ""
              ? null
              : typeof body.valid_until === "string"
                ? body.valid_until
                : (body.valid_until as Date).toISOString().split("T")[0];
        if (body.max_amount !== undefined)
          updateData.max_amount = body.max_amount;
        if (body.notes !== undefined) updateData.notes = body.notes ?? null;
        if (body.status !== undefined) updateData.status = body.status;

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json(
            { error: "No hay campos para actualizar" },
            { status: 400 },
          );
        }

        const { data: purchaseOrder, error } = await supabase
          .from("agreement_purchase_orders")
          .update(updateData)
          .eq("id", purchaseOrderId)
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return NextResponse.json(
              { error: "Ya existe una OC con ese número para este convenio" },
              { status: 409 },
            );
          }
          logger.error("Error updating purchase order", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        return createApiSuccessResponse(purchaseOrder);
      },
    );
  } catch (error) {
    logger.error("Purchase order PUT error", { error });
    return createApiErrorResponse(error as Error);
  }
}

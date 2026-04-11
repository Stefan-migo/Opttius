import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { updateAgreementSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { normalizeRUT } from "@/lib/utils/rut";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const { data: agreement, error } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !agreement) {
      return NextResponse.json(
        { error: "Convenio no encontrado" },
        { status: 404 },
      );
    }

    const { data: purchaseOrders } = await supabase
      .from("agreement_purchase_orders")
      .select("*")
      .eq("agreement_id", id)
      .order("created_at", { ascending: false });

    const { data: pendingBalances } = await supabase
      .from("agreement_institutional_balances")
      .select("id, order_id, amount, status, created_at")
      .eq("agreement_id", id)
      .eq("status", "pending");

    return createApiSuccessResponse({
      ...agreement,
      purchase_orders: purchaseOrders || [],
      pending_balances: pendingBalances || [],
    });
  } catch (error) {
    logger.error("Agreement GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as unknown)(
      request,
      async () => {
        const { id } = await params;
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
          .from("agreements")
          .select("id")
          .eq("id", id)
          .single();

        if (!existing) {
          return NextResponse.json(
            { error: "Convenio no encontrado" },
            { status: 404 },
          );
        }

        let body;
        try {
          body = await parseAndValidateBody(request, updateAgreementSchema);
        } catch (error) {
          if (error instanceof ValidationError) {
            return validationErrorResponse(error);
          }
          throw error;
        }

        const updateData: Record<string, unknown> = {
          updated_by: user.id,
        };

        if (body.name !== undefined) updateData.name = body.name;
        if (body.agreement_type !== undefined)
          updateData.agreement_type = body.agreement_type;
        if (body.institution_name !== undefined)
          updateData.institution_name = body.institution_name;
        if (body.institution_rut !== undefined)
          updateData.institution_rut = normalizeRUT(body.institution_rut);
        if (body.representative_name !== undefined)
          updateData.representative_name = body.representative_name;
        if (body.representative_email !== undefined)
          updateData.representative_email = body.representative_email;
        if (body.representative_phone !== undefined)
          updateData.representative_phone = body.representative_phone;
        if (body.valid_from !== undefined)
          updateData.valid_from =
            typeof body.valid_from === "string"
              ? body.valid_from
              : (body.valid_from as Date).toISOString().split("T")[0];
        if (body.valid_until !== undefined)
          updateData.valid_until =
            body.valid_until == null || body.valid_until === ""
              ? null
              : typeof body.valid_until === "string"
                ? body.valid_until
                : (body.valid_until as Date).toISOString().split("T")[0];
        if (body.branch_id !== undefined) updateData.branch_id = body.branch_id;
        if (body.billing_rules !== undefined)
          updateData.billing_rules = body.billing_rules;
        if (body.max_installments_by_product !== undefined)
          updateData.max_installments_by_product =
            body.max_installments_by_product;
        if (body.discount_percent !== undefined)
          updateData.discount_percent = body.discount_percent;
        if (body.notes !== undefined) updateData.notes = body.notes;

        const { data: agreement, error } = await supabase
          .from("agreements")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          logger.error("Error updating agreement", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        return createApiSuccessResponse(agreement);
      },
    );
  } catch (error) {
    logger.error("Agreement PUT error", { error });
    return createApiErrorResponse(error as Error);
  }
}

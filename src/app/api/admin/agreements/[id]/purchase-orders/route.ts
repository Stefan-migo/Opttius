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
import { createPurchaseOrderSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: agreementId } = await params;
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

    const { data: agreement } = await supabase
      .from("agreements")
      .select("id")
      .eq("id", agreementId)
      .single();

    if (!agreement) {
      return NextResponse.json(
        { error: "Convenio no encontrado" },
        { status: 404 },
      );
    }

    const { data: purchaseOrders, error } = await supabase
      .from("agreement_purchase_orders")
      .select("*")
      .eq("agreement_id", agreementId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching purchase orders", { error });
      return createApiErrorResponse(new Error(error.message));
    }

    return createApiSuccessResponse(purchaseOrders || []);
  } catch (error) {
    logger.error("Purchase orders GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as unknown)(
      request,
      async () => {
        const { id: agreementId } = await params;
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

        const { data: agreement } = await supabase
          .from("agreements")
          .select("id")
          .eq("id", agreementId)
          .single();

        if (!agreement) {
          return NextResponse.json(
            { error: "Convenio no encontrado" },
            { status: 404 },
          );
        }

        let body;
        try {
          body = await parseAndValidateBody(request, createPurchaseOrderSchema);
        } catch (error) {
          if (error instanceof ValidationError) {
            return validationErrorResponse(error);
          }
          throw error;
        }

        if (body.agreement_id !== agreementId) {
          return NextResponse.json(
            { error: "El agreement_id no coincide con el convenio" },
            { status: 400 },
          );
        }

        const issuedAt =
          body.issued_at == null || body.issued_at === ""
            ? null
            : typeof body.issued_at === "string"
              ? body.issued_at
              : (body.issued_at as Date).toISOString().split("T")[0];
        const validUntil =
          body.valid_until == null || body.valid_until === ""
            ? null
            : typeof body.valid_until === "string"
              ? body.valid_until
              : (body.valid_until as Date).toISOString().split("T")[0];

        const { data: purchaseOrder, error } = await supabase
          .from("agreement_purchase_orders")
          .insert({
            agreement_id: agreementId,
            oc_number: body.oc_number.trim(),
            issued_at: issuedAt,
            valid_until: validUntil,
            max_amount: body.max_amount ?? null,
            status: "active",
            notes: body.notes || null,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return NextResponse.json(
              { error: "Ya existe una OC con ese número para este convenio" },
              { status: 409 },
            );
          }
          logger.error("Error creating purchase order", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        return createApiSuccessResponse(purchaseOrder, { statusCode: 201 });
      },
    );
  } catch (error) {
    logger.error("Purchase order POST error", { error });
    return createApiErrorResponse(error as Error);
  }
}

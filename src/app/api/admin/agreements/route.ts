import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  createPaginatedResponse,
} from "@/lib/api/response";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import {
  agreementListQuerySchema,
  createAgreementSchema,
} from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { validateFeature } from "@/lib/saas/tier-validator";
import { normalizeRUT } from "@/lib/utils/rut";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as unknown)(
      request,
      async () => {
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

        const branchContext = await getBranchContext(request, user.id);
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        const orgId = adminUser?.organization_id;
        if (!orgId && !branchContext.isSuperAdmin) {
          return NextResponse.json(
            { error: "Organization context required" },
            { status: 400 },
          );
        }

        if (orgId) {
          const hasAgreements = await validateFeature(orgId, "agreements");
          if (!hasAgreements) {
            return NextResponse.json(
              {
                error:
                  "Gestión de Convenios requiere el plan Óptica Avanzada. Upgrade para habilitar.",
              },
              { status: 403 },
            );
          }
        }

        let queryParams;
        try {
          queryParams = parseAndValidateQuery(
            request,
            agreementListQuerySchema,
          );
        } catch (error) {
          if (error instanceof ValidationError) {
            return validationErrorResponse(error);
          }
          throw error;
        }

        const page = queryParams.page ?? 1;
        const limit = queryParams.limit ?? 20;
        const offset = (page - 1) * limit;

        let query = supabase.from("agreements").select("*", { count: "exact" });

        if (orgId) {
          query = query.eq("organization_id", orgId);
        }

        if (queryParams.status) {
          query = query.eq("status", queryParams.status);
        }
        if (queryParams.agreement_type) {
          query = query.eq("agreement_type", queryParams.agreement_type);
        }
        if (queryParams.branch_id) {
          query = query.eq("branch_id", queryParams.branch_id);
        } else if (branchContext.branchId && !branchContext.isSuperAdmin) {
          query = query.or(
            `branch_id.eq.${branchContext.branchId},branch_id.is.null`,
          );
        }

        const {
          data: agreements,
          error,
          count,
        } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          logger.error("Error fetching agreements", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        return createPaginatedResponse(agreements || [], {
          page,
          limit,
          total: count ?? 0,
        });
      },
    );
  } catch (error) {
    logger.error("Agreements GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as unknown)(
      request,
      async () => {
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

        const branchContext = await getBranchContext(request, user.id);
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        const orgId = adminUser?.organization_id;
        if (!orgId) {
          return NextResponse.json(
            { error: "Organization context required" },
            { status: 400 },
          );
        }

        const hasAgreements = await validateFeature(orgId, "agreements");
        if (!hasAgreements) {
          return NextResponse.json(
            {
              error:
                "Gestión de Convenios requiere el plan Óptica Avanzada. Upgrade para habilitar.",
            },
            { status: 403 },
          );
        }

        let body;
        try {
          body = await parseAndValidateBody(request, createAgreementSchema);
        } catch (error) {
          if (error instanceof ValidationError) {
            return validationErrorResponse(error);
          }
          throw error;
        }

        const institutionRut = normalizeRUT(body.institution_rut);
        const validFrom =
          typeof body.valid_from === "string"
            ? body.valid_from
            : (body.valid_from as Date).toISOString().split("T")[0];
        const validUntil =
          body.valid_until == null || body.valid_until === ""
            ? null
            : typeof body.valid_until === "string"
              ? body.valid_until
              : (body.valid_until as Date).toISOString().split("T")[0];

        const { data: agreement, error } = await supabase
          .from("agreements")
          .insert({
            organization_id: orgId,
            branch_id: body.branch_id || null,
            name: body.name,
            agreement_type: body.agreement_type,
            institution_name: body.institution_name,
            institution_rut: institutionRut,
            representative_name: body.representative_name || null,
            representative_email: body.representative_email || null,
            representative_phone: body.representative_phone || null,
            valid_from: validFrom,
            valid_until: validUntil,
            status: "active",
            billing_rules: body.billing_rules || {},
            max_installments_by_product: body.max_installments_by_product || {},
            discount_percent: body.discount_percent ?? null,
            notes: body.notes || null,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) {
          logger.error("Error creating agreement", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        return createApiSuccessResponse(agreement, { statusCode: 201 });
      },
    );
  } catch (error) {
    logger.error("Agreements POST error", { error });
    return createApiErrorResponse(error as Error);
  }
}

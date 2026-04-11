import { NextRequest } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import {
  APIError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createPaginatedResponse,
} from "@/lib/api/response";
import {
  parseAndValidateQuery,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { prescriptionListQuerySchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { normalizeRUT } from "@/lib/utils/rut";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Prescriptions API GET called", { requestId });

    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("User authentication failed", {
        error: userError,
        requestId,
      });
      throw new AuthenticationError("Unauthorized");
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email, requestId });
      throw new AuthorizationError("Admin access required");
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Parse and validate query params
    let queryParams;
    try {
      queryParams = parseAndValidateQuery(request, prescriptionListQuerySchema);
    } catch (error) {
      return validationErrorResponse(
        error as Parameters<typeof validationErrorResponse>[0],
      );
    }

    const {
      q,
      search,
      rut,
      date_from,
      date_to,
      issued_by,
      branch_id: queryBranchId,
      page,
      limit,
    } = queryParams;

    const searchTerm = (q || search || "").trim();
    const normalizedRut = rut ? normalizeRUT(rut) : "";

    // Resolve branch filter: query param overrides header.
    // Only super admin in global view (branchId=null) can see all branches.
    const effectiveBranchId = queryBranchId ?? branchContext.branchId;

    if (!branchContext.isSuperAdmin && effectiveBranchId === null) {
      return createApiErrorResponse(
        new APIError(
          "Seleccione una sucursal para ver las recetas. Solo super administradores en vista global pueden ver todas las sucursales.",
          403,
          "FORBIDDEN",
        ),
        { requestId },
      );
    }

    // Build base query
    let query = supabaseServiceRole
      .from("prescriptions")
      .select("*", { count: "exact" })
      .order("prescription_date", { ascending: false });

    // Apply branch filter (prescriptions has organization_id and branch_id)
    query = addBranchFilter(
      query,
      effectiveBranchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    // Filter by customer search (q or rut)
    if (searchTerm || normalizedRut) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      const userOrganizationId =
        adminUser?.organization_id || branchContext.organizationId;

      if (userOrganizationId) {
        let customersQuery = supabaseServiceRole
          .from("customers")
          .select("id, rut, first_name, last_name, email")
          .eq("organization_id", userOrganizationId)
          .limit(1000);

        if (effectiveBranchId) {
          customersQuery = customersQuery.eq("branch_id", effectiveBranchId);
        } else if (branchContext.isSuperAdmin && branchContext.organizationId) {
          const { data: branches } = await supabaseServiceRole
            .from("branches")
            .select("id")
            .eq("organization_id", branchContext.organizationId);
          const branchIds = branches?.map((b: { id: string }) => b.id) || [];
          if (branchIds.length > 0) {
            customersQuery = customersQuery.in("branch_id", branchIds);
          }
        }

        const { data: customersInOrg } = await customersQuery;

        const matchingIds = (customersInOrg || [])
          .filter(
            (c: {
              rut?: string | null;
              first_name?: string | null;
              last_name?: string | null;
              email?: string | null;
            }) => {
              if (normalizedRut) {
                if (!c.rut) return false;
                const customerRutNorm = normalizeRUT(c.rut);
                return (
                  customerRutNorm === normalizedRut ||
                  customerRutNorm.includes(normalizedRut) ||
                  normalizedRut.includes(customerRutNorm)
                );
              }
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const fullName =
                  `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
                const rutStr = (c.rut || "").toLowerCase();
                const email = (c.email || "").toLowerCase();
                return (
                  fullName.includes(term) ||
                  rutStr.includes(term) ||
                  email.includes(term)
                );
              }
              return false;
            },
          )
          .map((c: { id: string }) => c.id);

        if (matchingIds.length > 0) {
          query = query.in("customer_id", matchingIds);
        } else {
          query = query.eq(
            "customer_id",
            "00000000-0000-0000-0000-000000000000",
          );
        }
      }
    }

    if (date_from) {
      query = query.gte("prescription_date", date_from);
    }
    if (date_to) {
      query = query.lte("prescription_date", date_to);
    }
    if (issued_by?.trim()) {
      query = query.ilike("issued_by", `%${issued_by.trim()}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: prescriptions, error, count } = await query.range(from, to);

    if (error) {
      logger.error("Error fetching prescriptions", {
        error,
        requestId,
      });
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }

    let prescriptionsWithRelations = prescriptions || [];

    if (prescriptionsWithRelations.length > 0) {
      const customerIds = [
        ...new Set(
          prescriptionsWithRelations
            .map((p: { customer_id: string }) => p.customer_id)
            .filter(Boolean),
        ),
      ];

      const { data: customers } =
        customerIds.length > 0
          ? await supabaseServiceRole
              .from("customers")
              .select("id, first_name, last_name, rut, email")
              .in("id", customerIds)
          : { data: [] };

      const prescriptionIds = prescriptionsWithRelations.map(
        (p: { id: string }) => p.id,
      );

      const { data: workOrders } =
        prescriptionIds.length > 0
          ? await supabaseServiceRole
              .from("lab_work_orders")
              .select("prescription_id")
              .in("prescription_id", prescriptionIds)
          : { data: [] };

      const workOrdersCountByPrescription: Record<string, number> = {};
      (workOrders || []).forEach((wo: { prescription_id: string }) => {
        if (wo.prescription_id) {
          workOrdersCountByPrescription[wo.prescription_id] =
            (workOrdersCountByPrescription[wo.prescription_id] || 0) + 1;
        }
      });

      prescriptionsWithRelations = prescriptionsWithRelations.map(
        (p: Record<string, unknown>) => ({
          ...p,
          customer:
            customers?.find((c: { id: string }) => c.id === p.customer_id) ||
            null,
          work_orders_count: workOrdersCountByPrescription[p.id as string] || 0,
        }),
      );
    }

    logger.debug("Prescriptions fetched successfully", {
      count: prescriptionsWithRelations.length,
      total: count,
      requestId,
    });

    return createPaginatedResponse(
      prescriptionsWithRelations,
      {
        page,
        limit,
        total: count || 0,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in prescriptions API GET", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

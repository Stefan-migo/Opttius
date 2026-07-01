/**
 * Customers Service — GET list/search + POST analytics summary.
 *
 * Extracted from route.ts to reduce file size. No behavioral changes.
 */

import { NextRequest } from "next/server";

import {
  addBranchFilter,
  getBranchContext,
  getFieldOperationFromRequest,
} from "@/lib/api/branch-middleware";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  createPaginatedResponse,
  extractPaginationParams,
} from "@/lib/api/response";
import { parseAndValidateQuery } from "@/lib/api/validation/zod-helpers";
import {
  paginationSchema,
  searchCustomerSchema,
} from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClientFromRequest } from "@/utils/supabase/server";

export async function handleGetCustomers(
  request: NextRequest,
  requestId: string,
) {
  logger.info("Customers API GET called", { requestId });

  let queryParams: Record<string, unknown>;
  try {
    const combinedSchema = paginationSchema.merge(searchCustomerSchema);
    queryParams = parseAndValidateQuery(request, combinedSchema) as Record<
      string,
      unknown
    >;
  } catch (error) {
    if (error instanceof ValidationError) {
      return createApiErrorResponse(error, { requestId });
    }
    throw error;
  }

  const search = (queryParams.q || queryParams.search || "") as string;
  const status =
    queryParams.is_active !== undefined
      ? (queryParams.is_active as boolean)
        ? "active"
        : "inactive"
      : "";
  const agreementId = (queryParams.agreement_id ?? null) as string | null;
  const { page, limit } = extractPaginationParams(request.url);
  const offset = (page - 1) * limit;

  const { client: supabase, getUser } = await createClientFromRequest(request);
  const user = (await getUser()).data?.user as
    | { id: string; email?: string }
    | undefined;
  if (!user) throw new AuthenticationError("Unauthorized");

  const { data: isAdminResult } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdminResult) throw new AuthorizationError("Admin access required");

  const branchContext = await getBranchContext(request, user.id, supabase);
  const fieldOperationId = getFieldOperationFromRequest(request);
  let effectiveBranchId = branchContext.branchId;

  if (fieldOperationId) {
    const { createServiceRoleClient } = await import("@/utils/supabase/server");
    const serviceSupabase = createServiceRoleClient();
    const { data: fieldOp } = await serviceSupabase
      .from("field_operations")
      .select("id, branch_id, organization_id")
      .eq("id", fieldOperationId)
      .single();
    if (fieldOp) {
      effectiveBranchId = (fieldOp as { branch_id: string }).branch_id;
    }
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const userOrganizationId = (
    adminUser as { organization_id: string | null } | null
  )?.organization_id;

  const applyBranchFilter = (query: unknown) => {
    if (userOrganizationId) {
      query = query.eq("organization_id", userOrganizationId);
      if (effectiveBranchId) query = query.eq("branch_id", effectiveBranchId);
      if (fieldOperationId)
        query = query.eq("field_operation_id", fieldOperationId);
    } else if (branchContext.isSuperAdmin) {
      if (effectiveBranchId) query = query.eq("branch_id", effectiveBranchId);
      if (fieldOperationId)
        query = query.eq("field_operation_id", fieldOperationId);
    } else {
      query = addBranchFilter(
        query,
        effectiveBranchId ?? branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
      if (fieldOperationId)
        query = query.eq("field_operation_id", fieldOperationId);
    }
    return query;
  };

  // Agreement customer IDs filter
  let agreementCustomerIds: string[] = [];
  if (agreementId) {
    const { data: acRows } = await supabase
      .from("agreement_customers")
      .select("customer_id")
      .eq("agreement_id", agreementId);
    agreementCustomerIds = ((acRows || []) as { customer_id: string }[]).map(
      (r) => r.customer_id,
    );
    if (agreementCustomerIds.length === 0) {
      return createPaginatedResponse(
        [],
        { page, limit, total: 0 },
        { requestId },
      );
    }
  }

  let query = applyBranchFilter(supabase.from("customers").select("*"));
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,rut.ilike.%${search}%`,
    );
  }
  if (status === "active") query = query.eq("is_active", true);
  else if (status === "inactive") query = query.eq("is_active", false);
  if (agreementId && agreementCustomerIds.length > 0) {
    query = query.in("id", agreementCustomerIds);
  }

  let countQuery = applyBranchFilter(
    supabase.from("customers").select("*", { count: "exact", head: true }),
  );
  if (search) {
    countQuery = countQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,rut.ilike.%${search}%`,
    );
  }
  if (status === "active") countQuery = countQuery.eq("is_active", true);
  else if (status === "inactive")
    countQuery = countQuery.eq("is_active", false);
  if (agreementId && agreementCustomerIds.length > 0) {
    countQuery = countQuery.in("id", agreementCustomerIds);
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Failed to count customers");

  const { data: customers, error } = await query
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Failed to fetch customers");

  // Fetch order aggregates
  const customersArr = (customers || []) as Record<string, unknown>[];
  const customerIds = customersArr.map((c) => c.id as string);
  const orderStatsMap: Record<
    string,
    { totalSpent: number; orderCount: number; lastOrderDate: string | null }
  > = {};

  if (customerIds.length > 0) {
    const { createServiceRoleClient } = await import("@/utils/supabase/server");
    const serviceSupabase = createServiceRoleClient();

    const { data: ordersById } = await serviceSupabase
      .from("orders")
      .select("id, customer_id, email, total_amount, created_at")
      .in("customer_id", customerIds);

    const customerEmailsList = [
      ...new Set(customersArr.map((c) => c.email as string).filter(Boolean)),
    ];
    const { data: ordersByEmail } =
      customerEmailsList.length > 0
        ? await serviceSupabase
            .from("orders")
            .select("id, customer_id, email, total_amount, created_at")
            .is("customer_id", null)
            .in("email", customerEmailsList)
        : { data: [] };

    const ordersByIdArr = (ordersById || []) as Record<string, unknown>[];
    const ordersByEmailArr = (ordersByEmail || []) as Record<string, unknown>[];

    for (const c of customersArr) {
      const byId = ordersByIdArr.filter((o) => o.customer_id === c.id);
      const byEmail = ordersByEmailArr.filter(
        (o) =>
          o.email &&
          (o.email as string).toLowerCase().trim() ===
            ((c.email as string) || "").toLowerCase().trim(),
      );
      const allOrders = [...byId, ...byEmail];

      const totalSpent = allOrders.reduce(
        (s, o) => s + ((o.total_amount as number) || 0),
        0,
      );
      const orderCount = allOrders.length;
      const lastOrder =
        allOrders.length > 0
          ? [...allOrders].sort(
              (a, b) =>
                new Date(b.created_at as string).getTime() -
                new Date(a.created_at as string).getTime(),
            )[0]
          : null;

      orderStatsMap[c.id as string] = {
        totalSpent,
        orderCount,
        lastOrderDate: lastOrder
          ? (lastOrder.created_at as string) || null
          : null,
      };
    }
  }

  // Fetch is_convenio_client
  const convenioCustomerIds = new Set<string>();
  if (customerIds.length > 0) {
    const { data: acRows } = await supabase
      .from("agreement_customers")
      .select("customer_id")
      .in("customer_id", customerIds);
    ((acRows || []) as { customer_id: string }[]).forEach((r) =>
      convenioCustomerIds.add(r.customer_id),
    );
  }

  const customerStats = customersArr.map((c) => {
    const stats = orderStatsMap[c.id as string] || {
      totalSpent: 0,
      orderCount: 0,
      lastOrderDate: null,
    };
    const { totalSpent, orderCount, lastOrderDate } = stats;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    let segment = "new";
    if (orderCount > 10) segment = "vip";
    else if (orderCount > 3) segment = "regular";
    else if (orderCount > 0) segment = "first-time";

    return {
      ...c,
      is_convenio_client: convenioCustomerIds.has(c.id as string),
      analytics: {
        totalSpent,
        orderCount,
        lastOrderDate,
        avgOrderValue,
        segment,
        lifetimeValue: totalSpent,
      },
    };
  });

  return createPaginatedResponse(
    customerStats,
    { page, limit, total: (count as number) || 0 },
    { requestId },
  );
}

export async function handleCustomersAnalytics(
  request: NextRequest,
  _requestId: string,
) {
  const { client: rawClient, getUser } = await createClientFromRequest(request);
  const supabase = rawClient as unknown;
  const user = (await getUser()).data?.user as { id: string } | undefined;
  if (!user) throw new AuthenticationError("Unauthorized");

  const { data: isAdminResult } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null };
  if (!isAdminResult) throw new AuthorizationError("Admin access required");

  const branchContext = await getBranchContext(request, user.id, supabase);

  const applyBranchFilter = (query: unknown) => {
    return addBranchFilter(
      query,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );
  };

  const { count: totalCount } = await applyBranchFilter(
    supabase.from("customers").select("*", { count: "exact", head: true }),
  );

  const { count: activeCount } = await applyBranchFilter(
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  );

  const { count: recentCount } = await applyBranchFilter(
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      ),
  );

  return createApiSuccessResponse({
    summary: {
      totalCustomers: totalCount || 0,
      activeCustomers: activeCount || totalCount || 0,
      newCustomersThisMonth: recentCount || 0,
    },
  });
}

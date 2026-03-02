import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { NotificationService } from "@/lib/notifications/notification-service";
import {
  getBranchContext,
  addBranchFilter,
  getFieldOperationFromRequest,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import {
  RateLimitError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/api/errors";
import {
  createPaginatedResponse,
  createApiSuccessResponse,
  createApiErrorResponse,
  extractPaginationParams,
} from "@/lib/api/response";
import { z } from "zod";
import {
  createCustomerSchema,
  searchCustomerSchema,
  paginationSchema,
} from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
  validateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Customers API GET called", { requestId });

    // Validate query parameters with Zod
    let queryParams;
    try {
      // Combine pagination and search schemas
      const combinedSchema = paginationSchema.merge(searchCustomerSchema);
      queryParams = parseAndValidateQuery(request, combinedSchema);
    } catch (error) {
      if (error instanceof ValidationError) {
        return createApiErrorResponse(error, { requestId });
      }
      throw error;
    }

    const search = queryParams.q || queryParams.search || "";
    const status =
      queryParams.is_active !== undefined
        ? queryParams.is_active
          ? "active"
          : "inactive"
        : "";
    const agreementId = queryParams.agreement_id ?? null;
    const { page, limit } = extractPaginationParams(request.url);
    const offset = (page - 1) * limit;

    logger.debug("Query params", {
      search,
      status,
      agreementId,
      page,
      limit,
      requestId,
    });

    const { client: supabase, getUser } =
      await createClientFromRequest(request);

    // Check admin authorization
    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      logger.error("User authentication failed", {
        error: userError,
        requestId,
      });
      throw new AuthenticationError("Unauthorized");
    }
    logger.debug("User authenticated", { email: user.email, requestId });

    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      { user_id: user.id } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };
    if (adminError) {
      logger.error("Admin check error", { error: adminError, requestId });
      throw new AuthorizationError("Admin verification failed");
    }
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email, requestId });
      throw new AuthorizationError("Admin access required");
    }
    logger.debug("Admin access confirmed", { email: user.email, requestId });

    // Get branch context (pass supabase client to use same auth context)
    const branchContext = await getBranchContext(request, user.id, supabase);

    // Operativo mode: when field_operation_id in header/query, filter by it
    const fieldOperationId = getFieldOperationFromRequest(request);
    let effectiveBranchId = branchContext.branchId;
    if (fieldOperationId) {
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const serviceSupabase = createServiceRoleClient();
      const { data: fieldOp } = await serviceSupabase
        .from("field_operations")
        .select("id, branch_id, organization_id")
        .eq("id", fieldOperationId)
        .single();
      if (fieldOp) {
        effectiveBranchId = fieldOp.branch_id;
      }
    }

    // Get user's organization_id for filtering
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const userOrganizationId = adminUser?.organization_id;

    // Build branch filter function
    const applyBranchFilter = (query: any) => {
      // For customers, we should filter by organization_id first
      // Then optionally filter by branch_id if a specific branch is selected
      if (userOrganizationId) {
        // Filter by organization_id - this ensures multi-tenancy isolation
        // Even for super admins, unless they are platform staff (null org)
        query = query.eq("organization_id", userOrganizationId);

        // If a specific branch is selected, also filter by branch_id
        // Otherwise, show all customers from the organization
        if (effectiveBranchId) {
          query = query.eq("branch_id", effectiveBranchId);
        }
        if (fieldOperationId) {
          query = query.eq("field_operation_id", fieldOperationId);
        }
      } else if (branchContext.isSuperAdmin) {
        // Platform Super admin (no organization_id): sees only what branch filter says
        if (effectiveBranchId) {
          query = query.eq("branch_id", effectiveBranchId);
        }
        if (fieldOperationId) {
          query = query.eq("field_operation_id", fieldOperationId);
        }
      } else {
        // Fallback: use generic branch filter
        query = addBranchFilter(
          query,
          effectiveBranchId ?? branchContext.branchId,
          branchContext.isSuperAdmin,
          branchContext.organizationId,
        );
        if (fieldOperationId) {
          query = query.eq("field_operation_id", fieldOperationId);
        }
      }

      return query;
    };

    // If agreement_id filter: get customer IDs from agreement_customers first
    let agreementCustomerIds: string[] = [];
    if (agreementId) {
      const { data: acRows } = await supabase
        .from("agreement_customers")
        .select("customer_id")
        .eq("agreement_id", agreementId);
      agreementCustomerIds = (acRows || []).map((r: any) => r.customer_id);
      if (agreementCustomerIds.length === 0) {
        // No customers for this agreement - return empty result
        return createPaginatedResponse(
          [],
          { page, limit, total: 0 },
          { requestId },
        );
      }
    }

    // Build the query to get customers from customers table (not profiles)
    let query = applyBranchFilter(supabase.from("customers").select("*"));

    // Apply filters
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,rut.ilike.%${search}%`,
      );
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (agreementId && agreementCustomerIds.length > 0) {
      query = query.in("id", agreementCustomerIds);
    }

    // Get total count for pagination
    let countQuery = applyBranchFilter(
      supabase.from("customers").select("*", { count: "exact", head: true }),
    );

    if (search) {
      countQuery = countQuery.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,rut.ilike.%${search}%`,
      );
    }

    if (status === "active") {
      countQuery = countQuery.eq("is_active", true);
    } else if (status === "inactive") {
      countQuery = countQuery.eq("is_active", false);
    }

    if (agreementId && agreementCustomerIds.length > 0) {
      countQuery = countQuery.in("id", agreementCustomerIds);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      logger.error("Error getting customer count", {
        error: countError,
        requestId,
      });
      throw new Error("Failed to count customers");
    }
    logger.debug("Customer count retrieved", { count, requestId });

    // Apply pagination and ordering
    const { data: customers, error } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching customers", { error, requestId });
      throw new Error("Failed to fetch customers");
    }
    logger.debug("Customers fetched successfully", {
      count: customers?.length || 0,
      requestId,
    });

    // Fetch order aggregates for customers on this page (customer_id or email for legacy)
    const customerIds = (customers || []).map((c: any) => c.id);

    let orderStatsMap: Record<
      string,
      { totalSpent: number; orderCount: number; lastOrderDate: string | null }
    > = {};

    if (customerIds.length > 0) {
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const serviceSupabase = createServiceRoleClient();

      // Get all orders for these customers: by customer_id OR by email (legacy, no customer_id)
      const { data: ordersById } = await serviceSupabase
        .from("orders")
        .select("id, customer_id, email, total_amount, created_at")
        .in("customer_id", customerIds);

      const customerEmailsList = [
        ...new Set((customers || []).map((c: any) => c.email).filter(Boolean)),
      ];
      const { data: ordersByEmail } =
        customerEmailsList.length > 0
          ? await serviceSupabase
              .from("orders")
              .select("id, customer_id, email, total_amount, created_at")
              .is("customer_id", null)
              .in("email", customerEmailsList)
          : { data: [] };

      for (const c of customers || []) {
        const byId = (ordersById || []).filter(
          (o: any) => o.customer_id === c.id,
        );
        const byEmail = (ordersByEmail || []).filter(
          (o: any) =>
            o.email && o.email.toLowerCase() === (c.email || "").toLowerCase(),
        );
        const allOrders = [...byId, ...byEmail];

        const totalSpent = allOrders.reduce(
          (s: number, o: any) => s + (o.total_amount || 0),
          0,
        );
        const orderCount = allOrders.length;
        const lastOrder =
          allOrders.length > 0
            ? [...allOrders].sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )[0]
            : null;

        orderStatsMap[c.id] = {
          totalSpent,
          orderCount,
          lastOrderDate: lastOrder?.created_at || null,
        };
      }
    }

    // Fetch is_convenio_client: customers who have any agreement_customers record
    const convenioCustomerIds = new Set<string>();
    if (customerIds.length > 0) {
      const { data: acRows } = await supabase
        .from("agreement_customers")
        .select("customer_id")
        .in("customer_id", customerIds);
      (acRows || []).forEach((r: any) =>
        convenioCustomerIds.add(r.customer_id),
      );
    }

    // Calculate customer analytics
    const customerStats = (customers || []).map((customer: any) => {
      const stats = orderStatsMap[customer.id] || {
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
        ...customer,
        is_convenio_client: convenioCustomerIds.has(customer.id),
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

    // Use standardized paginated response
    return createPaginatedResponse(
      customerStats,
      {
        page,
        limit,
        total: count || 0,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in customers API GET", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

// Handle both analytics and customer creation
export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as any)(
      request,
      async () => {
        try {
          const { client: supabase, getUser } =
            await createClientFromRequest(request);

          // Check admin authorization
          const { data, error: userError } = await getUser();
          const user = data?.user;
          if (userError || !user) {
            logger.error("User authentication failed", userError);
            return createApiErrorResponse(
              new AuthenticationError("Unauthorized"),
            );
          }
          logger.debug("User authenticated", { email: user.email });

          // Check admin authorization using service role to bypass any context/RLS issues
          const { createServiceRoleClient } = await import(
            "@/utils/supabase/server"
          );
          const serviceSupabase = createServiceRoleClient();

          const { data: isAdmin } = await serviceSupabase.rpc("is_admin", {
            user_id: user.id,
          });

          if (!isAdmin) {
            logger.warn("User is not admin", { email: user.email });
            return createApiErrorResponse(
              new AuthorizationError("Admin access required"),
            );
          }
          logger.debug("Admin access confirmed", { email: user.email });

          // Get user's organization_id from admin_users table
          const { data: adminUser, error: adminUserError } = await supabase
            .from("admin_users")
            .select("organization_id")
            .eq("id", user.id)
            .single();

          if (adminUserError || !adminUser?.organization_id) {
            logger.error("Error getting user organization", adminUserError);
            return NextResponse.json(
              { error: "User organization not found" },
              { status: 500 },
            );
          }

          const userOrganizationId = adminUser.organization_id;

          // Get request body to determine action
          let body: any;
          try {
            body = await request.json();
            logger.debug("Request body parsed successfully", {
              bodyKeys: Object.keys(body || {}),
              bodyType: typeof body,
            });
          } catch (error) {
            logger.error(
              "Failed to parse request body",
              error instanceof Error ? error : new Error(String(error)),
            );
            return NextResponse.json(
              { error: "Invalid JSON in request body" },
              { status: 400 },
            );
          }

          // Check if this is a customer creation request (has first_name or last_name)
          // Analytics requests have empty body or only summary-related fields
          // Check if the property exists (not just if it's truthy, to catch empty strings)
          const isCustomerCreation =
            "first_name" in body ||
            "last_name" in body ||
            body.first_name ||
            body.last_name;

          if (isCustomerCreation) {
            logger.info("Customers API POST called (create new customer)");
            logger.debug("Create customer data received", {
              bodyKeys: Object.keys(body || {}),
              hasFirstName: !!body.first_name,
              hasLastName: !!body.last_name,
            });

            // Validate request body with Zod (body already parsed)
            let validatedBody;
            try {
              logger.debug("Starting Zod validation");
              validatedBody = validateBody(body, createCustomerSchema);
              logger.debug("Zod validation successful", {
                validatedKeys: Object.keys(validatedBody || {}),
              });
            } catch (error: unknown) {
              logger.error(
                "Validation error caught",
                error instanceof Error ? error : new Error(String(error)),
              );
              if (error instanceof ValidationError) {
                logger.debug(
                  "ValidationError detected, returning error response",
                );
                return validationErrorResponse(error);
              }
              // For ZodError that wasn't caught as ValidationError
              if (error instanceof z.ZodError) {
                logger.warn("ZodError not wrapped in ValidationError", {
                  errors: error.errors,
                });
                const errors = error.errors.map((err: z.ZodIssue) => ({
                  field: err.path.join("."),
                  message: err.message,
                }));
                return NextResponse.json(
                  {
                    error: "Validation failed",
                    details: errors,
                  },
                  { status: 400 },
                );
              }
              // Log and re-throw unexpected errors
              logger.error(
                "Unexpected error in validation",
                error instanceof Error ? error : new Error(String(error)),
              );
              throw error;
            }

            // Get branch context
            const branchContext = await getBranchContext(
              request,
              user.id,
              supabase,
            );

            logger.debug("Branch context for customer creation", {
              branchId: branchContext.branchId,
              isGlobalView: branchContext.isGlobalView,
              isSuperAdmin: branchContext.isSuperAdmin,
              bodyBranchId: validatedBody.branch_id,
            });

            // Determine customer branch_id
            // Priority: 1) branchContext.branchId (from header - selected branch), 2) validatedBody.branch_id (explicit), 3) error
            let customerBranchId: string | null = null;

            // First, try to use branch from context (header) - this is the selected branch
            if (branchContext.branchId) {
              customerBranchId = branchContext.branchId;
              logger.debug("Using branch_id from context (selected branch)", {
                branchId: customerBranchId,
              });
            } else if (validatedBody.branch_id) {
              // If no branch in context but provided in body (super admin in global view)
              // Validate that the branch belongs to the user's organization
              const { data: branch } = await supabase
                .from("branches")
                .select("id, organization_id")
                .eq("id", validatedBody.branch_id)
                .single();

              if (!branch) {
                return NextResponse.json(
                  { error: "Sucursal no encontrada" },
                  { status: 404 },
                );
              }

              // Check if branch belongs to user's organization
              if (
                branch.organization_id !== userOrganizationId &&
                !branchContext.isSuperAdmin
              ) {
                return NextResponse.json(
                  { error: "No tienes acceso a esta sucursal" },
                  { status: 403 },
                );
              }

              customerBranchId = validatedBody.branch_id;
              logger.debug("Using branch_id from request body", {
                branchId: customerBranchId,
              });
            } else if (
              branchContext.isGlobalView &&
              branchContext.isSuperAdmin
            ) {
              // Super admin in global view must provide branch_id in body
              return NextResponse.json(
                {
                  error:
                    "Como super administrador en vista global, debe especificar la sucursal para el cliente",
                },
                { status: 400 },
              );
            } else {
              // Regular admin must have a branch selected
              return NextResponse.json(
                {
                  error: "Debe seleccionar una sucursal para crear un cliente",
                },
                { status: 400 },
              );
            }

            if (!customerBranchId) {
              return NextResponse.json(
                { error: "Debe especificar una sucursal para el cliente" },
                { status: 400 },
              );
            }

            // Validar límite de clientes del tier
            const { validateTierLimit } = await import(
              "@/lib/saas/tier-validator"
            );
            const customerLimit = await validateTierLimit(
              userOrganizationId,
              "customers",
            );
            if (!customerLimit.allowed) {
              return NextResponse.json(
                {
                  error:
                    customerLimit.reason ??
                    "Límite de clientes alcanzado para tu plan. Considera actualizar tu suscripción.",
                  code: "TIER_LIMIT",
                  currentCount: customerLimit.currentCount,
                  maxAllowed: customerLimit.maxAllowed,
                },
                { status: 403 },
              );
            }

            // Check if customer already exists in this branch (by email, phone, or RUT)
            const existingCustomerQuery = supabase
              .from("customers")
              .select("id")
              .eq("branch_id", customerBranchId);

            if (validatedBody.email) {
              const { data: existingByEmail } = await existingCustomerQuery
                .eq("email", validatedBody.email)
                .maybeSingle();

              if (existingByEmail) {
                return NextResponse.json(
                  {
                    error:
                      "Ya existe un cliente con este email en esta sucursal.",
                  },
                  { status: 400 },
                );
              }
            }

            if (validatedBody.rut) {
              const { data: existingByRut } = await existingCustomerQuery
                .eq("rut", validatedBody.rut)
                .maybeSingle();

              if (existingByRut) {
                return NextResponse.json(
                  {
                    error:
                      "Ya existe un cliente con este RUT en esta sucursal.",
                  },
                  { status: 400 },
                );
              }
            }

            // Create customer data (NO auth user creation - customers don't need authentication)
            // Usar datos validados por Zod
            const customerData = {
              organization_id: userOrganizationId,
              branch_id: customerBranchId,
              field_operation_id: validatedBody.field_operation_id || null,
              first_name: validatedBody.first_name || null,
              last_name: validatedBody.last_name || null,
              email: validatedBody.email || null,
              phone: validatedBody.phone || null,
              rut: validatedBody.rut || null,
              date_of_birth: validatedBody.date_of_birth || null,
              gender: validatedBody.gender || null,
              address_line_1: validatedBody.address_line_1 || null,
              address_line_2: validatedBody.address_line_2 || null,
              city: validatedBody.city || null,
              state: validatedBody.state || null,
              postal_code: validatedBody.postal_code || null,
              country: validatedBody.country || "Chile",
              medical_conditions: validatedBody.medical_conditions || null,
              allergies: validatedBody.allergies || null,
              medications: validatedBody.medications || null,
              medical_notes: validatedBody.medical_notes || null,
              last_eye_exam_date: validatedBody.last_eye_exam_date || null,
              next_eye_exam_due: validatedBody.next_eye_exam_due || null,
              preferred_contact_method:
                validatedBody.preferred_contact_method || null,
              emergency_contact_name:
                validatedBody.emergency_contact_name || null,
              emergency_contact_phone:
                validatedBody.emergency_contact_phone || null,
              insurance_provider: validatedBody.insurance_provider || null,
              insurance_policy_number:
                validatedBody.insurance_policy_number || null,
              notes: validatedBody.notes || null,
              tags: validatedBody.tags || null,
              is_active:
                validatedBody.is_active !== undefined
                  ? validatedBody.is_active
                  : true,
              created_by: user.id,
            };

            const { data: newCustomer, error: customerError } = await supabase
              .from("customers")
              .insert(customerData)
              .select()
              .single();

            if (customerError) {
              logger.error("Error creating customer", customerError);
              return NextResponse.json(
                {
                  error: `Error al crear cliente: ${customerError.message}`,
                },
                { status: 500 },
              );
            }

            if (!newCustomer) {
              logger.error("Customer was not created");
              return NextResponse.json(
                { error: "Failed to create customer" },
                { status: 500 },
              );
            }

            logger.info("Customer created successfully", {
              customerId: newCustomer.id,
            });

            // Create notification for new customer (non-blocking)
            const customerName =
              `${validatedBody.first_name || ""} ${validatedBody.last_name || ""}`.trim() ||
              "Cliente";
            NotificationService.notifyNewCustomer(
              newCustomer.id,
              customerName,
              validatedBody.email || undefined,
              newCustomer.branch_id ??
                customerBranchId ??
                branchContext.branchId ??
                undefined,
            ).catch((err) => logger.error("Error creating notification", err));

            // Send account welcome email when customer has email (non-blocking)
            const customerEmail = validatedBody.email;
            if (customerEmail) {
              import("@/lib/email/notifications")
                .then(({ EmailNotificationService }) =>
                  EmailNotificationService.sendAccountWelcome(
                    customerName,
                    customerEmail,
                    userOrganizationId,
                  ),
                )
                .catch((err) =>
                  logger.error("Error sending account welcome email", err),
                );
            }

            return createApiSuccessResponse(newCustomer, { statusCode: 201 });
          } else {
            // This is an analytics request
            logger.info("Customers API POST called (analytics summary)");

            // Get branch context
            const branchContext = await getBranchContext(
              request,
              user.id,
              supabase,
            );

            // Build branch filter function
            const applyBranchFilter = (query: any) => {
              return addBranchFilter(
                query,
                branchContext.branchId,
                branchContext.isSuperAdmin,
                branchContext.organizationId,
              );
            };

            // Get customer analytics summary (filtered by branch)
            const { count: totalCount } = await applyBranchFilter(
              supabase
                .from("customers")
                .select("*", { count: "exact", head: true }),
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
        } catch (error) {
          if (error instanceof RateLimitError) {
            logger.warn("Rate limit exceeded for customer creation", {
              error: error.message,
            });
            return NextResponse.json({ error: error.message }, { status: 429 });
          }

          // Return standardized error response
          return createApiErrorResponse(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
    );
  } catch (error) {
    // Catch any errors from withRateLimit itself (e.g., RateLimitError thrown before try-catch)
    if (error instanceof RateLimitError) {
      logger.warn("Rate limit exceeded", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    // Log and return standardized error response
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

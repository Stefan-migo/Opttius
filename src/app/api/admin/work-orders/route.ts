import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { NotificationService } from "@/lib/notifications/notification-service";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/api/errors";
import {
  createPaginatedResponse,
  createApiErrorResponse,
  extractPaginationParams,
} from "@/lib/api/response";
import { createWorkOrderSchema } from "@/lib/api/validation/zod-schemas";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Work Orders API GET called", { requestId });

    const supabase = await createClient();

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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const customerId = searchParams.get("customer_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build base query with branch filter
    let query = supabase
      .from("lab_work_orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply branch filter
    query = addBranchFilter(
      query,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: workOrders, error, count } = await query.range(from, to);

    if (error) {
      logger.error("Error fetching work orders", {
        error,
        errorDetails: JSON.stringify(error, null, 2),
        errorCode: error.code,
        errorMessage: error.message,
        errorHint: error.hint,
        requestId,
      });
      throw new Error(`Failed to fetch work orders: ${error.message}`);
    }

    // Fetch related data using batch queries to avoid N+1
    let workOrdersWithRelations = workOrders || [];
    if (workOrdersWithRelations.length > 0) {
      // Fetch customers (from customers table)
      const customerIds = [
        ...new Set(
          workOrdersWithRelations.map((wo) => wo.customer_id).filter(Boolean),
        ),
      ];
      const { data: customers } =
        customerIds.length > 0
          ? await supabase
              .from("customers")
              .select("id, first_name, last_name, email, phone")
              .in("id", customerIds)
          : { data: [] };

      // Fetch prescriptions
      const prescriptionIds = [
        ...new Set(
          workOrdersWithRelations
            .map((wo) => wo.prescription_id)
            .filter(Boolean),
        ),
      ];
      const { data: prescriptions } =
        prescriptionIds.length > 0
          ? await supabase
              .from("prescriptions")
              .select("*")
              .in("id", prescriptionIds)
          : { data: [] };

      // Fetch quotes
      const quoteIds = [
        ...new Set(
          workOrdersWithRelations.map((wo) => wo.quote_id).filter(Boolean),
        ),
      ];
      const { data: quotes } =
        quoteIds.length > 0
          ? await supabase.from("quotes").select("*").in("id", quoteIds)
          : { data: [] };

      // Fetch products
      const productIds = [
        ...new Set(
          workOrdersWithRelations
            .map((wo) => wo.frame_product_id)
            .filter(Boolean),
        ),
      ];
      const { data: products } =
        productIds.length > 0
          ? await supabase
              .from("products")
              .select("id, name, price, frame_brand, frame_model")
              .in("id", productIds)
          : { data: [] };

      // Fetch assigned staff
      const staffIds = [
        ...new Set(
          workOrdersWithRelations.map((wo) => wo.assigned_to).filter(Boolean),
        ),
      ];
      const { data: staff } =
        staffIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, first_name, last_name")
              .in("id", staffIds)
          : { data: [] };

      // Map relations to work orders
      workOrdersWithRelations = workOrdersWithRelations.map((workOrder) => ({
        ...workOrder,
        customer:
          customers?.find((c) => c.id === workOrder.customer_id) || null,
        prescription:
          prescriptions?.find((p) => p.id === workOrder.prescription_id) ||
          null,
        quote: quotes?.find((q) => q.id === workOrder.quote_id) || null,
        frame_product:
          products?.find((p) => p.id === workOrder.frame_product_id) || null,
        assigned_staff:
          staff?.find((s) => s.id === workOrder.assigned_to) || null,
      }));
    }

    logger.debug("Work orders fetched successfully", {
      count: workOrdersWithRelations.length,
      total: count,
      requestId,
    });

    // Use standardized paginated response
    return createPaginatedResponse(
      workOrdersWithRelations,
      {
        page,
        limit,
        total: count || 0,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Error in work orders API GET", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Validate request body with Zod
    let validatedBody;
    try {
      validatedBody = await parseAndValidateBody(
        request,
        createWorkOrderSchema,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Validate branch access for non-super admins
    if (!branchContext.isSuperAdmin && !branchContext.branchId) {
      return NextResponse.json(
        {
          error: "Debe seleccionar una sucursal para crear trabajos",
        },
        { status: 400 },
      );
    }

    // Generate work order number
    const { data: workOrderNumber, error: workOrderNumberError } =
      await supabaseServiceRole.rpc("generate_work_order_number");

    if (workOrderNumberError || !workOrderNumber) {
      logger.error("Error generating work order number", workOrderNumberError);
      return NextResponse.json(
        { error: "Failed to generate work order number" },
        { status: 500 },
      );
    }

    // Get prescription snapshot if prescription_id is provided
    let prescriptionSnapshot = null;
    if (validatedBody.prescription_id) {
      const { data: prescription } = await supabaseServiceRole
        .from("prescriptions")
        .select("*")
        .eq("id", validatedBody.prescription_id)
        .single();

      if (prescription) {
        prescriptionSnapshot = prescription;
      }
    }

    // Prepare insert data - ensure no undefined values
    // Usar validatedBody para campos validados por Zod
    const insertData: Record<string, unknown> = {
      work_order_number: workOrderNumber,
      branch_id: branchContext.branchId,
      customer_id: validatedBody.customer_id,
      prescription_id: validatedBody.prescription_id ?? null,
      quote_id: (validatedBody as any).quote_id ?? null,
      frame_product_id: validatedBody.frame_product_id ?? null,
      frame_name: validatedBody.frame_name.trim(),
      frame_brand: validatedBody.frame_brand ?? null,
      frame_model: validatedBody.frame_model ?? null,
      frame_color: validatedBody.frame_color ?? null,
      frame_size: validatedBody.frame_size ?? null,
      frame_sku: validatedBody.frame_sku ?? null,
      frame_serial_number: (validatedBody as any).frame_serial_number ?? null,
      lens_type: validatedBody.lens_type.trim(),
      lens_material: validatedBody.lens_material.trim(),
      lens_index: validatedBody.lens_index ?? null,
      lens_treatments: validatedBody.lens_treatments || [],
      lens_tint_color: validatedBody.lens_tint_color ?? null,
      lens_tint_percentage: validatedBody.lens_tint_percentage ?? null,
      prescription_snapshot: prescriptionSnapshot,
      lab_name: validatedBody.lab_name ?? null,
      lab_contact: validatedBody.lab_contact ?? null,
      lab_order_number: validatedBody.lab_order_number ?? null,
      lab_estimated_delivery_date:
        validatedBody.lab_estimated_delivery_date ?? null,
      status: validatedBody.status || "quote",
      frame_cost:
        typeof validatedBody.frame_cost === "number"
          ? validatedBody.frame_cost
          : validatedBody.frame_cost || 0,
      lens_cost:
        typeof validatedBody.lens_cost === "number"
          ? validatedBody.lens_cost
          : validatedBody.lens_cost || 0,
      treatments_cost:
        typeof validatedBody.treatments_cost === "number"
          ? validatedBody.treatments_cost
          : validatedBody.treatments_cost || 0,
      labor_cost:
        typeof validatedBody.labor_cost === "number"
          ? validatedBody.labor_cost
          : validatedBody.labor_cost || 0,
      lab_cost:
        typeof validatedBody.lab_cost === "number"
          ? validatedBody.lab_cost
          : validatedBody.lab_cost || 0,
      subtotal:
        typeof validatedBody.subtotal === "number"
          ? validatedBody.subtotal
          : validatedBody.subtotal || 0,
      tax_amount:
        typeof validatedBody.tax_amount === "number"
          ? validatedBody.tax_amount
          : validatedBody.tax_amount || 0,
      discount_amount:
        typeof validatedBody.discount_amount === "number"
          ? validatedBody.discount_amount
          : validatedBody.discount_amount || 0,
      total_amount:
        typeof validatedBody.total_amount === "number"
          ? validatedBody.total_amount
          : parseFloat(String(validatedBody.total_amount)),
      currency: validatedBody.currency || "CLP",
      payment_status: validatedBody.payment_status || "pending",
      payment_method: validatedBody.payment_method ?? null,
      deposit_amount:
        typeof validatedBody.deposit_amount === "number"
          ? validatedBody.deposit_amount
          : validatedBody.deposit_amount || 0,
      balance_amount:
        validatedBody.balance_amount ?? validatedBody.total_amount,
      pos_order_id: validatedBody.pos_order_id ?? null,
      internal_notes: validatedBody.internal_notes ?? null,
      customer_notes: validatedBody.customer_notes ?? null,
      assigned_to: validatedBody.assigned_to || user.id,
      created_by: user.id,
    };

    // Log insert data for debugging (remove sensitive data)
    logger.debug("Creating work order with data", {
      work_order_number: insertData.work_order_number,
      branch_id: insertData.branch_id,
      customer_id: insertData.customer_id,
      frame_name: insertData.frame_name,
      lens_type: insertData.lens_type,
      lens_material: insertData.lens_material,
      total_amount: insertData.total_amount,
    });

    // Create work order
    const { data: newWorkOrder, error: workOrderError } =
      await supabaseServiceRole
        .from("lab_work_orders")
        .insert(insertData)
        .select(
          `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(*)
      `,
        )
        .single();

    if (workOrderError) {
      logger.error("Error creating work order", workOrderError, {
        errorDetails: JSON.stringify(workOrderError, null, 2),
        insertData: JSON.stringify(insertData, null, 2),
      });
      return NextResponse.json(
        {
          error: "Failed to create work order",
          details: workOrderError.message,
          code: workOrderError.code,
          hint: workOrderError.hint,
        },
        { status: 500 },
      );
    }

    // If status is not 'quote', update status dates
    if (validatedBody.status && validatedBody.status !== "quote") {
      await supabaseServiceRole.rpc("update_work_order_status", {
        p_work_order_id: newWorkOrder.id,
        p_new_status: validatedBody.status,
        p_changed_by: user.id,
        p_notes: "Work order created",
      });
    }

    // Create notification for new work order (non-blocking)
    if (newWorkOrder) {
      const customerName = newWorkOrder.customer
        ? `${newWorkOrder.customer.first_name || ""} ${newWorkOrder.customer.last_name || ""}`.trim() ||
          newWorkOrder.customer.email ||
          "Cliente"
        : "Cliente";

      NotificationService.notifyNewWorkOrder(
        newWorkOrder.id,
        newWorkOrder.work_order_number,
        customerName,
        newWorkOrder.total_amount,
        newWorkOrder.branch_id ?? branchContext.branchId ?? undefined,
      ).catch((err) => logger.error("Error creating notification", err));
    }

    return NextResponse.json({
      success: true,
      workOrder: newWorkOrder,
    });
  } catch (error) {
    logger.error("Error in work orders POST API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

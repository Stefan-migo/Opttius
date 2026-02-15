import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import {
  createOpticalInternalSupportTicketSchema,
  opticalInternalSupportTicketFiltersSchema,
} from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { getBranchContext } from "@/lib/api/branch-middleware";

/**
 * GET /api/admin/optical-support/tickets
 * Listar tickets de soporte interno de la óptica con filtros
 * Solo usuarios de la misma organización pueden ver sus tickets
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener información del usuario admin y su organización
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Resolver organization_id: usuarios normales usan el suyo; root/dev sin org usan optica-root para testing
    const isRoot = adminUser.role === "root" || adminUser.role === "dev";
    let organizationId = adminUser.organization_id;

    if (!organizationId && isRoot) {
      organizationId =
        (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || undefined;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    // Validar y parsear filtros
    const filters = opticalInternalSupportTicketFiltersSchema.parse({
      branch_id: searchParams.get("branch_id") || undefined,
      customer_id: searchParams.get("customer_id") || undefined,
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      category: searchParams.get("category") || undefined,
      assigned_to: searchParams.get("assigned_to") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      sort_by: searchParams.get("sort_by") || "created_at",
      sort_order: searchParams.get("sort_order") || "desc",
    });

    const offset = ((filters.page ?? 1) - 1) * (filters.limit ?? 20);

    // Construir query base
    let query = supabaseServiceRole
      .from("optical_internal_support_tickets")
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email),
        assigned_to_user:admin_users!optical_internal_support_tickets_assigned_to_fkey(id, email, role),
        created_by_user:admin_users!optical_internal_support_tickets_created_by_user_id_fkey(id, email, role),
        branch:branches(id, name, code),
        related_order:orders(id, order_number),
        related_work_order:lab_work_orders(id, work_order_number),
        related_appointment:appointments(id, appointment_date, appointment_time),
        related_quote:quotes(id, quote_number)
      `,
        { count: "exact" },
      )
      .eq("organization_id", organizationId) // Solo tickets de su organización
      .order((filters.sort_by || "created_at") as any, {
        ascending: filters.sort_order === "asc",
      });

    // Aplicar filtros
    if (filters.branch_id) {
      query = query.eq("branch_id", filters.branch_id);
    }

    if (filters.customer_id) {
      query = query.eq("customer_id", filters.customer_id);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.assigned_to) {
      query = query.eq("assigned_to", filters.assigned_to);
    }

    if (filters.search) {
      query = query.or(
        `subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`,
      );
    }

    // Aplicar paginación
    query = query.range(offset, offset + (filters.limit ?? 20) - 1);

    const { data: tickets, error, count } = await query;

    if (error) {
      logger.error("Error fetching optical internal support tickets", error);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        total: count || 0,
        page: filters.page,
        limit: filters.limit ?? 20,
        totalPages: Math.ceil((count || 0) / (filters.limit ?? 20)),
      },
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/admin/optical-support/tickets",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/optical-support/tickets
 * Crear nuevo ticket de soporte interno
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener información del usuario admin
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .select("id, email, role, organization_id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Resolver organization_id: usuarios normales usan el suyo; root/dev sin org usan optica-root para testing
    const isRoot = adminUser.role === "root" || adminUser.role === "dev";
    let organizationId = adminUser.organization_id;

    if (!organizationId && isRoot) {
      organizationId =
        (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || undefined;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    // Validar body
    const body = await parseAndValidateBody(
      request,
      createOpticalInternalSupportTicketSchema,
    );

    // Obtener contexto de branch para determinar branch_id si no se proporciona
    const branchContext = await getBranchContext(request, user.id);
    const branchId = body.branch_id || branchContext.branchId || null;

    // Si se proporciona branch_id, verificar que pertenece a la organización
    if (branchId) {
      const { data: branch } = await supabaseServiceRole
        .from("branches")
        .select("id, organization_id")
        .eq("id", branchId)
        .single();

      if (!branch || branch.organization_id !== organizationId) {
        return NextResponse.json(
          { error: "Branch does not belong to your organization" },
          { status: 403 },
        );
      }
    }

    // Si se proporciona customer_id, verificar que pertenece a la organización
    if (body.customer_id) {
      const { data: customer } = await supabaseServiceRole
        .from("customers")
        .select("id, organization_id, first_name, last_name, email, phone")
        .eq("id", body.customer_id)
        .single();

      if (!customer || customer.organization_id !== organizationId) {
        return NextResponse.json(
          { error: "Customer does not belong to your organization" },
          { status: 403 },
        );
      }

      // Usar datos del cliente si no se proporcionaron
      body.customer_name =
        body.customer_name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        undefined;
      body.customer_email = body.customer_email || customer.email || undefined;
      body.customer_phone = body.customer_phone || customer.phone || undefined;
    }

    // Crear ticket
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("optical_internal_support_tickets")
      .insert({
        organization_id: organizationId,
        branch_id: branchId,
        customer_id: body.customer_id || null,
        customer_name: body.customer_name || null,
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
        related_order_id: body.related_order_id || null,
        related_work_order_id: body.related_work_order_id || null,
        related_appointment_id: body.related_appointment_id || null,
        related_quote_id: body.related_quote_id || null,
        created_by_user_id: adminUser.id,
        created_by_name: user.email?.split("@")[0] || "Usuario",
        created_by_role: adminUser.role,
        subject: body.subject,
        description: body.description,
        category: body.category,
        priority: body.priority || "medium",
        status: "open",
        assigned_to: body.assigned_to || null,
        metadata: body.metadata || {},
      })
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email),
        assigned_to_user:admin_users!optical_internal_support_tickets_assigned_to_fkey(id, email, role),
        created_by_user:admin_users!optical_internal_support_tickets_created_by_user_id_fkey(id, email, role),
        branch:branches(id, name, code)
      `,
      )
      .single();

    if (ticketError) {
      logger.error(
        "Error creating optical internal support ticket",
        ticketError,
      );
      return NextResponse.json(
        {
          error: "Failed to create ticket",
          details: ticketError.message,
        },
        { status: 500 },
      );
    }

    // Crear mensaje inicial del ticket
    if (ticket) {
      await supabaseServiceRole
        .from("optical_internal_support_messages")
        .insert({
          ticket_id: ticket.id,
          message: body.description,
          is_internal: false,
          sender_id: adminUser.id,
          sender_name: user.email?.split("@")[0] || "Usuario",
          sender_email: adminUser.email || user.email || "",
          sender_role: adminUser.role,
          message_type: "message",
        });
    }

    logger.info("Optical internal support ticket created", {
      ticketId: ticket?.id,
      ticketNumber: ticket?.ticket_number,
    });

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /api/admin/optical-support/tickets",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import {
  createSaasSupportTicketSchema,
  saasSupportTicketFiltersSchema,
} from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";

/**
 * GET /api/admin/saas-management/support/tickets
 * Listar tickets de soporte SaaS con filtros
 * - Root/dev: puede ver todos los tickets
 * - Organizaciones: solo pueden ver sus propios tickets
 */
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

    // Verificar si es root/dev o pertenece a una organización
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isRoot = adminUser.role === "root" || adminUser.role === "dev";
    const userOrganizationId = adminUser.organization_id;

    const { searchParams } = new URL(request.url);

    // Validar y parsear filtros
    const filters = saasSupportTicketFiltersSchema.parse({
      organization_id: searchParams.get("organization_id") || undefined,
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

    const offset = ((filters.page || 1) - 1) * (filters.limit || 20);

    // Construir query base (sin relaciones complejas para evitar errores)
    let query = supabaseServiceRole
      .from("saas_support_tickets")
      .select("*", { count: "exact" })
      .order(filters.sort_by || "created_at", { ascending: filters.sort_order === "asc" });

    // Aplicar filtros
    // Si no es root, solo puede ver tickets de su organización
    if (!isRoot) {
      if (!userOrganizationId) {
        return NextResponse.json(
          { error: "No organization assigned" },
          { status: 403 },
        );
      }
      query = query.eq("organization_id", userOrganizationId);
    } else if (filters.organization_id) {
      // Root puede filtrar por organización específica
      query = query.eq("organization_id", filters.organization_id);
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
        `subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,requester_email.ilike.%${filters.search}%,requester_name.ilike.%${filters.search}%`,
      );
    }

    // Paginación
    query = query.range(offset, offset + (filters.limit || 20) - 1);

    const { data: tickets, error, count } = await query;

    if (error) {
      logger.error("Error fetching SaaS support tickets", error);
      return NextResponse.json(
        { error: "Failed to fetch tickets", details: error.message },
        { status: 500 },
      );
    }

    // Enriquecer tickets con información relacionada
    const enrichedTickets = await Promise.all(
      (tickets || []).map(async (ticket: any) => {
        // Obtener organización
        let organization = null;
        if (ticket.organization_id) {
          const { data: org } = await supabaseServiceRole
            .from("organizations")
            .select("id, name, slug")
            .eq("id", ticket.organization_id)
            .maybeSingle();
          organization = org;
        }

        // Obtener usuario creador
        let created_by_user = null;
        if (ticket.created_by_user_id) {
          const { data: creator } = await supabaseServiceRole
            .from("admin_users")
            .select("id, email, role")
            .eq("id", ticket.created_by_user_id)
            .maybeSingle();
          created_by_user = creator;
        }

        // Obtener usuario asignado
        let assigned_to_user = null;
        if (ticket.assigned_to) {
          const { data: assigned } = await supabaseServiceRole
            .from("admin_users")
            .select("id, email, role")
            .eq("id", ticket.assigned_to)
            .maybeSingle();
          assigned_to_user = assigned;
        }

        return {
          ...ticket,
          organization: organization || null,
          created_by_user: created_by_user || null,
          assigned_to_user: assigned_to_user || null,
        };
      }),
    );

    return NextResponse.json({
      tickets: enrichedTickets || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (filters.limit || 20)),
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error(
      "Unexpected error in GET /api/admin/saas-management/support/tickets",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/support/tickets
 * Crear nuevo ticket de soporte SaaS (desde organización autenticada)
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

    // Validar body
    const body = await parseAndValidateBody(
      request,
      createSaasSupportTicketSchema,
    );

    // Crear ticket
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .insert({
        organization_id: adminUser.organization_id,
        created_by_user_id: adminUser.id,
        requester_email: adminUser.email || user.email || "",
        requester_name: user.email?.split("@")[0] || "Usuario",
        requester_role: adminUser.role,
        subject: body.subject,
        description: body.description,
        category: body.category,
        priority: body.priority || "medium",
        status: "open",
        metadata: body.metadata || {},
      })
      .select(
        `
        *,
        organization:organizations(id, name, slug),
        created_by_user:admin_users!saas_support_tickets_created_by_user_id_fkey(id, email, role)
      `,
      )
      .single();

    if (ticketError) {
      logger.error("Error creating SaaS support ticket", ticketError);
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 },
      );
    }

    logger.info(`SaaS support ticket created: ${ticket.ticket_number}`);

    // Send email notification to requester (non-blocking)
    try {
      if (process.env.RESEND_API_KEY) {
        const { sendSaasTicketCreatedEmail } = await import(
          "@/lib/email/templates/saas-support"
        );
        await sendSaasTicketCreatedEmail({
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          description: body.description,
          status: ticket.status,
          priority: body.priority || "medium",
          category: body.category,
          requester_name: adminUser.email?.split("@")[0] || "Usuario",
          requester_email: adminUser.email || user.email || "",
          organization: ticket.organization as any,
        });
        logger.info("Ticket creation email sent successfully");
      } else {
        logger.debug("Resend not configured, skipping email notification");
      }
    } catch (emailError) {
      logger.warn("Failed to send ticket creation email", emailError);
      // Don't fail the request if email fails
    }

    // Push notification for root/dev (non-blocking)
    try {
      const { NotificationService } = await import(
        "@/lib/notifications/notification-service"
      );
      await NotificationService.notifySaasSupportTicketNew(
        ticket.id,
        ticket.ticket_number,
        ticket.subject,
        ticket.requester_email,
        ticket.organization?.name,
      );
    } catch (notifError) {
      logger.warn("Failed to create support notification", notifError);
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /api/admin/saas-management/support/tickets",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

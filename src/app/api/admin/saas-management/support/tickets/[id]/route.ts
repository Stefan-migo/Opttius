import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { updateSaasSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";

/**
 * GET /api/admin/saas-management/support/tickets/[id]
 * Obtener detalles de un ticket específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Verificar si es root/dev o pertenece a la organización del ticket
    const { data: adminUser } = await supabaseServiceRole
      .from("admin_users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    const isRoot = adminUser?.role === "root" || adminUser?.role === "dev";

    // Obtener ticket
    const query = supabaseServiceRole
      .from("saas_support_tickets")
      .select(
        `
        *,
        organization:organizations(id, name, slug),
        created_by_user:admin_users!saas_support_tickets_created_by_user_id_fkey(id, email, role),
        assigned_to_user:admin_users!saas_support_tickets_assigned_to_fkey(id, email, role)
      `,
      )
      .eq("id", params.id)
      .single();

    const { data: ticket, error: ticketError } = await query;

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verificar permisos: root puede ver todos, otros solo sus organizaciones
    if (!isRoot && ticket.organization_id !== adminUser?.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/admin/saas-management/support/tickets/[id]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/support/tickets/[id]
 * Actualizar un ticket (solo root/dev puede actualizar)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    // Validar body
    const body = await parseAndValidateBody(
      request,
      updateSaasSupportTicketSchema,
    );

    // Obtener ticket actual
    const { data: currentTicket, error: currentError } =
      await supabaseServiceRole
        .from("saas_support_tickets")
        .select("*")
        .eq("id", params.id)
        .single();

    if (currentError || !currentTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Preparar actualización
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updates.status = body.status;

      // Si se marca como resuelto, establecer resolved_at y resolved_by
      if (body.status === "resolved" && !currentTicket.resolved_at) {
        const {
          data: { user },
        } = await supabaseServiceRole.auth.getUser();
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id || null;

        // Calcular tiempo de resolución si existe created_at
        if (currentTicket.created_at) {
          const created = new Date(currentTicket.created_at);
          const resolved = new Date();
          const diffMinutes = Math.floor(
            (resolved.getTime() - created.getTime()) / (1000 * 60),
          );
          updates.resolution_time_minutes = diffMinutes;
        }
      }

      // Si se cierra, establecer resolved_at si no existe
      if (body.status === "closed" && !currentTicket.resolved_at) {
        const {
          data: { user },
        } = await supabaseServiceRole.auth.getUser();
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id || null;
      }
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }

    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to;
      if (body.assigned_to && !currentTicket.assigned_at) {
        updates.assigned_at = new Date().toISOString();
      }
    }

    if (body.resolution !== undefined) {
      updates.resolution = body.resolution;
    }

    if (body.customer_satisfaction_rating !== undefined) {
      updates.customer_satisfaction_rating = body.customer_satisfaction_rating;
    }

    if (body.customer_feedback !== undefined) {
      updates.customer_feedback = body.customer_feedback;
    }

    // Actualizar ticket
    const { data: ticket, error: updateError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .update(updates)
      .eq("id", params.id)
      .select(
        `
        *,
        organization:organizations(id, name, slug),
        created_by_user:admin_users!saas_support_tickets_created_by_user_id_fkey(id, email, role),
        assigned_to_user:admin_users!saas_support_tickets_assigned_to_fkey(id, email, role)
      `,
      )
      .single();

    if (updateError) {
      logger.error("Error updating SaaS support ticket", updateError);
      return NextResponse.json(
        { error: "Failed to update ticket" },
        { status: 500 },
      );
    }

    logger.info(`SaaS support ticket updated: ${ticket.ticket_number}`);

    // Send email notifications (non-blocking)
    try {
      if (process.env.RESEND_API_KEY) {
        const { sendSaasTicketAssignedEmail, sendSaasTicketResolvedEmail } =
          await import("@/lib/email/templates/saas-support");

        // Notification for assignment (email + push)
        if (
          body.assigned_to &&
          body.assigned_to !== currentTicket.assigned_to
        ) {
          const { data: assignedUser } = await supabaseServiceRole
            .from("admin_users")
            .select("email")
            .eq("id", body.assigned_to)
            .single();

          if (assignedUser?.email) {
            await sendSaasTicketAssignedEmail(
              {
                id: ticket.id,
                ticket_number: ticket.ticket_number,
                subject: ticket.subject,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                requester_name: ticket.requester_name,
                requester_email: ticket.requester_email,
                organization: ticket.organization as any,
              },
              assignedUser.email,
            );
            logger.info("Assignment email sent successfully");
          }
          // Push notification for assigned user
          try {
            const { NotificationService } = await import(
              "@/lib/notifications/notification-service"
            );
            await NotificationService.notifySaasSupportTicketAssigned(
              ticket.id,
              ticket.ticket_number,
              ticket.subject,
              body.assigned_to,
            );
          } catch (pushErr) {
            logger.warn(
              "Failed to create assignment push notification",
              pushErr,
            );
          }
        }

        // Notification for resolution
        if (
          (body.status === "resolved" || body.status === "closed") &&
          currentTicket.status !== "resolved" &&
          currentTicket.status !== "closed"
        ) {
          await sendSaasTicketResolvedEmail(
            {
              id: ticket.id,
              ticket_number: ticket.ticket_number,
              subject: ticket.subject,
              description: ticket.description,
              status: ticket.status,
              priority: ticket.priority,
              category: ticket.category,
              requester_name: ticket.requester_name,
              requester_email: ticket.requester_email,
              organization: ticket.organization as any,
            },
            body.resolution || ticket.resolution || null,
          );
          logger.info("Resolution email sent successfully");
        }
      } else {
        logger.debug("Resend not configured, skipping email notifications");
      }
    } catch (emailError) {
      logger.warn("Failed to send email notifications", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error(
      "Unexpected error in PATCH /api/admin/saas-management/support/tickets/[id]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

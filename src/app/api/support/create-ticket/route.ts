import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { createPublicSaasSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";

/**
 * POST /api/support/create-ticket
 * Crear ticket de soporte SaaS desde portal público (sin autenticación)
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseServiceRole = createServiceRoleClient();

    // Validar body
    const body = await parseAndValidateBody(
      request,
      createPublicSaasSupportTicketSchema,
    );

    // Intentar encontrar organización por nombre si se proporciona
    let organizationId: string | null = null;
    if (body.organization_name) {
      const { data: org } = await supabaseServiceRole
        .from("organizations")
        .select("id")
        .ilike("name", `%${body.organization_name}%`)
        .limit(1)
        .maybeSingle();

      if (org) {
        organizationId = org.id;
      }
    }

    // Crear ticket público
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .insert({
        organization_id: organizationId,
        created_by_user_id: null, // Ticket público, sin usuario autenticado
        requester_email: body.requester_email,
        requester_name: body.requester_name,
        requester_role: null, // No hay rol para tickets públicos
        subject: body.subject,
        description: body.description,
        category: body.category,
        priority: body.priority || "medium",
        status: "open",
        metadata: {
          ...(body.metadata || {}),
          is_public: true,
          organization_name: body.organization_name || null,
        },
      })
      .select(
        `
        id,
        ticket_number,
        subject,
        status,
        created_at,
        organization:organizations(id, name, slug)
      `,
      )
      .single();

    if (ticketError) {
      logger.error("Error creating public SaaS support ticket", ticketError);
      return NextResponse.json(
        { error: "Failed to create ticket. Please try again." },
        { status: 500 },
      );
    }

    logger.info(`Public SaaS support ticket created: ${ticket.ticket_number}`);

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
          requester_name: body.requester_name,
          requester_email: body.requester_email,
          organization: Array.isArray(ticket.organization)
            ? ticket.organization[0] || null
            : ticket.organization,
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
        body.requester_email,
        Array.isArray(ticket.organization) ? (ticket.organization[0] as any)?.name : (ticket.organization as any)?.name,
      );
    } catch (notifError) {
      logger.warn("Failed to create support notification", notifError);
    }

    return NextResponse.json(
      {
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
        },
        message:
          "Ticket creado exitosamente. Te hemos enviado un email de confirmación.",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Unexpected error in POST /api/support/create-ticket", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

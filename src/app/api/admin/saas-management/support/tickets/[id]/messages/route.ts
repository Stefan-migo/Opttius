import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { createSaasSupportMessageSchema } from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";

/**
 * GET /api/admin/saas-management/support/tickets/[id]/messages
 * Obtener mensajes de un ticket
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

    // Obtener ticket para verificar permisos
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .select("*")
      .eq("id", params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verificar permisos
    if (!isRoot && ticket.organization_id !== adminUser?.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Obtener mensajes
    let query = supabaseServiceRole
      .from("saas_support_messages")
      .select(
        `
        *,
        sender:admin_users!saas_support_messages_sender_id_fkey(id, email, role)
      `,
      )
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true });

    // Si no es root, filtrar mensajes internos
    if (!isRoot) {
      query = query.eq("is_internal", false);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      logger.error("Error fetching SaaS support messages", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/admin/saas-management/support/tickets/[id]/messages",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/support/tickets/[id]/messages
 * Crear nuevo mensaje en un ticket
 */
export async function POST(
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

    // Obtener información del usuario admin
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .select("id, email, role, organization_id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isRoot = adminUser.role === "root" || adminUser.role === "dev";

    // Obtener ticket para verificar permisos
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .select(
        "id, organization_id, status, first_response_at, last_response_at",
      )
      .eq("id", params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verificar permisos
    if (!isRoot && ticket.organization_id !== adminUser.organization_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validar body
    const body = await parseAndValidateBody(
      request,
      createSaasSupportMessageSchema,
    );

    // Determinar si el mensaje es del cliente o del soporte
    const isFromCustomer = !isRoot || body.is_internal === false;

    // Crear mensaje
    const { data: message, error: messageError } = await supabaseServiceRole
      .from("saas_support_messages")
      .insert({
        ticket_id: params.id,
        message: body.message,
        is_internal: body.is_internal || false,
        is_from_customer: isFromCustomer,
        sender_id: adminUser.id,
        sender_name: adminUser.email?.split("@")[0] || "Usuario",
        sender_email: adminUser.email || user.email || "",
        message_type: body.message_type || "message",
        attachments: body.attachments || [],
      })
      .select(
        `
        *,
        sender:admin_users!saas_support_messages_sender_id_fkey(id, email, role)
      `,
      )
      .single();

    if (messageError) {
      logger.error("Error creating SaaS support message", messageError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 },
      );
    }

    // Actualizar ticket: last_response_at y first_response_at si es la primera respuesta
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      last_response_at: now,
    };

    if (!(ticket as any)?.first_response_at && !isFromCustomer) {
      updates.first_response_at = now;

      // Calcular tiempo de primera respuesta
      if ((ticket as any)?.created_at) {
        const created = new Date((ticket as any).created_at);
        const firstResponse = new Date();
        const diffMinutes = Math.floor(
          (firstResponse.getTime() - created.getTime()) / (1000 * 60),
        );
        updates.response_time_minutes = diffMinutes;
      }
    }

    // Si el mensaje es del soporte y el ticket está en "waiting_customer", cambiar a "in_progress"
    if (!isFromCustomer && ticket.status === "waiting_customer") {
      updates.status = "in_progress";
    }

    // Si el mensaje es del cliente y el ticket está resuelto o cerrado, cambiar a "waiting_customer"
    if (
      isFromCustomer &&
      (ticket.status === "resolved" || ticket.status === "closed")
    ) {
      updates.status = "waiting_customer";
    }

    await supabaseServiceRole
      .from("saas_support_tickets")
      .update(updates)
      .eq("id", params.id);

    logger.info(`SaaS support message created for ticket: ${params.id}`);

    // Send email notification if message is from support (not internal, not from customer)
    if (!body.is_internal && !isFromCustomer) {
      try {
        if (process.env.RESEND_API_KEY) {
          // Get full ticket details for email
          const { data: fullTicket } = await supabaseServiceRole
            .from("saas_support_tickets")
            .select(
              `
              *,
              organization:organizations(id, name, slug)
            `,
            )
            .eq("id", params.id)
            .single();

          if (fullTicket) {
            const { sendSaasNewResponseEmail } = await import(
              "@/lib/email/templates/saas-support"
            );
            await sendSaasNewResponseEmail(
              {
                id: fullTicket.id,
                ticket_number: fullTicket.ticket_number,
                subject: fullTicket.subject,
                description: fullTicket.description,
                status: fullTicket.status,
                priority: fullTicket.priority,
                category: fullTicket.category,
                requester_name: fullTicket.requester_name,
                requester_email: fullTicket.requester_email,
                organization: fullTicket.organization as any,
              },
              {
                message: body.message,
                created_at: message.created_at,
                sender_name: message.sender_name,
                sender_email: message.sender_email,
                is_from_customer: false,
              },
            );
            logger.info("New response email sent successfully");
          }
        } else {
          logger.debug("Resend not configured, skipping email notification");
        }
      } catch (emailError) {
        logger.warn("Failed to send new response email", emailError);
        // Don't fail the request if email fails
      }
    }

    // Push notification for root/dev when customer adds message
    if (isFromCustomer) {
      try {
        const { NotificationService } = await import(
          "@/lib/notifications/notification-service"
        );
        await NotificationService.notifySaasSupportNewMessage(
          params.id,
          (ticket as any)?.ticket_number,
          (ticket as any)?.subject,
          true,
        );
      } catch (pushErr) {
        logger.warn("Failed to create support push notification", pushErr);
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /api/admin/saas-management/support/tickets/[id]/messages",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/support/ticket/[ticketNumber]
 * Obtener información de un ticket público por su número
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketNumber: string } },
) {
  try {
    const supabaseServiceRole = createServiceRoleClient();

    // Obtener ticket por número
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .select(
        `
        id,
        ticket_number,
        subject,
        description,
        category,
        priority,
        status,
        created_at,
        updated_at,
        first_response_at,
        last_response_at,
        organization:organizations(id, name, slug)
      `,
      )
      .eq("ticket_number", params.ticketNumber)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Obtener mensajes públicos (sin mensajes internos)
    const { data: messages, error: messagesError } = await supabaseServiceRole
      .from("saas_support_messages")
      .select(
        `
        id,
        message,
        sender_name,
        sender_email,
        is_from_customer,
        created_at,
        message_type
      `,
      )
      .eq("ticket_id", ticket.id)
      .eq("is_internal", false) // Solo mensajes públicos
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.error("Error fetching ticket messages", messagesError);
      // Continuar sin mensajes si hay error
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        messages: messages || [],
      },
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/support/ticket/[ticketNumber]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/support/ticket/[ticketNumber]
 * Agregar mensaje a un ticket público
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketNumber: string } },
) {
  try {
    const supabaseServiceRole = createServiceRoleClient();

    const body = await request.json();
    const { message, requester_email, requester_name } = body;

    if (!message || !requester_email) {
      return NextResponse.json(
        { error: "Message and email are required" },
        { status: 400 },
      );
    }

    // Obtener ticket por número
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("saas_support_tickets")
      .select("id, requester_email, status")
      .eq("ticket_number", params.ticketNumber)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verificar que el email coincida (seguridad básica)
    if (
      ticket.requester_email.toLowerCase() !== requester_email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Crear mensaje
    const { data: newMessage, error: messageError } = await supabaseServiceRole
      .from("saas_support_messages")
      .insert({
        ticket_id: ticket.id,
        message: message.trim(),
        is_internal: false,
        is_from_customer: true,
        sender_id: null, // No hay usuario autenticado
        sender_name: requester_name || requester_email.split("@")[0],
        sender_email: requester_email,
        message_type: "message",
        attachments: [],
      })
      .select()
      .single();

    if (messageError) {
      logger.error("Error creating message", messageError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 },
      );
    }

    // Actualizar ticket: last_response_at y cambiar estado si estaba resuelto/cerrado
    const updates: Record<string, unknown> = {
      last_response_at: new Date().toISOString(),
    };

    if (ticket.status === "resolved" || ticket.status === "closed") {
      updates.status = "waiting_customer";
    }

    await supabaseServiceRole
      .from("saas_support_tickets")
      .update(updates)
      .eq("id", ticket.id);

    logger.info(`Message added to public ticket: ${params.ticketNumber}`);

    // Push notification for root/dev when customer adds message
    try {
      const { data: fullTicket } = await supabaseServiceRole
        .from("saas_support_tickets")
        .select("id, ticket_number, subject")
        .eq("id", ticket.id)
        .single();
      if (fullTicket) {
        const { NotificationService } = await import(
          "@/lib/notifications/notification-service"
        );
        await NotificationService.notifySaasSupportNewMessage(
          fullTicket.id,
          fullTicket.ticket_number,
          fullTicket.subject,
          true,
        );
      }
    } catch (notifError) {
      // Non-blocking
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /api/support/ticket/[ticketNumber]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

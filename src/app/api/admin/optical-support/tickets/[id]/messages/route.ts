import { NextRequest, NextResponse } from "next/server";

import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { createOpticalInternalSupportMessageSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/optical-support/tickets/[id]/messages
 * Obtener mensajes de un ticket
 */
export const dynamic = "force-dynamic";
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

    // Obtener información del usuario admin
    const { data: adminUser } = await supabaseServiceRole
      .from("admin_users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    const isRoot = adminUser?.role === "root" || adminUser?.role === "dev";
    let organizationId = adminUser?.organization_id;
    if (!organizationId && isRoot) {
      organizationId = (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || null;
    }
    if (!adminUser || !organizationId) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    // Obtener ticket para verificar permisos
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("optical_internal_support_tickets")
      .select("id, organization_id")
      .eq("id", params.id)
      .eq("organization_id", organizationId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Obtener mensajes
    const { data: messages, error: messagesError } = await supabaseServiceRole
      .from("optical_internal_support_messages")
      .select(
        `
        *,
        sender:admin_users!optical_internal_support_messages_sender_id_fkey(id, email, role)
      `,
      )
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.error(
        "Error fetching optical internal support messages",
        messagesError,
      );
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/admin/optical-support/tickets/[id]/messages",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/optical-support/tickets/[id]/messages
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

    const isRootPost = adminUser.role === "root" || adminUser.role === "dev";
    let organizationIdPost = adminUser.organization_id;
    if (!organizationIdPost && isRootPost) {
      organizationIdPost =
        (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || null;
    }
    if (!organizationIdPost) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    // Verificar que el ticket existe y pertenece a la organización
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("optical_internal_support_tickets")
      .select("id, organization_id, status")
      .eq("id", params.id)
      .eq("organization_id", organizationIdPost)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Validar body
    const body = await parseAndValidateBody(
      request,
      createOpticalInternalSupportMessageSchema,
    );

    // Crear mensaje
    const { data: message, error: messageError } = await supabaseServiceRole
      .from("optical_internal_support_messages")
      .insert({
        ticket_id: params.id,
        message: body.message,
        is_internal: body.is_internal ?? true,
        sender_id: adminUser.id,
        sender_name: user.email?.split("@")[0] || "Usuario",
        sender_email: adminUser.email || user.email || "",
        sender_role: adminUser.role,
        message_type: body.message_type || "message",
        attachments: body.attachments || [],
      })
      .select(
        `
        *,
        sender:admin_users!optical_internal_support_messages_sender_id_fkey(id, email, role)
      `,
      )
      .single();

    if (messageError) {
      logger.error(
        "Error creating optical internal support message",
        messageError,
      );
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 },
      );
    }

    // Actualizar last_response_at del ticket
    await supabaseServiceRole
      .from("optical_internal_support_tickets")
      .update({
        last_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    // Si el ticket estaba cerrado y se agrega un mensaje, cambiar a "waiting_customer"
    if (ticket.status === "closed" || ticket.status === "resolved") {
      await supabaseServiceRole
        .from("optical_internal_support_tickets")
        .update({
          status: "waiting_customer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);
    }

    logger.info("Optical internal support message created", {
      messageId: message?.id,
      ticketId: params.id,
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /api/admin/optical-support/tickets/[id]/messages",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

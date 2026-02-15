import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { updateOpticalInternalSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";

/**
 * GET /api/admin/optical-support/tickets/[id]
 * Obtener detalles de un ticket específico
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

    if (!adminUser || !adminUser.organization_id) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    // Obtener ticket
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("optical_internal_support_tickets")
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email, phone),
        assigned_to_user:admin_users!optical_internal_support_tickets_assigned_to_fkey(id, email, role),
        created_by_user:admin_users!optical_internal_support_tickets_created_by_user_id_fkey(id, email, role),
        resolved_by_user:admin_users!optical_internal_support_tickets_resolved_by_fkey(id, email, role),
        branch:branches(id, name, code),
        related_order:orders(id, order_number),
        related_work_order:lab_work_orders(id, work_order_number),
        related_appointment:appointments(id, appointment_date, appointment_time),
        related_quote:quotes(id, quote_number)
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", adminUser.organization_id) // Solo tickets de su organización
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/admin/optical-support/tickets/[id]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/optical-support/tickets/[id]
 * Actualizar un ticket (cambiar estado, asignar, resolver, etc.)
 */
export async function PATCH(
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
      .select("id, email, role, organization_id")
      .eq("id", user.id)
      .single();

    if (!adminUser || !adminUser.organization_id) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    // Obtener ticket actual
    const { data: currentTicket, error: currentError } =
      await supabaseServiceRole
        .from("optical_internal_support_tickets")
        .select("id, organization_id, status, assigned_to, resolved_at")
        .eq("id", params.id)
        .eq("organization_id", adminUser.organization_id)
        .single();

    if (currentError || !currentTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Validar body
    const body = await parseAndValidateBody(
      request,
      updateOpticalInternalSupportTicketSchema,
    );

    // Preparar actualización
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      updateData.status = body.status;

      // Si se resuelve, establecer resolved_at y resolved_by
      if (body.status === "resolved" || body.status === "closed") {
        if (!currentTicket.resolved_at) {
          updateData.resolved_at = new Date().toISOString();
          updateData.resolved_by = adminUser.id;
        }
      }
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    if (body.assigned_to !== undefined) {
      updateData.assigned_to = body.assigned_to;
      if (body.assigned_to && currentTicket.assigned_to !== body.assigned_to) {
        updateData.assigned_at = new Date().toISOString();
      }
    }

    if (body.resolution !== undefined) {
      updateData.resolution = body.resolution;
    }

    if (body.resolution_notes !== undefined) {
      updateData.resolution_notes = body.resolution_notes;
    }

    // Actualizar ticket
    const { data: ticket, error: ticketError } = await supabaseServiceRole
      .from("optical_internal_support_tickets")
      .update(updateData)
      .eq("id", params.id)
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email),
        assigned_to_user:admin_users!optical_internal_support_tickets_assigned_to_fkey(id, email, role),
        created_by_user:admin_users!optical_internal_support_tickets_created_by_user_id_fkey(id, email, role),
        resolved_by_user:admin_users!optical_internal_support_tickets_resolved_by_fkey(id, email, role),
        branch:branches(id, name, code)
      `,
      )
      .single();

    if (ticketError) {
      logger.error(
        "Error updating optical internal support ticket",
        ticketError,
      );
      return NextResponse.json(
        { error: "Failed to update ticket" },
        { status: 500 },
      );
    }

    // Crear mensaje de sistema si cambió el estado o asignación
    if (body.status && body.status !== currentTicket.status) {
      await supabaseServiceRole
        .from("optical_internal_support_messages")
        .insert({
          ticket_id: params.id,
          message: `Estado cambiado a: ${body.status}`,
          is_internal: false,
          sender_id: adminUser.id,
          sender_name: user.email?.split("@")[0] || "Sistema",
          sender_email: adminUser.email || user.email || "",
          sender_role: adminUser.role,
          message_type: "status_change",
        });
    }

    if (
      body.assigned_to !== undefined &&
      body.assigned_to !== currentTicket.assigned_to
    ) {
      const assignedUserName = body.assigned_to
        ? (
            await supabaseServiceRole
              .from("admin_users")
              .select("email")
              .eq("id", body.assigned_to)
              .single()
          ).data?.email || "Usuario"
        : "Sin asignar";

      await supabaseServiceRole
        .from("optical_internal_support_messages")
        .insert({
          ticket_id: params.id,
          message: `Ticket asignado a: ${assignedUserName}`,
          is_internal: false,
          sender_id: adminUser.id,
          sender_name: user.email?.split("@")[0] || "Sistema",
          sender_email: adminUser.email || user.email || "",
          sender_role: adminUser.role,
          message_type: "assignment",
        });
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in PATCH /api/admin/optical-support/tickets/[id]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

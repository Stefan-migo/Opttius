import { NextRequest, NextResponse } from "next/server";

import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { updateOpticalInternalSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
// eslint-disable-next-line no-restricted-imports
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function updateTicketHandler(
  request: NextRequest,
  ticketId: string,
) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminUser } = await supabaseServiceRole
    .from("admin_users")
    .select("id, email, role, organization_id")
    .eq("id", user.id)
    .single();

  const isRoot = adminUser?.role === "root" || adminUser?.role === "dev";
  let organizationId = adminUser?.organization_id;
  if (!organizationId && isRoot) {
    organizationId =
      (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || undefined;
  }
  if (!adminUser || !organizationId) {
    return NextResponse.json(
      { error: "No organization assigned" },
      { status: 403 },
    );
  }

  const { data: currentTicket, error: currentError } = await supabaseServiceRole
    .from("optical_internal_support_tickets")
    .select("id, organization_id, status, assigned_to, resolved_at, created_at")
    .eq("id", ticketId)
    .eq("organization_id", organizationId)
    .single();

  if (currentError || !currentTicket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const body = await parseAndValidateBody(
    request,
    updateOpticalInternalSupportTicketSchema,
  );

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    updateData.status = body.status;

    if (body.status === "resolved" || body.status === "closed") {
      if (!currentTicket.resolved_at) {
        const resolvedAt = new Date();
        updateData.resolved_at = resolvedAt.toISOString();
        updateData.resolved_by = adminUser.id;
        const createdAt = new Date(currentTicket.created_at);
        updateData.resolution_time_minutes = Math.round(
          (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60),
        );
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

  const { data: ticket, error: ticketError } = await supabaseServiceRole
    .from("optical_internal_support_tickets")
    .update(updateData)
    .eq("id", ticketId)
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
    logger.error("Error updating optical internal support ticket", ticketError);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 },
    );
  }

  if (body.status && body.status !== currentTicket.status) {
    await supabaseServiceRole.from("optical_internal_support_messages").insert({
      ticket_id: ticketId,
      message: `Estado cambiado a: ${body.status}`,
      is_internal: true,
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

    await supabaseServiceRole.from("optical_internal_support_messages").insert({
      ticket_id: ticketId,
      message: `Ticket asignado a: ${assignedUserName}`,
      is_internal: true,
      sender_id: adminUser.id,
      sender_name: user.email?.split("@")[0] || "Sistema",
      sender_email: adminUser.email || user.email || "",
      sender_role: adminUser.role,
      message_type: "assignment",
    });
  }

  const hasResolution =
    (body.resolution && body.resolution.trim()) ||
    (body.resolution_notes && body.resolution_notes.trim());
  if (hasResolution) {
    const resolutionParts: string[] = [];
    if (body.resolution?.trim()) {
      resolutionParts.push(`Resolución: ${body.resolution.trim()}`);
    }
    if (body.resolution_notes?.trim()) {
      resolutionParts.push(`Notas: ${body.resolution_notes.trim()}`);
    }

    await supabaseServiceRole.from("optical_internal_support_messages").insert({
      ticket_id: ticketId,
      message: resolutionParts.join("\n\n"),
      is_internal: true,
      sender_id: adminUser.id,
      sender_name: user.email?.split("@")[0] || "Sistema",
      sender_email: adminUser.email || user.email || "",
      sender_role: adminUser.role,
      message_type: "resolution",
    });
  }

  return NextResponse.json({
    success: true,
    ticket,
  });
}

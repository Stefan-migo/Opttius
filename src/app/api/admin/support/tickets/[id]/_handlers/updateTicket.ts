import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export async function updateTicketHandler(
  request: NextRequest,
  ticketId: string,
) {
  const body = await request.json();
  const {
    status,
    priority,
    assigned_to,
    category_id,
    resolution,
    customer_satisfaction_rating,
  } = body;

  const supabase = await createClient();

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

  const { data: existingTicket } = await supabase
    .from("support_tickets")
    .select("branch_id")
    .eq("id", ticketId)
    .single();

  if (!existingTicket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const branchContext = await getBranchContext(request, user.id);
  const hasAccess = await validateBranchAccess(
    user.id,
    existingTicket.branch_id,
  );

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "No tiene acceso a este ticket de soporte",
      },
      { status: 403 },
    );
  }

  const updateData: {
    updated_at: string;
    status?: string;
    priority?: string;
    category_id?: string;
    resolution?: string | null;
    customer_satisfaction_rating?: number | null;
    assigned_to?: string | null;
    assigned_at?: string | null;
    resolved_at?: string;
    [key: string]: unknown;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (resolution !== undefined) updateData.resolution = resolution;
  if (customer_satisfaction_rating !== undefined)
    updateData.customer_satisfaction_rating = customer_satisfaction_rating;

  if (assigned_to !== undefined) {
    updateData.assigned_to = assigned_to;
    if (assigned_to) {
      updateData.assigned_at = new Date().toISOString();
    } else {
      updateData.assigned_at = null;
    }
  }

  if (status === "resolved" || status === "closed") {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = user.id;
  }

  const { data: updatedTicket, error: updateError } = await supabase
    .from("support_tickets")
    .update(updateData)
    .eq("id", ticketId)
    .select(
      `
        *,
        category:support_categories(id, name),
        assigned_admin:admin_users!assigned_to(id, email)
      `,
    )
    .single();

  if (updateError) {
    logger.error("Error updating support ticket", updateError);
    return NextResponse.json(
      {
        error: "Failed to update support ticket",
        details: updateError.message,
      },
      { status: 500 },
    );
  }

  if (updatedTicket.customer_id && updatedTicket.branch_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone")
      .eq("id", updatedTicket.customer_id)
      .eq("branch_id", updatedTicket.branch_id)
      .maybeSingle();

    updatedTicket.customer = customer;
  }

  if (status && status !== body.previous_status) {
    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      message: `Ticket status changed from ${body.previous_status || "unknown"} to ${status}`,
      is_internal: false,
      is_from_customer: false,
      sender_id: user.id,
      message_type: "status_change",
    });
  }

  if (assigned_to !== undefined && assigned_to !== body.previous_assigned_to) {
    const assignmentMessage = assigned_to
      ? `Ticket assigned to admin`
      : `Ticket unassigned`;

    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      message: assignmentMessage,
      is_internal: true,
      is_from_customer: false,
      sender_id: user.id,
      message_type: "assignment",
    });
  }

  await supabase.rpc("log_admin_activity", {
    action: "update_support_ticket",
    resource_type: "support_ticket",
    resource_id: ticketId,
    details: {
      updated_fields: Object.keys(updateData),
      ticket_number: updatedTicket.ticket_number,
    },
  });

  if (status && status !== body.previous_status) {
    try {
      const { sendStatusChangeEmail } = await import(
        "@/lib/email/templates/support"
      );

      const ticketForEmail = {
        id: updatedTicket.id,
        ticket_number: updatedTicket.ticket_number,
        subject: updatedTicket.subject,
        description: updatedTicket.description || "",
        status: updatedTicket.status,
        priority: updatedTicket.priority,
        customer_name:
          updatedTicket.customer?.first_name &&
          updatedTicket.customer?.last_name
            ? `${updatedTicket.customer.first_name} ${updatedTicket.customer.last_name}`.trim()
            : undefined,
        customer_email: updatedTicket.customer?.email || "",
      };

      await sendStatusChangeEmail(
        ticketForEmail,
        body.previous_status || "unknown",
        status,
      );
      logger.info("Status change email sent successfully", { ticketId });
    } catch (emailError) {
      logger.warn("Failed to send status change email", emailError);
    }
  }

  return NextResponse.json({ ticket: updatedTicket });
}

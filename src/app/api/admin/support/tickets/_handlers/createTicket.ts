import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export async function createTicketHandler(request: NextRequest) {
  logger.info("Support Tickets API POST called (create ticket)");
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", {
    user_id: user.id,
  });
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const branchContext = await getBranchContext(request, user.id);

  if (!branchContext.isSuperAdmin && !branchContext.branchId) {
    return NextResponse.json(
      {
        error: "Debe seleccionar una sucursal para crear tickets de soporte",
      },
      { status: 400 },
    );
  }

  const body = await request.json();
  const {
    title,
    description,
    priority = "medium",
    category_id,
    customer_email,
    customer_name,
    order_id,
    assigned_to,
    created_by_admin,
  } = body;

  logger.info("Creating new ticket", { customer_email, title, priority });

  if (!title || !description || !customer_email) {
    return NextResponse.json(
      {
        error: "Missing required fields: title, description, customer_email",
      },
      { status: 400 },
    );
  }

  const { data: latestTicket } = await supabase
    .from("support_tickets")
    .select("ticket_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let ticketNumber = "SUP-001";
  if (latestTicket?.ticket_number) {
    const match = latestTicket.ticket_number.match(/SUP-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      ticketNumber = `SUP-${nextNumber.toString().padStart(3, "0")}`;
    }
  }

  let customer_id = null;
  if (branchContext.branchId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", customer_email)
      .eq("branch_id", branchContext.branchId)
      .maybeSingle();

    if (customer) {
      customer_id = customer.id;
    }
  }

  const ticketData = {
    ticket_number: ticketNumber,
    subject: title,
    description,
    priority,
    status: "open",
    branch_id: branchContext.branchId,
    customer_id,
    customer_email,
    customer_name: customer_name || null,
    category_id: category_id || null,
    order_id: order_id || null,
    assigned_to: assigned_to || null,
    assigned_at: assigned_to ? new Date().toISOString() : null,
  };

  logger.debug("Attempting to insert ticket with data", { ticketData });

  const { data: newTicket, error: createError } = await supabase
    .from("support_tickets")
    .insert(ticketData)
    .select(
      `
        *,
        category:support_categories(id, name),
        assigned_admin:admin_users!assigned_to(id, email),
        order:orders!order_id(id, order_number)
      `,
    )
    .single();

  if (createError) {
    logger.error("Error creating ticket", createError, {
      errorDetails: JSON.stringify(createError, null, 2),
      ticketData: JSON.stringify(ticketData, null, 2),
    });
    return NextResponse.json(
      {
        error: "Failed to create ticket",
        details: createError.message,
        code: createError.code,
        hint: createError.hint,
      },
      { status: 500 },
    );
  }

  logger.info("Ticket created successfully", {
    ticketNumber: newTicket.ticket_number,
  });

  try {
    await supabase.from("support_messages").insert({
      ticket_id: newTicket.id,
      message: `Ticket created by admin${created_by_admin ? " on behalf of customer" : ""}`,
      is_internal: true,
      is_from_customer: false,
      sender_id: user.id,
      message_type: "note",
    });
    logger.debug("System message created");
  } catch (msgError) {
    logger.warn("Failed to create system message", msgError);
  }

  try {
    await supabase.rpc("log_admin_activity", {
      action: "create_support_ticket",
      resource_type: "support_ticket",
      resource_id: newTicket.id,
      details: {
        ticket_number: newTicket.ticket_number,
        customer_email,
        priority,
      },
    });
  } catch (logError) {
    logger.warn("Failed to log admin activity", logError);
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const { sendTicketCreatedEmail } = await import(
        "@/lib/email/templates/support"
      );
      await sendTicketCreatedEmail({
        id: newTicket.id,
        ticket_number: newTicket.ticket_number,
        subject: title,
        description,
        status: newTicket.status,
        priority: newTicket.priority,
        customer_name: customer_name,
        customer_email: customer_email,
      });
      logger.info("Ticket creation email sent successfully");
    } else {
      logger.debug("Resend not configured, skipping email notification");
    }
  } catch (emailError) {
    logger.warn("Failed to send ticket creation email", emailError);
  }

  try {
    const priorityMap = {
      low: "low" as const,
      medium: "medium" as const,
      high: "high" as const,
      urgent: "urgent" as const,
    };

    await supabase.from("admin_notifications").insert({
      type: "support_ticket_new",
      priority: priorityMap[priority as keyof typeof priorityMap] || "medium",
      title: "Nuevo Ticket de Soporte",
      message: `${customer_name || customer_email} ha creado un nuevo ticket: ${title}`,
      related_entity_type: "ticket",
      related_entity_id: newTicket.id,
      action_url: `/admin/support/tickets/${newTicket.id}`,
      action_label: "Ver Ticket",
      metadata: {
        ticket_number: newTicket.ticket_number,
        customer_email: customer_email,
        customer_name: customer_name,
        priority: priority,
        category_id: category_id,
      },
      target_admin_id: assigned_to || null,
      is_read: false,
    });
    logger.debug("Admin notification created for new ticket");
  } catch (notificationError) {
    logger.warn("Failed to create admin notification", notificationError);
  }

  return NextResponse.json({
    ticket: newTicket,
    success: true,
  });
}

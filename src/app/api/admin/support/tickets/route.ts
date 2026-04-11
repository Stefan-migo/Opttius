import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    logger.info("Support Tickets API GET called");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const assigned_to = searchParams.get("assigned_to") || "";
    const category_id = searchParams.get("category_id") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    logger.debug("Query params", {
      status,
      priority,
      assigned_to,
      category_id,
      search,
      page,
      limit,
    });

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("User authentication failed", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.debug("User authenticated", { email: user.email });

    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      { user_id: user.id } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };
    if (adminError) {
      logger.error("Admin check error", adminError);
      return NextResponse.json(
        { error: "Admin verification failed" },
        { status: 500 },
      );
    }
    if (!isAdmin) {
      logger.warn("User is not admin", { email: user.email });
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.debug("Admin access confirmed", { email: user.email });

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Build the base query
    let query = supabase.from("support_tickets").select(
      `
        *,
        category:support_categories(
          id,
          name
        ),
        assigned_admin:admin_users!assigned_to(
          id,
          email
        ),
        order:orders!order_id(
          id,
          order_number
        )
      `,
      { count: "exact" },
    );

    // Apply branch filter
    query = addBranchFilter(
      query,
      branchContext.branchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (priority && priority !== "all") {
      query = query.eq("priority", priority);
    }

    if (assigned_to && assigned_to !== "all") {
      if (assigned_to === "unassigned") {
        query = query.is("assigned_to", null);
      } else if (assigned_to === "assigned") {
        query = query.not("assigned_to", "is", null);
      }
    }

    if (category_id && category_id !== "all") {
      query = query.eq("category_id", category_id);
    }

    // Apply ordering (newest first)
    query = query.order("created_at", { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      logger.error("Error fetching tickets", ticketsError);
      return NextResponse.json(
        { error: "Failed to fetch support tickets" },
        { status: 500 },
      );
    }

    logger.debug("Support tickets returned", {
      returned: tickets?.length || 0,
      total: count || 0,
    });

    // For each ticket, fetch customer profile and message stats
    const ticketsWithStats = await Promise.all(
      (tickets || []).map(async (ticket) => {
        // Get customer if customer_id exists (try customers table first, then profiles as fallback)
        let customerProfile = null;
        if (ticket.customer_id && ticket.branch_id) {
          // Try customers table first (new structure)
          const { data: customer } = await supabase
            .from("customers")
            .select("id, first_name, last_name, email")
            .eq("id", ticket.customer_id)
            .eq("branch_id", ticket.branch_id)
            .maybeSingle();

          if (customer) {
            customerProfile = customer;
          } else {
            // Fallback to profiles for legacy tickets
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, email")
              .eq("id", ticket.customer_id)
              .maybeSingle();
            customerProfile = profile;
          }
        } else if (ticket.customer_id) {
          // Legacy tickets without branch_id - use profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .eq("id", ticket.customer_id)
            .maybeSingle();
          customerProfile = profile;
        }

        // Get messages for this ticket
        const { data: messages } = await supabase
          .from("support_messages")
          .select("id, is_from_customer, is_internal, created_at")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: false });

        const customerMessages =
          messages?.filter((msg) => msg.is_from_customer) || [];
        const adminMessages =
          messages?.filter(
            (msg) => !msg.is_from_customer && !msg.is_internal,
          ) || [];
        const allMessages = messages || [];

        // Calculate age in hours
        const createdAt = new Date(ticket.created_at);
        const now = new Date();
        const ageHours = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
        );

        // Determine if needs response (customer has sent more messages than admin)
        const needsResponse = customerMessages.length > adminMessages.length;

        // Get last message timestamp for "last activity"
        const lastMessage = allMessages[0]; // First one since we ordered desc
        const lastResponseAt = lastMessage
          ? lastMessage.created_at
          : ticket.updated_at;

        return {
          ...ticket,
          // Add customer data
          customer: customerProfile,
          customer_name: customerProfile
            ? `${customerProfile.first_name || ""} ${customerProfile.last_name || ""}`.trim()
            : ticket.customer_name || "",
          // Use email from profile if available, otherwise from ticket
          customer_email: customerProfile?.email || ticket.customer_email || "",
          last_response_at: lastResponseAt,
          stats: {
            messageCount: allMessages.length,
            customerMessageCount: customerMessages.length,
            adminMessageCount: adminMessages.length,
            ageHours,
            needsResponse,
          },
        };
      }),
    );

    return NextResponse.json({
      tickets: ticketsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error("Error in support tickets API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info("Support Tickets API POST called (create ticket)");
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("User authentication failed", userError);
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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Validate branch access for non-super admins
    if (!branchContext.isSuperAdmin && !branchContext.branchId) {
      return NextResponse.json(
        {
          error: "Debe seleccionar una sucursal para crear tickets de soporte",
        },
        { status: 400 },
      );
    }

    // Parse request body
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

    // Validate required fields
    if (!title || !description || !customer_email) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, description, customer_email",
        },
        { status: 400 },
      );
    }

    // Generate unique ticket number
    const { data: latestTicket } = await supabase
      .from("support_tickets")
      .select("ticket_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let ticketNumber = "SUP-001";
    if (latestTicket?.ticket_number) {
      // Extract number from format SUP-XXX and increment
      const match = latestTicket.ticket_number.match(/SUP-(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1]) + 1;
        ticketNumber = `SUP-${nextNumber.toString().padStart(3, "0")}`;
      }
    }

    // Find customer by email (if exists) - use customers table
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

    // Create the ticket
    const ticketData = {
      ticket_number: ticketNumber,
      subject: title, // The database field is 'subject' not 'title'
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

    // Create an initial system message (non-blocking)
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
      // Don't fail the request if message creation fails
    }

    // Log admin activity (non-blocking)
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
      // Don't fail the request if logging fails
    }

    // Send email notification to customer using Resend (non-blocking)
    try {
      // Check if Resend is configured
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
      // Don't fail the request if email fails
    }

    // Create admin notification for new ticket (non-blocking)
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
        target_admin_id: assigned_to || null, // Notify assigned admin or all admins
        is_read: false,
      });
      logger.debug("Admin notification created for new ticket");
    } catch (notificationError) {
      logger.warn("Failed to create admin notification", notificationError);
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      ticket: newTicket,
      success: true,
    });
  } catch (error) {
    logger.error("Unexpected error in support tickets POST API", error, {
      stack: error instanceof Error ? error.stack : "No stack trace",
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 },
    );
  }
}

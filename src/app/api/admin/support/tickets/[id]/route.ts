import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

import { updateTicketHandler } from "./_handlers/updateTicket";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params;

    const supabase = await createClient();

    // Check admin authorization
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

    // Get ticket with full details (without customer join to avoid null issues)
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select(
        `
        *,
        category:support_categories(
          id,
          name,
          description
        ),
        assigned_admin:admin_users!assigned_to(
          id,
          email
        ),
        resolved_admin:admin_users!resolved_by(
          id,
          email
        ),
        order:orders!order_id(
          id,
          order_number,
          total_amount,
          status,
          created_at
        )
      `,
      )
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      logger.error("Error fetching ticket", ticketError);
      return NextResponse.json(
        {
          error: "Ticket not found",
          details: ticketError?.message,
        },
        { status: 404 },
      );
    }

    // Validate branch access
    const branchContext = await getBranchContext(request, user.id);
    const hasAccess = await validateBranchAccess(user.id, ticket.branch_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este ticket de soporte",
        },
        { status: 403 },
      );
    }

    // Fetch customer separately if customer_id exists (use customers table)
    let customerProfile = null;
    if (ticket.customer_id && ticket.branch_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, first_name, last_name, email, phone")
        .eq("id", ticket.customer_id)
        .eq("branch_id", ticket.branch_id)
        .maybeSingle();

      customerProfile = customer;
    }

    // Attach customer data
    ticket.customer = customerProfile;

    // Get ticket messages
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.warn("Error fetching ticket messages", messagesError);
    }

    // Calculate ticket analytics
    const createdAt = new Date(ticket.created_at);
    const now = new Date();
    const ageHours = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
    );

    const customerMessages =
      messages?.filter((msg) => msg.is_from_customer) || [];
    const adminMessages =
      messages?.filter((msg) => !msg.is_from_customer && !msg.is_internal) ||
      [];
    const internalNotes = messages?.filter((msg) => msg.is_internal) || [];

    const needsResponse = customerMessages.length > adminMessages.length;
    const lastCustomerMessage = customerMessages[customerMessages.length - 1];
    const lastAdminMessage = adminMessages[adminMessages.length - 1];

    let responseTime = null;
    if (ticket.first_response_at) {
      const firstResponseTime =
        new Date(ticket.first_response_at).getTime() - createdAt.getTime();
      responseTime = Math.floor(firstResponseTime / (1000 * 60 * 60)); // hours
    }

    const ticketWithAnalytics = {
      ...ticket,
      messages: messages || [],
      analytics: {
        ageHours,
        responseTimeHours: responseTime,
        messageCount: messages?.length || 0,
        customerMessageCount: customerMessages.length,
        adminMessageCount: adminMessages.length,
        internalNoteCount: internalNotes.length,
        needsResponse,
        lastCustomerMessageAt: lastCustomerMessage?.created_at,
        lastAdminMessageAt: lastAdminMessage?.created_at,
      },
    };

    return NextResponse.json({ ticket: ticketWithAnalytics });
  } catch (error) {
    logger.error("Error in ticket detail API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await params;
  return updateTicketHandler(request, ticketId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ticketId = params.id;

    const supabase = await createClient();

    // Check admin authorization (only super admin can delete tickets)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRole } = await supabase.rpc("get_admin_role", {
      user_id: user.id,
    });
    if (adminRole !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Delete the ticket (messages will be cascade deleted)
    const { error: deleteError } = await supabase
      .from("support_tickets")
      .delete()
      .eq("id", ticketId);

    if (deleteError) {
      logger.error("Error deleting support ticket", deleteError);
      return NextResponse.json(
        { error: "Failed to delete support ticket" },
        { status: 500 },
      );
    }

    // Log admin activity
    await supabase.rpc("log_admin_activity", {
      action: "delete_support_ticket",
      resource_type: "support_ticket",
      resource_id: ticketId,
      details: { deleted_by: user.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in ticket delete API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

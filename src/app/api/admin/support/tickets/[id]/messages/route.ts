import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ticketId = params.id;
    const body = await request.json();
    const {
      message,
      is_internal = false,
      is_from_customer = false,
      attachments = null,
    } = body;

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

    // Verify ticket exists and get full details for email
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select(
        "id, ticket_number, subject, description, status, priority, customer_email, customer_name, first_response_at",
      )
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get admin user details
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("email")
      .eq("id", user.id)
      .single();

    // Create the message
    const { data: newMessage, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        message,
        is_internal,
        is_from_customer,
        sender_id: user.id,
        sender_name: adminUser?.email || "Admin",
        sender_email: adminUser?.email,
        attachments,
        message_type: "message",
      })
      .select("*")
      .single();

    if (messageError) {
      logger.error("Error creating support message", messageError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 },
      );
    }

    // If this is not an internal message, update ticket status if needed
    if (!is_internal && !is_from_customer) {
      await supabase
        .from("support_tickets")
        .update({
          status: "pending_customer",
          updated_at: new Date().toISOString(),
          last_response_at: new Date().toISOString(),
          // Set first_response_at if not set
          first_response_at:
            ticket.first_response_at || new Date().toISOString(),
        })
        .eq("id", ticketId)
        .eq("status", "open"); // Only update if currently open

      // Send email notification to customer for admin responses (not internal notes)
      try {
        const { sendNewResponseEmail } = await import(
          "@/lib/email/templates/support"
        );
        await sendNewResponseEmail(
          {
            id: ticket.id,
            ticket_number: ticket.ticket_number || ticketId,
            subject: ticket.subject || "Support Ticket",
            description: ticket.description || "",
            status: ticket.status || "open",
            priority: ticket.priority || "medium",
            customer_name: ticket.customer_name,
            customer_email: ticket.customer_email,
          },
          {
            message: newMessage.message,
            created_at: newMessage.created_at,
            is_from_customer: false,
          },
        );
        logger.info("Response email sent successfully", { ticketId });
      } catch (emailError) {
        logger.warn("Failed to send response email", emailError);
        // Don't fail the request if email fails
      }
    }

    // Log admin activity
    await supabase.rpc("log_admin_activity", {
      action: "create_support_message",
      resource_type: "support_message",
      resource_id: newMessage.id,
      details: {
        ticket_id: ticketId,
        message_type: is_internal ? "internal_note" : "response",
      },
    });

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    logger.error("Error in create support message API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ticketId = params.id;

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

    // Get all messages for the ticket
    const { data: messages, error } = await supabase
      .from("support_messages")
      .select(
        `
        *,
        sender:auth.users!sender_id(
          id,
          email
        )
      `,
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Error fetching support messages", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    logger.error("Error in support messages API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

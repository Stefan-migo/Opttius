import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

import { createTicketHandler } from "./_handlers/createTicket";

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
  return createTicketHandler(request);
}

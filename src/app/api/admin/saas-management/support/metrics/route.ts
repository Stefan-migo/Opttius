import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/saas-management/support/metrics
 * Obtener métricas de soporte SaaS (solo root/dev)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Total tickets
    let totalQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("*", { count: "exact", head: true });

    if (startDate) {
      totalQuery = totalQuery.gte("created_at", startDate);
    }
    if (endDate) {
      totalQuery = totalQuery.lte("created_at", endDate);
    }

    const { count: totalTickets } = await totalQuery;

    // Tickets by status
    let statusQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("status");

    if (startDate) {
      statusQuery = statusQuery.gte("created_at", startDate);
    }
    if (endDate) {
      statusQuery = statusQuery.lte("created_at", endDate);
    }

    const { data: ticketsByStatus } = await statusQuery;

    const statusCounts = {
      open: 0,
      assigned: 0,
      in_progress: 0,
      waiting_customer: 0,
      resolved: 0,
      closed: 0,
    };

    ticketsByStatus?.forEach((ticket: unknown) => {
      if (ticket.status in statusCounts) {
        statusCounts[ticket.status as keyof typeof statusCounts]++;
      }
    });

    // Tickets by priority
    let ticketsByPriorityQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("priority");

    if (startDate) {
      ticketsByPriorityQuery = ticketsByPriorityQuery.gte(
        "created_at",
        startDate,
      );
    }
    if (endDate) {
      ticketsByPriorityQuery = ticketsByPriorityQuery.lte(
        "created_at",
        endDate,
      );
    }

    const { data: ticketsByPriority } = await ticketsByPriorityQuery;

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    ticketsByPriority?.forEach((ticket: unknown) => {
      if (ticket.priority in priorityCounts) {
        priorityCounts[ticket.priority as keyof typeof priorityCounts]++;
      }
    });

    // Tickets by category
    let categoryQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("category");

    if (startDate) {
      categoryQuery = categoryQuery.gte("created_at", startDate);
    }
    if (endDate) {
      categoryQuery = categoryQuery.lte("created_at", endDate);
    }

    const { data: ticketsByCategory } = await categoryQuery;

    const categoryCounts: Record<string, number> = {};
    ticketsByCategory?.forEach((ticket: unknown) => {
      categoryCounts[ticket.category] =
        (categoryCounts[ticket.category] || 0) + 1;
    });

    // Average response time
    let responseTimeQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("response_time_minutes")
      .not("response_time_minutes", "is", null);

    if (startDate) {
      responseTimeQuery = responseTimeQuery.gte("created_at", startDate);
    }
    if (endDate) {
      responseTimeQuery = responseTimeQuery.lte("created_at", endDate);
    }

    const { data: ticketsWithResponseTime } = await responseTimeQuery;

    const avgResponseTime =
      ticketsWithResponseTime && ticketsWithResponseTime.length > 0
        ? ticketsWithResponseTime.reduce(
            (sum: number, ticket: unknown) =>
              sum + (ticket.response_time_minutes || 0),
            0,
          ) / ticketsWithResponseTime.length
        : null;

    // Average resolution time
    let resolutionTimeQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("resolution_time_minutes")
      .not("resolution_time_minutes", "is", null);

    if (startDate) {
      resolutionTimeQuery = resolutionTimeQuery.gte("created_at", startDate);
    }
    if (endDate) {
      resolutionTimeQuery = resolutionTimeQuery.lte("created_at", endDate);
    }

    const { data: ticketsWithResolutionTime } = await resolutionTimeQuery;

    const avgResolutionTime =
      ticketsWithResolutionTime && ticketsWithResolutionTime.length > 0
        ? ticketsWithResolutionTime.reduce(
            (sum: number, ticket: unknown) =>
              sum + (ticket.resolution_time_minutes || 0),
            0,
          ) / ticketsWithResolutionTime.length
        : null;

    // Customer satisfaction
    let ratingQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("customer_satisfaction_rating")
      .not("customer_satisfaction_rating", "is", null);

    if (startDate) {
      ratingQuery = ratingQuery.gte("created_at", startDate);
    }
    if (endDate) {
      ratingQuery = ratingQuery.lte("created_at", endDate);
    }

    const { data: ticketsWithRating } = await ratingQuery;

    const avgSatisfaction =
      ticketsWithRating && ticketsWithRating.length > 0
        ? ticketsWithRating.reduce(
            (sum: number, ticket: unknown) =>
              sum + (ticket.customer_satisfaction_rating || 0),
            0,
          ) / ticketsWithRating.length
        : null;

    // Tickets created per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTickets } = await supabaseServiceRole
      .from("saas_support_tickets")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const ticketsPerDay: Record<string, number> = {};
    recentTickets?.forEach((ticket: unknown) => {
      const date = new Date(ticket.created_at).toISOString().split("T")[0];
      ticketsPerDay[date] = (ticketsPerDay[date] || 0) + 1;
    });

    // Top organizations by ticket count
    let orgQuery = supabaseServiceRole
      .from("saas_support_tickets")
      .select("organization_id, organizations(name)")
      .not("organization_id", "is", null);

    if (startDate) {
      orgQuery = orgQuery.gte("created_at", startDate);
    }
    if (endDate) {
      orgQuery = orgQuery.lte("created_at", endDate);
    }

    const { data: ticketsByOrg } = await orgQuery;

    const orgTicketCounts: Record<string, { name: string; count: number }> = {};
    ticketsByOrg?.forEach((ticket: unknown) => {
      const orgId = ticket.organization_id;
      if (orgId) {
        if (!orgTicketCounts[orgId]) {
          orgTicketCounts[orgId] = {
            name: ticket.organizations?.name || "Unknown",
            count: 0,
          };
        }
        orgTicketCounts[orgId].count++;
      }
    });

    const topOrganizations = Object.entries(orgTicketCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      metrics: {
        totalTickets: totalTickets || 0,
        statusCounts,
        priorityCounts,
        categoryCounts,
        averageResponseTimeMinutes: avgResponseTime
          ? Math.round(avgResponseTime)
          : null,
        averageResolutionTimeMinutes: avgResolutionTime
          ? Math.round(avgResolutionTime)
          : null,
        averageSatisfactionRating: avgSatisfaction
          ? Number(avgSatisfaction.toFixed(2))
          : null,
        ticketsPerDay,
        topOrganizations,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error(
      "Unexpected error in GET /api/admin/saas-management/support/metrics",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

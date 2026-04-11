import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const CSV_HEADERS = [
  "ticket_number",
  "subject",
  "status",
  "priority",
  "category",
  "requester_name",
  "requester_email",
  "organization_name",
  "created_at",
  "first_response_at",
  "resolved_at",
  "resolution_time_minutes",
  "customer_satisfaction_rating",
];

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row: Record<string, unknown>): string {
  return CSV_HEADERS.map((h) => escapeCsvCell(row[h])).join(",");
}

/**
 * GET /api/admin/saas-management/support/export
 * Export support tickets as CSV (root/dev only)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("end_date") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "5000", 10),
      10000,
    );

    if (format !== "csv") {
      return NextResponse.json(
        { error: "Unsupported format. Use format=csv" },
        { status: 400 },
      );
    }

    let query = supabaseServiceRole
      .from("saas_support_tickets")
      .select(
        `
        ticket_number,
        subject,
        status,
        priority,
        category,
        requester_name,
        requester_email,
        created_at,
        first_response_at,
        resolved_at,
        resolution_time_minutes,
        customer_satisfaction_rating,
        organization:organizations(name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (category) query = query.eq("category", category);

    const result = await query;
    const tickets = result.data ?? [];
    const err = result.error;

    if (err) {
      logger.error("Error exporting SaaS support tickets", err);
      return NextResponse.json(
        { error: "Failed to export tickets" },
        { status: 500 },
      );
    }

    const rows = tickets.map((t: unknown) => ({
      ticket_number: t.ticket_number,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category,
      requester_name: t.requester_name ?? "",
      requester_email: t.requester_email,
      organization_name: t.organization?.name ?? "",
      created_at: t.created_at ?? "",
      first_response_at: t.first_response_at ?? "",
      resolved_at: t.resolved_at ?? "",
      resolution_time_minutes: t.resolution_time_minutes ?? "",
      customer_satisfaction_rating: t.customer_satisfaction_rating ?? "",
    }));

    const headerRow = CSV_HEADERS.join(",");
    const dataRows = rows.map((r) => rowToCsv(r));
    const csv = [headerRow, ...dataRows].join("\n");

    const filename = `soporte-saas-tickets-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error(
      "Unexpected error in GET /api/admin/saas-management/support/export",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

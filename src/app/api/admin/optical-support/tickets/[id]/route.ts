import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
// eslint-disable-next-line no-restricted-imports
import { createServiceRoleClient } from "@/utils/supabase/service-role";

import { updateTicketHandler } from "./_handlers/updateTicket";

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
      .eq("organization_id", organizationId)
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
  return updateTicketHandler(request, params.id);
}

import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { createOpticalInternalSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
// eslint-disable-next-line no-restricted-imports
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function createTicketHandler(request: NextRequest) {
  const supabase = await createClient();
  const supabaseServiceRole = createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminUser, error: adminError } = await supabaseServiceRole
    .from("admin_users")
    .select("id, email, role, organization_id")
    .eq("id", user.id)
    .single();

  if (adminError || !adminUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isRoot = adminUser.role === "root" || adminUser.role === "dev";
  let organizationId = adminUser.organization_id;

  if (!organizationId && isRoot) {
    organizationId =
      (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || undefined;
  }

  if (!organizationId) {
    return NextResponse.json(
      { error: "No organization assigned" },
      { status: 403 },
    );
  }

  const body = await parseAndValidateBody(
    request,
    createOpticalInternalSupportTicketSchema,
  );

  const branchContext = await getBranchContext(request, user.id);
  const branchId = body.branch_id || branchContext.branchId || null;

  if (branchId) {
    const { data: branch } = await supabaseServiceRole
      .from("branches")
      .select("id, organization_id")
      .eq("id", branchId)
      .single();

    if (!branch || branch.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Branch does not belong to your organization" },
        { status: 403 },
      );
    }
  }

  if (body.customer_id) {
    const { data: customer } = await supabaseServiceRole
      .from("customers")
      .select("id, organization_id, first_name, last_name, email, phone")
      .eq("id", body.customer_id)
      .single();

    if (!customer || customer.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Customer does not belong to your organization" },
        { status: 403 },
      );
    }

    body.customer_name =
      body.customer_name ||
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
      undefined;
    body.customer_email = body.customer_email || customer.email || undefined;
    body.customer_phone = body.customer_phone || customer.phone || undefined;
  }

  const { data: ticket, error: ticketError } = await supabaseServiceRole
    .from("optical_internal_support_tickets")
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      customer_id: body.customer_id || null,
      customer_name: body.customer_name || null,
      customer_email: body.customer_email || null,
      customer_phone: body.customer_phone || null,
      related_order_id: body.related_order_id || null,
      related_work_order_id: body.related_work_order_id || null,
      related_appointment_id: body.related_appointment_id || null,
      related_quote_id: body.related_quote_id || null,
      created_by_user_id: adminUser.id,
      created_by_name: user.email?.split("@")[0] || "Usuario",
      created_by_role: adminUser.role,
      subject: body.subject,
      description: body.description,
      category: body.category,
      priority: body.priority || "medium",
      status: "open",
      assigned_to: body.assigned_to || null,
      metadata: body.metadata || {},
    })
    .select(
      `
        *,
        customer:customers(id, first_name, last_name, email),
        assigned_to_user:admin_users!optical_internal_support_tickets_assigned_to_fkey(id, email, role),
        created_by_user:admin_users!optical_internal_support_tickets_created_by_user_id_fkey(id, email, role),
        branch:branches(id, name, code)
      `,
    )
    .single();

  if (ticketError) {
    logger.error("Error creating optical internal support ticket", ticketError);
    return NextResponse.json(
      {
        error: "Failed to create ticket",
        details: ticketError.message,
      },
      { status: 500 },
    );
  }

  if (ticket) {
    await supabaseServiceRole.from("optical_internal_support_messages").insert({
      ticket_id: ticket.id,
      message: body.description,
      is_internal: false,
      sender_id: adminUser.id,
      sender_name: user.email?.split("@")[0] || "Usuario",
      sender_email: adminUser.email || user.email || "",
      sender_role: adminUser.role,
      message_type: "message",
    });
  }

  logger.info("Optical internal support ticket created", {
    ticketId: ticket?.id,
    ticketNumber: ticket?.ticket_number,
  });

  return NextResponse.json({
    success: true,
    ticket,
  });
}

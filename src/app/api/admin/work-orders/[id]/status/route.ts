import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { NotificationService } from "@/lib/notifications/notification-service";
import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { EmailNotificationService } from "@/lib/email/notifications";
import { sendWorkOrderReadyWhatsApp } from "@/lib/whatsapp/notifications-b2b";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

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

    const { id } = await params;
    const body = await request.json();
    const { status, notes, ...additionalData } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    // Get old status and branch_id before update
    const { data: workOrderBeforeUpdate } = await supabaseServiceRole
      .from("lab_work_orders")
      .select("status, work_order_number, branch_id")
      .eq("id", id)
      .single();

    if (!workOrderBeforeUpdate) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    // Validate branch access
    const hasAccess = await validateBranchAccess(
      user.id,
      workOrderBeforeUpdate.branch_id,
    );
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este trabajo",
        },
        { status: 403 },
      );
    }

    const oldStatus = workOrderBeforeUpdate.status || "quote";
    const workOrderNumber = workOrderBeforeUpdate.work_order_number || "";

    // Update work order status using the function
    const { error: statusError } = await supabaseServiceRole.rpc(
      "update_work_order_status",
      {
        p_work_order_id: id,
        p_new_status: status,
        p_changed_by: user.id,
        p_notes: notes || null,
      },
    );

    if (statusError) {
      logger.error("Error updating work order status", statusError);
      return NextResponse.json(
        {
          error: "Failed to update status",
          details: statusError.message,
        },
        { status: 500 },
      );
    }

    // Update additional fields if provided
    if (Object.keys(additionalData).length > 0) {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Add lab-specific fields
      if (additionalData.lab_name)
        updateData.lab_name = additionalData.lab_name;
      if (additionalData.lab_contact)
        updateData.lab_contact = additionalData.lab_contact;
      if (additionalData.lab_order_number)
        updateData.lab_order_number = additionalData.lab_order_number;
      if (additionalData.lab_estimated_delivery_date)
        updateData.lab_estimated_delivery_date =
          additionalData.lab_estimated_delivery_date;
      if (additionalData.lab_notes)
        updateData.lab_notes = additionalData.lab_notes;
      if (additionalData.quality_notes)
        updateData.quality_notes = additionalData.quality_notes;
      if (additionalData.internal_notes)
        updateData.internal_notes = additionalData.internal_notes;
      if (additionalData.customer_notes)
        updateData.customer_notes = additionalData.customer_notes;
      if (additionalData.assigned_to)
        updateData.assigned_to = additionalData.assigned_to;
      if (additionalData.lab_contact_person)
        updateData.lab_contact_person = additionalData.lab_contact_person;

      const { error: updateError } = await supabaseServiceRole
        .from("lab_work_orders")
        .update(updateData)
        .eq("id", id);

      if (updateError) {
        logger.warn("Error updating work order", updateError);
        // Don't fail, status was already updated
      }
    }

    // Fetch updated work order
    const { data: updatedWorkOrder, error: fetchError } =
      await supabaseServiceRole
        .from("lab_work_orders")
        .select(
          `
        *,
        customer:customers!lab_work_orders_customer_id_fkey(id, first_name, last_name, email, phone, preferred_contact_method),
        prescription:prescriptions!lab_work_orders_prescription_id_fkey(*)
      `,
        )
        .eq("id", id)
        .single();

    if (fetchError) {
      logger.error("Error fetching updated work order", fetchError);
      return NextResponse.json(
        {
          error: "Status updated but failed to fetch updated work order",
        },
        { status: 500 },
      );
    }

    // Create notification for status change (non-blocking)
    if (updatedWorkOrder && oldStatus !== status) {
      NotificationService.notifyWorkOrderStatusChange(
        id,
        updatedWorkOrder.work_order_number,
        oldStatus,
        status,
        updatedWorkOrder.branch_id ?? undefined,
      ).catch((err) => logger.warn("Error creating notification", err));

      // If status is delivered, also create completion notification
      if (status === "delivered") {
        const customerName = updatedWorkOrder.customer
          ? `${updatedWorkOrder.customer.first_name || ""} ${updatedWorkOrder.customer.last_name || ""}`.trim() ||
            updatedWorkOrder.customer.email ||
            "Cliente"
          : "Cliente";

        NotificationService.notifyWorkOrderCompleted(
          id,
          updatedWorkOrder.work_order_number,
          customerName,
          updatedWorkOrder.branch_id ?? undefined,
        ).catch((err) => logger.warn("Error creating notification", err));
      }

      // If status is ready_for_pickup, send email and optionally WhatsApp to customer
      if (status === "ready_for_pickup") {
        (async () => {
          try {
            const customer = updatedWorkOrder.customer as {
              email?: string;
              phone?: string;
              preferred_contact_method?: string;
              first_name?: string;
              last_name?: string;
            } | null;
            const hasEmail = customer?.email || (updatedWorkOrder as any).email;

            if (hasEmail) {
              const { data: adminUser } = await supabaseServiceRole
                .from("admin_users")
                .select("organization_id")
                .eq("id", user.id)
                .single();

              const organizationId = adminUser?.organization_id;

              await EmailNotificationService.sendWorkOrderReady(
                {
                  customer_name:
                    `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
                    "Cliente",
                  customer_email:
                    customer?.email || (updatedWorkOrder as any).email,
                  work_order_number: updatedWorkOrder.work_order_number,
                },
                organizationId ?? undefined,
              );
            }

            if (
              customer?.phone &&
              customer?.preferred_contact_method === "whatsapp"
            ) {
              const { data: branch } = await supabaseServiceRole
                .from("branches")
                .select("name")
                .eq("id", updatedWorkOrder.branch_id)
                .single();
              await sendWorkOrderReadyWhatsApp(
                customer.phone,
                updatedWorkOrder.work_order_number,
                branch?.name ?? undefined,
              );
            }
          } catch (err) {
            logger.error("Error sending work order ready notification", err);
          }
        })();
      }
    }

    return NextResponse.json({
      success: true,
      workOrder: updatedWorkOrder,
    });
  } catch (error) {
    logger.error("Error in work order status update API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

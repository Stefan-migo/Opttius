import { NextRequest, NextResponse } from "next/server";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/notification-service";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("Auth error in quote status update", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin, error: adminCheckError } = (await supabase.rpc(
      "is_admin",
      { user_id: user.id } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };
    if (adminCheckError) {
      logger.error("Admin check error", adminCheckError);
      return NextResponse.json(
        { error: "Admin verification failed" },
        { status: 500 },
      );
    }
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Build branch filter function
    const applyBranchFilter = (query: ReturnType<typeof supabase.from>) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    const supabaseServiceRole = createServiceRoleClient();
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    // Check if quote is already converted (with branch access check)
    const { data: existingQuote, error: fetchError } = await applyBranchFilter(
      supabaseServiceRole
        .from("quotes")
        .select("status, converted_to_work_order_id") as unknown,
    )
      .eq("id", id)
      .single();

    if (fetchError || !existingQuote) {
      return NextResponse.json(
        { error: "Presupuesto no encontrado o sin acceso" },
        { status: 404 },
      );
    }

    if (
      existingQuote?.status === "converted_to_work" ||
      existingQuote?.converted_to_work_order_id
    ) {
      return NextResponse.json(
        {
          error: "Cannot change status of a converted quote",
        },
        { status: 400 },
      );
    }

    // Valid statuses (excluding converted_to_work as it can only be set via convert endpoint)
    const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get old status before update
    const oldStatus = existingQuote?.status || "draft";

    // Update status
    const { data: updatedQuote, error } = await supabaseServiceRole
      .from("quotes")
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("quote_number, status, branch_id")
      .single();

    if (error) {
      logger.error("Error updating quote status", error);
      return NextResponse.json(
        {
          error: "Failed to update quote status",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Create notification for status change (non-blocking)
    if (updatedQuote && oldStatus !== body.status) {
      NotificationService.notifyQuoteStatusChange(
        id,
        updatedQuote.quote_number,
        oldStatus,
        body.status,
        updatedQuote.branch_id ?? undefined,
      ).catch((err) => logger.warn("Error creating notification", err));
    }

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
    });
  } catch (error) {
    logger.error("Error in quote status API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

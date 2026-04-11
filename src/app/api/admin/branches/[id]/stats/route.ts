import { NextRequest, NextResponse } from "next/server";

import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  IsSuperAdminParams,
  IsSuperAdminResult,
} from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = (await supabase.rpc("is_super_admin", {
      user_id: user.id,
    } as IsSuperAdminParams)) as {
      data: IsSuperAdminResult | null;
      error: Error | null;
    };

    // Check access
    const branchId = id === "global" ? null : id;
    const canAccess = await validateBranchAccess(user.id, branchId);

    if (!canAccess) {
      return NextResponse.json(
        { error: "Access denied to this branch" },
        { status: 403 },
      );
    }

    // Build queries with branch filter
    const branchFilter = (query: unknown) => {
      if (id === "global" && isSuperAdmin) {
        return query; // Super admin sees all
      }
      if (branchId) {
        return query.eq("branch_id", branchId);
      }
      return query.is("branch_id", null);
    };

    // Get statistics
    const [
      appointmentsCount,
      quotesCount,
      workOrdersCount,
      ordersCount,
      todayRevenue,
      pendingQuotes,
      inProgressWorkOrders,
      todayAppointments,
    ] = await Promise.all([
      // Total appointments
      branchFilter(
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true }),
      ),

      // Total quotes
      branchFilter(
        supabase.from("quotes").select("id", { count: "exact", head: true }),
      ),

      // Total work orders
      branchFilter(
        supabase
          .from("lab_work_orders")
          .select("id", { count: "exact", head: true }),
      ),

      // Total orders
      branchFilter(
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ),

      // Today's revenue
      branchFilter(
        supabase
          .from("orders")
          .select("total_amount")
          .eq("status", "completed")
          .gte("created_at", new Date().toISOString().split("T")[0]),
      ),

      // Pending quotes
      branchFilter(
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent"),
      ),

      // In progress work orders
      branchFilter(
        supabase
          .from("lab_work_orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["in_progress_lab", "mounted", "quality_check"]),
      ),

      // Today's appointments
      branchFilter(
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("appointment_date", new Date().toISOString().split("T")[0])
          .in("status", ["scheduled", "confirmed"]),
      ),
    ]);

    // Calculate today's revenue
    const revenueData = await todayRevenue;
    const todayRevenueAmount =
      revenueData.data?.reduce(
        (sum: number, order: unknown) =>
          sum + (parseFloat(order.total_amount) || 0),
        0,
      ) || 0;

    const stats = {
      branch_id: branchId,
      is_global: id === "global",
      appointments: {
        total: appointmentsCount.count || 0,
        today: todayAppointments.count || 0,
      },
      quotes: {
        total: quotesCount.count || 0,
        pending: pendingQuotes.count || 0,
      },
      work_orders: {
        total: workOrdersCount.count || 0,
        in_progress: inProgressWorkOrders.count || 0,
      },
      orders: {
        total: ordersCount.count || 0,
      },
      revenue: {
        today: todayRevenueAmount,
      },
    };

    return NextResponse.json({ stats });
  } catch (error: unknown) {
    logger.error("Error in GET /api/admin/branches/[id]/stats:", {
      error,
      branchId: id,
    });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { validateBranchAccess } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admins can access global stats
    const canAccess = await validateBranchAccess(user.id, null);

    if (!canAccess) {
      return NextResponse.json(
        { error: "Only super admins can access global statistics" },
        { status: 403 },
      );
    }

    // Get all branches
    const { data: branches } = await supabase
      .from("branches")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name");

    // Get global statistics
    const [
      totalAppointments,
      totalQuotes,
      totalWorkOrders,
      totalOrders,
      totalRevenue,
      branchesStats,
    ] = await Promise.all([
      // Total appointments across all branches
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true }),

      // Total quotes
      supabase.from("quotes").select("id", { count: "exact", head: true }),

      // Total work orders
      supabase
        .from("lab_work_orders")
        .select("id", { count: "exact", head: true }),

      // Total orders
      supabase.from("orders").select("id", { count: "exact", head: true }),

      // Total revenue
      supabase.from("orders").select("total_amount").eq("status", "completed"),

      // Stats per branch
      Promise.all(
        (branches || []).map(async (branch) => {
          const [appointments, quotes, workOrders, orders, revenue] =
            await Promise.all([
              supabase
                .from("appointments")
                .select("id", { count: "exact", head: true })
                .eq("branch_id", branch.id),
              supabase
                .from("quotes")
                .select("id", { count: "exact", head: true })
                .eq("branch_id", branch.id),
              supabase
                .from("lab_work_orders")
                .select("id", { count: "exact", head: true })
                .eq("branch_id", branch.id),
              supabase
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("branch_id", branch.id),
              supabase
                .from("orders")
                .select("total_amount")
                .eq("branch_id", branch.id)
                .eq("status", "completed"),
            ]);

          const revenueData = await revenue;
          const branchRevenue =
            revenueData.data?.reduce(
              (sum: number, order: unknown) =>
                sum + (parseFloat(order.total_amount) || 0),
              0,
            ) || 0;

          return {
            branch_id: branch.id,
            branch_name: branch.name,
            branch_code: branch.code,
            appointments: (await appointments).count || 0,
            quotes: (await quotes).count || 0,
            work_orders: (await workOrders).count || 0,
            orders: (await orders).count || 0,
            revenue: branchRevenue,
          };
        }),
      ),
    ]);

    // Calculate total revenue
    const revenueData = await totalRevenue;
    const globalRevenue =
      revenueData.data?.reduce(
        (sum: number, order: unknown) =>
          sum + (parseFloat(order.total_amount) || 0),
        0,
      ) || 0;

    const globalStats = {
      is_global: true,
      branches_count: branches?.length || 0,
      appointments: {
        total: totalAppointments.count || 0,
      },
      quotes: {
        total: totalQuotes.count || 0,
      },
      work_orders: {
        total: totalWorkOrders.count || 0,
      },
      orders: {
        total: totalOrders.count || 0,
      },
      revenue: {
        total: globalRevenue,
      },
      branches: await branchesStats,
    };

    return NextResponse.json({ stats: globalStats });
  } catch (error: unknown) {
    logger.error("Error in GET /api/admin/branches/global/stats:", { error });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

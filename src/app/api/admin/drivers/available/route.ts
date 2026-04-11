import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

// GET /api/admin/drivers/available - Get available drivers (not assigned to active orders)
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get branch context
    const branchContext = await getBranchContext(req, user.id, supabase);
    if (!branchContext.branchId && !branchContext.isGlobalView) {
      return NextResponse.json({ error: "No branch access" }, { status: 403 });
    }

    // Get drivers not assigned to active orders
    const { data: activeOrderDrivers, error: ordersError } = await supabase
      .from("internal_orders")
      .select("assigned_driver_id")
      .eq("organization_id", branchContext.organizationId)
      .in("status", ["pending", "confirmed", "in_transit"])
      .not("assigned_driver_id", "is", null);

    if (ordersError) {
      logger.error("Failed to fetch active orders", {
        error: ordersError.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 },
      );
    }

    const assignedDriverIds =
      activeOrderDrivers?.map((o: unknown) => o.assigned_driver_id) || [];

    // Get available drivers
    let query = supabase
      .from("drivers")
      .select("*")
      .eq("organization_id", branchContext.organizationId)
      .eq("is_active", true);

    if (assignedDriverIds.length > 0) {
      query = query.not("id", "in", `(${assignedDriverIds.join(",")})`);
    }

    const { data: drivers, error } = await query.order("name");

    if (error) {
      logger.error("Failed to fetch available drivers", {
        error: error.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch available drivers" },
        { status: 500 },
      );
    }

    return NextResponse.json(drivers);
  } catch (error) {
    logger.error("Available drivers error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

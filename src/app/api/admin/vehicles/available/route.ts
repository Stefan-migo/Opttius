import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

// GET /api/admin/vehicles/available - Get available vehicles (not assigned to active orders)
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get vehicles not assigned to active orders
    const { data: activeOrderVehicles, error: ordersError } = await supabase
      .from("internal_orders")
      .select("assigned_vehicle_id")
      .eq("organization_id", branchContext.organizationId)
      .in("status", ["pending", "confirmed", "in_transit"])
      .not("assigned_vehicle_id", "is", null);

    if (ordersError) {
      logger.error("Failed to fetch active orders", {
        error: ordersError.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 },
      );
    }

    const assignedVehicleIds =
      activeOrderVehicles?.map((o: any) => o.assigned_vehicle_id) || [];

    // Get available vehicles
    let query = supabase
      .from("vehicles")
      .select("*")
      .eq("organization_id", branchContext.organizationId)
      .eq("is_active", true);

    if (assignedVehicleIds.length > 0) {
      query = query.not("id", "in", `(${assignedVehicleIds.join(",")})`);
    }

    const { data: vehicles, error } = await query.order("plate_number");

    if (error) {
      logger.error("Failed to fetch available vehicles", {
        error: error.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch available vehicles" },
        { status: 500 },
      );
    }

    return NextResponse.json(vehicles);
  } catch (error) {
    logger.error("Available vehicles error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

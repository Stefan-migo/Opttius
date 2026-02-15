import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/vehicles/[id] - Get specific vehicle
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Vehicle not found" },
          { status: 404 },
        );
      }
      logger.error("Failed to fetch vehicle", { error: error.message });
      return NextResponse.json(
        { error: "Failed to fetch vehicle" },
        { status: 500 },
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    logger.error("Vehicle detail error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/vehicles/[id] - Update vehicle
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    const body = await req.json();
    const { plate_number, model, capacity, is_active } = body;

    // Validation
    if (plate_number) {
      // Check if another vehicle has this plate number
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate_number", plate_number)
        .eq("organization_id", branchContext.organizationId)
        .neq("id", id)
        .maybeSingle();

      if (existingVehicle) {
        return NextResponse.json(
          { error: "Another vehicle with this plate number already exists" },
          { status: 400 },
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (plate_number !== undefined) updateData.plate_number = plate_number;
    if (model !== undefined) updateData.model = model;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update vehicle", { error: error.message });
      return NextResponse.json(
        { error: "Failed to update vehicle" },
        { status: 500 },
      );
    }

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    logger.info("Vehicle updated", {
      vehicleId: id,
      userId: user.id,
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    logger.error("Vehicle update error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/vehicles/[id] - Delete vehicle
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Check if vehicle is assigned to any active orders
    const { data: assignedOrders } = await supabase
      .from("internal_orders")
      .select("id")
      .eq("assigned_vehicle_id", id)
      .in("status", ["pending", "confirmed", "in_transit"])
      .maybeSingle();

    if (assignedOrders) {
      return NextResponse.json(
        { error: "Cannot delete vehicle assigned to active orders" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId);

    if (error) {
      logger.error("Failed to delete vehicle", { error: error.message });
      return NextResponse.json(
        { error: "Failed to delete vehicle" },
        { status: 500 },
      );
    }

    logger.info("Vehicle deleted", {
      vehicleId: id,
      userId: user.id,
    });

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    logger.error("Vehicle deletion error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

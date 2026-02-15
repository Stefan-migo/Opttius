import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

// GET /api/admin/vehicles - List vehicles
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

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("is_active");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("vehicles")
      .select("*", { count: "exact" })
      .eq("organization_id", branchContext.organizationId);

    // Apply filters
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    // Execute query with pagination
    const {
      data: vehicles,
      error,
      count,
    } = await query.order("plate_number").range(offset, offset + limit - 1);

    if (error) {
      logger.error("Failed to fetch vehicles", { error: error.message });
      return NextResponse.json(
        { error: "Failed to fetch vehicles" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      vehicles,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count! / limit),
      },
    });
  } catch (error) {
    logger.error("Vehicles list error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/vehicles - Create new vehicle
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { plate_number, model, capacity = 0, is_active = true } = body;

    // Validation
    if (!plate_number) {
      return NextResponse.json(
        { error: "Plate number is required" },
        { status: 400 },
      );
    }

    // Check if plate number already exists
    const { data: existingVehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("plate_number", plate_number)
      .eq("organization_id", branchContext.organizationId)
      .maybeSingle();

    if (existingVehicle) {
      return NextResponse.json(
        { error: "Vehicle with this plate number already exists" },
        { status: 400 },
      );
    }

    // Create vehicle
    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .insert({
        plate_number,
        model,
        capacity,
        is_active,
        organization_id: branchContext.organizationId,
      })
      .select()
      .single();

    if (error) {
      logger.error("Failed to create vehicle", { error: error.message });
      return NextResponse.json(
        { error: "Failed to create vehicle" },
        { status: 500 },
      );
    }

    logger.info("Vehicle created", {
      vehicleId: vehicle.id,
      plateNumber: vehicle.plate_number,
      userId: user.id,
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    logger.error("Vehicle creation error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

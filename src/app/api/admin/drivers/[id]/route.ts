import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/drivers/[id] - Get specific driver
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

    const { data: driver, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 },
        );
      }
      logger.error("Failed to fetch driver", { error: error.message });
      return NextResponse.json(
        { error: "Failed to fetch driver" },
        { status: 500 },
      );
    }

    return NextResponse.json(driver);
  } catch (error) {
    logger.error("Driver detail error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/drivers/[id] - Update driver
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
    const { name, license_number, phone, email, is_active } = body;

    // Validation
    if (license_number) {
      // Check if another driver has this license number
      const { data: existingDriver } = await supabase
        .from("drivers")
        .select("id")
        .eq("license_number", license_number)
        .eq("organization_id", branchContext.organizationId)
        .neq("id", id)
        .maybeSingle();

      if (existingDriver) {
        return NextResponse.json(
          { error: "Another driver with this license number already exists" },
          { status: 400 },
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (license_number !== undefined)
      updateData.license_number = license_number;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: driver, error } = await supabase
      .from("drivers")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update driver", { error: error.message });
      return NextResponse.json(
        { error: "Failed to update driver" },
        { status: 500 },
      );
    }

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    logger.info("Driver updated", {
      driverId: id,
      userId: user.id,
    });

    return NextResponse.json(driver);
  } catch (error) {
    logger.error("Driver update error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/drivers/[id] - Delete driver
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

    // Check if driver is assigned to any active orders
    const { data: assignedOrders } = await supabase
      .from("internal_orders")
      .select("id")
      .eq("assigned_driver_id", id)
      .in("status", ["pending", "confirmed", "in_transit"])
      .maybeSingle();

    if (assignedOrders) {
      return NextResponse.json(
        { error: "Cannot delete driver assigned to active orders" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("drivers")
      .delete()
      .eq("id", id)
      .eq("organization_id", branchContext.organizationId);

    if (error) {
      logger.error("Failed to delete driver", { error: error.message });
      return NextResponse.json(
        { error: "Failed to delete driver" },
        { status: 500 },
      );
    }

    logger.info("Driver deleted", {
      driverId: id,
      userId: user.id,
    });

    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    logger.error("Driver deletion error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

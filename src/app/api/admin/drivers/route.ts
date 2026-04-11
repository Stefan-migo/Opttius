import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

// GET /api/admin/drivers - List drivers
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

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("is_active");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("drivers")
      .select("*", { count: "exact" })
      .eq("organization_id", branchContext.organizationId);

    // Apply filters
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    // Execute query with pagination
    const {
      data: drivers,
      error,
      count,
    } = await query.order("name").range(offset, offset + limit - 1);

    if (error) {
      logger.error("Failed to fetch drivers", { error: error.message });
      return NextResponse.json(
        { error: "Failed to fetch drivers" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      drivers,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count! / limit),
      },
    });
  } catch (error) {
    logger.error("Drivers list error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/drivers - Create new driver
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, license_number, phone, email, is_active = true } = body;

    // Validation
    if (!name || !license_number) {
      return NextResponse.json(
        { error: "Name and license number are required" },
        { status: 400 },
      );
    }

    // Check if license number already exists
    const { data: existingDriver } = await supabase
      .from("drivers")
      .select("id")
      .eq("license_number", license_number)
      .eq("organization_id", branchContext.organizationId)
      .maybeSingle();

    if (existingDriver) {
      return NextResponse.json(
        { error: "Driver with this license number already exists" },
        { status: 400 },
      );
    }

    // Create driver
    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        name,
        license_number,
        phone,
        email,
        is_active,
        organization_id: branchContext.organizationId,
      })
      .select()
      .single();

    if (error) {
      logger.error("Failed to create driver", { error: error.message });
      return NextResponse.json(
        { error: "Failed to create driver" },
        { status: 500 },
      );
    }

    logger.info("Driver created", {
      driverId: driver.id,
      licenseNumber: driver.license_number,
      userId: user.id,
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    logger.error("Driver creation error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

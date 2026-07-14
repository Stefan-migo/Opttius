import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import {
  getSystemConfigs,
  createSystemConfig,
  updateSystemConfigs,
} from "@/lib/api/services/systemConfigService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";
    const publicOnly = searchParams.get("public_only") === "true";
    const branchId =
      searchParams.get("branch_id") || request.headers.get("x-branch-id");

    const result = await getSystemConfigs({
      category,
      publicOnly,
      branchId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : message.startsWith("config_value:") || message === "Config key and value are required" || message === "Invalid value type" ? 400 : 500;
    logger.error("Error in system config API:", { error });
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createSystemConfig(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : message.startsWith("config_value:") || message.startsWith("Sucursal") || message === "Config key and value are required" || message === "Invalid value type" ? 400 : 500;
    logger.error("Error in create system config API:", { error });
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const branchIdFromHeaders = request.headers.get("x-branch-id");
    const result = await updateSystemConfigs(body, branchIdFromHeaders);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    logger.error("Error in update system config API:", { error });
    return NextResponse.json({ error: message }, { status: status === 500 && message.startsWith("Updates") ? 400 : status });
  }
}

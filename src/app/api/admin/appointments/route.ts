import { NextRequest, NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/api/response";
import {
  createAppointment,
  listAppointments,
} from "@/lib/api/services/adminAppointmentService";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return await listAppointments(request);
  } catch (error) {
    logger.error("Error in appointments API GET", { error });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await createAppointment(request);
  } catch (error) {
    logger.error("Error in appointments POST API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

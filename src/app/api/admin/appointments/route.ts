import { NextRequest, NextResponse } from "next/server";

import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { createApiErrorResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import {
  listAppointments,
  createAppointment,
} from "@/lib/api/services/adminAppointmentService";

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

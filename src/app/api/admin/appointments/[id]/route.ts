import { NextRequest, NextResponse } from "next/server";

import {
  deleteAppointment,
  getAppointment,
  updateAppointment,
} from "@/lib/api/services/appointmentDetailService";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await getAppointment(request, id);
  } catch (error) {
    logger.error("Error fetching appointment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await updateAppointment(request, id);
  } catch (error) {
    logger.error("Error updating appointment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await deleteAppointment(request, id);
  } catch (error) {
    logger.error("Error deleting appointment", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { createApiErrorResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import {
  getQuote,
  updateQuote,
  deleteQuote,
} from "@/lib/api/services/adminQuoteService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await getQuote(request, params.id);
  } catch (error) {
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await updateQuote(request, params.id);
  } catch (error) {
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await deleteQuote(request, params.id);
  } catch (error) {
    logger.error("Error deleting quote", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

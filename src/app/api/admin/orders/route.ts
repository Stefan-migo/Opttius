import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createApiErrorResponse } from "@/lib/api/response";
import {
  listOrders,
  handleOrderPost,
  deleteAllOrders,
} from "@/lib/api/services/adminOrderService";
import { RateLimitError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return listOrders(request);
  } catch (error) {
    logger.error("Admin orders API GET error", { error });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleOrderPost(request);
  } catch (error) {
    if (error instanceof RateLimitError) {
      logger.warn("Rate limit exceeded for order creation", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    logger.error("Admin orders POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await deleteAllOrders(request);
  } catch (error) {
    logger.error("Admin orders DELETE error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

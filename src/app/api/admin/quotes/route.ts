import { NextRequest, NextResponse } from "next/server";

import { createApiErrorResponse, createPaginatedResponse } from "@/lib/api/response";
import {
  createQuote,
  listQuotes,
} from "@/lib/api/services/adminQuoteService";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const result = await listQuotes(request);
    return createPaginatedResponse(
      result.quotes,
      { page: result.pagination.page, limit: result.pagination.limit, total: result.pagination.total },
      { requestId: result.requestId },
    );
  } catch (error) {
    logger.error("Error in quotes API GET", { error });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId: crypto.randomUUID() },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await createQuote(request);
  } catch (error) {
    logger.error("Error in quotes POST API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

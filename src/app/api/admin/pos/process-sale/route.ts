import { NextRequest, NextResponse } from "next/server";
import { APIError, RateLimitError } from "@/lib/api/errors";
import { createApiErrorResponse } from "@/lib/api/response";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import { appLogger as logger } from "@/lib/logger";
import { handleProcessSale } from "./processSaleHandler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.pos) as unknown)(
      request,
      async () => {
        try {
          return await handleProcessSale(request);
        } catch (error) {
          if (error instanceof RateLimitError) {
            logger.warn("Rate limit exceeded for POS sale", {
              error: error.message,
            });
            return NextResponse.json({ error: error.message }, { status: 429 });
          }
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error("POS process sale error", { error: errMsg });
          return createApiErrorResponse(
            new APIError(
              `Error al procesar la venta: ${errMsg}`,
              500,
              "INTERNAL_ERROR",
            ),
          );
        }
      },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      logger.warn("Rate limit exceeded", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    logger.error(
      "Unexpected error in POST handler",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

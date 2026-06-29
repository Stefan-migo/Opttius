import { NextRequest, NextResponse } from "next/server";

import { AuthenticationError, RateLimitError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import { createApiErrorResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

import { handleCreateCustomer } from "./customersCreateService";
import {
  handleCustomersAnalytics,
  handleGetCustomers,
} from "./customersService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    return await handleGetCustomers(request, requestId);
  } catch (error) {
    logger.error("Error in customers API GET", { error, requestId });
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
      { requestId },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    return await (withRateLimit(rateLimitConfigs.modification) as unknown)(
      request,
      async () => {
        try {
          const { getUser } = await createClientFromRequest(request);
          const { data, error: userError } = await getUser();
          const user = data?.user;
          if (userError || !user) {
            return createApiErrorResponse(
              new AuthenticationError("Unauthorized"),
            );
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return NextResponse.json(
              { error: "Invalid JSON in request body" },
              { status: 400 },
            );
          }

          const bodyRecord = body as Record<string, unknown>;
          const isCustomerCreation =
            "first_name" in bodyRecord ||
            "last_name" in bodyRecord ||
            bodyRecord.first_name ||
            bodyRecord.last_name;

          if (isCustomerCreation) {
            return await handleCreateCustomer(request, body);
          }

          return await handleCustomersAnalytics(request, requestId);
        } catch (error) {
          if (error instanceof RateLimitError) {
            return NextResponse.json({ error: error.message }, { status: 429 });
          }
          return createApiErrorResponse(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

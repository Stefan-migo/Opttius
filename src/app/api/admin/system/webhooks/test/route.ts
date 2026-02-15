import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhook_type } = body;

    if (!webhook_type || !["mercadopago", "sanity"].includes(webhook_type)) {
      return NextResponse.json(
        { error: "Invalid webhook type" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log test webhook
    const { error: logError } = await supabase.from("webhook_logs").insert({
      webhook_type,
      event_type: "test",
      payload: { test: true, timestamp: new Date().toISOString() },
      status: "success",
      response_code: 200,
      processed_at: new Date().toISOString(),
    });

    if (logError) {
      logger.error("Error logging test webhook:", {
        error: logError,
        webhook_type,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Test webhook logged for ${webhook_type}`,
    });
  } catch (error) {
    logger.error("Error in test webhook API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { serverTelemetryCollector } from "@/lib/telemetry/collector/server-collector";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const events = await request.json();

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid event format" },
        { status: 400 },
      );
    }

    // Check if telemetry is enabled globally using the service role client
    // initialized at the top of the file to avoid shadowing and redundant calls.
    const { data: config } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "telemetry_enabled")
      .maybeSingle();

    let enabled = true;
    if (config) {
      try {
        enabled =
          typeof config.config_value === "string"
            ? JSON.parse(config.config_value)
            : config.config_value;
      } catch (e) {
        enabled = !!config.config_value;
      }
    }

    if (!enabled) {
      return NextResponse.json({
        success: true,
        message: "Telemetry is globally disabled",
        processed: 0,
        stored: 0,
      });
    }

    // Map all events to database schema with validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const dbEvents = events.map((event) => {
      // Validate IDs
      const userId =
        event.userId && uuidRegex.test(event.userId) ? event.userId : null;
      const orgId =
        event.context?.organizationId &&
        uuidRegex.test(event.context.organizationId)
          ? event.context.organizationId
          : null;

      // Parse duration safely
      let duration = null;
      const rawDuration =
        event.payload?.duration || event.metadata?.performance?.responseTime;
      if (rawDuration !== undefined && rawDuration !== null) {
        duration = Math.round(Number(rawDuration));
      }

      return {
        event_type: event.eventType || "server_event",
        event_name:
          event.eventName || event.eventType || "unnamed_server_event",
        timestamp: event.timestamp || new Date().toISOString(),
        user_id: userId,
        organization_id: orgId,
        session_id: event.sessionId || null,
        payload: event.payload || {},
        user_agent: request.headers.get("user-agent") || null,
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          null,
        device_type: null,
        browser: null,
        os: null,
        screen_size: null,
        page_url: event.metadata?.pageUrl || null,
        referrer: event.metadata?.referrer || null,
        duration: duration,
        performance_data: event.metadata?.performance || null,
      };
    });

    // Insert into database in bulk
    const { data: insertedData, error } = await supabase
      .from("telemetry_events")
      .insert(dbEvents)
      .select();

    if (error) {
      console.error("Failed to store server telemetry events:", error);
      // Return more detail in development/internal logs
      return NextResponse.json(
        {
          error: "Failed to store telemetry events",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    const storedEventsCount = insertedData ? insertedData.length : 0;

    return NextResponse.json({
      success: true,
      processed: events.length,
      stored: storedEventsCount,
      totalReceived: events.length,
    });
  } catch (error) {
    console.error("Server telemetry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

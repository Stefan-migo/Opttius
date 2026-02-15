import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get webhook statistics
    const { data: stats } = await supabase
      .from("webhook_logs")
      .select("webhook_type, status, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ); // Last 24 hours

    const status = {
      mercadopago: {
        total: 0,
        success: 0,
        failed: 0,
        last_delivery: null as string | null,
      },
      sanity: {
        total: 0,
        success: 0,
        failed: 0,
        last_delivery: null as string | null,
      },
    };

    stats?.forEach((log) => {
      const type = log.webhook_type as "mercadopago" | "sanity";
      if (type in status) {
        status[type].total++;
        if (log.status === "success") status[type].success++;
        if (log.status === "failed") status[type].failed++;
        if (
          !status[type].last_delivery ||
          log.created_at > status[type].last_delivery
        ) {
          status[type].last_delivery = log.created_at;
        }
      }
    });

    // Get webhook URLs - Auto-detect from request, then fallback to env vars
    // Priority: 1. Request origin (most reliable), 2. VERCEL_URL (auto-provided by Vercel),
    // 3. Manual env vars, 4. Fallback
    const getBaseUrl = () => {
      // 1. Try to get from request headers (works in all environments)
      const host = request.headers.get("host");
      const protocol =
        request.headers.get("x-forwarded-proto") ||
        (request.url.startsWith("https") ? "https" : "http");

      if (host) {
        // In production, use https; in development, use http
        const isProduction =
          process.env.NODE_ENV === "production" ||
          host.includes("vercel.app") ||
          host.includes("opttius.com");
        return `${isProduction ? "https" : protocol}://${host}`;
      }

      // 2. Use VERCEL_URL (automatically provided by Vercel)
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
      }

      // 3. Use manual environment variables (if configured)
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
      }

      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
      }

      // 4. Fallback to production domain
      return "https://opttius.com";
    };

    const baseUrl = getBaseUrl();

    return NextResponse.json({
      status,
      urls: {
        mercadopago: `${baseUrl}/api/webhooks/mercadopago`,
        sanity: `${baseUrl}/api/revalidate`,
      },
    });
  } catch (error) {
    logger.error("Error in webhook status API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

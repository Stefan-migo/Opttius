import { NextRequest, NextResponse } from "next/server";

import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

/**
 * POST /api/ai/insights/:id/dismiss
 * Dismiss an insight
 */
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withRateLimit(rateLimitConfigs.modification)(request, async () => {
    try {
      const { id } = await params;

      const { client: supabase, getUser } =
        await createClientFromRequest(request);

      // Check authentication
      const { data, error: userError } = await getUser();
      const user = data?.user;
      if (userError || !user) {
        logger.error("User authentication failed", userError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get user's organization
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .eq("is_active", true)
        .single();

      if (adminError || !adminUser?.organization_id) {
        logger.error("Organization not found", { userId: user.id });
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }

      // Update insight to dismissed
      const { data: insight, error: updateError } = await supabase
        .from("ai_insights")
        .update({ is_dismissed: true })
        .eq("id", id)
        .eq("organization_id", adminUser.organization_id)
        .select()
        .single();

      if (updateError) {
        logger.error("Error dismissing insight", {
          error: updateError,
          insightId: id,
        });
        return NextResponse.json(
          { error: "Failed to dismiss insight" },
          { status: 500 },
        );
      }

      if (!insight) {
        return NextResponse.json(
          { error: "Insight not found" },
          { status: 404 },
        );
      }

      logger.info("Insight dismissed", { insightId: id, userId: user.id });

      return NextResponse.json({ success: true, insight });
    } catch (error: unknown) {
      logger.error("Dismiss insight API error", { error: error.message });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

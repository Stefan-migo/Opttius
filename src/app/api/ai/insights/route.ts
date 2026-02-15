import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { InsightSectionSchema } from "@/lib/ai/insights/schemas";
import { parseAndValidateQuery } from "@/lib/api/validation/zod-helpers";
import { z } from "zod";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";

const querySchema = z.object({
  section: InsightSectionSchema,
});

/**
 * GET /api/ai/insights
 * Fetch insights for a specific section
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.general)(request, async () => {
    try {
      // Validate query parameters
      const queryParams = parseAndValidateQuery(request, querySchema);
      const section = queryParams.section;

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
        logger.error("Organization not found", { userId: user.id, adminError });
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }

      // Fetch insights for the section
      const { data: insights, error: insightsError } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("organization_id", adminUser.organization_id)
        .eq("section", section)
        .eq("is_dismissed", false)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (insightsError) {
        logger.error("Error fetching insights", {
          error: insightsError,
          section,
        });
        return NextResponse.json(
          { error: "Failed to fetch insights" },
          { status: 500 },
        );
      }

      logger.debug("Insights fetched successfully", {
        section,
        count: insights?.length || 0,
      });

      return NextResponse.json({
        insights: insights || [],
      });
    } catch (error: any) {
      logger.error("Insights API error", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { InsightSectionSchema } from "@/lib/ai/insights/schemas";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import { parseAndValidateQuery } from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

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
      const { data: rawInsights, error: insightsError } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("organization_id", adminUser.organization_id)
        .eq("section", section)
        .eq("is_dismissed", false)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

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

      // For dashboard: prioritize daily_summary from yesterday first
      let insights = rawInsights || [];
      if (section === "dashboard" && insights.length > 0) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        insights = [...insights].sort((a, b) => {
          const aDaily =
            (a.metadata as unknown)?.type === "daily_summary" &&
            (a.metadata as unknown)?.date === yesterdayStr;
          const bDaily =
            (b.metadata as unknown)?.type === "daily_summary" &&
            (b.metadata as unknown)?.date === yesterdayStr;
          if (aDaily && !bDaily) return -1;
          if (!aDaily && bDaily) return 1;
          return 0;
        });
      }

      logger.debug("Insights fetched successfully", {
        section,
        count: insights?.length || 0,
      });

      return NextResponse.json({
        insights: insights.slice(0, 5),
      });
    } catch (error: unknown) {
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

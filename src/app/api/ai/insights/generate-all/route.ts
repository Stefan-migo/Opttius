import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { generateInsights } from "@/lib/ai/insights/generator";
import { prepareInsightData } from "@/lib/ai/insights/prepare-data";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { createOrganizationalMemory } from "@/lib/ai/memory/organizational";
import { getBranchContext } from "@/lib/api/branch-middleware";
import type { InsightSection } from "@/lib/ai/insights/schemas";

const ALL_SECTIONS: InsightSection[] = [
  "dashboard",
  "inventory",
  "clients",
  "pos",
  "analytics",
];

/**
 * POST /api/ai/insights/generate-all
 * Generate insights for ALL sections. Used when user clicks "Regenerar insights".
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 min for multiple LLM calls

export async function POST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.general)(request, async () => {
    try {
      const { client: supabase, getUser } =
        await createClientFromRequest(request);

      const { data: userData, error: userError } = await getUser();
      const user = userData?.user;
      if (userError || !user) {
        logger.error("User authentication failed", userError);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

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

      const branchContext = await getBranchContext(request, user.id);

      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("name, created_at")
        .eq("id", adminUser.organization_id)
        .single();

      if (orgError || !organization) {
        logger.error("Failed to fetch organization", { error: orgError });
        return NextResponse.json(
          { error: "Failed to fetch organization" },
          { status: 500 },
        );
      }

      const orgMemory = createOrganizationalMemory(
        adminUser.organization_id,
        supabase,
      );
      const maturityLevel = await orgMemory.getMaturityLevel();

      const orgCreatedAt = new Date(organization.created_at);
      const now = new Date();
      const organizationAge = Math.floor(
        (now.getTime() - orgCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", adminUser.organization_id);

      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", adminUser.organization_id);

      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", adminUser.organization_id);

      const isNewOrganization =
        organizationAge < 7 ||
        (totalOrders || 0) === 0 ||
        (totalCustomers || 0) < 5;

      const enhancedContext = {
        organizationAge,
        isNewOrganization,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
      };

      // Prepare data for ALL sections
      const { data: preparedData } = await prepareInsightData(
        supabase,
        adminUser.organization_id,
        organization.name,
        null,
        branchContext,
      );

      let totalCount = 0;
      const sectionCounts: Record<string, number> = {};

      for (const section of ALL_SECTIONS) {
        try {
          const sectionData =
            preparedData[section as keyof typeof preparedData];
          if (!sectionData) {
            logger.warn("No data for section, skipping", { section });
            continue;
          }

          const insights = await generateInsights({
            section,
            data: sectionData,
            organizationName: organization.name,
            organizationId: adminUser.organization_id,
            maturityLevel,
            additionalContext: enhancedContext,
            temperature: 0.7,
            useMaturityAdaptation: true,
            supabase,
          });

          const insightsToInsert = insights.map((insight) => ({
            organization_id: adminUser.organization_id,
            section,
            ...insight,
          }));

          const { error: insertError } = await supabase
            .from("ai_insights")
            .insert(insightsToInsert);

          if (insertError) {
            logger.error("Failed to save insights", {
              section,
              error: insertError,
            });
            continue;
          }

          sectionCounts[section] = insights.length;
          totalCount += insights.length;

          await new Promise((r) => setTimeout(r, 300));
        } catch (err: unknown) {
          logger.error("Insight generation failed for section", {
            section,
            error: err,
          });
        }
      }

      logger.info("Generate-all insights completed", {
        organizationId: adminUser.organization_id,
        totalCount,
        sectionCounts,
      });

      return NextResponse.json({
        success: true,
        count: totalCount,
        sectionCounts,
      });
    } catch (error: unknown) {
      logger.error("Generate-all insights API error", { error });

      if (
        error instanceof Error &&
        error.message.includes("No available LLM providers")
      ) {
        return NextResponse.json(
          {
            error:
              "AI service is not configured. Please configure at least one LLM provider.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 },
      );
    }
  });
}

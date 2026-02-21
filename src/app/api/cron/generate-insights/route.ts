import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { appLogger as logger } from "@/lib/logger";
import { prepareInsightData } from "@/lib/ai/insights/prepare-data";
import { generateInsights } from "@/lib/ai/insights/generator";
import { createOrganizationalMemory } from "@/lib/ai/memory/organizational";
import type { BranchContext } from "@/lib/api/branch-middleware";
import type { InsightSection } from "@/lib/ai/insights/schemas";

/**
 * GET /api/cron/generate-insights
 * Triggered by Vercel Cron. Generates AI insights for all active organizations.
 * - dashboard: daily
 * - inventory: Mondays only
 * - clients: daily
 *
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for processing multiple orgs

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const sectionParam = searchParams.get("section") as InsightSection | null;

    // Get active organizations
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, created_at")
      .eq("status", "active");

    if (orgError) {
      logger.error("Failed to fetch organizations for insights cron", {
        error: orgError,
      });
      return NextResponse.json(
        { error: "Failed to fetch organizations", details: orgError.message },
        { status: 500 },
      );
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active organizations to process",
        processed: 0,
      });
    }

    const now = new Date();
    const isMonday = now.getDay() === 1;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const sectionsToProcess: Array<InsightSection | "daily_summary"> =
      sectionParam
        ? [sectionParam as InsightSection]
        : [
            "daily_summary",
            "dashboard",
            "clients",
            ...(isMonday ? (["inventory"] as const) : []),
          ];

    let totalInsights = 0;
    const results: Array<{
      orgId: string;
      orgName: string;
      sections: string[];
      insightsCount: number;
      errors?: string[];
    }> = [];

    for (const org of organizations) {
      const orgErrors: string[] = [];
      let orgInsightsCount = 0;

      const globalBranchContext: BranchContext = {
        branchId: null,
        isGlobalView: true,
        isSuperAdmin: true,
        organizationId: org.id,
        accessibleBranches: [],
      };

      for (const section of sectionsToProcess) {
        try {
          const effectiveSection =
            section === "daily_summary" ? "dashboard" : section;
          const { data } = await prepareInsightData(
            supabase,
            org.id,
            org.name,
            effectiveSection,
            globalBranchContext,
          );

          const orgMemory = createOrganizationalMemory(org.id, supabase);
          const maturityLevel = await orgMemory.getMaturityLevel();

          const orgCreatedAt = new Date(org.created_at);
          const organizationAge = Math.floor(
            (now.getTime() - orgCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
          );

          const { count: totalCustomers } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          const { count: totalProducts } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          const { count: totalOrders } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

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

          const sectionData =
            section === "daily_summary"
              ? data.dashboard
              : data[effectiveSection as keyof typeof data];
          if (!sectionData) continue;

          const insights = await generateInsights({
            section: effectiveSection,
            data: sectionData,
            organizationName: org.name,
            organizationId: org.id,
            maturityLevel,
            additionalContext: enhancedContext,
            temperature: 0.7,
            useMaturityAdaptation: section !== "daily_summary",
            supabase,
            ...(section === "daily_summary" && {
              variant: "daily_summary" as const,
              variantDate: yesterdayStr,
            }),
          });

          const insightsToInsert = insights.map((insight) => ({
            organization_id: org.id,
            section: effectiveSection,
            ...insight,
            metadata: {
              ...(insight.metadata || {}),
              ...(section === "daily_summary" && {
                type: "daily_summary",
                date: yesterdayStr,
              }),
            },
          }));

          const { error: insertError } = await supabase
            .from("ai_insights")
            .insert(insightsToInsert);

          if (insertError) {
            orgErrors.push(`${section}: ${insertError.message}`);
            logger.error("Failed to save insights", {
              orgId: org.id,
              section,
              error: insertError,
            });
          } else {
            orgInsightsCount += insights.length;
            totalInsights += insights.length;
          }

          // Small delay between LLM calls to avoid rate limits
          await new Promise((r) => setTimeout(r, 500));
        } catch (err: any) {
          orgErrors.push(`${section}: ${err?.message || "Unknown error"}`);
          logger.error("Insight generation failed for org/section", {
            orgId: org.id,
            section,
            error: err,
          });
        }
      }

      results.push({
        orgId: org.id,
        orgName: org.name,
        sections: sectionsToProcess,
        insightsCount: orgInsightsCount,
        ...(orgErrors.length > 0 && { errors: orgErrors }),
      });
    }

    logger.info("Insights cron completed", {
      organizationsProcessed: organizations.length,
      totalInsights,
      results,
    });

    return NextResponse.json({
      success: true,
      message: "Insight generation completed",
      processed: organizations.length,
      totalInsights,
      results,
    });
  } catch (error: unknown) {
    logger.error("Generate insights cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

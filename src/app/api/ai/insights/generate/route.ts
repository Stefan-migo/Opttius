import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateInsights } from "@/lib/ai/insights/generator";
import { InsightSectionSchema } from "@/lib/ai/insights/schemas";
import { createOrganizationalMemory } from "@/lib/ai/memory/organizational";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import {
  parseAndValidateBody,
  parseAndValidateQuery,
} from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

const generateQuerySchema = z.object({
  section: InsightSectionSchema.optional(),
});

const generateBodySchema = z.object({
  section: InsightSectionSchema,
  data: z.any(), // Data to analyze
  additionalContext: z.record(z.any()).optional(),
  forceRegenerate: z.boolean().optional().default(false),
});

/**
 * POST /api/ai/insights/generate
 * Generate insights for a specific section
 * This endpoint is used by cron jobs or manual triggers
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.general)(request, async () => {
    try {
      // Validate body
      const body = await parseAndValidateBody(request, generateBodySchema);
      const { section, data, additionalContext, forceRegenerate } = body;

      const { client: supabase, getUser } =
        await createClientFromRequest(request);

      // Check authentication
      const { data: userData, error: userError } = await getUser();
      const user = userData?.user;
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

      // Get organization name and metadata
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

      // Use organizational memory to get maturity level and context
      const orgMemory = createOrganizationalMemory(
        adminUser.organization_id,
        supabase,
      );
      const maturityLevel = await orgMemory.getMaturityLevel();

      logger.info("Organization maturity calculated", {
        organizationId: adminUser.organization_id,
        maturityLevel: maturityLevel.level,
        daysSinceCreation: maturityLevel.daysSinceCreation,
        totalOrders: maturityLevel.totalOrders,
      });

      // Calculate organization age (for backward compatibility)
      const orgCreatedAt = new Date(organization.created_at);
      const now = new Date();
      const organizationAge = Math.floor(
        (now.getTime() - orgCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Get basic stats to determine organization state
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

      // Determine if organization is new
      const isNewOrganization =
        organizationAge < 7 ||
        (totalOrders || 0) === 0 ||
        (totalCustomers || 0) < 5;

      // Enhance additional context with organization state
      const enhancedContext = {
        ...additionalContext,
        organizationAge,
        isNewOrganization,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
      };

      // Cache check: return existing insights if recent (< 24h) and not forceRegenerate
      if (!forceRegenerate) {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: recentInsights } = await supabase
          .from("ai_insights")
          .select(
            "id, section, type, title, message, priority, action_label, action_url, metadata, is_dismissed, feedback_score, created_at, updated_at",
          )
          .eq("organization_id", adminUser.organization_id)
          .eq("section", section)
          .eq("is_dismissed", false)
          .gte("created_at", twentyFourHoursAgo.toISOString())
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (recentInsights && recentInsights.length > 0) {
          logger.info("Returning cached insights", {
            section,
            count: recentInsights.length,
            organizationId: adminUser.organization_id,
          });
          return NextResponse.json({
            success: true,
            insights: recentInsights,
            count: recentInsights.length,
            fromCache: true,
          });
        }
      }

      // Generate insights using LLM with maturity adaptation
      logger.info("Generating insights with maturity adaptation", {
        section,
        organizationId: adminUser.organization_id,
        maturityLevel: maturityLevel.level,
        organizationAge,
        isNewOrganization,
      });

      const insights = await generateInsights({
        section,
        data,
        organizationName: organization.name,
        organizationId: adminUser.organization_id,
        maturityLevel: maturityLevel,
        additionalContext: enhancedContext,
        temperature: 0.7,
        useMaturityAdaptation: true,
        supabase,
      });

      // Save insights to database
      const insightsToInsert = insights.map((insight) => ({
        organization_id: adminUser.organization_id,
        section,
        ...insight,
      }));

      const { data: insertedInsights, error: insertError } = await supabase
        .from("ai_insights")
        .insert(insightsToInsert)
        .select();

      if (insertError) {
        logger.error("Error saving insights", { error: insertError, section });
        return NextResponse.json(
          { error: "Failed to save insights" },
          { status: 500 },
        );
      }

      logger.info("Insights generated and saved", {
        section,
        count: insertedInsights?.length || 0,
        organizationId: adminUser.organization_id,
      });

      return NextResponse.json({
        success: true,
        insights: insertedInsights || [],
        count: insertedInsights?.length || 0,
      });
    } catch (error: unknown) {
      logger.error("Generate insights API error", {
        error: error.message,
        stack: error.stack,
      });

      // Return user-friendly error message
      if (error.message.includes("No available LLM providers")) {
        return NextResponse.json(
          {
            error:
              "AI service is not configured. Please configure at least one LLM provider.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  });
}

/**
 * GET /api/ai/insights/generate
 * Get information about insight generation (for debugging/monitoring)
 */
export async function GET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.general)(request, async () => {
    try {
      const queryParams = parseAndValidateQuery(request, generateQuerySchema);
      const section = queryParams.section;

      const { client: supabase, getUser } =
        await createClientFromRequest(request);

      // Check authentication
      const { data, error: userError } = await getUser();
      const user = data?.user;
      if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get user's organization
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("organization_id")
        .eq("id", user.id)
        .eq("is_active", true)
        .single();

      if (!adminUser?.organization_id) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }

      // Get latest insights generation info
      let query = supabase
        .from("ai_insights")
        .select("section, created_at, count")
        .eq("organization_id", adminUser.organization_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (section) {
        query = query.eq("section", section);
      }

      const { data: recentInsights, error } = await query;

      if (error) {
        logger.error("Error fetching insight generation info", { error });
        return NextResponse.json(
          { error: "Failed to fetch generation info" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        recentGenerations: recentInsights || [],
      });
    } catch (error: unknown) {
      logger.error("Get generation info error", { error: error.message });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

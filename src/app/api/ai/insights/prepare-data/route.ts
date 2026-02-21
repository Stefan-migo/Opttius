import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { prepareInsightData } from "@/lib/ai/insights/prepare-data";
import type { InsightSection } from "@/lib/ai/insights/schemas";

/**
 * GET /api/ai/insights/prepare-data
 * Prepare real system data for insight generation
 * This endpoint aggregates data from various sources to prepare it for AI analysis
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.general)(request, async () => {
    try {
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

      // Get branch context
      const branchContext = await getBranchContext(request, user.id);

      // Get organization name
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", adminUser.organization_id)
        .single();

      if (orgError || !organization) {
        logger.error("Failed to fetch organization", { error: orgError });
        return NextResponse.json(
          { error: "Failed to fetch organization" },
          { status: 500 },
        );
      }

      const searchParams = request.nextUrl.searchParams;
      const section = searchParams.get("section") as InsightSection | null;

      const result = await prepareInsightData(
        supabase,
        adminUser.organization_id,
        organization.name,
        section,
        branchContext,
      );

      return NextResponse.json({
        success: true,
        organizationName: result.organizationName,
        section: result.section,
        data: result.data,
      });
    } catch (error: any) {
      logger.error("Prepare data API error", {
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  });
}

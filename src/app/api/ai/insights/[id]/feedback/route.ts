import { NextRequest, NextResponse } from "next/server";

import { InsightFeedbackSchema } from "@/lib/ai/insights/schemas";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

/**
 * POST /api/ai/insights/:id/feedback
 * Submit feedback for an insight
 */
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withRateLimit(rateLimitConfigs.modification)(request, async () => {
    try {
      const { id } = await params;

      // Validate body
      const { score, comment } = await parseAndValidateBody(
        request,
        InsightFeedbackSchema,
      );

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

      // Update insight with feedback
      const { data: insight, error: updateError } = await supabase
        .from("ai_insights")
        .update({
          feedback_score: score,
          feedback_comment: comment ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", adminUser.organization_id)
        .select()
        .single();

      if (updateError) {
        logger.error("Error submitting feedback", {
          error: updateError,
          insightId: id,
        });
        return NextResponse.json(
          { error: "Failed to submit feedback" },
          { status: 500 },
        );
      }

      if (!insight) {
        return NextResponse.json(
          { error: "Insight not found" },
          { status: 404 },
        );
      }

      logger.info("Feedback submitted", {
        insightId: id,
        score,
        userId: user.id,
      });

      return NextResponse.json({ success: true, insight });
    } catch (error: unknown) {
      logger.error("Feedback API error", { error: error.message });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

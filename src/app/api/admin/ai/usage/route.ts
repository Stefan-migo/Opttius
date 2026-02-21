import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/admin/ai/usage
 * Get AI usage and cost metrics for the current organization.
 * Query params: days (default 30), organizationId (super_admin only)
 */
export const dynamic = "force-dynamic";

// Rough cost per 1K tokens (USD) - update as needed
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4-turbo-preview": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-opus": { input: 0.015, output: 0.075 },
  "gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "deepseek-chat": { input: 0.00014, output: 0.00028 },
  default: { input: 0.001, output: 0.002 },
};

function getModelCost(model: string) {
  const key = Object.keys(MODEL_COSTS).find((k) =>
    model.toLowerCase().includes(k.toLowerCase()),
  );
  return MODEL_COSTS[key || "default"];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");
    const days = Math.min(
      90,
      Math.max(1, parseInt(daysParam || "30", 10) || 30),
    );
    const targetOrgId = searchParams.get("organizationId");

    let orgId = adminUser.organization_id;
    if (
      targetOrgId &&
      ["super_admin", "root", "dev"].includes(adminUser.role)
    ) {
      orgId = targetOrgId;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs, error } = await supabase
      .from("ai_usage_log")
      .select(
        "provider, model, prompt_tokens, completion_tokens, endpoint, created_at",
      )
      .eq("organization_id", orgId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch AI usage", { error });
      return NextResponse.json(
        { error: "Failed to fetch usage" },
        { status: 500 },
      );
    }

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let estimatedCost = 0;

    const byModel: Record<
      string,
      { promptTokens: number; completionTokens: number; count: number }
    > = {};

    for (const row of logs || []) {
      totalPromptTokens += row.prompt_tokens || 0;
      totalCompletionTokens += row.completion_tokens || 0;
      const cost = getModelCost(row.model);
      estimatedCost +=
        ((row.prompt_tokens || 0) / 1000) * cost.input +
        ((row.completion_tokens || 0) / 1000) * cost.output;

      const key = `${row.provider}:${row.model}`;
      if (!byModel[key]) {
        byModel[key] = { promptTokens: 0, completionTokens: 0, count: 0 };
      }
      byModel[key].promptTokens += row.prompt_tokens || 0;
      byModel[key].completionTokens += row.completion_tokens || 0;
      byModel[key].count += 1;
    }

    return NextResponse.json({
      organizationId: orgId,
      period: { days, startDate: startDate.toISOString() },
      summary: {
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
        estimatedCostUsd: Math.round(estimatedCost * 10000) / 10000,
        requestCount: logs?.length || 0,
      },
      byModel: Object.entries(byModel).map(([key, v]) => ({
        model: key,
        ...v,
        totalTokens: v.promptTokens + v.completionTokens,
      })),
      recentLogs: (logs || []).slice(0, 50),
    });
  } catch (err: any) {
    logger.error("AI usage API error", { error: err?.message });
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAllTools, getToolByName, getToolsByCategory } from "@/lib/ai/tools";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
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

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const toolName = searchParams.get("name");
    const category = searchParams.get("category");

    if (toolName) {
      const tool = getToolByName(toolName);
      if (!tool) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }
      return NextResponse.json({ tool });
    }

    if (category) {
      const tools = getToolsByCategory(category);
      return NextResponse.json({ tools });
    }

    const allTools = getAllTools();

    const toolsByCategory = allTools.reduce(
      (acc, tool) => {
        const category = tool.category || "other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          name: tool.name,
          description: tool.description,
          category: category,
          parameters: tool.parameters,
          requiresConfirmation: tool.requiresConfirmation || false,
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{
          name: string;
          description: string;
          category: string;
          parameters: unknown;
          requiresConfirmation: boolean;
        }>
      >,
    );

    return NextResponse.json({
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameters: tool.parameters,
        requiresConfirmation: tool.requiresConfirmation,
      })),
      categories: Object.keys(toolsByCategory),
      toolsByCategory,
    });
  } catch (error) {
    logger.error("Tools API error", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

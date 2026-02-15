import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { LLMFactory } from "@/lib/ai/factory";
import { getProvider } from "@/lib/ai/providers";
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

    const factory = LLMFactory.getInstance();
    const availableProviders = factory.getAvailableProviders();

    const providers = await Promise.all(
      availableProviders.map(async (providerId) => {
        try {
          const provider = getProvider(providerId);
          const models = provider.getAvailableModels();

          return {
            id: providerId,
            name: providerId,
            enabled: factory.isProviderEnabled(providerId),
            models: models.map((m) => ({
              id: m.id,
              name: m.name,
              supportsStreaming: m.supportsStreaming,
              supportsFunctionCalling: m.supportsFunctionCalling,
              maxTokens: m.maxTokens,
            })),
          };
        } catch (error: unknown) {
          return {
            id: providerId,
            name: providerId,
            enabled: false,
            models: [],
            error: "Failed to load provider",
          };
        }
      }),
    );

    return NextResponse.json({ providers });
  } catch (error) {
    logger.error("Providers API error", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 },
      );
    }

    try {
      const providerInstance = getProvider(provider);
      const models = providerInstance.getAvailableModels();

      return NextResponse.json({
        success: true,
        provider: {
          id: provider,
          name: provider,
          models: models.map((m) => ({
            id: m.id,
            name: m.name,
          })),
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Provider test failed",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error("Provider test error", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

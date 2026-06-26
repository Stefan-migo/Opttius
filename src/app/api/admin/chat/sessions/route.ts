// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error("Auth error", { error: userError });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      logger.error("User is not admin", { userId: user.id });
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const body = await request.json();
    const { provider, model, title, config } = body;

    logger.debug("Creating session", {
      provider,
      model,
      title,
      userId: user.id,
    });

    if (!provider || !model) {
      return NextResponse.json(
        { error: "Provider and model are required" },
        { status: 400 },
      );
    }

    // Ensure model is a string and not empty
    const modelString = String(model).trim();
    if (!modelString) {
      return NextResponse.json(
        { error: "Model cannot be empty" },
        { status: 400 },
      );
    }

    const insertData: {
      user_id: string;
      provider: string;
      model: string;
      title: string | null;
      organization_id?: string | null;
      config?: string | null;
    } = {
      user_id: user.id,
      provider: String(provider).trim(),
      model: modelString,
      title: title ? String(title).trim() : null,
      organization_id: adminUser?.organization_id ?? null,
    };

    // Only include config if it's a valid object
    if (config && typeof config === "object") {
      try {
        // Validate that config can be serialized to JSON
        const configString = JSON.stringify(config);
        // Only include if it's not empty
        if (configString !== "{}") {
          insertData.config = JSON.parse(configString); // Re-parse to ensure it's clean
        }
      } catch (e) {
        logger.error("Invalid config object", { error: e });
        // Continue without config if it's invalid
      }
    }

    logger.debug("Inserting session data", {
      insertData: {
        ...insertData,
        config: insertData.config ? "[object]" : null,
      },
    });

    // Try with regular client first, fallback to service role if RLS fails
    let { data: session, error } = await supabase
      .from("chat_sessions")
      .insert(insertData)
      .select()
      .single();

    // If RLS fails, try with service role client
    if (
      error &&
      (error.code === "42501" ||
        (error.message &&
          typeof error.message === "string" &&
          (error.message.includes("permission") ||
            error.message.includes("policy"))))
    ) {
      logger.warn("RLS error detected, trying with service role client", {
        error: error.code,
      });
      const serviceSupabase = createServiceRoleClient();
      const serviceResult = await serviceSupabase
        .from("chat_sessions")
        .insert(insertData)
        .select()
        .single();

      session = serviceResult.data;
      error = serviceResult.error;
    }

    if (error) {
      logger.error("Database error creating session", { error, insertData });
      return NextResponse.json(
        {
          error:
            error.message && typeof error.message === "string"
              ? error.message
              : "Failed to create session",
          details:
            error.code && typeof error.code === "string"
              ? error.code
              : error.hint && typeof error.hint === "string"
                ? error.hint
                : "Unknown database error",
          errorCode:
            error.code && typeof error.code === "string"
              ? error.code
              : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    logger.error("Create session error", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
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
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const { data: session, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return NextResponse.json(
          {
            error:
              error.message && typeof error.message === "string"
                ? error.message
                : "Database error",
          },
          { status: 500 },
        );
      }

      const { data: messages, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        return NextResponse.json(
          { error: messagesError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ session, messages: messages || [] });
    } else {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error("Get session error", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { sessionId, title, config } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    const updateData: {
      title?: string;
      config?: string | null;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (config !== undefined) updateData.config = config;

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message && typeof error.message === "string"
              ? error.message
              : "Database error",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    logger.error("Update session error", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

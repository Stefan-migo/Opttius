import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { getUser } = await createClientFromRequest(request);
    const { data: userData, error: userError } = await getUser();

    if (userError || !userData || !("user" in userData) || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = userData.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener progreso del tour desde la base de datos
    const supabase = await createClientFromRequest(request);

    // Obtener organización del usuario
    const { data: adminUser } = await supabase.client
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = adminUser?.organization_id || null;

    const { data: progress, error } = await supabase.client
      .from("user_tour_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (esto es normal)
      logger.error("Error fetching tour progress:", error);
      return NextResponse.json(
        { error: "Failed to fetch tour progress" },
        { status: 500 },
      );
    }

    // Si no existe, retornar estado inicial
    if (!progress) {
      return NextResponse.json({
        status: "not_started",
        current_step: 0,
        completed_steps: [],
        skip_on_next_login: false,
      });
    }

    return NextResponse.json(progress);
  } catch (error) {
    logger.error("Tour progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getUser } = await createClientFromRequest(request);
    const { data: userData, error: userError } = await getUser();

    if (userError || !userData || !("user" in userData) || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = userData.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const supabase = await createClientFromRequest(request);

    // Obtener organización del usuario
    const { data: adminUser } = await supabase.client
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = adminUser?.organization_id || null;

    let updateData: unknown = {};

    switch (action) {
      case "start":
        updateData = {
          status: "in_progress",
          current_step: 0,
          completed_steps: [],
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          skip_on_next_login: false,
        };
        break;
      case "complete":
        updateData = {
          status: "completed",
          completed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        };
        break;
      case "skip":
        updateData = {
          status: "disabled",
          skip_on_next_login: true,
          last_accessed_at: new Date().toISOString(),
        };
        break;
      case "restart":
        updateData = {
          status: "in_progress",
          current_step: 0,
          completed_steps: [],
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          skip_on_next_login: false,
        };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Upsert tour progress
    const { data, error } = await supabase.client
      .from("user_tour_progress")
      .upsert(
        {
          user_id: user.id,
          organization_id: organizationId,
          ...updateData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,organization_id",
        },
      )
      .select()
      .single();

    if (error) {
      logger.error("Error updating tour progress:", error);
      return NextResponse.json(
        { error: "Failed to update tour progress", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Tour action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { step: string } },
) {
  try {
    const { getUser } = await createClientFromRequest(request);
    const {
      data: userData,
      error: userError,
    } = await getUser();
    
    if (userError || !userData || !("user" in userData) || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = userData.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stepIndex = parseInt(params.step, 10);
    if (isNaN(stepIndex) || stepIndex < 0) {
      return NextResponse.json(
        { error: "Invalid step index" },
        { status: 400 },
      );
    }

    const { client: supabaseClient } = await createClientFromRequest(request);

    // Obtener organización del usuario
    const { data: adminUser } = await supabaseClient
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = adminUser?.organization_id || null;

    // Obtener progreso actual
    const { data: progress, error: fetchError } = await supabaseClient
      .from("user_tour_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching tour progress:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch tour progress" },
        { status: 500 },
      );
    }

    if (!progress || progress.status !== "in_progress") {
      return NextResponse.json({ error: "Tour not started" }, { status: 400 });
    }

    // Actualizar paso actual y agregar a completados
    const completedSteps = [...(progress.completed_steps || [])];
    if (!completedSteps.includes(stepIndex)) {
      completedSteps.push(stepIndex);
    }
    const nextStep = stepIndex + 1;

    const { data: updatedProgress, error } = await supabaseClient
      .from("user_tour_progress")
      .update({
        current_step: nextStep,
        completed_steps: completedSteps,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating step:", error);
      return NextResponse.json(
        { error: "Failed to update step", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedProgress);
  } catch (error) {
    console.error("Step completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

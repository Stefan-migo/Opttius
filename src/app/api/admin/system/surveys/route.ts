import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("organization_id")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return adminUser?.organization_id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await getOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const offset = (page - 1) * limit;

    const serviceSupabase = createServiceRoleClient();

    // Metrics: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: metricsRows } = await serviceSupabase
      .from("customer_satisfaction_surveys")
      .select("score")
      .eq("organization_id", orgId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const scores = (metricsRows ?? []).map((r) => r.score);
    const total = scores.length;
    const average = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const s of scores) {
      if (s >= 1 && s <= 5) distribution[s] = (distribution[s] ?? 0) + 1;
    }

    // Paginated responses (use FK hints for relations)
    const { data: responses, error } = await serviceSupabase
      .from("customer_satisfaction_surveys")
      .select(
        `
        id,
        score,
        comment,
        created_at,
        lab_work_orders!work_order_id(id, work_order_number),
        customers!customer_id(id, first_name, last_name, email)
      `,
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error("Error fetching survey responses", error);
      return NextResponse.json(
        { error: "Error al cargar respuestas" },
        { status: 500 },
      );
    }

    // Total count
    const { count } = await serviceSupabase
      .from("customer_satisfaction_surveys")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    return NextResponse.json({
      responses: responses ?? [],
      metrics: {
        total,
        average: Math.round(average * 100) / 100,
        distribution,
      },
      pagination: {
        page,
        limit,
        total_count: count ?? 0,
      },
    });
  } catch (err) {
    logger.error("Surveys GET error", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

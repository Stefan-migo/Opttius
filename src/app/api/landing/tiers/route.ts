/**
 * GET /api/landing/tiers
 * Public endpoint: returns subscription tiers (name, price, limits) for the landing pricing section.
 * Values are the same as in Gestión SaaS Opttius so the landing always reflects current pricing.
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: tiers, error } = await supabase
      .from("subscription_tiers")
      .select(
        "name, price_monthly, max_branches, max_users, max_customers, max_products, features",
      )
      .order("price_monthly", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Error al cargar planes", details: error.message },
        { status: 500 },
      );
    }

    let trialDays = 7;
    const trialRes = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "membership_trial_days")
      .is("organization_id", null)
      .is("branch_id", null)
      .maybeSingle();
    if (!trialRes.error && trialRes.data?.config_value != null) {
      const parsed = parseInt(
        String(trialRes.data.config_value).replace(/"/g, ""),
        10,
      );
      if (!isNaN(parsed) && parsed > 0) trialDays = parsed;
    }

    return NextResponse.json(
      { tiers: tiers || [], trial_days: trialDays },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Error al cargar planes" },
      { status: 500 },
    );
  }
}

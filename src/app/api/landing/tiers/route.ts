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
        "name, price_monthly, max_branches, max_users, max_customers, max_products",
      )
      .order("price_monthly", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Error al cargar planes", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tiers: tiers || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Error al cargar planes" },
      { status: 500 },
    );
  }
}

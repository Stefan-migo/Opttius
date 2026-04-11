/**
 * GET /api/admin/checkout/tiers
 * List subscription tiers (name, price) for checkout - any authenticated admin
 */
import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tiers, error } = await supabase
    .from("subscription_tiers")
    .select("name, price_monthly")
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
}

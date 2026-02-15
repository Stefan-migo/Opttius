import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/checkout/gateways
 * Obtiene las pasarelas activas para el checkout
 */
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();

  const { data: gateways, error } = await supabase
    .from("payment_gateways_config")
    .select("gateway_id, name, description, icon_name, config")
    .eq("is_enabled", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Error al cargar gateways" },
      { status: 500 },
    );
  }

  return NextResponse.json({ gateways });
}

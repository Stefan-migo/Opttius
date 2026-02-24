/**
 * GET /api/admin/whatsapp/status
 * Lista números WhatsApp conectados para la organización
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "Admin sin organización" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("whatsapp_phone_numbers")
      .select("id, phone_number_id, waba_id, display_phone_number, created_at")
      .eq("organization_id", adminUser.organization_id);

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener estado" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      connected: (data?.length ?? 0) > 0,
      numbers: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

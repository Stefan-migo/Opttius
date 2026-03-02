/**
 * POST /api/admin/whatsapp/connect
 * Guarda waba_id y phone_number_id tras Embedded Signup o registro manual
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { validateFeature } from "@/lib/saas/tier-validator";

export const dynamic = "force-dynamic";

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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, organization_id")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "Admin sin organización asignada" },
        { status: 403 },
      );
    }

    const hasWhatsApp = await validateFeature(
      adminUser.organization_id,
      "whatsapp",
    );
    if (!hasWhatsApp) {
      return NextResponse.json(
        {
          error:
            "WhatsApp Business requiere el plan Óptica Avanzada. Upgrade para habilitar.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { waba_id, phone_number_id, display_phone_number } = body;

    if (!waba_id || !phone_number_id) {
      return NextResponse.json(
        { error: "waba_id y phone_number_id son requeridos" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("whatsapp_phone_numbers")
      .select("id")
      .eq("organization_id", adminUser.organization_id)
      .maybeSingle();

    const payload = {
      organization_id: adminUser.organization_id,
      phone_number_id: String(phone_number_id),
      waba_id: String(waba_id),
      display_phone_number: display_phone_number
        ? String(display_phone_number)
        : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("whatsapp_phone_numbers")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        logger.error("WhatsApp connect update failed", {
          error: updateError.message,
          organizationId: adminUser.organization_id,
        });
        return NextResponse.json(
          { error: "Error al actualizar configuración" },
          { status: 500 },
        );
      }
      return NextResponse.json({
        success: true,
        message: "WhatsApp actualizado",
        updated: true,
      });
    }

    const { error: insertError } = await supabase
      .from("whatsapp_phone_numbers")
      .insert(payload);

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Este número ya está conectado a otra organización. Usa un número distinto.",
          },
          { status: 409 },
        );
      }
      logger.error("WhatsApp connect insert failed", {
        error: insertError.message,
        organizationId: adminUser.organization_id,
      });
      return NextResponse.json(
        { error: "Error al conectar WhatsApp" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp conectado correctamente",
    });
  } catch (error) {
    logger.error(
      "WhatsApp connect error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

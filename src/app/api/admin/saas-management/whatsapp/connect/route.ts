/**
 * POST /api/admin/saas-management/whatsapp/connect
 * Guarda waba_id y phone_number_id para una organización (root solo)
 * Body: { organization_id, waba_id, phone_number_id, display_phone_number? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const { organization_id, waba_id, phone_number_id, display_phone_number } =
      body;

    if (!organization_id || !waba_id || !phone_number_id) {
      return NextResponse.json(
        { error: "organization_id, waba_id y phone_number_id son requeridos" },
        { status: 400 },
      );
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 },
      );
    }

    const { data: existing } = await supabase
      .from("whatsapp_phone_numbers")
      .select("id")
      .eq("organization_id", organization_id)
      .maybeSingle();

    const payload = {
      organization_id: String(organization_id),
      phone_number_id: String(phone_number_id),
      waba_id: String(waba_id),
      display_phone_number: display_phone_number
        ? String(display_phone_number).trim()
        : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("whatsapp_phone_numbers")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        if (updateError.code === "23505") {
          return NextResponse.json(
            {
              error:
                "Este número ya está conectado a otra organización. Usa un número distinto.",
            },
            { status: 409 },
          );
        }
        logger.error("WhatsApp connect update failed", {
          error: updateError.message,
          organizationId: organization_id,
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
        organizationId: organization_id,
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("WhatsApp connect error", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor" },
      { status: 500 },
    );
  }
}

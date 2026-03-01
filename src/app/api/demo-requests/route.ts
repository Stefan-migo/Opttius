/**
 * POST /api/demo-requests
 * Public endpoint: creates a demo request from /solicitar-demo form.
 * No auth required.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import {
  parseAndValidateBody,
  ValidationError,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { appLogger as logger } from "@/lib/logger";

const demoRequestSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().optional().nullable(),
  optica_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  source: z.string().optional().default("landing"),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: z.infer<typeof demoRequestSchema>;
    try {
      body = await parseAndValidateBody(request, demoRequestSchema);
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const { email, full_name, optica_name, phone, source } = body;

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("demo_requests")
      .insert({
        email: email.trim().toLowerCase(),
        full_name: full_name?.trim() || null,
        optica_name: optica_name?.trim() || null,
        phone: phone?.trim() || null,
        source: source || "landing",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      logger.error("Error creating demo request", { error, email });
      return NextResponse.json(
        { error: "No pudimos registrar tu solicitud. Intenta de nuevo." },
        { status: 500 },
      );
    }

    logger.info("Demo request created", { id: data?.id, email });

    return NextResponse.json({
      success: true,
      message: "Solicitud recibida correctamente",
    });
  } catch (err) {
    logger.error("Error in POST /api/demo-requests", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/leads/[id]/email/send
 * Envía un email manual a un lead
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { sendEmail } from "@/lib/email/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRoot(request);
    const { id } = await params;

    const body = await request.json();
    const { subject, body: emailBody } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject y body son requeridos" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Get lead info
    const { data: lead, error: leadError } = await supabase
      .from("demo_requests")
      .select("id, email, full_name, optica_name")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 },
      );
    }

    // Send email using Resend
    try {
      const result = await sendEmail({
        to: lead.email,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1A2B23 0%, #2D3F35 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #C5A059; margin: 0; font-size: 24px;">Opttius</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
              <p style="margin-top: 0;">Hola ${lead.full_name?.split(" ")[0] || ""},</p>
              <div style="white-space: pre-wrap;">${emailBody}</div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px;">
                <p style="margin: 0;">Este email fue enviado desde Opttius - Gestión Inteligente para Ópticas</p>
                <p style="margin: 5px 0 0;">¿Tienes preguntas? Contáctanos en contacto@opttius.cl</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: emailBody,
      });

      if (!result.success) {
        logger.error("Failed to send email", result.error);
        return NextResponse.json(
          { error: "Error al enviar email", details: result.error },
          { status: 500 },
        );
      }

      // Record activity
      await supabase.from("lead_activities").insert({
        lead_id: id,
        activity_type: "manual_email_sent",
        description: `Email enviado: ${subject.substring(0, 50)}...`,
        metadata: {
          subject,
          body_length: emailBody.length,
          sent_to: lead.email,
        },
      });

      // Update last_contact_at
      await supabase
        .from("demo_requests")
        .update({
          last_contact_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        message: "Email enviado correctamente",
        emailId: result.id,
      });
    } catch (emailError) {
      logger.error("Email sending error", emailError);
      return NextResponse.json(
        {
          error: "Error al enviar email",
          details:
            emailError instanceof Error ? emailError.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in POST lead email send", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

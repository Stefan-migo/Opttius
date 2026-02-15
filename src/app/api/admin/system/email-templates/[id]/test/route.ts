import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { testEmail, variables = {} } = body;

    if (!testEmail) {
      return NextResponse.json(
        {
          error: "Test email address is required",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", params.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        {
          error: "Template not found",
        },
        { status: 404 },
      );
    }

    // Replace variables in subject and content
    let subject = template.subject || "";
    let content = template.content || "";

    // Replace variables with provided values or defaults
    const defaultVariables: Record<string, string> = {
      customer_name: "Cliente de Prueba",
      order_number: "ORD-12345",
      order_total: "$1,000.00",
      order_date: new Date().toLocaleDateString("es-AR"),
      company_name: "OPTTIUS CONSCIENTE",
      support_email: "soporte@opttius.com",
      ...variables,
    };

    Object.entries({ ...defaultVariables, ...variables }).forEach(
      ([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        subject = subject.replace(regex, String(value));
        content = content.replace(regex, String(value));
      },
    );

    // Send test email
    try {
      await sendEmail({
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html: content,
        text: content.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      });

      return NextResponse.json({
        success: true,
        message: `Email de prueba enviado a ${testEmail}`,
      });
    } catch (emailError) {
      logger.error("Error sending test email", { error: emailError });
      return NextResponse.json(
        {
          success: false,
          error: "Error al enviar el email de prueba",
          details:
            emailError instanceof Error
              ? emailError.message
              : "Error desconocido",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Error in test email template API", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

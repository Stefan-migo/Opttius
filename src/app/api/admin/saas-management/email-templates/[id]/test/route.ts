import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { wrapInModernLayout } from "@/lib/email/layout";
import { replaceTemplateVariables } from "@/lib/email/template-utils";
import { appLogger as logger } from "@/lib/logger";
import { requireRoot } from "@/lib/api/root-middleware";

export const dynamic = "force-dynamic";

const DEFAULT_VARIABLES: Record<string, string> = {
  customer_name: "Cliente de Prueba",
  order_number: "ORD-12345",
  order_total: "$1,000.00",
  order_date: new Date().toLocaleDateString("es-AR"),
  company_name: "Opttius",
  organization_name: "Opttius",
  support_email: "soporte@opttius.com",
  admin_first_name: "Administrador",
  trial_end_date: new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("es-AR"),
  days_remaining: "7",
};

/**
 * POST /api/admin/saas-management/email-templates/[id]/test
 * Send test email for SaaS template (root/dev only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const { id } = params;

    const body = await request.json();
    const { testEmail, variables = {} } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: "Test email address is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    const { data: template, error: templateError } = await supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", id)
      .eq("category", "saas")
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const allVariables = { ...DEFAULT_VARIABLES, ...variables };
    const subject = replaceTemplateVariables(
      template.subject || "",
      allVariables,
    );
    let content = replaceTemplateVariables(
      template.content || "",
      allVariables,
    );

    content = wrapInModernLayout(content, {
      organizationName: "Opttius",
      organizationColor: "#1A2B23",
      previewText: subject,
    });

    const text = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html: content,
      text,
    });

    if (!result.success) {
      logger.error("Error sending test email", { error: result.error });
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Error al enviar el email de prueba",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email de prueba enviado a ${testEmail}`,
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in SaaS email template test", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

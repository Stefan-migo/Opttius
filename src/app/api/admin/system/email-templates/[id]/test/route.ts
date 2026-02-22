import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { wrapInModernLayout } from "@/lib/email/layout";
import { replaceTemplateVariables } from "@/lib/email/template-utils";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const DEFAULT_VARIABLES: Record<string, string> = {
  customer_name: "Cliente de Prueba",
  order_number: "ORD-12345",
  order_total: "$1,000.00",
  order_date: new Date().toLocaleDateString("es-AR"),
  company_name: "Nuestra Óptica",
  organization_name: "Nuestra Óptica",
  support_email: "soporte@opttius.com",
  ...Object.fromEntries(
    [
      "order_items",
      "order_items_text",
      "appointment_date",
      "appointment_time",
      "professional_name",
      "branch_name",
      "quote_number",
      "quote_total",
      "work_order_number",
      "low_stock_products",
      "low_stock_products_text",
      "product_count",
    ].map((k) => [k, "(ejemplo)"]),
  ),
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { testEmail, variables = {} } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: "Test email address is required" },
        { status: 400 },
      );
    }

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
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: template, error: templateError } = await supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", id)
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

    let organizationName = "Nuestra Óptica";
    let organizationColor = "#1A2B23";

    if (template.organization_id) {
      const serviceRole = createServiceRoleClient();
      const { data: org } = await serviceRole
        .from("organizations")
        .select("name, metadata")
        .eq("id", template.organization_id)
        .single();
      if (org) {
        organizationName = org.name || organizationName;
        organizationColor =
          (org.metadata as { primary_color?: string })?.primary_color ||
          organizationColor;
      }
    }

    content = wrapInModernLayout(content, {
      organizationName,
      organizationColor,
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
    logger.error("Error in test email template API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

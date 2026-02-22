import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { LLMFactory } from "@/lib/ai/factory";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import type { LLMProvider } from "@/lib/ai/types";

/**
 * POST /api/admin/email-templates/ai-assist
 * AI-assisted email template generation.
 * Receives: { type, organizationId?, userPrompt }
 * Returns: { subject, content }
 *
 * The agent receives template type, available variables, and org metadata (if organizationId).
 * Tools for org metadata will be added when defined by the user.
 */
export const dynamic = "force-dynamic";

const VARIABLES_BY_TYPE: Record<string, string[]> = {
  order_confirmation: [
    "customer_name",
    "order_number",
    "order_total",
    "order_date",
    "order_items",
    "company_name",
    "support_email",
  ],
  account_welcome: [
    "customer_name",
    "account_url",
    "company_name",
    "support_email",
    "website_url",
  ],
  appointment_reminder: [
    "customer_name",
    "appointment_date",
    "appointment_time",
    "branch_name",
    "company_name",
    "support_email",
  ],
  quote_sent: [
    "customer_name",
    "quote_number",
    "quote_date",
    "quote_total",
    "company_name",
    "support_email",
  ],
  quote_expiring: [
    "customer_name",
    "quote_number",
    "quote_expiry_date",
    "total",
    "company_name",
    "support_email",
  ],
  work_order_ready: [
    "customer_name",
    "work_order_number",
    "branch_name",
    "company_name",
    "support_email",
  ],
  low_stock_alert: [
    "low_stock_products",
    "product_count",
    "company_name",
    "support_email",
  ],
  custom: ["customer_name", "company_name", "support_email", "website_url"],
};

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

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { type, organizationId, userPrompt } = body;

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json(
        { error: "userPrompt is required" },
        { status: 400 },
      );
    }

    const templateType = type || "custom";
    const variables =
      VARIABLES_BY_TYPE[templateType] || VARIABLES_BY_TYPE.custom;

    let orgInfo: { name?: string; primary_color?: string } | null = null;
    if (organizationId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name, metadata")
        .eq("id", organizationId)
        .single();
      orgInfo = org
        ? {
            name: org.name,
            primary_color: (org.metadata as { primary_color?: string })
              ?.primary_color,
          }
        : null;
    }

    const systemPrompt = `Eres un asistente que genera plantillas de email para una óptica. El usuario describe lo que quiere y tú devuelves un subject (asunto) y content (HTML del cuerpo del email).

Tipo de plantilla: ${templateType}
Variables disponibles (usar con {{variable_name}}): ${variables.join(", ")}
${orgInfo?.name ? `Nombre de la óptica: ${orgInfo.name}` : ""}
${orgInfo?.primary_color ? `Color primario: ${orgInfo.primary_color}` : ""}

Responde ÚNICAMENTE con un JSON válido en este formato exacto, sin markdown ni texto adicional:
{"subject":"Asunto del email","content":"<html>...</html>"}

El content debe ser HTML completo, con estilos inline o en <style>. Usa las variables con doble llave {{variable_name}}. Mantén el diseño limpio y profesional.`;

    const factory = LLMFactory.getInstance();
    const { provider, config } = await factory.createProviderWithFallback(
      "deepseek" as LLMProvider,
      { temperature: 0.7, maxTokens: 4000 },
    );

    const response = await provider.generateText(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      undefined,
      config,
    );

    const text = response?.content?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;

    let parsed: { subject?: string; content?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.warn("AI assist: failed to parse LLM response as JSON", {
        response: text.slice(0, 200),
      });
      return NextResponse.json(
        {
          error: "No se pudo generar la plantilla. Intenta de nuevo.",
          subject: "",
          content: "",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      subject: parsed.subject || "",
      content: parsed.content || "",
    });
  } catch (error) {
    logger.error("Email template AI assist error", { error });
    return NextResponse.json(
      {
        error: "Error al generar plantilla",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

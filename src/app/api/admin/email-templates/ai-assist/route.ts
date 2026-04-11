import { NextRequest, NextResponse } from "next/server";

import { LLMFactory } from "@/lib/ai/factory";
import type { LLMProvider } from "@/lib/ai/types";
import { buildVariablesPromptForAgent } from "@/lib/email/ai-template-variables";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

/**
 * POST /api/admin/email-templates/ai-assist
 * AI-assisted email template generation.
 * Receives: { type, organizationId?, userPrompt }
 * Returns: { subject, content }
 *
 * El agente usa las variables definidas en ai-template-variables.ts,
 * alineadas con notifications.ts y optica.ts. Usar organization_name (no company_name).
 */
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
    const variablesPrompt = buildVariablesPromptForAgent(templateType);

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

Variables disponibles (OBLIGATORIO usar solo estas, con sintaxis {{variable_name}}):
${variablesPrompt}

REGLAS CRÍTICAS:
- NUNCA uses customer_first_name; usa customer_name para el saludo.
- Usa organization_name para el nombre de la óptica (company_name es alias, mismo valor).
${orgInfo?.name ? `Nombre de la óptica en este contexto: ${orgInfo.name}` : ""}
${orgInfo?.primary_color ? `Color primario sugerido: ${orgInfo.primary_color}` : ""}

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

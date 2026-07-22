import { NextRequest, NextResponse } from "next/server";

import { LLMFactory } from "@/lib/ai/factory";
import type { LLMConfig } from "@/lib/ai/types";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const LEAD_EMAIL_SYSTEM_PROMPT = [
  "Eres un asistente de ventas profesional especializado en ópticas.",
  "Contexto: Opttius software de gestión para ópticas. Target: dueños, óptometristas.",
  "Tono: profesional, cercano, eficiente. Evita jerga excesiva, tono agresivo.",
  "Instrucciones: analiza lead, genera subject atractivo, cuerpo breve (<150 palabras)",
  "con problema, CTA claro, formato básico. Personaliza por etapa del funnel.",
  "Idioma: español chileno natural.",
  'Responde JSON: { "subject": "...", "body": "..." }',
].join(" ");

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();

  try {
    await requireRoot(request);
    const { id } = await params;

    logger.info("Generating lead email with AI", { leadId: id, startTime });

    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt es requerido" },
        { status: 400 },
      );
    }

    // Get lead info for context
    const { createServiceRoleClient } = await import(
      "@/utils/supabase/service-role"
    );
    const supabase = createServiceRoleClient();

    const { data: lead, error: leadError } = await supabase
      .from("demo_requests")
      .select(
        "id, email, full_name, optica_name, phone, funnel_stage, lead_score, notes",
      )
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      logger.error("Lead not found", { leadId: id, error: leadError });
      return NextResponse.json(
        { error: "Lead no encontrado" },
        { status: 404 },
      );
    }

    // Build context for the AI
    const leadContext = `
Lead: ${lead.full_name || "Sin nombre"}
Email: ${lead.email}
Óptica: ${lead.optica_name || "No especificada"}
Teléfono: ${lead.phone || "No especificado"}
Etapa del funnel: ${lead.funnel_stage || "pending"}
Score: ${lead.lead_score || 0}
Notas: ${lead.notes || "Sin notas"}
${context ? `Contexto adicional: ${context}` : ""}
`;

    const fullPrompt = `${LEAD_EMAIL_SYSTEM_PROMPT}

Información del lead:
${leadContext}

Solicitud del usuario:
${prompt}

Genera el email:`;

    // Generate with AI - use kilocode first, then openrouter as fallback
    try {
      const factory = LLMFactory.getInstance();

      logger.info("Creating LLM provider", { leadId: id });

      // Try kilocode first
      let provider, config;

      const orConfig: Partial<LLMConfig> = { model: "minimax/minimax-m2.5:free", maxTokens: 500, temperature: 0.7 };
      try {
        const result = await factory.createProviderWithFallback("kilocode", { maxTokens: 500, temperature: 0.7 });
        provider = result.provider; config = result.config;
      } catch {
        logger.warn("Kilocode init failed, trying openrouter");
        const result = await factory.createProviderWithFallback("openrouter", orConfig);
        provider = result.provider; config = result.config;
      }

      const userMsg = { role: "user" as const, content: `Información del lead:\n${leadContext}\n\nSolicitud:\n${prompt}` };
      const genOpts = { maxTokens: 500, temperature: 0.7 };

      let response;
      try {
        response = await provider.generateText([{ role: "system", content: LEAD_EMAIL_SYSTEM_PROMPT }, userMsg], undefined, genOpts);
      } catch (genError) {
        if (config.provider === "kilocode") {
          logger.warn("Kilocode generateText failed, trying openrouter fallback");
          const orResult = await factory.createProviderWithFallback("openrouter", orConfig);
          provider = orResult.provider; config = orResult.config;
          response = await provider.generateText([{ role: "system", content: LEAD_EMAIL_SYSTEM_PROMPT }, userMsg], undefined, genOpts);
        } else {
          throw genError;
        }
      }
      try {
        response = await provider.generateText(
          [
            { role: "system", content: LEAD_EMAIL_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Información del lead:\n${leadContext}\n\nSolicitud:\n${prompt}`,
            },
          ],
          undefined,
          {
            maxTokens: 500,
            temperature: 0.7,
          },
        );
      } catch (genError: unknown) {
        const msg = genError && typeof genError === "object" && "message" in genError
          ? (genError as { message: string }).message : String(genError);
        logger.error("Provider generateText failed", { error: msg, provider: config.provider, model: config.model, leadId: id });
        throw new Error("AI generation failed: " + msg);
      }

      logger.info("AI response received", {
        leadId: id,
        contentLength: response.content?.length,
        hasToolCalls: !!response.toolCalls,
      });

      let parsed: { subject: string; body: string };
      try {
        parsed = JSON.parse(response.content);
      } catch {
        const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) { parsed = JSON.parse(jsonMatch[1]); }
        else {
          const match = response.content.match(/\{[\s\S]*\}/);
          if (match) { parsed = JSON.parse(match[0]); }
          else {
            const lines = response.content.split("\n").filter((l: string) => l.trim());
            parsed = { subject: lines[0]?.replace(/^#+\s*/, "") || "Seguimiento", body: lines.slice(1).join("\n").trim() || response.content };
          }
        }
      }

      logger.info("AI email generated successfully", {
        leadId: id,
        subjectLength: parsed.subject.length,
        bodyLength: parsed.body?.length,
        duration: Date.now() - startTime,
      });

      // Log the generation (don't fail if this fails)
      try {
        await supabase.from("lead_activities").insert({
          lead_id: id,
          activity_type: "ai_email_generated",
          description: `Email generado con IA: ${parsed.subject.substring(0, 50)}...`,
          metadata: {
            prompt: prompt.substring(0, 200),
            generated_subject: parsed.subject,
            generated_body_length: parsed.body?.length,
          },
        });
      } catch (logError) {
        logger.warn("Failed to log AI email generation", {
          leadId: id,
          error:
            logError instanceof Error ? logError.message : String(logError),
        });
      }

      return NextResponse.json({
        success: true,
        subject: parsed.subject,
        body: parsed.body,
      });
    } catch (aiError) {
      const errorMessage =
        aiError instanceof Error ? aiError.message : String(aiError);
      const errorStack = aiError instanceof Error ? aiError.stack : undefined;

      logger.error("AI generation error", {
        error: errorMessage,
        errorType: aiError?.constructor?.name,
        stack: errorStack,
        leadId: id,
        duration: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: "Error al generar email con IA",
          details: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Error in POST lead email generate", {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      leadId: (await params).id,
      duration: Date.now() - startTime,
    });

    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor", details: errorMessage },
      { status: 500 },
    );
  }
}

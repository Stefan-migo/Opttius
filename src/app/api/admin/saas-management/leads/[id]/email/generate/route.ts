/**
 * POST /api/admin/saas-management/leads/[id]/email/generate
 * Genera un email personalizado usando IA
 */
import { NextRequest, NextResponse } from "next/server";

import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { LLMFactory } from "@/lib/ai/factory";
import type { LLMConfig } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const LEAD_EMAIL_SYSTEM_PROMPT = `Eres un asistente de ventas profesional especializado en ópticas. Tu tarea es generar emails personalizados y profesionales para leads potenciales.

Contexto:
- Estás ayudando a Opttius, un software de gestión para ópticas
- El target son dueño de ópticas, óptometristas y profesionales del área visual
- El tono debe ser: profesional, cercano, eficiente
- Evita: jerga técnica excesiva, tono muy agresivo, promesas exageradas

Instrucciones:
1. Analiza la información del lead proporcionada
2. Genera un subject line atractivo y claro
3. Genera un cuerpo de email que:
   - Sea breve (máximo 150 palabras)
   - Tackle el problema del cliente
   - Incluya un call-to-action claro
   - Use formato básico (párrafos cortos)
4. Personaliza según la etapa del funnel
5. El email debe ser en español chileno,自然的

Responde en formato JSON con:
{
  "subject": "asunto del email",
  "body": "cuerpo del email en español"
}`;

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

      try {
        const result = await factory.createProviderWithFallback("kilocode", {
          maxTokens: 500,
          temperature: 0.7,
        });
        provider = result.provider;
        config = result.config;
        logger.info("Using kilocode provider", { model: config.model });
      } catch (kilocodeInitError) {
        logger.warn("Kilocode init failed, trying openrouter", {
          error:
            kilocodeInitError instanceof Error
              ? kilocodeInitError.message
              : String(kilocodeInitError),
        });
        // Try openrouter instead
        const orConfig: Partial<LLMConfig> = {
          model: "minimax/minimax-m2.5:free",
          maxTokens: 500,
          temperature: 0.7,
        };
        const result = await factory.createProviderWithFallback(
          "openrouter",
          orConfig,
        );
        provider = result.provider;
        config = result.config;
        logger.info("Using openrouter fallback", { model: config.model });
      }

      logger.info("Provider created, config:", {
        leadId: id,
        provider: config.provider,
        model: config.model,
      });

      logger.info("Generating text with AI", { leadId: id });

      let response;
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
      } catch (genError) {
        // If kilocode fails at generateText, try openrouter as fallback
        if (config.provider === "kilocode") {
          logger.warn(
            "Kilocode generateText failed, trying openrouter fallback",
            {
              error:
                genError instanceof Error ? genError.message : String(genError),
            },
          );

          // Try openrouter as fallback
          const orConfig: Partial<LLMConfig> = {
            model: "minimax/minimax-m2.5:free",
            maxTokens: 500,
            temperature: 0.7,
          };
          const orResult = await factory.createProviderWithFallback(
            "openrouter",
            orConfig,
          );
          provider = orResult.provider;
          config = orResult.config;

          logger.info("Using openrouter fallback after kilocode failure", {
            model: config.model,
          });

          // Retry with openrouter
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
        // Log error details
        logger.error("=== PROVIDER ERROR DIRECT LOG ===");
        logger.error("Error:", genError);
        logger.error("Error type:", typeof genError);
        logger.error(
          "Error message:",
          genError && typeof genError === "object" && "message" in genError
            ? (genError as { message: string }).message
            : String(genError),
        );
        logger.error(
          "Error stack:",
          genError && typeof genError === "object" && "stack" in genError
            ? (genError as { stack: string }).stack
            : undefined,
        );
        logger.error("Full error object:", genError);
        logger.error("=================================");

        // Log detailed error from the provider - capture all details
        const errorDetails = {
          message:
            genError && typeof genError === "object" && "message" in genError
              ? (genError as { message: string }).message
              : String(genError),
          name:
            genError && typeof genError === "object" && "name" in genError
              ? (genError as { name: string }).name
              : "Unknown",
          stack:
            genError && typeof genError === "object" && "stack" in genError
              ? (genError as { stack: string }).stack
              : undefined,
        };

        logger.error("Provider generateText failed", {
          errorMessage: errorDetails.message,
          errorName: errorDetails.name,
          errorStack: errorDetails.stack,
          provider: config.provider,
          model: config.model,
          leadId: id,
        });

        throw new Error(`AI generation failed: ${errorDetails.message}`);
      }

      logger.info("AI response received", {
        leadId: id,
        contentLength: response.content?.length,
        hasToolCalls: !!response.toolCalls,
      });

      // Parse the response
      const content = response.content;

      // Try to extract JSON from response
      let parsed: { subject: string; body: string };
      try {
        // Try direct JSON parse first
        parsed = JSON.parse(content);
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find JSON-like structure
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            // Fallback: create structured response from plain text
            const lines = content.split("\n").filter((l: string) => l.trim());
            parsed = {
              subject: lines[0]?.replace(/^#+\s*/, "") || "Seguimiento",
              body: lines.slice(1).join("\n").trim() || content,
            };
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

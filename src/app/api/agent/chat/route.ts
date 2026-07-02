/**
 * POST /api/agent/chat — Agent chat endpoint with structured Block[] responses via SSE.
 *
 * Parallel to the legacy /api/admin/chat — does NOT modify it.
 *
 * Flow:
 *   1. Auth validation
 *   2-8. Rate-limited handler body (withRateLimit, 30 req/min)
 *   3. Tier quota check → 429/403
 *   4. Build AgentSession from body
 *   5. Execute memory loop (agent-loop.ts)
 *   6. Build 4-layer prompt + tools filtered by role
 *   7. Call agent.streamChatStructured() with SSE stream
 *   8. Events: event: block, event: done
 *
 * @module api/agent/chat
 */

import { NextRequest, NextResponse } from "next/server";

import { createAgent } from "@/lib/ai/agent/core";
import { buildSystemPrompt } from "@/lib/ai/agent/prompt-builder";
import { buildSession } from "@/lib/ai/agent/session";
import { executeMemoryLoop } from "@/lib/ai/memory/agent-loop";
import { getAllTools } from "@/lib/ai/tools";
import { appLogger as logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiting";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth validation
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acceso de administrador requerido" },
        { status: 403 },
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role, full_name")
      .eq("id", user.id)
      .single();

    // 2-8. Rate-limited handler body
    return withRateLimit({ limit: 30, windowMs: 60_000, keyPrefix: "agent" })(
      request,
      async () => {
        // 3. Tier quota check
        if (adminUser?.organization_id) {
          const { validateFeature } = await import("@/lib/saas/tier-validator");
          const hasChatIa = await validateFeature(
            adminUser.organization_id,
            "chat_ia",
          );
          if (!hasChatIa) {
            return NextResponse.json(
              {
                error:
                  "Chat IA no está incluido en tu plan. Actualiza a Pro o Premium para usar esta función.",
                code: "FEATURE_NOT_AVAILABLE",
              },
              { status: 403 },
            );
          }
        }

        // 4. Parse body and build session
        const body = await request.json();
        const sessionResult = buildSession(body);

        if ("status" in sessionResult && sessionResult.status === 400) {
          return NextResponse.json(
            { error: sessionResult.error },
            { status: 400 },
          );
        }

        // Narrow type after validation
        const session =
          sessionResult as import("@/lib/ai/agent/session").AgentSession;

        // 5. Execute memory loop (parallel) — using auth'd supabase from line 35
        const memoryContext = await executeMemoryLoop({
          message: session.message,
          orgId: session.context.orgId,
          supabase,
        });

        // 6. Filter tools by role + build prompt
        const tools = getAllTools(session.role);
        const systemPrompt = buildSystemPrompt({
          session,
          memoryContext,
          tools,
        });

        // 7. Resolve org ID and create agent with 30s LLM timeout
        const resolvedOrgId =
          adminUser?.organization_id || session.context.orgId;

        const agent = await createAgent({
          userId: user.id,
          sessionId: session.sessionId,
          organizationId: resolvedOrgId,
          config: {
            systemPrompt,
            enableToolCalling: true,
            maxTokens: 2048,
            // ponytail: hard 30s timeout — make configurable if per-provider needs differ
            temperature: 0.7,
          },
          currentBranchId: session.context.branchId,
          supabase,
          userData: {
            role: adminUser?.role || session.role,
            name: adminUser?.full_name || undefined,
          },
        });

        // 8. SSE stream with timeout
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let hasContent = false;

            // ponytail: 30s timeout — abort signal pattern if per-request cancellation needed
            const timeoutId = setTimeout(() => {
              logger.warn("Agent stream timed out after 30s", {
                sessionId: session.sessionId,
              });
              const errData = JSON.stringify({
                type: "error",
                content:
                  "Lo siento, no pude procesar tu solicitud. Intenta de nuevo.",
              });
              controller.enqueue(
                encoder.encode(`event: block\ndata: ${errData}\n\n`),
              );
              controller.enqueue(
                encoder.encode(
                  `event: done\ndata: ${JSON.stringify({ session_id: session.sessionId })}\n\n`,
                ),
              );
              controller.close();
            }, 30_000);

            try {
              for await (const result of agent.streamChatStructured(
                session.message,
                session.context,
              )) {
                clearTimeout(timeoutId);

                if (result.blocks && result.blocks.length > 0) {
                  hasContent = true;
                  for (const block of result.blocks) {
                    const data = JSON.stringify(block);
                    controller.enqueue(
                      encoder.encode(`event: block\ndata: ${data}\n\n`),
                    );
                  }
                }

                if (result.done) {
                  const doneData = JSON.stringify({
                    session_id: session.sessionId,
                  });
                  controller.enqueue(
                    encoder.encode(`event: done\ndata: ${doneData}\n\n`),
                  );
                  controller.close();
                  return;
                }
              }

              // Fallback if generator finished without emitting done
              if (!hasContent) {
                const data = JSON.stringify({
                  type: "text",
                  content: "Procesado.",
                });
                controller.enqueue(
                  encoder.encode(`event: block\ndata: ${data}\n\n`),
                );
              }
              controller.enqueue(
                encoder.encode(
                  `event: done\ndata: ${JSON.stringify({ session_id: session.sessionId })}\n\n`,
                ),
              );
              controller.close();
            } catch (err) {
              clearTimeout(timeoutId);
              logger.error("Agent stream error", { error: err });
              const errData = JSON.stringify({
                type: "error",
                content:
                  "Ocurrió un error al procesar tu solicitud. Intenta de nuevo.",
              });
              controller.enqueue(
                encoder.encode(`event: block\ndata: ${errData}\n\n`),
              );
              controller.enqueue(
                encoder.encode(
                  `event: done\ndata: ${JSON.stringify({ session_id: session.sessionId })}\n\n`,
                ),
              );
              controller.close();
            }
          },
        });

        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    );
  } catch (error) {
    logger.error("Agent chat API error", { error });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

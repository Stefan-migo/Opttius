import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAgent } from "@/lib/ai/agent/core";
import { LLMFactory } from "@/lib/ai/factory";
import type { LLMProvider, ToolCall } from "@/lib/ai/types";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

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

    // Tier feature: chat_ia must be enabled for the organization
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();
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

    const body = await request.json();
    const {
      message,
      provider,
      model,
      sessionId,
      config,
      section,
      currentBranchId,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Get user details for context
    const { data: userData } = await supabase
      .from("admin_users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = userData?.role === "super_admin";
    const userName =
      userData?.full_name || user.email?.split("@")[0] || "Usuario";

    let currentSessionId = sessionId;
    let sessionTitle: string | null = null;

    if (!currentSessionId) {
      // Default to DeepSeek which has more generous rate limits
      const providerToUse = provider || "deepseek";
      const modelToUse =
        model ||
        (providerToUse === "deepseek" ? "deepseek-chat" : "gemini-2.5-flash");

      const sessionResponse = await fetch(
        `${request.nextUrl.origin}/api/admin/chat/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            provider: providerToUse,
            model: modelToUse,
            title: null,
            config: config || null,
          }),
        },
      );

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        currentSessionId = sessionData.session.id;
      }
    }

    // Note: Agent is created inside tryWithProvider, not here
    // This prevents creating unused agents

    if (currentSessionId && !sessionTitle) {
      const firstWords = message.split(" ").slice(0, 5).join(" ");
      sessionTitle =
        firstWords.length > 50
          ? firstWords.substring(0, 50) + "..."
          : firstWords;

      await fetch(`${request.nextUrl.origin}/api/admin/chat/sessions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          title: sessionTitle,
        }),
      });
    }

    const { createServiceRoleClient } = await import("@/utils/supabase/server");
    const serviceSupabase = createServiceRoleClient();

    if (currentSessionId) {
      await serviceSupabase.from("chat_messages").insert({
        session_id: currentSessionId,
        role: "user",
        content: message,
      });
    }

    let assistantContent = "";
    const toolCalls: ToolCall[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const tryWithProvider = async (
          providerToTry: LLMProvider | undefined,
          modelToTry: string | undefined,
        ) => {
          let providerContent = "";
          const providerToolCalls: ToolCall[] = [];

          try {
            // Get organization details for specialized personality
            const { data: orgData } = await serviceSupabase
              .from("organizations")
              .select("name")
              .eq("id", adminUser?.organization_id)
              .single();

            // Get branch details if branch selected
            let branchName = "";
            let branchContext = "";
            if (currentBranchId && currentBranchId !== "global") {
              const { data: branchData } = await serviceSupabase
                .from("branches")
                .select("name")
                .eq("id", currentBranchId)
                .single();
              if (branchData) {
                branchName = branchData.name;
                branchContext = `SUCURSAL ACTUAL: ${branchName} (ID: ${currentBranchId})`;
              }
            } else if (currentBranchId === "global") {
              branchContext = "MODO: Vista Global (Todas las sucursales)";
            }

            const orgName = orgData?.name || "tu óptica";

            // Map section to context for agent config
            const contextMap: Record<string, string> = {
              dashboard: "analytics",
              inventory: "products",
              clients: "orders",
              pos: "orders",
              analytics: "analytics",
            };
            const agentContext = section ? contextMap[section] : undefined;

            // Enhance system prompt with section context and org name
            const baseConfig = config || {};
            let systemPrompt = baseConfig.systemPrompt || "";

            // Replace organization name placeholder if exists
            systemPrompt = systemPrompt.replace("[NOMBRE_OPTICA]", orgName);

            // If prompt is default/generic, make it feel more "managerial"
            const specializedIdentity = `Eres el Agente de Inteligencia de ${orgName}. No eres solo un asistente, eres el cerebro digital que ayuda a gestionar y optimizar cada aspecto de esta óptica. Habla con propiedad sobre "nuestros productos", "nuestros clientes" y "nuestras ventas". Tu objetivo es el éxito total de ${orgName}.
            
            IMPORTANTE: Te estás comunicando con ${userName} (${isSuperAdmin ? "Super Admin" : "Administrador"}). Trátalo con respeto pero de forma cercana.
            
            ${isSuperAdmin ? "NOTA SUPER ADMIN: Estás hablando con un Super Admin. Tienes permisos totales. Si te pide acciones sobre una sucursal específica y no está seleccionada, pregúntale sobre cuál actuar." : ""}`;

            const enhancedSystemPrompt = `${specializedIdentity}\n\n${section ? `ESTADO ACTUAL: El usuario está navegando en la sección de ${section === "dashboard" ? "Dashboard" : section === "inventory" ? "Inventario" : section === "clients" ? "Clientes" : section === "pos" ? "Punto de Venta" : "Analíticas"}.\n` : ""}\n${branchContext}\n${systemPrompt}`;

            const fallbackAgent = await createAgent({
              userId: user.id,
              provider: providerToTry,
              model: modelToTry,
              sessionId: currentSessionId,
              organizationId: adminUser?.organization_id,
              context: agentContext,
              config: {
                ...baseConfig,
                systemPrompt: enhancedSystemPrompt,
              },
              currentBranchId, // Pass branch context
              userData: {
                // Pass user context
                role: userData?.role,
                isSuperAdmin,
                name: userName,
              },
            });

            // Load session history if we have a session ID
            // This gives the agent memory of previous conversation turns
            if (currentSessionId) {
              await fallbackAgent.loadSessionHistory(currentSessionId);
              logger.debug("Session history loaded for agent", {
                sessionId: currentSessionId,
              });
            }

            for await (const chunk of fallbackAgent.streamChat(message)) {
              if (chunk.content) {
                providerContent += chunk.content;
                assistantContent += chunk.content;
                const data = JSON.stringify({
                  content: chunk.content,
                  done: false,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }

              if (chunk.toolCalls) {
                providerToolCalls.push(...chunk.toolCalls);
                toolCalls.push(...chunk.toolCalls);
              }

              if (chunk.done) {
                logger.debug("Stream done", {
                  contentLength: providerContent.length,
                  sessionId: currentSessionId,
                });
                if (currentSessionId && providerContent) {
                  await serviceSupabase.from("chat_messages").insert({
                    session_id: currentSessionId,
                    role: "assistant",
                    content: providerContent,
                    metadata:
                      providerToolCalls.length > 0
                        ? { toolCalls: providerToolCalls }
                        : null,
                  });
                }

                const data = JSON.stringify({
                  done: true,
                  sessionId: currentSessionId,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                controller.close();
                return true; // Success
              }
            }
            return true;
          } catch (error) {
            logger.error("Error with provider", {
              provider: providerToTry,
              error,
            });

            // Check if it's a rate limit error - don't retry in this case
            const errorMessage =
              (error instanceof Error ? error.message : String(error)) ||
              String(error);
            const isRateLimit =
              errorMessage.includes("Too Many Requests") ||
              errorMessage.includes("429") ||
              errorMessage.includes("rate limit") ||
              errorMessage.includes("RATE_LIMIT");

            if (isRateLimit) {
              // For rate limit errors, throw immediately to prevent fallback
              throw error;
            }

            // Reset content for next attempt (only for non-rate-limit errors)
            assistantContent = "";
            toolCalls.length = 0;
            return false; // Failed
          }
        };

        try {
          // Try with primary provider first
          const success = await tryWithProvider(
            provider as LLMProvider | undefined,
            model,
          );

          // If failed and provider is not already deepseek, try with deepseek
          // BUT only if it's not a rate limit error
          if (!success && provider !== "deepseek") {
            const errorMessage = assistantContent || "";
            const isRateLimit =
              errorMessage.includes("Too Many Requests") ||
              errorMessage.includes("429") ||
              errorMessage.includes("rate limit");

            if (!isRateLimit) {
              logger.warn(
                "Primary provider failed, attempting fallback to DeepSeek",
                { provider },
              );
              const fallbackMessage = JSON.stringify({
                content:
                  "\n\n⚠️ El proveedor principal falló. Intentando con DeepSeek...\n\n",
                done: false,
              });
              controller.enqueue(
                encoder.encode(`data: ${fallbackMessage}\n\n`),
              );

              const fallbackSuccess = await tryWithProvider(
                "deepseek",
                "deepseek-chat",
              );

              if (!fallbackSuccess) {
                const errorData = JSON.stringify({
                  error:
                    "Todos los proveedores fallaron. Por favor, verifica tus API keys.",
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                controller.close();
              }
            } else {
              // Rate limit error - don't retry, just show the error
              const errorData = JSON.stringify({
                error:
                  "Límite de solicitudes excedido. Por favor, espera unos momentos antes de intentar de nuevo.",
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              controller.close();
            }
          } else if (!success) {
            // If primary provider failed and we're already on deepseek, just show error
            const errorData = JSON.stringify({
              error:
                "Error procesando la solicitud. Por favor, verifica tus API keys.",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        } catch (error) {
          logger.error("Stream error", { error });
          const errorMessage =
            (error instanceof Error ? error.message : String(error)) ||
            "An error occurred";
          const isRateLimit =
            errorMessage.includes("Too Many Requests") ||
            errorMessage.includes("429") ||
            errorMessage.includes("rate limit");

          const errorData = JSON.stringify({
            error: isRateLimit
              ? "Límite de solicitudes excedido. Por favor, espera unos momentos antes de intentar de nuevo."
              : errorMessage,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Chat API error", { error });
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
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

    const factory = LLMFactory.getInstance();
    const availableProviders = factory.getAvailableProviders();

    return NextResponse.json({
      providers: availableProviders.map((provider) => ({
        id: provider,
        name: provider,
        enabled: factory.isProviderEnabled(provider),
      })),
    });
  } catch (error) {
    logger.error("Providers API error", { error });
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}

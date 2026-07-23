import { NextRequest, NextResponse } from "next/server";

import { LLMFactory } from "@/lib/ai/factory";
import type { LLMProvider } from "@/lib/ai/types";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

import { buildAgentContext, buildEnhancedPrompt, createAndStreamAgent, resolveOrgId } from "./_helpers/chatHelpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id } as IsAdminParams) as { data: IsAdminResult | null };
    if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { data: adminUser } = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single();
    if (adminUser?.organization_id) {
      const { validateFeature } = await import("@/lib/saas/tier-validator");
      if (!await validateFeature(adminUser.organization_id, "chat_ia")) return NextResponse.json({ error: "Chat IA no está incluido en tu plan. Actualiza a Pro o Premium para usar esta función.", code: "FEATURE_NOT_AVAILABLE" }, { status: 403 });
    }

    const body = await request.json();
    const { message, fileId, provider, model, sessionId, config, section, currentBranchId } = body;
    if (!message || typeof message !== "string") return NextResponse.json({ error: "Message is required" }, { status: 400 });

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const providerToUse = provider || "deepseek";
      const modelToUse = model || (providerToUse === "deepseek" ? "deepseek-chat" : "gemini-2.5-flash");
      const sessionRes = await fetch(`${request.nextUrl.origin}/api/admin/chat/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") || "" },
        body: JSON.stringify({ provider: providerToUse, model: modelToUse, title: null, config: config || null }),
      });
      if (sessionRes.ok) currentSessionId = (await sessionRes.json()).session.id;
    }

    if (currentSessionId && !body.sessionId) {
      const title = message.split(" ").slice(0, 5).join(" ").substring(0, 50);
      fetch(`${request.nextUrl.origin}/api/admin/chat/sessions`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") || "" },
        body: JSON.stringify({ sessionId: currentSessionId, title: title + (message.length > 50 ? "..." : "") }),
      });
    }

    if (currentSessionId) await supabase.from("chat_messages").insert({ session_id: currentSessionId, role: "user", content: message });

    const { orgName, branchContext, userName, isSuperAdmin, userData } = await buildAgentContext(supabase, user.id, adminUser, currentBranchId);
    const contextMap: Record<string, string> = { dashboard: "analytics", inventory: "products", clients: "orders", pos: "orders", analytics: "analytics" };
    const agentContext = section ? contextMap[section] : undefined;
    const baseConfig = config || {};
    let systemPrompt = baseConfig.systemPrompt || "";
    systemPrompt = systemPrompt.replace("[NOMBRE_OPTICA]", orgName);
    const enhancedPrompt = buildEnhancedPrompt(orgName, userName, isSuperAdmin, branchContext, section, systemPrompt, currentBranchId);
    const resolvedOrgId = await resolveOrgId(supabase, adminUser, currentBranchId);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const tryWithProvider = async (p: LLMProvider | undefined, m: string | undefined): Promise<boolean> => {
          try {
            const result = await createAndStreamAgent(supabase, user.id, p, m, currentSessionId, resolvedOrgId, agentContext, baseConfig, enhancedPrompt, currentBranchId, userData, isSuperAdmin, userName, fileId ? `[Archivo adjunto: fileId="${fileId}"]\n\n${message}` : message, controller, encoder);
            return result.success;
          } catch (error: unknown) {
            const msg = error.message || String(error);
            if (msg.includes("Too Many Requests") || msg.includes("429")) throw error; // Rate limit - don't fallback
            return false;
          }
        };

        try {
          const success = await tryWithProvider(provider as LLMProvider | undefined, model);
          if (!success && provider !== "deepseek") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "\n\n⚠️ El proveedor principal falló. Intentando con DeepSeek...\n\n", done: false })}\n\n`));
            const fallbackOk = await tryWithProvider("deepseek" as LLMProvider, "deepseek-chat");
            if (!fallbackOk) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Todos los proveedores fallaron." })}\n\n`)); controller.close(); }
          } else if (!success) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Error procesando la solicitud." })}\n\n`)); controller.close();
          }
        } catch (error: unknown) {
          const msg = error.message || String(error);
          const isRateLimit = msg.includes("Too Many Requests") || msg.includes("429") || msg.includes("rate limit");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: isRateLimit ? "Límite de solicitudes excedido." : msg })}\n\n`)); controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (error) {
    logger.error("Chat API error", { error });
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id } as IsAdminParams) as { data: IsAdminResult | null };
    if (!isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const factory = LLMFactory.getInstance();
    return NextResponse.json({ providers: factory.getAvailableProviders().map((p: string) => ({ id: p, name: p, enabled: factory.isProviderEnabled(p) })) });
  } catch (error) {
    logger.error("Providers API error", { error });
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Internal server error" }, { status: 500 });
  }
}

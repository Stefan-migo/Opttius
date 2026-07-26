import { createAgent } from "@/lib/ai/agent/core";
import type { Database, SupabaseClient } from "@/types/supabase";

export async function buildAgentContext(supabase: SupabaseClient<Database>, userId: string, adminUser: unknown, currentBranchId: string | null) {
  const { data: orgData } = await supabase.from("organizations").select("name").eq("id", adminUser?.organization_id).single();
  const orgName = orgData?.name || "tu óptica";

  let branchName = "";
  let branchContext = "";
  if (currentBranchId && currentBranchId !== "global") {
    const { data: branchData } = await supabase.from("branches").select("name").eq("id", currentBranchId).single();
    if (branchData) { branchName = branchData.name; branchContext = `SUCURSAL ACTUAL: ${branchName} (ID: ${currentBranchId})`; }
  } else if (currentBranchId === "global") branchContext = "MODO: Vista Global (Todas las sucursales)";

  const { data: userData } = await supabase.from("admin_users").select("role, full_name").eq("id", userId).single();
  let userName = userData?.full_name?.trim() || supabase.user?.email?.split("@")[0] || "Usuario";
  if (!userData?.full_name?.trim()) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
    if (profile?.full_name?.trim()) userName = profile.full_name.trim();
  }
  const isSuperAdmin = userData?.role === "super_admin";

  return { orgName, branchContext, userName, isSuperAdmin, userData };
}

export function buildEnhancedPrompt(orgName: string, userName: string, isSuperAdmin: boolean, branchContext: string, section: string | null, systemPrompt: string, currentBranchId: string | null) {
  const specializedIdentity = `Eres el Agente de Inteligencia de ${orgName}. Habla con propiedad sobre "nuestros productos", "nuestros clientes" y "nuestras ventas". Tu objetivo es el éxito total de ${orgName}.\n\nIMPORTANTE: Te estás comunicando con ${userName} (${isSuperAdmin ? "Super Admin" : "Administrador"}). ${isSuperAdmin ? "NOTA SUPER ADMIN: Estás hablando con un Super Admin. Tienes permisos totales." : ""}`;
  const branchInstruction = isSuperAdmin && (currentBranchId === "global" || !currentBranchId) ? "\n\nIMPORTANTE SUCURSAL: El usuario tiene vista global. Para cualquier acción que afecte una sucursal, DEBES preguntar primero en qué sucursal realizarla." : "";
  const today = new Date().toISOString().split("T")[0];
  const dateContext = `FECHA ACTUAL: ${today} (YYYY-MM-DD). Usa SIEMPRE esta fecha para citas y cualquier referencia temporal. NO preguntes "para qué año".`;
  const sectionMap: Record<string, string> = { dashboard: "Dashboard", inventory: "Inventario", clients: "Clientes", pos: "Punto de Venta", analytics: "Analíticas" };
  const sectionContext = section ? `\n\nESTADO ACTUAL: El usuario está navegando en la sección de ${sectionMap[section] || section}.` : "";
  return `${specializedIdentity}\n\n${dateContext}${sectionContext}\n${branchContext}${branchInstruction}\n${systemPrompt}`;
}

export async function resolveOrgId(supabase: SupabaseClient<Database>, adminUser: unknown, currentBranchId: string | null): Promise<string | null> {
  let resolvedOrgId = adminUser?.organization_id;
  if (!resolvedOrgId && currentBranchId && currentBranchId !== "global") {
    const { data: branchRow } = await supabase.from("branches").select("organization_id").eq("id", currentBranchId).single();
    if (branchRow?.organization_id) resolvedOrgId = branchRow.organization_id;
  }
  return resolvedOrgId;
}

export async function createAndStreamAgent(supabase: SupabaseClient<Database>, userId: string, provider: string | undefined, model: string | undefined, sessionId: string | null, organizationId: string | null, context: string | undefined, baseConfig: unknown, enhancedPrompt: string, currentBranchId: string | null, userData: unknown, isSuperAdmin: boolean, userName: string, message: string, controller: ReadableStreamDefaultController, encoder: TextEncoder): Promise<{ content: string; toolCalls: unknown[]; success: boolean }> {
  let content = "";
  const toolCalls: unknown[] = [];

  const agent = await createAgent({
    userId, provider, model, sessionId: sessionId || undefined, organizationId, context,
    config: { ...baseConfig, systemPrompt: enhancedPrompt },
    currentBranchId, supabase,
    userData: { role: userData?.role, isSuperAdmin, name: userName },
  });

  if (sessionId) await agent.loadSessionHistory(sessionId);

  const msgToSend = message; // File attachment handling simplified
  for await (const chunk of agent.streamChat(msgToSend)) {
    if (chunk.content) { content += chunk.content; controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content, done: false })}\n\n`)); }
    if (chunk.toolCalls) toolCalls.push(...chunk.toolCalls);
    if (chunk.done) {
      if (sessionId && content) {
        await supabase.from("chat_messages").insert({ session_id: sessionId, role: "assistant", content, metadata: toolCalls.length > 0 ? { toolCalls } : null });
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
      controller.close();
      return { content, toolCalls, success: true };
    }
  }
  return { content, toolCalls, success: true };
}

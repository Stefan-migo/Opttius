/**
 * Session Manager: getOrCreateWhatsAppSession(wa_id, org_id)
 * Crea o recupera chat_sessions para conversaciones WhatsApp
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { appLogger as logger } from "@/lib/logger";

const DEFAULT_PROVIDER = "deepseek";
const DEFAULT_MODEL = "deepseek-chat";

/**
 * Obtiene o crea una sesión de chat para WhatsApp
 * Sesiones por (wa_id, organization_id) con metadata { channel: "whatsapp", wa_id }
 */
export async function getOrCreateWhatsAppSession(
  waId: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const metadata = {
    channel: "whatsapp" as const,
    wa_id: waId,
    organization_id: organizationId,
  };

  // Buscar sesión existente (wa_id + org)
  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("id")
    .is("user_id", null)
    .eq("metadata->>channel", "whatsapp")
    .eq("metadata->>wa_id", waId)
    .eq("metadata->>organization_id", organizationId)
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // Crear nueva sesión (user_id NULL para WhatsApp)
  const { data: inserted, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: null,
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      title: `WhatsApp ${waId}`,
      metadata,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to create WhatsApp chat session", {
      waId,
      organizationId,
      error: error.message,
    });
    return null;
  }

  return inserted?.id ?? null;
}

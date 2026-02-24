/**
 * Notificaciones B2B: Opttius → Dueño de óptica
 * Usa número oficial de Opttius (env WHATSAPP_PHONE_NUMBER_ID)
 */

import { WhatsAppClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appLogger as logger } from "@/lib/logger";

/** Normaliza teléfono para envío (solo dígitos, sin +) */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Obtiene el teléfono del dueño/admin de la organización para notificaciones B2B
 * Prioridad: system_config whatsapp_notification_phone > profiles.phone del owner/admin
 */
export async function getOrgOwnerPhoneForWhatsApp(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: config } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", "whatsapp_notification_phone")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (config?.config_value && typeof config.config_value === "string") {
    const phone = config.config_value.trim();
    if (phone.length >= 8) return normalizePhone(phone);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .single();

  const ownerId = org?.owner_id;
  if (ownerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", ownerId)
      .single();
    if (profile?.phone) return normalizePhone(profile.phone);
  }

  const { data: admins } = await supabase
    .from("admin_users")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["admin", "super_admin"])
    .limit(3);

  for (const admin of admins || []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", admin.id)
      .single();
    if (profile?.phone) return normalizePhone(profile.phone);
  }

  return null;
}

/**
 * Envía alerta de inventario bajo por WhatsApp al dueño
 */
export async function sendLowStockAlertWhatsApp(
  organizationId: string,
  products: Array<{ name: string; current_stock: number; min_stock: number }>,
  supabase: SupabaseClient,
): Promise<boolean> {
  const phone = await getOrgOwnerPhoneForWhatsApp(organizationId, supabase);
  if (!phone) return false;

  const client = WhatsAppClient.fromEnv();
  if (!client) return false;

  const lines = products
    .slice(0, 10)
    .map(
      (p) => `• ${p.name}: ${p.current_stock} unidades (mín: ${p.min_stock})`,
    );
  const body = `⚠️ Alerta de inventario bajo\n\n${lines.join("\n")}\n\nRevisa tu stock en Opttius.`;

  try {
    await client.sendText(phone, body);
    return true;
  } catch (e) {
    logger.error("WhatsApp B2B low stock send failed", {
      organizationId,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Envía recordatorio de cita por WhatsApp al dueño (o al cliente si preferred_contact_method)
 */
export async function sendAppointmentReminderWhatsApp(
  toPhone: string,
  message: string,
): Promise<boolean> {
  const client = WhatsAppClient.fromEnv();
  if (!client) return false;

  const phone = normalizePhone(toPhone);
  if (phone.length < 8) return false;

  try {
    await client.sendText(phone, message);
    return true;
  } catch (e) {
    logger.error("WhatsApp B2B appointment reminder send failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Envía resumen de presupuesto por WhatsApp al cliente
 */
export async function sendQuoteWhatsApp(
  toPhone: string,
  quoteNumber: string,
  totalAmount: number,
  currency: string = "CLP",
): Promise<boolean> {
  const client = WhatsAppClient.fromEnv();
  if (!client) return false;

  const phone = normalizePhone(toPhone);
  if (phone.length < 8) return false;

  const formatted = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(totalAmount);

  const body = `Tu presupuesto ${quoteNumber} está listo. Total: ${formatted}. Te enviamos el detalle por email. Responde si tienes dudas.`;

  try {
    await client.sendText(phone, body);
    return true;
  } catch (e) {
    logger.error("WhatsApp quote send failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Envía "Tu orden está lista" por WhatsApp al cliente
 */
export async function sendWorkOrderReadyWhatsApp(
  toPhone: string,
  workOrderNumber: string,
  branchName?: string,
): Promise<boolean> {
  const client = WhatsAppClient.fromEnv();
  if (!client) return false;

  const phone = normalizePhone(toPhone);
  if (phone.length < 8) return false;

  const branch = branchName ? ` en ${branchName}` : "";
  const body = `¡Buenas noticias! Tu orden ${workOrderNumber} está lista para retiro${branch}. Te esperamos.`;

  try {
    await client.sendText(phone, body);
    return true;
  } catch (e) {
    logger.error("WhatsApp work order ready send failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

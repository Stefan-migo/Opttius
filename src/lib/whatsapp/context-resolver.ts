/**
 * Context Resolver: phone_number_id + wa_id → organization_id, branch_id, role
 * Resuelve quién escribe (admin o customer) y a qué organización pertenece
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { appLogger as logger } from "@/lib/logger";

export interface WhatsAppContext {
  waId: string;
  organizationId: string;
  branchId: string | null;
  phoneNumberId: string;
  userId?: string;
  customerId?: string;
  role: "admin" | "customer";
}

/**
 * Normaliza wa_id o teléfono para comparación E.164-like
 * Meta wa_id: 56912345678 (sin +)
 * customers.phone puede tener +56, espacios, guiones
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normaliza para comparación: ambos a dígitos.
 * Chile: si es 9 dígitos empezando en 9, se considera 56+9 dígitos
 */
function normalizeForComparison(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) {
    return "56" + digits;
  }
  return digits;
}

/**
 * Resuelve el contexto de un mensaje WhatsApp entrante
 * 1. phone_number_id → whatsapp_phone_numbers → organization_id
 * 2. wa_id → customers (phone) o admin_users+profiles (phone) → role, branch_id
 */
export async function resolveWhatsAppContext(
  waId: string,
  phoneNumberId: string,
  supabase: SupabaseClient
): Promise<WhatsAppContext | null> {
  const normalizedWaId = normalizeForComparison(waId);

  // 1. Resolver organization_id desde phone_number_id
  const { data: wpn, error: wpnError } = await supabase
    .from("whatsapp_phone_numbers")
    .select("organization_id")
    .eq("phone_number_id", phoneNumberId)
    .single();

  if (wpnError || !wpn) {
    logger.warn("WhatsApp context: phone_number_id not found", {
      phoneNumberId,
      error: wpnError?.message,
    });
    return null;
  }

  const organizationId = wpn.organization_id;

  // 2. Buscar si wa_id es un customer (phone en customers de esa org)
  const { data: customers } = await supabase
    .from("customers")
    .select("id, branch_id, phone")
    .eq("organization_id", organizationId)
    .not("phone", "is", null);

  const matchingCustomer = customers?.find((c) => {
    if (!c.phone) return false;
    const normalized = normalizeForComparison(c.phone);
    return normalized === normalizedWaId;
  });

  if (matchingCustomer) {
    return {
      waId,
      organizationId,
      branchId: matchingCustomer.branch_id,
      phoneNumberId,
      customerId: matchingCustomer.id,
      role: "customer",
    };
  }

  // 3. Buscar si wa_id es un admin (profiles.phone + admin_users)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, phone")
    .not("phone", "is", null);

  const matchingProfile = profiles?.find((p) => {
    if (!p.phone) return false;
    const normalized = normalizeForComparison(p.phone);
    return normalized === normalizedWaId;
  });

  if (matchingProfile) {
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, organization_id")
      .eq("id", matchingProfile.id)
      .eq("is_active", true)
      .single();

    if (adminUser && adminUser.organization_id === organizationId) {
      const { data: branchAccess } = await supabase
        .from("admin_branch_access")
        .select("branch_id")
        .eq("admin_user_id", adminUser.id)
        .eq("is_primary", true)
        .limit(1)
        .single();

      return {
        waId,
        organizationId,
        branchId: branchAccess?.branch_id ?? null,
        phoneNumberId,
        userId: adminUser.id,
        role: "admin",
      };
    }
  }

  // 4. No encontrado: tratar como customer anónimo (solo org conocida)
  // El adapter puede responder con mensaje "Contacta a la sucursal"
  return {
    waId,
    organizationId,
    branchId: null,
    phoneNumberId,
    role: "customer",
  };
}

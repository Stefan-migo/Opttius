/**
 * Organization info for email branding with fallbacks from system_config.
 * - Display Name: metadata.email_display_name || org.name
 * - Reply-To: metadata.support_email || system_config.contact_email
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

export interface OrgInfoForEmail {
  name: string | null;
  metadata: Record<string, unknown> | null;
  /** Resolved reply-to: metadata.support_email || contact_email from config */
  resolvedSupportEmail: string;
  /** Resolved display name: metadata.email_display_name || org.name */
  resolvedDisplayName: string | undefined;
}

const DEFAULT_REPLY_TO = "contacto@opttius.cl";

export async function getOrganizationInfoWithFallbacks(
  organizationId?: string,
  supabase?: SupabaseClient,
): Promise<OrgInfoForEmail | null> {
  if (!organizationId) return null;

  try {
    const client = supabase ?? createServiceRoleClient();
    const { data: org } = await client
      .from("organizations")
      .select("name, metadata")
      .eq("id", organizationId)
      .single();

    if (!org) return null;

    const meta = (org.metadata as Record<string, unknown>) || {};
    const metaSupportEmail = meta.support_email as string | undefined;
    const metaDisplayName = meta.email_display_name as string | undefined;

    let contactEmailFromConfig = "";
    if (!metaSupportEmail?.trim()) {
      // Fetch contact_email from system_config: org-level first, then global
      const { data: orgConfig } = await client
        .from("system_config")
        .select("config_value")
        .eq("config_key", "contact_email")
        .eq("organization_id", organizationId)
        .maybeSingle();

      const { data: globalConfig } = orgConfig
        ? { data: null }
        : await client
            .from("system_config")
            .select("config_value")
            .eq("config_key", "contact_email")
            .is("organization_id", null)
            .maybeSingle();

      const row = orgConfig ?? globalConfig;
      if (row?.config_value != null) {
        contactEmailFromConfig =
          typeof row.config_value === "string"
            ? row.config_value
            : String(row.config_value);
      }
    }

    const resolvedSupportEmail =
      metaSupportEmail?.trim() ||
      contactEmailFromConfig.trim() ||
      DEFAULT_REPLY_TO;
    const resolvedDisplayName =
      metaDisplayName?.trim() || org.name?.trim() || undefined;

    return {
      name: org.name ?? null,
      metadata: meta,
      resolvedSupportEmail,
      resolvedDisplayName,
    };
  } catch (error) {
    logger.error("Error fetching organization info for email:", error);
    return null;
  }
}

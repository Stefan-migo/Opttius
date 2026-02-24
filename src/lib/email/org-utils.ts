/**
 * Organization info for email branding with fallbacks from system_config.
 * - Display Name: metadata.email_display_name || org.name
 * - Reply-To: metadata.support_email || system_config.contact_email
 */

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
): Promise<OrgInfoForEmail | null> {
  if (!organizationId) return null;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
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
      const { data: orgConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "contact_email")
        .eq("organization_id", organizationId)
        .maybeSingle();

      const { data: globalConfig } = orgConfig
        ? { data: null }
        : await supabase
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
    console.error("Error fetching organization info for email:", error);
    return null;
  }
}

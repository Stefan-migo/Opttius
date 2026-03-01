import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  is_active: boolean;
}

/**
 * Load email template from database by type
 * Returns the active template for the given type, or null if not found
 * SERVER-ONLY: This function requires server-side access
 */
export async function loadEmailTemplate(
  type: string,
  useServiceRole: boolean = false,
  organizationId?: string,
  category?: "saas" | "organization",
): Promise<EmailTemplate | null> {
  try {
    const supabase = useServiceRole
      ? createServiceRoleClient()
      : await createClient();

    // Strategy: Org override (is_active=false) = disabled for that org. Otherwise: org-specific first, then system default.
    if (organizationId) {
      const { data: orgOverride } = await supabase
        .from("system_email_templates")
        .select("id, is_active")
        .eq("type", type)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (orgOverride && orgOverride.is_active === false) {
        return null;
      }
    }

    let query = supabase
      .from("system_email_templates")
      .select("*")
      .eq("type", type)
      .eq("is_active", true);

    if (category) {
      query = query.eq("category", category);
    }

    if (organizationId) {
      query = query.or(
        `organization_id.eq.${organizationId},organization_id.is.null`,
      );
    } else {
      query = query.is("organization_id", null);
    }

    const { data: templates, error } = await query.order("organization_id", {
      ascending: false,
      nullsFirst: false,
    });

    if (error || !templates || templates.length === 0) {
      console.warn(`⚠️ No active template found for type: ${type}`);
      return null;
    }

    const template = templates[0];

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: Array.isArray(template.variables)
        ? template.variables
        : typeof template.variables === "string"
          ? JSON.parse(template.variables)
          : [],
      is_active: template.is_active,
    };
  } catch (error) {
    console.error(`Error loading email template for type ${type}:`, error);
    return null;
  }
}

/**
 * Increment usage count for a template
 * SERVER-ONLY: This function requires server-side access
 */
export async function incrementTemplateUsage(
  templateId: string,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Get current usage count
    const { data: template } = await supabase
      .from("system_email_templates")
      .select("usage_count")
      .eq("id", templateId)
      .single();

    // Update usage count and last_used_at
    await supabase
      .from("system_email_templates")
      .update({
        usage_count: (template?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", templateId);
  } catch (error) {
    console.error("Error incrementing template usage:", error);
    // Don't fail email sending if usage tracking fails
  }
}

// Re-export client-side utilities for convenience
export {
  replaceTemplateVariables,
  getDefaultVariables,
  formatOrderItemsHTML,
  formatOrderItemsText,
} from "./template-utils";

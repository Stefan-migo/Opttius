/**
 * SaaS admin notification email templates — terms, maintenance, usage, features
 */
import { sendEmail } from "../client";
import { incrementTemplateUsage, loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

export async function sendSaaSTermsUpdate(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  terms_url: string,
  acceptance_url: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_terms_update", true);

    if (!template) {
      console.warn("⚠️ No saas_terms_update template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      terms_url: terms_url,
      acceptance_url: acceptance_url,
      support_email: "legal@opttius.cl",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "legal@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending terms update:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSaaSMaintenanceNotice(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  maintenance_start: string,
  maintenance_end: string,
  affected_services: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_maintenance", true);

    if (!template) {
      console.warn("⚠️ No saas_maintenance template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      maintenance_start: maintenance_start,
      maintenance_end: maintenance_end,
      affected_services: affected_services.join(", "),
      status_url: `${process.env.NEXT_PUBLIC_APP_URL}/status`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending maintenance notice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSaaSUsageAlert(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  resource_type: string,
  current_usage: number,
  limit_usage: number,
  percentage_used: number,
  upgrade_url?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_usage_alert", true);

    if (!template) {
      console.warn("⚠️ No saas_usage_alert template found");
      return { success: false, error: "Template not found" };
    }

    const resourceLabels: Record<string, string> = {
      users: "Usuarios",
      storage: "Almacenamiento",
      appointments: "Citas",
      customers: "Clientes",
      invoices: "Facturas",
    };

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      resource_type: resourceLabels[resource_type] || resource_type,
      current_usage: current_usage.toString(),
      limit_usage: limit_usage.toString(),
      percentage_used: percentage_used.toString(),
      upgrade_url:
        upgrade_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/plans`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending usage alert:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSaaSFeatureAnnouncement(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  feature_name: string,
  feature_description: string,
  feature_url: string,
  release_date: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_feature_announcement", true);

    if (!template) {
      console.warn("⚠️ No saas_feature_announcement template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      feature_name: feature_name,
      feature_description: feature_description,
      feature_url: feature_url,
      release_date: release_date,
      docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/features`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "producto@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending feature announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

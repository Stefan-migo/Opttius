import { sendEmail } from "../client";
import { loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send SaaS Notification
export async function sendSaaSNotification(
  type: string,
  recipients: string | string[],
  variables: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate(type, true); // No organizationId means SaaS level

    if (!template) {
      return { success: false, error: "SaaS template not found" };
    }

    const allVariables = {
      ...getDefaultVariables(), // Default system branding (Opttius)
      ...variables,
    };

    const subject = replaceTemplateVariables(template.subject, allVariables);
    let html = replaceTemplateVariables(template.content, allVariables);

    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      organizationName: "Opttius",
      organizationColor: "#1e40af",
      previewText: subject,
    });

    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const result = await sendEmail({
      to: recipients,
      subject,
      html,
      text,
    });

    if (result.success && template.id) {
      const { incrementTemplateUsage } = await import("../template-loader");
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error(`Error sending SaaS notification (${type}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send membership welcome email using DB template
export async function sendMembershipWelcome(
  customerName: string,
  customerEmail: string,
  membershipType: string,
  accessUrl: string,
  startDate?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("membership_welcome", true);

    if (!template) {
      console.warn(
        "⚠️ No active membership_welcome template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const variables = {
      ...getDefaultVariables(),
      customer_name: customerName,
      membership_tier: membershipType,
      membership_start_date:
        startDate ||
        new Date().toLocaleDateString("es-AR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      access_url: accessUrl,
      duration: "7 meses",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const result = await sendEmail({
      to: customerEmail,
      subject,
      html,
      text,
    });

    if (result.success) {
      const { incrementTemplateUsage } = await import("../template-loader");
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending membership welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send membership reminder email using DB template
export async function sendMembershipReminder(
  customerName: string,
  customerEmail: string,
  membershipType: string,
  daysRemaining: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("membership_reminder", true);

    if (!template) {
      console.warn(
        "⚠️ No active membership_reminder template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const variables = {
      ...getDefaultVariables(),
      customer_name: customerName,
      membership_tier: membershipType,
      days_remaining: daysRemaining.toString(),
      renewal_url: `${getDefaultVariables().website_url}/membresias`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const result = await sendEmail({
      to: customerEmail,
      subject,
      html,
      text,
    });

    if (result.success) {
      const { incrementTemplateUsage } = await import("../template-loader");
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending membership reminder email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

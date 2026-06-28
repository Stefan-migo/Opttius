import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { incrementTemplateUsage, loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send account welcome email using DB template
export async function sendAccountWelcome(
  customerName: string,
  customerEmail: string,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "account_welcome",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active account_welcome template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: customerName,
      account_url: `${getDefaultVariables().website_url}/mi-cuenta`,
      organization_name: orgInfo?.name || "Nuestra Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);

    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      organizationName: orgInfo?.name || "Nuestra Óptica",
      organizationColor:
        typeof orgInfo?.metadata?.primary_color === "string"
          ? orgInfo.metadata.primary_color
          : "#1e40af",
      previewText: `Bienvenido a ${orgInfo?.name || "Nuestra Óptica"}`,
    });

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
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending account welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send password reset email using DB template
export async function sendPasswordReset(
  customerEmail: string,
  resetLink: string,
  customerName?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("password_reset", true);

    if (!template) {
      console.warn(
        "⚠️ No active password_reset template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const variables = {
      ...getDefaultVariables(),
      customer_name: customerName || "Usuario",
      reset_link: resetLink,
      reset_url: resetLink,
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
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

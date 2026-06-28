import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send prescription ready
export async function sendPrescriptionReady(
  prescription: unknown,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "prescription_ready",
      true,
      organizationId,
    );

    if (!template) return { success: false, error: "Template not found" };

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: prescription.customer_name || "Cliente",
      prescription_date: prescription.date,
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
      previewText: `Tu receta de fecha ${prescription.date} está disponible`,
    });

    return await sendEmail({
      to: prescription.customer_email,
      subject,
      html,
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });
  } catch (error) {
    console.error("Error sending prescription email:", error);
    return { success: false, error: "Error sending email" };
  }
}

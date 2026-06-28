import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send work order ready
export async function sendWorkOrderReady(
  workOrder: unknown,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "work_order_ready",
      true,
      organizationId,
    );

    if (!template) return { success: false, error: "Template not found" };

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: workOrder.customer_name || "Cliente",
      work_order_number: workOrder.work_order_number,
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
      previewText: `Tu trabajo #${workOrder.work_order_number} está listo para retirar`,
    });

    return await sendEmail({
      to: workOrder.customer_email,
      subject,
      html,
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });
  } catch (error) {
    console.error("Error sending work order email:", error);
    return { success: false, error: "Error sending email" };
  }
}

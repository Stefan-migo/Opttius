import { formatCurrency } from "./types";
import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send quote sent
export async function sendQuoteSent(
  quote: unknown,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "quote_sent",
      true,
      organizationId,
    );

    if (!template) return { success: false, error: "Template not found" };

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: quote.customer_name || "Cliente",
      quote_number: quote.quote_number,
      quote_date: quote.date,
      quote_total: formatCurrency(quote.total_amount),
      quote_expiry: quote.expiry_date,
      quote_items: quote.items_html || "",
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
      previewText: `Presupuesto disponible #${quote.quote_number}`,
    });

    return await sendEmail({
      to: quote.customer_email,
      subject,
      html,
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });
  } catch (error) {
    console.error("Error sending quote email:", error);
    return { success: false, error: "Error sending email" };
  }
}

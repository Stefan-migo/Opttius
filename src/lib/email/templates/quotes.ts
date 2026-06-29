/**
 * Quote email templates for optical shops
 */
import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
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

export interface QuoteData {
  id: string;
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  quote_number: string;
  date: string;
  expiry_date: string;
  valid_days?: number;
  items?: Array<{
    description: string;
    amount: string;
  }>;
  subtotal?: string;
  discount?: string;
  discount_percentage?: string;
  iva?: string;
  total?: string;
  deposit_required?: string;
  products?: string;
  services?: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  branch_email?: string;
  quote_url?: string;
  accept_url?: string;
  reject_url?: string;
  payment_url?: string;
}

export async function sendQuoteSent(
  quote: QuoteData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "quote_sent",
      true,
      organizationId,
    );

    if (!template) {
      console.warn("⚠️ No active quote_sent template found, skipping email");
      return { success: false, error: "Template not found" };
    }

    if (!quote.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const itemsTable = quote.items
      ? quote.items
          .map(
            (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #374151;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #374151;">${item.amount}</td>
        </tr>
      `,
          )
          .join("")
      : "";

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: quote.customer_name || "Cliente",
      customer_first_name: quote.customer_first_name || "Cliente",
      quote_number: quote.quote_number,
      quote_date: quote.date,
      quote_expiry: quote.expiry_date,
      quote_expiry_date: quote.expiry_date,
      valid_days: quote.valid_days?.toString() || "30",
      quote_items: itemsTable,
      items_table: itemsTable,
      subtotal: quote.subtotal || "",
      discount: quote.discount || "",
      discount_percentage: quote.discount_percentage || "",
      iva: quote.iva || "",
      total: quote.total || "",
      deposit_required: quote.deposit_required || "",
      products: quote.products || "",
      services: quote.services || "",
      branch_name: quote.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: quote.branch_address || "",
      branch_phone: quote.branch_phone || "",
      branch_email: quote.branch_email || "",
      quote_url: quote.quote_url || "",
      accept_url: quote.accept_url || "",
      reject_url: quote.reject_url || "",
      payment_url: quote.payment_url || "",
      organization_name: orgInfo?.name || "Nuestra Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);

    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      organizationName: orgInfo?.name || "Nuestra Óptica",
      organizationColor:
        (orgInfo?.metadata as { primary_color?: string })?.primary_color ||
        "#1e40af",
      previewText: `Presupuesto #${quote.quote_number} disponible`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: quote.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending quote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendQuoteExpiring(
  quote: QuoteData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "quote_expiring",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active quote_expiring template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!quote.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: quote.customer_name || "Cliente",
      customer_first_name: quote.customer_first_name || "Cliente",
      quote_number: quote.quote_number,
      quote_expiry_date: quote.expiry_date,
      total: quote.total || "",
      accept_url: quote.accept_url || "",
      quote_url: quote.quote_url || "",
      branch_phone: quote.branch_phone || "",
      branch_email: quote.branch_email || "",
      organization_name: orgInfo?.name || "Nuestra Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);

    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      organizationName: orgInfo?.name || "Nuestra Óptica",
      organizationColor:
        (orgInfo?.metadata as { primary_color?: string })?.primary_color ||
        "#1e40af",
      previewText: `Tu presupuesto #${quote.quote_number} vence pronto`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: quote.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending quote expiring:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { incrementTemplateUsage, loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send low stock alert to admins using DB template
export async function sendLowStockAlert(
  adminEmails: string[],
  products: Array<{ name: string; current_stock: number; min_stock: number }>,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "low_stock_alert",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active low_stock_alert template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const productsHTML = products
      .map(
        (p) => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${p.name}</strong><br>
          Stock actual: ${p.current_stock} | Stock mínimo: ${p.min_stock}
        </div>
      `,
      )
      .join("");

    const productsText = products
      .map(
        (p) =>
          `${p.name} - Stock actual: ${p.current_stock} | Stock mínimo: ${p.min_stock}`,
      )
      .join("\n");

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      low_stock_products: productsHTML,
      low_stock_products_text: productsText,
      product_count: products.length.toString(),
      organization_name: orgInfo?.name || "Tu Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Send to all admin emails
    const results = await Promise.all(
      adminEmails.map((email) =>
        sendEmail({
          to: email,
          subject,
          html,
          text,
          replyTo: orgInfo?.resolvedSupportEmail,
          fromDisplayName: orgInfo?.resolvedDisplayName,
        }),
      ),
    );

    if (results.some((r) => r.success)) {
      await incrementTemplateUsage(template.id);
    }

    return {
      success: results.some((r) => r.success),
      error: results.every((r) => !r.success)
        ? "Failed to send to all recipients"
        : undefined,
    };
  } catch (error) {
    console.error("Error sending low stock alert:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

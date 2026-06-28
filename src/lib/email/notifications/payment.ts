import type { Order } from "./types";
import { formatCurrency, getPaymentMethodLabel } from "./types";
import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { incrementTemplateUsage, loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send payment success notification (using custom template or fallback)
export async function sendPaymentSuccess(
  order: Order & { organization_id?: string },
  transactionId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = order.organization_id;
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);

    // Try to use custom template first, fallback to order_confirmation if not found
    let template = await loadEmailTemplate(
      "payment_success",
      true,
      organizationId,
    );

    if (!template) {
      // Fallback to order confirmation
      template = await loadEmailTemplate(
        "order_confirmation",
        true,
        organizationId,
      );
    }

    if (!template) {
      console.warn("⚠️ No active payment template found, skipping email");
      return { success: false, error: "No active template found" };
    }

    const customerEmail = order.user_email || order.email;
    if (!customerEmail) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: order.customer_name || "Cliente",
      order_number: order.order_number,
      amount: formatCurrency(order.total_amount, order.currency),
      payment_method: getPaymentMethodLabel(order.payment_method),
      transaction_id: transactionId || order.payment_id || "N/A",
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
      previewText: `Pago recibido para la orden ${order.order_number}`,
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

    if (result.success && template) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending payment success email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send payment failed notification
export async function sendPaymentFailed(
  order: Order & { organization_id?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = order.organization_id;
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "payment_failed",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active payment_failed template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const customerEmail = order.user_email || order.email;
    if (!customerEmail) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: order.customer_name || "Cliente",
      order_number: order.order_number,
      amount: formatCurrency(order.total_amount, order.currency),
      payment_method: getPaymentMethodLabel(order.payment_method),
      organization_name: orgInfo?.name || "Nuestra Óptica",
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
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending payment failed email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

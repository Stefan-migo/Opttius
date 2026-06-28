import type { Order } from "./types";
import { formatCurrency, getPaymentMethodLabel } from "./types";
import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { incrementTemplateUsage, loadEmailTemplate } from "../template-loader";
import {
  formatOrderItemsHTML,
  formatOrderItemsText,
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send order confirmation email using DB template
export async function sendOrderConfirmation(
  order: Order & { organization_id?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = order.organization_id;
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);

    const template = await loadEmailTemplate(
      "order_confirmation",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active order_confirmation template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const customerEmail = order.user_email || order.email;
    if (!customerEmail) {
      return { success: false, error: "No customer email found" };
    }

    const orderDate = new Date(order.created_at).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const orderCurrency = order.currency || "CLP";
    const orderItemsHTML = formatOrderItemsHTML(order.items, orderCurrency);
    const orderItemsText = formatOrderItemsText(order.items, orderCurrency);

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: order.customer_name || "Cliente",
      order_number: order.order_number,
      order_date: orderDate,
      order_total: formatCurrency(order.total_amount, order.currency),
      order_items: orderItemsHTML,
      payment_method: getPaymentMethodLabel(order.payment_method),
      order_items_text: orderItemsText,
      organization_name: orgInfo?.name || "Nuestra Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);

    // Wrap in modern layout if it's not already a full HTML document or if we want to enforce it
    // For now, we'll wrap it to ensure the "Modern" default look.
    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      organizationName: orgInfo?.name || "Nuestra Óptica",
      organizationColor:
        typeof orgInfo?.metadata?.primary_color === "string"
          ? orgInfo.metadata.primary_color
          : "#1e40af",
      previewText: `Confirmación de tu orden ${order.order_number}`,
    });

    // Generate plain text version (basic HTML to text conversion)
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
    console.error("Error sending order confirmation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send shipping notification using DB template
export async function sendShippingNotification(
  order: Order & { organization_id?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = order.organization_id;
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);

    const template = await loadEmailTemplate(
      "order_shipped",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active order_shipped template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const customerEmail =
      order.user_email || order.email || order.profiles?.email;
    const customerName =
      order.customer_name || order.profiles?.full_name || "Cliente";

    if (!customerEmail) {
      return { success: false, error: "No customer email found" };
    }

    // Calculate estimated delivery (7 days from shipped date or now)
    const shippedDate = order.shipped_at
      ? new Date(order.shipped_at)
      : new Date();
    const estimatedDelivery = new Date(shippedDate);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: customerName,
      order_number: order.order_number,
      carrier: order.carrier || "Transporte",
      tracking_number: order.tracking_number || "Pendiente",
      estimated_delivery: estimatedDelivery.toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
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
      previewText: `Tu orden ${order.order_number} está en camino`,
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
    console.error("Error sending shipping notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send delivery confirmation using DB template
export async function sendDeliveryConfirmation(
  order: Order & { organization_id?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = order.organization_id;
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);

    const template = await loadEmailTemplate(
      "order_delivered",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active order_delivered template found, skipping email",
      );
      return { success: false, error: "No active template found" };
    }

    const customerEmail =
      order.user_email || order.email || order.profiles?.email;
    const customerName =
      order.customer_name || order.profiles?.full_name || "Cliente";

    if (!customerEmail) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: customerName,
      order_number: order.order_number,
      delivery_date: order.delivered_at
        ? new Date(order.delivered_at).toLocaleDateString("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : new Date().toLocaleDateString("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
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
      previewText: `Tu orden ${order.order_number} ha sido entregada`,
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
    console.error("Error sending delivery confirmation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

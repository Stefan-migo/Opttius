/**
 * Work order email templates for optical shops
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

export interface WorkOrderData {
  id: string;
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  work_order_number: string;
  date: string;
  estimated_delivery_date?: string;
  delivery_date?: string;
  product_type?: string;
  product_description?: string;
  lens_details?: string;
  frame_details?: string;
  price?: string;
  deposit_paid?: string;
  balance_due?: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  branch_email?: string;
  branch_hours?: string;
  status?: string;
  work_order_url?: string;
  payment_url?: string;
}

export async function sendWorkOrderReady(
  workOrder: WorkOrderData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "work_order_ready",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active work_order_ready template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!workOrder.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: workOrder.customer_name || "Cliente",
      customer_first_name: workOrder.customer_first_name || "Cliente",
      work_order_number: workOrder.work_order_number,
      work_order_date: workOrder.date,
      delivery_date: workOrder.delivery_date || "",
      estimated_delivery_date: workOrder.estimated_delivery_date || "",
      product_type: workOrder.product_type || "Trabajo",
      product_description: workOrder.product_description || "",
      price: workOrder.price || "",
      deposit_paid: workOrder.deposit_paid || "",
      balance_due: workOrder.balance_due || "",
      branch_name: workOrder.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: workOrder.branch_address || "",
      branch_phone: workOrder.branch_phone || "",
      branch_hours: workOrder.branch_hours || "",
      work_order_url: workOrder.work_order_url || "",
      payment_url: workOrder.payment_url || "",
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
      previewText: `Tu trabajo ${workOrder.work_order_number} está listo para retiro`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: workOrder.customer_email,
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
    console.error("Error sending work order ready:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

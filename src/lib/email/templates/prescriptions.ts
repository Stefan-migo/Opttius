/**
 * Prescription email templates for optical shops
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

export interface PrescriptionData {
  id: string;
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  prescription_number: string;
  date: string;
  expiry_date: string;
  doctor_name?: string;
  doctor_title?: string;
  doctor_license?: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  branch_email?: string;
  branch_hours?: string;
  products_recommended?: string;
  sphere_right?: string;
  sphere_left?: string;
  cylinder_right?: string;
  cylinder_left?: string;
  axis_right?: string;
  axis_left?: string;
  add_right?: string;
  add_left?: string;
  pd?: string;
  next_checkup_date?: string;
  prescription_url?: string;
  show_graduation?: boolean;
}

export async function sendPrescriptionReady(
  prescription: PrescriptionData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "prescription_ready",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active prescription_ready template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!prescription.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: prescription.customer_name || "Cliente",
      customer_first_name: prescription.customer_first_name || "Cliente",
      prescription_date: prescription.date,
      prescription_expiry_date: prescription.expiry_date,
      prescription_number: prescription.prescription_number,
      doctor_name: prescription.doctor_name || "",
      doctor_title: prescription.doctor_title || "",
      doctor_license: prescription.doctor_license || "",
      sphere_right: prescription.sphere_right || "",
      sphere_left: prescription.sphere_left || "",
      cylinder_right: prescription.cylinder_right || "",
      cylinder_left: prescription.cylinder_left || "",
      axis_right: prescription.axis_right || "",
      axis_left: prescription.axis_left || "",
      add_right: prescription.add_right || "",
      add_left: prescription.add_left || "",
      pd: prescription.pd || "",
      products_recommended: prescription.products_recommended || "",
      next_checkup_date: prescription.next_checkup_date || "",
      branch_name:
        prescription.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: prescription.branch_address || "",
      branch_phone: prescription.branch_phone || "",
      branch_hours: prescription.branch_hours || "",
      prescription_url: prescription.prescription_url || "",
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
      previewText: `Tu receta de fecha ${prescription.date} está disponible`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: prescription.customer_email,
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
    console.error("Error sending prescription ready:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendPrescriptionExpiring(
  prescription: PrescriptionData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "prescription_expiring",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active prescription_expiring template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!prescription.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: prescription.customer_name || "Cliente",
      customer_first_name: prescription.customer_first_name || "Cliente",
      prescription_expiry_date: prescription.expiry_date,
      prescription_number: prescription.prescription_number,
      branch_name:
        prescription.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: prescription.branch_address || "",
      branch_phone: prescription.branch_phone || "",
      branch_email: prescription.branch_email || "",
      booking_url: prescription.prescription_url || "",
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
      previewText: `Tu receta ${prescription.prescription_number} vence pronto`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: prescription.customer_email,
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
    console.error("Error sending prescription expiring:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

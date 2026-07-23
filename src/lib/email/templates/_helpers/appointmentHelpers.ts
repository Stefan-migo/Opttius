import { sendEmail } from "../../client";
import { getOrganizationInfoWithFallbacks } from "../../org-utils";
import { incrementTemplateUsage, loadEmailTemplate } from "../../template-loader";
import { getDefaultVariables, replaceTemplateVariables } from "../../template-utils";

export function htmlToText(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").replace(/\n\s*\n/g, "\n").trim();
}

interface SendAppointmentEmailParams {
  templateKey: string;
  appointment: Record<string, any>;
  organizationId?: string;
  extraVariables?: Record<string, string>;
  previewText: string;
  logLabel: string;
}

export async function sendAppointmentEmail({ templateKey, appointment, organizationId, extraVariables = {}, previewText, logLabel }: SendAppointmentEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(templateKey, true, organizationId);
    if (!template) { console.warn(`⚠️ No active ${templateKey} template found, skipping email`); return { success: false, error: "Template not found" }; }
    if (!appointment.customer_email) return { success: false, error: "No customer email found" };

    const variables = {
      ...getDefaultVariables({ name: orgInfo?.name ?? undefined, support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl" }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      appointment_date: appointment.date || "",
      appointment_time: appointment.time || "",
      appointment_datetime: appointment.datetime || `${appointment.date || ""} a las ${appointment.time || ""}`,
      professional_name: appointment.professional_name || "Nuestro Profesional",
      professional_title: appointment.professional_title || "",
      professional_license: appointment.professional_license || "",
      branch_name: appointment.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: appointment.branch_address || "",
      branch_phone: appointment.branch_phone || "",
      branch_email: appointment.branch_email || "",
      branch_hours: appointment.branch_hours || "",
      appointment_type: appointment.appointment_type || "Examen Visual",
      appointment_duration: appointment.duration || "45 minutos",
      preparation_instructions: appointment.preparation_instructions || "",
      confirmation_url: appointment.confirmation_url || "",
      cancellation_url: appointment.cancellation_url || "",
      reschedule_url: appointment.reschedule_url || "",
      booking_url: appointment.booking_url || "",
      organization_name: orgInfo?.name || "Nuestra Óptica",
      ...extraVariables,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);
    const { wrapInModernLayout } = await import("../../layout");
    html = wrapInModernLayout(html, { organizationName: orgInfo?.name || "Nuestra Óptica", organizationColor: (orgInfo?.metadata as any)?.primary_color || "#1e40af", previewText });

    const result = await sendEmail({ to: appointment.customer_email, subject, html, text: htmlToText(html), replyTo: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl", fromDisplayName: orgInfo?.resolvedDisplayName });
    if (result.success) await incrementTemplateUsage(template.id);
    return result;
  } catch (error) { console.error(`Error sending ${logLabel}:`, error); return { success: false, error: error instanceof Error ? error.message : "Unknown error" }; }
}

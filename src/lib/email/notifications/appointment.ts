import { sendEmail } from "../client";
import { getOrganizationInfoWithFallbacks } from "../org-utils";
import { loadEmailTemplate } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send appointment confirmation
export async function sendAppointmentConfirmation(
  appointment: unknown,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_confirmation",
      true,
      organizationId,
    );

    if (!template) return { success: false, error: "Template not found" };

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: appointment.customer_name || "Paciente",
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      professional_name: appointment.professional_name || "Especialista",
      appointment_type: appointment.type || "Consulta",
      branch_name: appointment.branch_name || "",
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
      previewText: `Tu cita ha sido confirmada para el ${appointment.date}`,
    });

    return await sendEmail({
      to: appointment.customer_email,
      subject,
      html,
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });
  } catch (error) {
    console.error("Error sending appointment confirmation:", error);
    return { success: false, error: "Error sending email" };
  }
}

// Send appointment reminder
export async function sendAppointmentReminder(
  appointment: unknown,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_reminder",
      true,
      organizationId,
    );

    if (!template) return { success: false, error: "Template not found" };

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail ?? undefined,
      }),
      customer_name: appointment.customer_name || "Paciente",
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      branch_name: appointment.branch_name || "",
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
      previewText: `Recordatorio: Tienes una cita mañana a las ${appointment.time}`,
    });

    return await sendEmail({
      to: appointment.customer_email,
      subject,
      html,
      replyTo: orgInfo?.resolvedSupportEmail,
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });
  } catch (error) {
    console.error("Error sending appointment reminder:", error);
    return { success: false, error: "Error sending email" };
  }
}

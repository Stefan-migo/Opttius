/**
 * Appointment email templates for optical shops
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

export interface AppointmentData {
  id: string;
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  date: string;
  time: string;
  datetime?: string;
  professional_name?: string;
  professional_title?: string;
  professional_license?: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  branch_email?: string;
  branch_hours?: string;
  appointment_type?: string;
  duration?: string;
  preparation_instructions?: string;
  confirmation_url?: string;
  cancellation_url?: string;
  reschedule_url?: string;
}

export interface AppointmentRescheduleData extends AppointmentData {
  old_date: string;
  old_time: string;
}

export interface AppointmentFollowUpData {
  id: string;
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  follow_up_date: string;
  branch_name?: string;
  branch_phone?: string;
  branch_email?: string;
  booking_url?: string;
}

export async function sendAppointmentConfirmation(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_confirmation",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active appointment_confirmation template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!appointment.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      appointment_datetime:
        appointment.datetime || `${appointment.date} a las ${appointment.time}`,
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
      previewText: `Confirmación de tu cita para el ${appointment.date}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
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
    console.error("Error sending appointment confirmation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendAppointmentReminder(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_reminder",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active appointment_reminder template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!appointment.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      professional_name: appointment.professional_name || "Nuestro Profesional",
      professional_title: appointment.professional_title || "",
      branch_name: appointment.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: appointment.branch_address || "",
      branch_phone: appointment.branch_phone || "",
      preparation_instructions: appointment.preparation_instructions || "",
      reschedule_url: appointment.reschedule_url || "",
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
      previewText: `Recordatorio: Tienes una cita el ${appointment.date} a las ${appointment.time}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
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
    console.error("Error sending appointment reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendAppointmentReminder2h(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_reminder_2h",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active appointment_reminder_2h template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!appointment.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      appointment_time: appointment.time,
      professional_name: appointment.professional_name || "",
      branch_name: appointment.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: appointment.branch_address || "",
      branch_phone: appointment.branch_phone || "",
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
      previewText: `Tu cita es en 2 horas a las ${appointment.time}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
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
    console.error("Error sending appointment reminder 2h:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendAppointmentCancellation(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_cancelation",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active appointment_cancelation template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!appointment.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      branch_name: appointment.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_phone: appointment.branch_phone || "",
      branch_email: appointment.branch_email || "",
      booking_url: appointment.reschedule_url || "",
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
      previewText: `Tu cita del ${appointment.date} fue cancelada`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
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
    console.error("Error sending appointment cancellation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendAppointmentRescheduled(
  appointment: AppointmentRescheduleData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_rescheduled",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active appointment_rescheduled template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!appointment.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      old_appointment_date: appointment.old_date,
      old_appointment_time: appointment.old_time,
      branch_name: appointment.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_phone: appointment.branch_phone || "",
      branch_email: appointment.branch_email || "",
      professional_name: appointment.professional_name || "Especialista",
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
      previewText: `Tu cita fue reprogramada para el ${appointment.date}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
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
    console.error("Error sending appointment rescheduled:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendAppointmentFollowUpReminder(
  appointment: AppointmentFollowUpData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "appointment_follow_up_reminder",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active appointment_follow_up_reminder template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!appointment.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const followUpDateFormatted = appointment.follow_up_date
      ? new Date(appointment.follow_up_date).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : appointment.follow_up_date;

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: appointment.customer_name || "Cliente",
      customer_first_name: appointment.customer_first_name || "Cliente",
      follow_up_date: followUpDateFormatted,
      branch_name: appointment.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_phone: appointment.branch_phone || "",
      branch_email: appointment.branch_email || "",
      booking_url: appointment.booking_url || "",
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
      previewText: `Recuerda tu control programado para el ${appointment.follow_up_date}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
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
    console.error("Error sending appointment follow-up reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

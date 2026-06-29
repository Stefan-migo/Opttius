/**
 * SaaS demo lifecycle email templates — approved, expiring, expired, post-meeting
 */
import { sendEmail } from "../client";
import { wrapInModernLayout } from "../layout";
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

export interface DemoApprovedData {
  email: string;
  fullName?: string | null;
  loginUrl: string;
}

export interface DemoExpiringData {
  email: string;
  fullName?: string | null;
  daysRemaining: number;
  meetingUrl: string;
}

export interface DemoExpiredData {
  email: string;
  fullName?: string | null;
  meetingUrl: string;
}

export interface DemoPostMeetingFollowupData {
  email: string;
  fullName?: string | null;
}

export async function sendDemoApprovedEmail(
  data: DemoApprovedData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate(
      "demo_approved",
      true,
      undefined,
      "saas",
    );
    if (!template) {
      console.warn("⚠️ No demo_approved template found");
      return { success: false, error: "Template not found" };
    }

    const loginUrl =
      data.loginUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://www.opttius.cl"}/login`;
    const variables = {
      full_name: data.fullName || "Usuario",
      login_url: loginUrl,
    };
    const subject = replaceTemplateVariables(template.subject, variables);
    const content = replaceTemplateVariables(template.content, variables);
    const html = wrapInModernLayout(content, {
      title: "Demo aprobada - Opttius",
      previewText: "Tu solicitud de demo ha sido aprobada.",
      organizationName: "Opttius",
    });
    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.email,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });
    if (result.success) await incrementTemplateUsage(template.id);
    return result;
  } catch (error) {
    console.error("Error sending demo approved email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendDemoExpiringEmail(
  data: DemoExpiringData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate(
      "demo_expiring",
      true,
      undefined,
      "saas",
    );
    if (!template) {
      console.warn("⚠️ No demo_expiring template found");
      return { success: false, error: "Template not found" };
    }

    const days = data.daysRemaining;
    const meetingUrl = data.meetingUrl || "https://www.opttius.cl/contacto";
    const variables = {
      full_name: data.fullName || "Usuario",
      days_remaining: days.toString(),
      days_label: days === 1 ? "día" : "días",
      meeting_url: meetingUrl,
    };
    const subject = replaceTemplateVariables(template.subject, variables);
    const content = replaceTemplateVariables(template.content, variables);
    const html = wrapInModernLayout(content, {
      title: "Tu demo de Opttius vence pronto",
      previewText: `Tu demo vence en ${days} ${days === 1 ? "día" : "días"}. Agenda una reunión.`,
      organizationName: "Opttius",
    });
    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.email,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });
    if (result.success) await incrementTemplateUsage(template.id);
    return result;
  } catch (error) {
    console.error("Error sending demo expiring email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendDemoExpiredEmail(
  data: DemoExpiredData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate(
      "demo_expired",
      true,
      undefined,
      "saas",
    );
    if (!template) {
      console.warn("⚠️ No demo_expired template found");
      return { success: false, error: "Template not found" };
    }

    const meetingUrl = data.meetingUrl || "https://www.opttius.cl/contacto";
    const variables = {
      full_name: data.fullName || "Usuario",
      meeting_url: meetingUrl,
    };
    const subject = replaceTemplateVariables(template.subject, variables);
    const content = replaceTemplateVariables(template.content, variables);
    const html = wrapInModernLayout(content, {
      title: "Tu prueba de Opttius ha finalizado",
      previewText: "Tu demo ha expirado. Agenda una reunión para continuar.",
      organizationName: "Opttius",
    });
    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.email,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });
    if (result.success) await incrementTemplateUsage(template.id);
    return result;
  } catch (error) {
    console.error("Error sending demo expired email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendDemoPostMeetingFollowupEmail(
  data: DemoPostMeetingFollowupData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate(
      "demo_post_meeting_followup",
      true,
      undefined,
      "saas",
    );
    if (!template) {
      console.warn("⚠️ No demo_post_meeting_followup template found");
      return { success: false, error: "Template not found" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.opttius.cl";
    const variables = {
      full_name: data.fullName || "Usuario",
      app_url: appUrl,
    };
    const subject = replaceTemplateVariables(template.subject, variables);
    const content = replaceTemplateVariables(template.content, variables);
    const html = wrapInModernLayout(content, {
      title: "Gracias por reunirte con Opttius",
      previewText: "¿Tienes preguntas? Estamos aquí para ayudarte.",
      organizationName: "Opttius",
    });
    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.email,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });
    if (result.success) await incrementTemplateUsage(template.id);
    return result;
  } catch (error) {
    console.error("Error sending demo post-meeting followup email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

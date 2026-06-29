/**
 * SaaS security and onboarding email templates
 */
import { sendEmail } from "../client";
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

export interface SaaSSecurityData {
  user_id: string;
  user_email: string;
  user_name: string;
  organization_id: string;
  organization_name: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  timestamp: string;
  action_type:
    | "login"
    | "password_change"
    | "2fa_enable"
    | "2fa_disable"
    | "api_key_created"
    | "api_key_revoked";
  security_url?: string;
}

export interface SaaSOnboardingData {
  user_id: string;
  user_email: string;
  user_name: string;
  organization_id: string;
  organization_name: string;
  step_number: number;
  total_steps: number;
  current_step_name: string;
  next_step_name?: string;
  next_step_url?: string;
  resources_url?: string;
}

export async function sendSaaSSecurityAlert(
  data: SaaSSecurityData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_security_alert", true);

    if (!template) {
      console.warn("⚠️ No saas_security_alert template found");
      return { success: false, error: "Template not found" };
    }

    const actionMessages: Record<string, string> = {
      login: "Nuevo inicio de sesión",
      password_change: "Cambio de contraseña",
      "2fa_enable": "Autenticación de dos factores activada",
      "2fa_disable": "Autenticación de dos factores desactivada",
      api_key_created: "Nueva clave API creada",
      api_key_revoked: "Clave API revocada",
    };

    const variables = {
      ...getDefaultVariables(),
      user_name: data.user_name,
      user_email: data.user_email,
      organization_name: data.organization_name,
      action_type: actionMessages[data.action_type] || data.action_type,
      ip_address: data.ip_address || "Desconocida",
      user_agent: data.user_agent || "Desconocido",
      location: data.location || "Desconocida",
      timestamp: data.timestamp,
      security_url:
        data.security_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/security/activity`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.user_email,
      subject,
      html,
      text,
      replyTo: "seguridad@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending security alert:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSaaSOnboardingStep(
  data: SaaSOnboardingData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_onboarding", true);

    if (!template) {
      console.warn("⚠️ No saas_onboarding template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      user_name: data.user_name,
      organization_name: data.organization_name,
      step_number: data.step_number.toString(),
      total_steps: data.total_steps.toString(),
      current_step_name: data.current_step_name,
      next_step_name: data.next_step_name || "",
      next_step_url: data.next_step_url || "",
      resources_url:
        data.resources_url || `${process.env.NEXT_PUBLIC_APP_URL}/docs`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.user_email,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending onboarding email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

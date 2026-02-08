/**
 * Funciones de Email para SaaS - Opttius
 * Estas funciones implementan las plantillas para comunicación con administradores de ópticas
 */

import { sendEmail } from "../client";
import { loadEmailTemplate, incrementTemplateUsage } from "../template-loader";
import {
  replaceTemplateVariables,
  getDefaultVariables,
} from "../template-utils";
import { createServiceRoleClient } from "@/utils/supabase/server";

// ============================================================================
// Interfaces para tipos de datos SaaS
// ============================================================================

export interface SaaSUserData {
  id: string;
  email: string;
  full_name: string;
  organization_id?: string;
  organization_name?: string;
  role?: string;
  login_url?: string;
  dashboard_url?: string;
}

export interface SaaSSubscriptionData {
  organization_id: string;
  organization_name: string;
  plan_name: string;
  plan_price: number;
  billing_cycle: "monthly" | "annual";
  current_period_start: string;
  current_period_end: string;
  status: "active" | "past_due" | "canceled" | "trial";
  payment_url?: string;
  invoices_url?: string;
}

export interface SaaSTrialData {
  organization_id: string;
  organization_name: string;
  trial_start_date: string;
  trial_end_date: string;
  days_remaining: number;
  plan_name: string;
  upgrade_url?: string;
}

export interface SaaSPaymentData {
  organization_id: string;
  organization_name: string;
  amount: number;
  currency: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: "paid" | "pending" | "failed";
  payment_url?: string;
  invoice_url?: string;
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

// ============================================================================
// Funciones de Utilidad
// ============================================================================

async function getOrganizationInfo(organizationId: string) {
  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("name, metadata")
      .eq("id", organizationId)
      .single();

    return org;
  } catch (error) {
    console.error("Error fetching organization info:", error);
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// ============================================================================
// 1. BIENVENIDA AL SAAS
// ============================================================================

export async function sendSaaSWelcome(
  user: SaaSUserData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_welcome", true);

    if (!template) {
      console.warn("⚠️ No saas_welcome template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      user_name: user.full_name || "Usuario",
      user_email: user.email,
      organization_name: user.organization_name || "Tu Organización",
      login_url: user.login_url || `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      dashboard_url:
        user.dashboard_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      support_email: "soporte@opttius.com",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: user.email,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending SaaS welcome:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 2. TRIAL POR FINALIZAR
// ============================================================================

export async function sendSaaSTrialEnding(
  data: SaaSTrialData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_trial_ending", true);

    if (!template) {
      console.warn("⚠️ No saas_trial_ending template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: data.organization_name,
      trial_end_date: data.trial_end_date,
      days_remaining: data.days_remaining.toString(),
      plan_name: data.plan_name,
      upgrade_url:
        data.upgrade_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.organization_id,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending trial ending:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 3. SUSCRIPCIÓN EXITOSA
// ============================================================================

export async function sendSaaSSubscriptionSuccess(
  data: SaaSSubscriptionData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_subscription_success", true);

    if (!template) {
      console.warn("⚠️ No saas_subscription_success template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: data.organization_name,
      plan_name: data.plan_name,
      plan_price: data.plan_price.toString(),
      billing_cycle: data.billing_cycle === "monthly" ? "mensual" : "anual",
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      invoices_url:
        data.invoices_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.organization_id,
      subject,
      html,
      text,
      replyTo: "facturas@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending subscription success:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 4. PAGO FALLIDO
// ============================================================================

export async function sendSaaSPaymentFailed(
  data: SaaSPaymentData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_payment_failed", true);

    if (!template) {
      console.warn("⚠️ No saas_payment_failed template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: data.organization_name,
      amount: data.amount.toString(),
      currency: data.currency,
      invoice_number: data.invoice_number,
      due_date: data.due_date,
      payment_url:
        data.payment_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing/pay`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.organization_id,
      subject,
      html,
      text,
      replyTo: "facturas@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending payment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 5. RECORDATORIO DE PAGO
// ============================================================================

export async function sendSaaSPaymentReminder(
  data: SaaSPaymentData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_payment_reminder", true);

    if (!template) {
      console.warn("⚠️ No saas_payment_reminder template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: data.organization_name,
      amount: data.amount.toString(),
      currency: data.currency,
      due_date: data.due_date,
      payment_url:
        data.payment_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing/pay`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.organization_id,
      subject,
      html,
      text,
      replyTo: "facturas@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 6. ALERTA DE SEGURIDAD - LOGIN
// ============================================================================

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
      replyTo: "seguridad@opttius.com",
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

// ============================================================================
// 7. ONBOARDING
// ============================================================================

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
      replyTo: "soporte@opttius.com",
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

// ============================================================================
// 8. ACTUALIZACIÓN DE TÉRMINOS
// ============================================================================

export async function sendSaaSTermsUpdate(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  terms_url: string,
  acceptance_url: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_terms_update", true);

    if (!template) {
      console.warn("⚠️ No saas_terms_update template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      terms_url: terms_url,
      acceptance_url: acceptance_url,
      support_email: "legal@opttius.com",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "legal@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending terms update:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 9. MANTENIMIENTO PROGRAMADO
// ============================================================================

export async function sendSaaSMaintenanceNotice(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  maintenance_start: string,
  maintenance_end: string,
  affected_services: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_maintenance", true);

    if (!template) {
      console.warn("⚠️ No saas_maintenance template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      maintenance_start: maintenance_start,
      maintenance_end: maintenance_end,
      affected_services: affected_services.join(", "),
      status_url: `${process.env.NEXT_PUBLIC_APP_URL}/status`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending maintenance notice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 10. ALERTA DE USO
// ============================================================================

export async function sendSaaSUsageAlert(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  resource_type: string,
  current_usage: number,
  limit_usage: number,
  percentage_used: number,
  upgrade_url?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_usage_alert", true);

    if (!template) {
      console.warn("⚠️ No saas_usage_alert template found");
      return { success: false, error: "Template not found" };
    }

    const resourceLabels: Record<string, string> = {
      users: "Usuarios",
      storage: "Almacenamiento",
      appointments: "Citas",
      customers: "Clientes",
      invoices: "Facturas",
    };

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      resource_type: resourceLabels[resource_type] || resource_type,
      current_usage: current_usage.toString(),
      limit_usage: limit_usage.toString(),
      percentage_used: percentage_used.toString(),
      upgrade_url:
        upgrade_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/plans`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending usage alert:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 11. ANUNCIO DE NUEVA FUNCIÓN
// ============================================================================

export async function sendSaaSFeatureAnnouncement(
  organizationId: string,
  organizationName: string,
  adminEmail: string,
  feature_name: string,
  feature_description: string,
  feature_url: string,
  release_date: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await loadEmailTemplate("saas_feature_announcement", true);

    if (!template) {
      console.warn("⚠️ No saas_feature_announcement template found");
      return { success: false, error: "Template not found" };
    }

    const variables = {
      ...getDefaultVariables(),
      organization_name: organizationName,
      feature_name: feature_name,
      feature_description: feature_description,
      feature_url: feature_url,
      release_date: release_date,
      docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/features`,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      replyTo: "producto@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending feature announcement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const saasEmailTemplates = {
  sendSaaSWelcome,
  sendSaaSTrialEnding,
  sendSaaSSubscriptionSuccess,
  sendSaaSPaymentFailed,
  sendSaaSPaymentReminder,
  sendSaaSSecurityAlert,
  sendSaaSOnboardingStep,
  sendSaaSTermsUpdate,
  sendSaaSMaintenanceNotice,
  sendSaaSUsageAlert,
  sendSaaSFeatureAnnouncement,
};

/**
 * SaaS subscription email templates — welcome, trial, payments
 */
import { createServiceRoleClient } from "@/utils/supabase/server";

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
  /** Email to send the notification to (org owner). Required for sending. */
  admin_email?: string;
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
  /** Email to send the notification to (org owner). Required for sending. */
  admin_email?: string;
}

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
      support_email: "soporte@opttius.cl",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: user.email,
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
    console.error("Error sending SaaS welcome:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendSaaSTrialEnding(
  data: SaaSTrialData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const variables = {
      ...getDefaultVariables(),
      organization_name: data.organization_name,
      trial_end_date: data.trial_end_date,
      days_remaining: data.days_remaining.toString(),
      days_label: data.days_remaining === 1 ? "día" : "días",
      plan_name: data.plan_name,
      upgrade_url:
        data.upgrade_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/plans`,
    };

    const daysLabel = data.days_remaining === 1 ? "día" : "días";

    const subject = `Tu prueba de ${data.plan_name} está por terminar`;
    let html = `
      <h2>Hola,</h2>
      <p>Tu prueba de <strong>${data.plan_name}</strong> termina el <strong>${data.trial_end_date}</strong> (${data.days_remaining} ${daysLabel}).</p>
      <p>No pierdas acceso a tu organización. Actualiza a un plan pago para continuar.</p>
    `;

    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      title: "Tu prueba está por terminar",
      previewText: `Quedan ${data.days_remaining} ${daysLabel} de prueba`,
      organizationName: data.organization_name,
    });

    const text = htmlToText(html);

    const toEmail = data.admin_email;
    if (!toEmail) {
      return { success: false, error: "admin_email required" };
    }

    const result = await sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      const template = await loadEmailTemplate("saas_trial_ending", true);
      if (template) await incrementTemplateUsage(template.id);
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

export async function sendSaaSSubscriptionSuccess(
  data: SaaSSubscriptionData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(data.organization_id);

    const variables = {
      ...getDefaultVariables(),
      organization_name: data.organization_name,
      plan_name: data.plan_name,
      plan_price: data.plan_price.toString(),
      billing_cycle: data.billing_cycle === "annual" ? "anual" : "mensual",
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      invoices_url:
        data.invoices_url ||
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/saas-management/billing/invoices`,
      dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
      support_email: "soporte@opttius.cl",
    };

    const subject = `¡Suscripción a ${data.plan_name} confirmada!`;
    let html = `
      <h2>¡Suscripción confirmada!</h2>
      <p>Tu plan <strong>${data.plan_name}</strong> (${variables.billing_cycle}) está activo.</p>
      <p>Monto: $${data.plan_price} USD/${variables.billing_cycle === "anual" ? "año" : "mes"}</p>
    `;

    const orgName =
      (orgInfo?.name as string) || data.organization_name || "Opttius";
    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      title: "Suscripción confirmada",
      previewText: `Tu plan ${data.plan_name} está activo`,
      organizationName: orgName,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: orgInfo
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}`
        : data.organization_id,
      subject,
      html,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      const template = await loadEmailTemplate(
        "saas_subscription_success",
        true,
      );
      if (template) await incrementTemplateUsage(template.id);
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

    const toEmail = data.admin_email;
    if (!toEmail) {
      return { success: false, error: "admin_email required" };
    }

    const result = await sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      replyTo: "facturas@opttius.cl",
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

    const toEmail = data.admin_email;
    if (!toEmail) {
      return { success: false, error: "admin_email required" };
    }

    const result = await sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      replyTo: "facturas@opttius.cl",
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

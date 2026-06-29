/**
 * Customer welcome, contact form, and birthday promo email templates
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

export interface CustomerData {
  id: string;
  name: string;
  first_name: string;
  email: string;
  birth_date?: string;
  organization_id?: string;
  dashboard_url?: string;
}

export interface ContactFormData {
  customer_name: string;
  customer_email: string;
  subject: string;
  message: string;
  organization_id?: string;
}

export interface BirthdayPromoData {
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  promo_code?: string;
  promo_description?: string;
  promo_url?: string;
  organization_id?: string;
}

export async function sendAccountWelcomeEmail(
  customer: CustomerData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate(
      "account_welcome",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active account_welcome template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!customer.email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: customer.name || "Cliente",
      customer_first_name: customer.first_name || "Cliente",
      account_url:
        customer.dashboard_url ||
        `${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/mi-cuenta`,
      dashboard_url:
        customer.dashboard_url ||
        `${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/mi-cuenta`,
      organization_name: orgInfo?.name || "Nuestra Óptica",
      branch_phone: "",
      branch_email: "",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);

    const { wrapInModernLayout } = await import("../layout");
    html = wrapInModernLayout(html, {
      organizationName: orgInfo?.name || "Nuestra Óptica",
      organizationColor:
        (orgInfo?.metadata as { primary_color?: string })?.primary_color ||
        "#1e40af",
      previewText: `Bienvenido a ${orgInfo?.name || "nuestra óptica"}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: customer.email,
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
    console.error("Error sending account welcome:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendContactFormNotification(
  data: ContactFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(
      data.organization_id,
    );

    const recipientEmail =
      orgInfo?.resolvedSupportEmail || "contacto@opttius.cl";

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">📬 Nuevo Mensaje de Contacto</h1>
        </div>
        <div style="background: #ffffff; padding: 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Nombre</p>
                <p style="margin: 0; color: #1e3a5f; font-size: 16px; font-weight: 500;">${data.customer_name}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Email</p>
                <p style="margin: 0; color: #1e3a5f; font-size: 16px;">${data.customer_email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Asunto</p>
                <p style="margin: 0; color: #1e3a5f; font-size: 16px; font-weight: 500;">${data.subject}</p>
              </td>
            </tr>
          </table>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Mensaje</p>
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
          </div>
          <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
            Este mensaje fue enviado desde el formulario de contacto de ${orgInfo?.name || "nuestra óptica"}.
          </p>
        </div>
      </div>
    `;

    const text = `
📬 Nuevo Mensaje de Contacto

Nombre: ${data.customer_name}
Email: ${data.customer_email}
Asunto: ${data.subject}

Mensaje:
${data.message}

---
Este mensaje fue enviado desde el formulario de contacto de ${orgInfo?.name || "nuestra óptica"}.

Responder a: ${data.customer_email}
    `;

    const result = await sendEmail({
      to: recipientEmail,
      subject: `📬 Contacto: ${data.subject}`,
      html,
      text,
      replyTo: data.customer_email,
    });

    return result;
  } catch (error) {
    console.error("Error sending contact form notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendBirthdayPromo(
  data: BirthdayPromoData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const template = await loadEmailTemplate("birthday", true, organizationId);

    if (!template) {
      console.warn("⚠️ No active birthday template found, skipping email");
      return { success: false, error: "Template not found" };
    }

    if (!data.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const today = new Date();
    const currentDate = today.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: data.customer_name || "Cliente",
      customer_first_name: data.customer_first_name || "Cliente",
      current_date: currentDate,
      birthday_promo_code: data.promo_code || "",
      birthday_promo_description: data.promo_description || "",
      promo_url: data.promo_url || "",
      booking_url: data.promo_url || "",
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
      previewText: `¡Feliz cumpleaños ${data.customer_name || "!"}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.customer_email,
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
    console.error("Error sending birthday email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Funciones de Email para Óptica - Rediseñadas
 * Estas funciones implementan las 12 plantillas específicas para comunicación con clientes de óptica
 */

import { sendEmail } from "../client";
import { loadEmailTemplate, incrementTemplateUsage } from "../template-loader";
import {
  replaceTemplateVariables,
  getDefaultVariables,
} from "../template-utils";
import { createServiceRoleClient } from "@/utils/supabase/server";

// ============================================================================
// Interfaces para tipos de datos
// ============================================================================

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

export interface QuoteData {
  id: string;
  customer_name: string;
  customer_first_name: string;
  customer_email: string;
  quote_number: string;
  date: string;
  expiry_date: string;
  valid_days?: number;
  items?: Array<{
    description: string;
    amount: string;
  }>;
  subtotal?: string;
  discount?: string;
  discount_percentage?: string;
  iva?: string;
  total?: string;
  deposit_required?: string;
  products?: string;
  services?: string;
  branch_name?: string;
  branch_address?: string;
  branch_phone?: string;
  branch_email?: string;
  quote_url?: string;
  accept_url?: string;
  reject_url?: string;
  payment_url?: string;
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

// ============================================================================
// Funciones de Utilidad
// ============================================================================

/**
 * Obtiene la información de la organización para el branding del email
 */
async function getOrganizationInfo(organizationId?: string) {
  if (!organizationId) return null;

  try {
    const supabase = createServiceRoleClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("name, metadata")
      .eq("id", organizationId)
      .single();

    return org;
  } catch (error) {
    console.error("Error fetching organization info for email:", error);
    return null;
  }
}

/**
 * Genera versión de texto plano del HTML
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// ============================================================================
// 1. Confirmación de Cita
// ============================================================================

export async function sendAppointmentConfirmation(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 2. Recordatorio de Cita - 24 horas
// ============================================================================

export async function sendAppointmentReminder(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 3. Recordatorio de Cita - 2 horas
// ============================================================================

export async function sendAppointmentReminder2h(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 4. Cancelación de Cita
// ============================================================================

export async function sendAppointmentCancellation(
  appointment: AppointmentData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: appointment.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 5. Receta Lista Para Retirar
// ============================================================================

export async function sendPrescriptionReady(
  prescription: PrescriptionData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: prescription.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 6. Receta Próxima a Vencer
// ============================================================================

export async function sendPrescriptionExpiring(
  prescription: PrescriptionData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: prescription.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 7. Orden de Trabajo Lista
// ============================================================================

export async function sendWorkOrderReady(
  workOrder: WorkOrderData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: workOrder.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 8. Presupuesto Enviado
// ============================================================================

export async function sendQuoteSent(
  quote: QuoteData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
    const template = await loadEmailTemplate(
      "quote_sent",
      true,
      organizationId,
    );

    if (!template) {
      console.warn("⚠️ No active quote_sent template found, skipping email");
      return { success: false, error: "Template not found" };
    }

    if (!quote.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    // Generar tabla de items HTML
    const itemsTable = quote.items
      ? quote.items
          .map(
            (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #374151;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #374151;">${item.amount}</td>
        </tr>
      `,
          )
          .join("")
      : "";

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
      }),
      customer_name: quote.customer_name || "Cliente",
      customer_first_name: quote.customer_first_name || "Cliente",
      quote_number: quote.quote_number,
      quote_date: quote.date,
      quote_expiry_date: quote.expiry_date,
      valid_days: quote.valid_days?.toString() || "30",
      items_table: itemsTable,
      subtotal: quote.subtotal || "",
      discount: quote.discount || "",
      discount_percentage: quote.discount_percentage || "",
      iva: quote.iva || "",
      total: quote.total || "",
      deposit_required: quote.deposit_required || "",
      products: quote.products || "",
      services: quote.services || "",
      branch_name: quote.branch_name || orgInfo?.name || "Nuestra Óptica",
      branch_address: quote.branch_address || "",
      branch_phone: quote.branch_phone || "",
      branch_email: quote.branch_email || "",
      quote_url: quote.quote_url || "",
      accept_url: quote.accept_url || "",
      reject_url: quote.reject_url || "",
      payment_url: quote.payment_url || "",
      organization_name: orgInfo?.name || "Nuestra Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: quote.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending quote:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 9. Presupuesto Próximo a Vencer
// ============================================================================

export async function sendQuoteExpiring(
  quote: QuoteData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
    const template = await loadEmailTemplate(
      "quote_expiring",
      true,
      organizationId,
    );

    if (!template) {
      console.warn(
        "⚠️ No active quote_expiring template found, skipping email",
      );
      return { success: false, error: "Template not found" };
    }

    if (!quote.customer_email) {
      return { success: false, error: "No customer email found" };
    }

    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
      }),
      customer_name: quote.customer_name || "Cliente",
      customer_first_name: quote.customer_first_name || "Cliente",
      quote_number: quote.quote_number,
      quote_expiry_date: quote.expiry_date,
      total: quote.total || "",
      accept_url: quote.accept_url || "",
      quote_url: quote.quote_url || "",
      branch_phone: quote.branch_phone || "",
      branch_email: quote.branch_email || "",
      organization_name: orgInfo?.name || "Nuestra Óptica",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: quote.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    console.error("Error sending quote expiring:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// 10. Bienvenida de Cliente
// ============================================================================

export async function sendAccountWelcomeEmail(
  customer: CustomerData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
      }),
      customer_name: customer.name || "Cliente",
      customer_first_name: customer.first_name || "Cliente",
      dashboard_url:
        customer.dashboard_url ||
        `${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.com"}/mi-cuenta`,
      organization_name: orgInfo?.name || "Nuestra Óptica",
      branch_phone: "",
      branch_email: "",
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: customer.email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// 11. Formulario de Contacto
// ============================================================================

export async function sendContactFormNotification(
  data: ContactFormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(data.organization_id);

    // El email se envía al negocio, no al cliente
    const recipientEmail =
      orgInfo?.metadata?.support_email || "contacto@opttius.com";

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

// ============================================================================
// 12. Feliz Cumpleaños
// ============================================================================

export async function sendBirthdayPromo(
  data: BirthdayPromoData,
  organizationId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgInfo = await getOrganizationInfo(organizationId);
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
        name: orgInfo?.name,
        support_email:
          orgInfo?.metadata?.support_email || "contacto@opttius.com",
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
    const html = replaceTemplateVariables(template.content, variables);

    const text = htmlToText(html);

    const result = await sendEmail({
      to: data.customer_email,
      subject,
      html,
      text,
      replyTo: orgInfo?.metadata?.support_email || "contacto@opttius.com",
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

// ============================================================================
// Exports
// ============================================================================

export const opticaEmailTemplates = {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentReminder2h,
  sendAppointmentCancellation,
  sendPrescriptionReady,
  sendPrescriptionExpiring,
  sendWorkOrderReady,
  sendQuoteSent,
  sendQuoteExpiring,
  sendAccountWelcomeEmail,
  sendContactFormNotification,
  sendBirthdayPromo,
};

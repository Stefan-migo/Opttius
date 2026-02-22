import { sendEmail } from "./client";
import { loadEmailTemplate, incrementTemplateUsage } from "./template-loader";
import {
  replaceTemplateVariables,
  formatOrderItemsHTML,
  formatOrderItemsText,
  getDefaultVariables,
} from "./template-utils";
import { ARGENTINA_PAYMENT_LABELS } from "@/lib/mercadopago";
import { createServiceRoleClient } from "@/utils/supabase/server";

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

// Helper function to get payment method label
function getPaymentMethodLabel(paymentMethod: string): string {
  return (
    ARGENTINA_PAYMENT_LABELS[
      paymentMethod as keyof typeof ARGENTINA_PAYMENT_LABELS
    ] || paymentMethod
  );
}

// Types for order data from database
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant_title?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_email: string;
  email?: string;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  payment_id?: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

// Notification service class
export class EmailNotificationService {
  /**
   * Helper to get organization info for email branding
   */
  private static async getOrganizationInfo(organizationId?: string) {
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

  // Send order confirmation email using DB template
  static async sendOrderConfirmation(
    order: Order & { organization_id?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const organizationId = order.organization_id;
      const orgInfo = await this.getOrganizationInfo(organizationId);

      const template = await loadEmailTemplate(
        "order_confirmation",
        true,
        organizationId,
      );

      if (!template) {
        console.warn(
          "⚠️ No active order_confirmation template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const customerEmail = order.user_email || order.email;
      if (!customerEmail) {
        return { success: false, error: "No customer email found" };
      }

      const orderDate = new Date(order.created_at).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const orderItemsHTML = formatOrderItemsHTML(order.items);
      const orderItemsText = formatOrderItemsText(order.items);

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: order.customer_name || "Cliente",
        order_number: order.order_number,
        order_date: orderDate,
        order_total: formatCurrency(order.total_amount),
        order_items: orderItemsHTML,
        payment_method: getPaymentMethodLabel(order.payment_method),
        order_items_text: orderItemsText,
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      // Wrap in modern layout if it's not already a full HTML document or if we want to enforce it
      // For now, we'll wrap it to ensure the "Modern" default look.
      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Confirmación de tu orden ${order.order_number}`,
      });

      // Generate plain text version (basic HTML to text conversion)
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
        replyTo: orgInfo?.metadata?.support_email,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending order confirmation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send appointment confirmation
  static async sendAppointmentConfirmation(
    appointment: any, // Use proper type if available
    organizationId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgInfo = await this.getOrganizationInfo(organizationId);
      const template = await loadEmailTemplate(
        "appointment_confirmation",
        true,
        organizationId,
      );

      if (!template) return { success: false, error: "Template not found" };

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
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

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Tu cita ha sido confirmada para el ${appointment.date}`,
      });

      return await sendEmail({
        to: appointment.customer_email,
        subject,
        html,
        replyTo: orgInfo?.metadata?.support_email,
      });
    } catch (error) {
      console.error("Error sending appointment confirmation:", error);
      return { success: false, error: "Error sending email" };
    }
  }

  // Send appointment reminder
  static async sendAppointmentReminder(
    appointment: any,
    organizationId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgInfo = await this.getOrganizationInfo(organizationId);
      const template = await loadEmailTemplate(
        "appointment_reminder",
        true,
        organizationId,
      );

      if (!template) return { success: false, error: "Template not found" };

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: appointment.customer_name || "Paciente",
        appointment_date: appointment.date,
        appointment_time: appointment.time,
        branch_name: appointment.branch_name || "",
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Recordatorio: Tienes una cita mañana a las ${appointment.time}`,
      });

      return await sendEmail({
        to: appointment.customer_email,
        subject,
        html,
        replyTo: orgInfo?.metadata?.support_email,
      });
    } catch (error) {
      console.error("Error sending appointment reminder:", error);
      return { success: false, error: "Error sending email" };
    }
  }

  // Send quote sent
  static async sendQuoteSent(
    quote: any,
    organizationId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgInfo = await this.getOrganizationInfo(organizationId);
      const template = await loadEmailTemplate(
        "quote_sent",
        true,
        organizationId,
      );

      if (!template) return { success: false, error: "Template not found" };

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: quote.customer_name || "Cliente",
        quote_number: quote.quote_number,
        quote_date: quote.date,
        quote_total: formatCurrency(quote.total_amount),
        quote_expiry: quote.expiry_date,
        quote_items: quote.items_html || "",
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Presupuesto disponible #${quote.quote_number}`,
      });

      return await sendEmail({
        to: quote.customer_email,
        subject,
        html,
        replyTo: orgInfo?.metadata?.support_email,
      });
    } catch (error) {
      console.error("Error sending quote email:", error);
      return { success: false, error: "Error sending email" };
    }
  }

  // Send work order ready
  static async sendWorkOrderReady(
    workOrder: any,
    organizationId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgInfo = await this.getOrganizationInfo(organizationId);
      const template = await loadEmailTemplate(
        "work_order_ready",
        true,
        organizationId,
      );

      if (!template) return { success: false, error: "Template not found" };

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: workOrder.customer_name || "Cliente",
        work_order_number: workOrder.work_order_number,
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Tu trabajo #${workOrder.work_order_number} está listo para retirar`,
      });

      return await sendEmail({
        to: workOrder.customer_email,
        subject,
        html,
        replyTo: orgInfo?.metadata?.support_email,
      });
    } catch (error) {
      console.error("Error sending work order email:", error);
      return { success: false, error: "Error sending email" };
    }
  }

  // Send prescription ready
  static async sendPrescriptionReady(
    prescription: any,
    organizationId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgInfo = await this.getOrganizationInfo(organizationId);
      const template = await loadEmailTemplate(
        "prescription_ready",
        true,
        organizationId,
      );

      if (!template) return { success: false, error: "Template not found" };

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: prescription.customer_name || "Cliente",
        prescription_date: prescription.date,
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Tu receta de fecha ${prescription.date} está disponible`,
      });

      return await sendEmail({
        to: prescription.customer_email,
        subject,
        html,
        replyTo: orgInfo?.metadata?.support_email,
      });
    } catch (error) {
      console.error("Error sending prescription email:", error);
      return { success: false, error: "Error sending email" };
    }
  }

  // Send shipping notification using DB template
  static async sendShippingNotification(
    order: Order & { organization_id?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const organizationId = order.organization_id;
      const orgInfo = await this.getOrganizationInfo(organizationId);

      const template = await loadEmailTemplate(
        "order_shipped",
        true,
        organizationId,
      );

      if (!template) {
        console.warn(
          "⚠️ No active order_shipped template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const customerEmail =
        order.user_email || order.email || order.profiles?.email;
      const customerName =
        order.customer_name || order.profiles?.full_name || "Cliente";

      if (!customerEmail) {
        return { success: false, error: "No customer email found" };
      }

      // Calculate estimated delivery (7 days from shipped date or now)
      const shippedDate = order.shipped_at
        ? new Date(order.shipped_at)
        : new Date();
      const estimatedDelivery = new Date(shippedDate);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: customerName,
        order_number: order.order_number,
        carrier: order.carrier || "Transporte",
        tracking_number: order.tracking_number || "Pendiente",
        estimated_delivery: estimatedDelivery.toLocaleDateString("es-AR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Tu orden ${order.order_number} está en camino`,
      });

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
        replyTo: orgInfo?.metadata?.support_email,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending shipping notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send delivery confirmation using DB template
  static async sendDeliveryConfirmation(
    order: Order & { organization_id?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const organizationId = order.organization_id;
      const orgInfo = await this.getOrganizationInfo(organizationId);

      const template = await loadEmailTemplate(
        "order_delivered",
        true,
        organizationId,
      );

      if (!template) {
        console.warn(
          "⚠️ No active order_delivered template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const customerEmail =
        order.user_email || order.email || order.profiles?.email;
      const customerName =
        order.customer_name || order.profiles?.full_name || "Cliente";

      if (!customerEmail) {
        return { success: false, error: "No customer email found" };
      }

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: customerName,
        order_number: order.order_number,
        delivery_date: order.delivered_at
          ? new Date(order.delivered_at).toLocaleDateString("es-AR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : new Date().toLocaleDateString("es-AR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Tu orden ${order.order_number} ha sido entregada`,
      });

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
        replyTo: orgInfo?.metadata?.support_email,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending delivery confirmation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send payment success notification (using custom template or fallback)
  static async sendPaymentSuccess(
    order: Order & { organization_id?: string },
    transactionId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const organizationId = order.organization_id;
      const orgInfo = await this.getOrganizationInfo(organizationId);

      // Try to use custom template first, fallback to order_confirmation if not found
      let template = await loadEmailTemplate(
        "payment_success",
        true,
        organizationId,
      );

      if (!template) {
        // Fallback to order confirmation
        template = await loadEmailTemplate(
          "order_confirmation",
          true,
          organizationId,
        );
      }

      if (!template) {
        console.warn("⚠️ No active payment template found, skipping email");
        return { success: false, error: "No active template found" };
      }

      const customerEmail = order.user_email || order.email;
      if (!customerEmail) {
        return { success: false, error: "No customer email found" };
      }

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: order.customer_name || "Cliente",
        order_number: order.order_number,
        amount: formatCurrency(order.total_amount),
        payment_method: getPaymentMethodLabel(order.payment_method),
        transaction_id: transactionId || order.payment_id || "N/A",
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Pago recibido para la orden ${order.order_number}`,
      });

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
        replyTo: orgInfo?.metadata?.support_email,
      });

      if (result.success && template) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending payment success email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send payment failed notification
  static async sendPaymentFailed(
    order: Order,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = await loadEmailTemplate("payment_failed", true);

      if (!template) {
        console.warn(
          "⚠️ No active payment_failed template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const customerEmail = order.user_email || order.email;
      if (!customerEmail) {
        return { success: false, error: "No customer email found" };
      }

      const variables = {
        ...getDefaultVariables(),
        customer_name: order.customer_name || "Cliente",
        order_number: order.order_number,
        amount: formatCurrency(order.total_amount),
        payment_method: getPaymentMethodLabel(order.payment_method),
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      const html = replaceTemplateVariables(template.content, variables);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending payment failed email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send account welcome email using DB template
  static async sendAccountWelcome(
    customerName: string,
    customerEmail: string,
    organizationId?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgInfo = await this.getOrganizationInfo(organizationId);
      const template = await loadEmailTemplate(
        "account_welcome",
        true,
        organizationId,
      );

      if (!template) {
        console.warn(
          "⚠️ No active account_welcome template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const variables = {
        ...getDefaultVariables({
          name: orgInfo?.name,
          support_email: orgInfo?.metadata?.support_email,
        }),
        customer_name: customerName,
        account_url: `${getDefaultVariables().website_url}/mi-cuenta`,
        organization_name: orgInfo?.name || "Nuestra Óptica",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      let html = replaceTemplateVariables(template.content, variables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: orgInfo?.name || "Nuestra Óptica",
        organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
        previewText: `Bienvenido a ${orgInfo?.name || "Nuestra Óptica"}`,
      });

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
        replyTo: orgInfo?.metadata?.support_email,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending account welcome email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send SaaS Notification
  static async sendSaaSNotification(
    type: string,
    recipients: string | string[],
    variables: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = await loadEmailTemplate(type, true); // No organizationId means SaaS level

      if (!template) {
        return { success: false, error: "SaaS template not found" };
      }

      const allVariables = {
        ...getDefaultVariables(), // Default system branding (Opttius)
        ...variables,
      };

      const subject = replaceTemplateVariables(template.subject, allVariables);
      let html = replaceTemplateVariables(template.content, allVariables);

      const { wrapInModernLayout } = await import("./layout");
      html = wrapInModernLayout(html, {
        organizationName: "Opttius",
        organizationColor: "#1e40af",
        previewText: subject,
      });

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      return await sendEmail({
        to: recipients,
        subject,
        html,
        text,
      });
    } catch (error) {
      console.error(`Error sending SaaS notification (${type}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send membership welcome email using DB template
  static async sendMembershipWelcome(
    customerName: string,
    customerEmail: string,
    membershipType: string,
    accessUrl: string,
    startDate?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = await loadEmailTemplate("membership_welcome", true);

      if (!template) {
        console.warn(
          "⚠️ No active membership_welcome template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const variables = {
        ...getDefaultVariables(),
        customer_name: customerName,
        membership_tier: membershipType,
        membership_start_date:
          startDate ||
          new Date().toLocaleDateString("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        access_url: accessUrl,
        duration: "7 meses",
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      const html = replaceTemplateVariables(template.content, variables);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending membership welcome email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send membership reminder email using DB template
  static async sendMembershipReminder(
    customerName: string,
    customerEmail: string,
    membershipType: string,
    daysRemaining: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = await loadEmailTemplate("membership_reminder", true);

      if (!template) {
        console.warn(
          "⚠️ No active membership_reminder template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const variables = {
        ...getDefaultVariables(),
        customer_name: customerName,
        membership_tier: membershipType,
        days_remaining: daysRemaining.toString(),
        renewal_url: `${getDefaultVariables().website_url}/membresias`,
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      const html = replaceTemplateVariables(template.content, variables);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending membership reminder email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send low stock alert to admins using DB template
  static async sendLowStockAlert(
    adminEmails: string[],
    products: Array<{ name: string; current_stock: number; min_stock: number }>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = await loadEmailTemplate("low_stock_alert", true);

      if (!template) {
        console.warn(
          "⚠️ No active low_stock_alert template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const productsHTML = products
        .map(
          (p) => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${p.name}</strong><br>
          Stock actual: ${p.current_stock} | Stock mínimo: ${p.min_stock}
        </div>
      `,
        )
        .join("");

      const productsText = products
        .map(
          (p) =>
            `${p.name} - Stock actual: ${p.current_stock} | Stock mínimo: ${p.min_stock}`,
        )
        .join("\n");

      const variables = {
        ...getDefaultVariables(),
        low_stock_products: productsHTML,
        low_stock_products_text: productsText,
        product_count: products.length.toString(),
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      const html = replaceTemplateVariables(template.content, variables);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      // Send to all admin emails
      const results = await Promise.all(
        adminEmails.map((email) =>
          sendEmail({
            to: email,
            subject,
            html,
            text,
          }),
        ),
      );

      if (results.some((r) => r.success)) {
        await incrementTemplateUsage(template.id);
      }

      return {
        success: results.some((r) => r.success),
        error: results.every((r) => !r.success)
          ? "Failed to send to all recipients"
          : undefined,
      };
    } catch (error) {
      console.error("Error sending low stock alert:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send password reset email using DB template
  static async sendPasswordReset(
    customerEmail: string,
    resetLink: string,
    customerName?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = await loadEmailTemplate("password_reset", true);

      if (!template) {
        console.warn(
          "⚠️ No active password_reset template found, skipping email",
        );
        return { success: false, error: "No active template found" };
      }

      const variables = {
        ...getDefaultVariables(),
        customer_name: customerName || "Usuario",
        reset_link: resetLink,
        reset_url: resetLink,
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      const html = replaceTemplateVariables(template.content, variables);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        text,
      });

      if (result.success) {
        await incrementTemplateUsage(template.id);
      }

      return result;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Send marketing email using DB template
  static async sendMarketingEmail(
    recipients: string[],
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{
    success: boolean;
    results: Array<{
      email: string;
      success: boolean;
      id?: string;
      error?: string;
    }>;
    errors: Array<{ email: string; error: string }>;
  }> {
    try {
      const supabase = createServiceRoleClient();
      const { data: template, error } = await supabase
        .from("system_email_templates")
        .select("*")
        .eq("id", templateId)
        .eq("is_active", true)
        .single();

      if (error || !template) {
        return {
          success: false,
          results: [],
          errors: recipients.map((email) => ({
            email,
            error: "Template not found",
          })),
        };
      }

      const allVariables = {
        ...getDefaultVariables(),
        ...variables,
      };

      const subject = replaceTemplateVariables(template.subject, allVariables);
      const html = replaceTemplateVariables(template.content, allVariables);

      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const results: Array<{
        email: string;
        success: boolean;
        id?: string;
        error?: string;
      }> = [];
      const errors: Array<{ email: string; error: string }> = [];

      // Send emails in batches
      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        const batchPromises = batch.map(async (email) => {
          try {
            const result = await sendEmail({
              to: email,
              subject,
              html,
              text,
            });
            results.push({ email, ...result });

            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (error) {
            errors.push({
              email,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        });

        await Promise.all(batchPromises);

        if (i + batchSize < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (results.some((r) => r.success)) {
        await incrementTemplateUsage(template.id);
      }

      return {
        success: errors.length === 0,
        results,
        errors,
      };
    } catch (error) {
      console.error("Error sending marketing email:", error);
      return {
        success: false,
        results: [],
        errors: recipients.map((email) => ({
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        })),
      };
    }
  }

  // Send contact form notification
  static async sendContactFormNotification(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // For Resend onboarding domain (resend.dev), we can only send to the registered email
      // When proper domain is configured, use the business contact email
      const recipientEmail = process.env.RESEND_FROM_EMAIL?.includes(
        "resend.dev",
      )
        ? process.env.RESEND_FROM_EMAIL // Use the onboarding email (registered email with Resend)
        : "contacto@opttius.cl"; // Use business email when domain is configured

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #AE0000;">Nuevo mensaje de contacto</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Nombre:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Asunto:</strong> ${data.subject}</p>
            <div style="margin-top: 20px;">
              <strong>Mensaje:</strong>
              <p style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 3px; margin-top: 10px;">
                ${data.message}
              </p>
            </div>
          </div>
          <p style="color: #666; font-size: 12px;">
            Este mensaje fue enviado desde el formulario de contacto de la web.
          </p>
        </div>
      `;

      const text = `
Nuevo mensaje de contacto

Nombre: ${data.name}
Email: ${data.email}
Asunto: ${data.subject}

Mensaje:
${data.message}

---
Este mensaje fue enviado desde el formulario de contacto de la web.
      `;

      return await sendEmail({
        to: recipientEmail,
        subject: `Contacto: ${data.subject}`,
        html,
        text,
        replyTo: data.email,
      });
    } catch (error) {
      console.error("Error sending contact form notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper method to calculate estimated delivery
  private static calculateEstimatedDelivery(): string {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days from now

    return deliveryDate.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

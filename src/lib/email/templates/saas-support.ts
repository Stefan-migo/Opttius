import { sendEmail } from "../client";
import { loadEmailTemplate, incrementTemplateUsage } from "../template-loader";
import { replaceTemplateVariables } from "../template-utils";
import { wrapInModernLayout } from "../layout";

interface SaasSupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  requester_name?: string | null;
  requester_email: string;
  organization?: {
    name: string;
    slug: string;
  } | null;
}

interface SaasSupportMessage {
  message: string;
  created_at: string;
  sender_name: string;
  sender_email: string;
  is_from_customer: boolean;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

// Helper functions
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: "Abierto",
    assigned: "Asignado",
    in_progress: "En Progreso",
    waiting_customer: "Esperando Tu Respuesta",
    resolved: "Resuelto",
    closed: "Cerrado",
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] || priority;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    technical: "Técnico",
    billing: "Facturación",
    feature_request: "Funcionalidad",
    bug_report: "Bug",
    account: "Cuenta",
    other: "Otro",
  };
  return labels[category] || category;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "#6B7280",
    medium: "#3B82F6",
    high: "#F59E0B",
    urgent: "#EF4444",
  };
  return colors[priority] || "#3B82F6";
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

/**
 * Send ticket creation notification to requester
 * Uses DB template when available, falls back to hardcoded HTML
 */
export async function sendSaasTicketCreatedEmail(ticket: SaasSupportTicket) {
  const ticketUrl = `${APP_URL}/support/ticket/${ticket.ticket_number}`;
  const requesterName = ticket.requester_name ? ` ${ticket.requester_name}` : "";
  const organizationNameBlock = ticket.organization
    ? `<p style="margin: 0 0 8px 0;"><strong>Organización:</strong> ${ticket.organization.name}</p>`
    : "";

  const template = await loadEmailTemplate("saas_support_ticket_created", true);

  if (template) {
    const variables: Record<string, string> = {
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      category_label: getCategoryLabel(ticket.category),
      priority_label: getPriorityLabel(ticket.priority),
      status_label: getStatusLabel(ticket.status),
      requester_name: requesterName,
      organization_name: ticket.organization?.name || "",
      organization_name_block: organizationNameBlock,
      ticket_url: ticketUrl,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let content = replaceTemplateVariables(template.content, variables);
    content = wrapInModernLayout(content, {
      organizationName: "Opttius",
      organizationColor: "#1A2B23",
      previewText: "Tu ticket de soporte ha sido creado",
    });

    const text = htmlToText(content);
    const result = await sendEmail({
      to: ticket.requester_email,
      subject,
      html: content,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }
    return result;
  }

  // Fallback: hardcoded HTML
  const subject = `Ticket de Soporte Creado: ${ticket.subject} (#${ticket.ticket_number})`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr><td style="background: linear-gradient(135deg, #1A2B23 0%, #2d4a3e 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">OPTTIUS</h1>
          <p style="margin: 10px 0 0 0; color: #C5A059; font-size: 14px;">Soporte Técnico SaaS</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #1A2B23; font-size: 24px;">Tu ticket de soporte ha sido creado</h2>
          <p style="margin: 0 0 20px 0; color: #666; font-size: 16px;">Hola${requesterName},</p>
          <p style="margin: 0 0 20px 0; color: #666; font-size: 16px;">Hemos recibido tu solicitud. Detalles:</p>
          <div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Número:</strong> #${ticket.ticket_number}</p>
            <p style="margin: 0 0 8px 0;"><strong>Asunto:</strong> ${ticket.subject}</p>
            <p style="margin: 0 0 8px 0;"><strong>Categoría:</strong> ${getCategoryLabel(ticket.category)}</p>
            <p style="margin: 0 0 8px 0;"><strong>Prioridad:</strong> ${getPriorityLabel(ticket.priority)}</p>
            ${ticket.organization ? `<p style="margin: 0;"><strong>Organización:</strong> ${ticket.organization.name}</p>` : ""}
          </div>
          <p style="margin: 20px 0;"><a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Estado del Ticket</a></p>
        </td></tr>
        <tr><td style="background: #F9F7F2; padding: 20px; text-align: center; font-size: 12px; color: #666;">soporte@opttius.cl</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `OPTTIUS - Ticket creado\n\nHola${requesterName},\n\nTicket #${ticket.ticket_number}: ${ticket.subject}\nVer: ${ticketUrl}`;
  return sendEmail({ to: ticket.requester_email, subject, html, text, replyTo: "soporte@opttius.cl" });
}

/**
 * Send new response notification to requester
 */
export async function sendSaasNewResponseEmail(
  ticket: SaasSupportTicket,
  message: SaasSupportMessage,
) {
  const ticketUrl = `${APP_URL}/support/ticket/${ticket.ticket_number}`;
  const requesterName = ticket.requester_name ? ` ${ticket.requester_name}` : "";
  const messageLabel = message.is_from_customer ? "Tu mensaje:" : "Respuesta del equipo:";
  const createdAt = new Date(message.created_at).toLocaleString("es-CL");

  const template = await loadEmailTemplate("saas_support_new_response", true);

  if (template) {
    const variables: Record<string, string> = {
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      message: message.message,
      message_label: messageLabel,
      sender_name: message.sender_name,
      created_at: createdAt,
      requester_name: requesterName,
      ticket_url: ticketUrl,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let content = replaceTemplateVariables(template.content, variables);
    content = wrapInModernLayout(content, {
      organizationName: "Opttius",
      organizationColor: "#1A2B23",
      previewText: "Nueva respuesta en tu ticket",
    });

    const text = htmlToText(content);
    const result = await sendEmail({
      to: ticket.requester_email,
      subject,
      html: content,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }
    return result;
  }

  // Fallback
  const subject = `Nueva respuesta en tu ticket #${ticket.ticket_number}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr><td style="background: linear-gradient(135deg, #1A2B23 0%, #2d4a3e 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">OPTTIUS</h1>
          <p style="margin: 10px 0 0 0; color: #C5A059; font-size: 14px;">Soporte Técnico SaaS</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #1A2B23;">Nueva respuesta en tu ticket</h2>
          <p style="margin: 0 0 20px 0; color: #666;">Hola${requesterName},</p>
          <p style="margin: 0 0 20px 0; color: #666;">Nuestro equipo ha respondido a tu ticket <strong>#${ticket.ticket_number}</strong>.</p>
          <div style="background: #F9F7F2; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #1A2B23; font-weight: 600;">${messageLabel}</p>
            <p style="margin: 0; white-space: pre-wrap;">${message.message}</p>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">${message.sender_name} - ${createdAt}</p>
          </div>
          <p><a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Ticket Completo</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `OPTTIUS - Nueva respuesta\n\nHola${requesterName},\n\nTicket #${ticket.ticket_number}\n${messageLabel}\n${message.message}\nVer: ${ticketUrl}`;
  return sendEmail({ to: ticket.requester_email, subject, html, text, replyTo: "soporte@opttius.cl" });
}

/**
 * Send ticket assignment notification to root/dev
 */
export async function sendSaasTicketAssignedEmail(
  ticket: SaasSupportTicket,
  assignedToEmail: string,
  assignedToName?: string,
) {
  const ticketUrl = `${APP_URL}/admin/saas-management/support/tickets/${ticket.id}`;
  const assignedName = assignedToName ? ` ${assignedToName}` : "";
  const requesterName = ticket.requester_name || ticket.requester_email;
  const organizationNameBlock = ticket.organization
    ? `<p style="margin: 0 0 8px 0;"><strong>Organización:</strong> ${ticket.organization.name}</p>`
    : "";

  const template = await loadEmailTemplate("saas_support_ticket_assigned", true);

  if (template) {
    const variables: Record<string, string> = {
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      priority_label: getPriorityLabel(ticket.priority),
      requester_name: requesterName,
      organization_name: ticket.organization?.name || "",
      organization_name_block: organizationNameBlock,
      assigned_to_name: assignedName,
      ticket_url: ticketUrl,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let content = replaceTemplateVariables(template.content, variables);
    content = wrapInModernLayout(content, {
      organizationName: "Opttius",
      organizationColor: "#1A2B23",
      previewText: "Nuevo ticket asignado",
    });

    const text = htmlToText(content);
    const result = await sendEmail({
      to: assignedToEmail,
      subject,
      html: content,
      text,
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }
    return result;
  }

  // Fallback
  const subject = `Ticket asignado: ${ticket.subject} (#${ticket.ticket_number})`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr><td style="background: linear-gradient(135deg, #1A2B23 0%, #2d4a3e 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">OPTTIUS</h1>
          <p style="margin: 10px 0 0 0; color: #C5A059; font-size: 14px;">Sistema de Gestión SaaS</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #1A2B23;">Nuevo ticket asignado</h2>
          <p style="margin: 0 0 20px 0; color: #666;">Hola${assignedName},</p>
          <div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Número:</strong> #${ticket.ticket_number}</p>
            <p style="margin: 0 0 8px 0;"><strong>Asunto:</strong> ${ticket.subject}</p>
            <p style="margin: 0 0 8px 0;"><strong>Prioridad:</strong> ${getPriorityLabel(ticket.priority)}</p>
            <p style="margin: 0 0 8px 0;"><strong>Solicitante:</strong> ${requesterName}</p>
            ${ticket.organization ? `<p style="margin: 0;"><strong>Organización:</strong> ${ticket.organization.name}</p>` : ""}
          </div>
          <p><a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Ticket</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `OPTTIUS - Ticket asignado\n\nHola${assignedName},\n\n#${ticket.ticket_number}: ${ticket.subject}\nVer: ${ticketUrl}`;
  return sendEmail({ to: assignedToEmail, subject, html, text });
}

/**
 * Send ticket resolution notification to requester
 */
export async function sendSaasTicketResolvedEmail(
  ticket: SaasSupportTicket,
  resolution?: string | null,
) {
  const ticketUrl = `${APP_URL}/support/ticket/${ticket.ticket_number}`;
  const requesterName = ticket.requester_name ? ` ${ticket.requester_name}` : "";
  const resolutionBlock = resolution
    ? `<div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0 0 10px 0; color: #059669; font-weight: 600; font-size: 14px;">Resolución:</p>
  <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${resolution}</p>
</div>`
    : "";

  const template = await loadEmailTemplate("saas_support_ticket_resolved", true);

  if (template) {
    const variables: Record<string, string> = {
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      resolution: resolution || "",
      resolution_block: resolutionBlock,
      requester_name: requesterName,
      ticket_url: ticketUrl,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let content = replaceTemplateVariables(template.content, variables);
    content = wrapInModernLayout(content, {
      organizationName: "Opttius",
      organizationColor: "#059669",
      previewText: "Tu ticket ha sido resuelto",
    });

    const text = htmlToText(content);
    const result = await sendEmail({
      to: ticket.requester_email,
      subject,
      html: content,
      text,
      replyTo: "soporte@opttius.cl",
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }
    return result;
  }

  // Fallback
  const subject = `Ticket resuelto: ${ticket.subject} (#${ticket.ticket_number})`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr><td style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">✓ Ticket Resuelto</h1>
          <p style="margin: 10px 0 0 0; color: #D1FAE5; font-size: 14px;">OPTTIUS Soporte Técnico</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #059669;">Tu ticket ha sido resuelto</h2>
          <p style="margin: 0 0 20px 0; color: #666;">Hola${requesterName},</p>
          <p style="margin: 0 0 20px 0; color: #666;">Tu ticket <strong>#${ticket.ticket_number}</strong> ha sido resuelto.</p>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10B981;">
            <p style="margin: 0; color: #059669; font-weight: 600;">Ticket: ${ticket.subject}</p>
          </div>
          ${resolution ? `<div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 6px; margin: 20px 0;"><p style="margin: 0 0 10px 0; color: #059669; font-weight: 600;">Resolución:</p><p style="margin: 0; white-space: pre-wrap;">${resolution}</p></div>` : ""}
          <p><a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background: #059669; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Ticket</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `OPTTIUS - Ticket resuelto\n\nHola${requesterName},\n\nTicket #${ticket.ticket_number} resuelto.\n${resolution ? `Resolución:\n${resolution}\n` : ""}Ver: ${ticketUrl}`;
  return sendEmail({ to: ticket.requester_email, subject, html, text, replyTo: "soporte@opttius.cl" });
}

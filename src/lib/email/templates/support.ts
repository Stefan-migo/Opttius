import { sendEmail } from "../client";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  customer_name?: string;
  customer_email: string;
}

interface TicketMessage {
  message: string;
  created_at: string;
  is_from_customer: boolean;
}

/**
 * Send ticket creation notification to customer
 */
export async function sendTicketCreatedEmail(ticket: SupportTicket) {
  const subject = `Ticket creado: ${ticket.subject} (#${ticket.ticket_number})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Creado</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">OPTTIUS CONSCIENTE</h1>
              <p style="margin: 10px 0 0 0; color: #f0e6d2; font-size: 14px;">Soporte al Cliente</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #8B4513; font-size: 24px; font-weight: 600;">
                Tu ticket de soporte ha sido creado
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Hola${ticket.customer_name ? ` ${ticket.customer_name}` : ""},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Hemos recibido tu solicitud de soporte y nuestro equipo está trabajando en ella. 
                A continuación, encontrarás los detalles de tu ticket:
              </p>
              
              <!-- Ticket Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #8B4513; font-weight: 600; width: 140px;">Número de Ticket:</td>
                        <td style="color: #333333; font-weight: 600;">#${ticket.ticket_number}</td>
                      </tr>
                      <tr>
                        <td style="color: #8B4513; font-weight: 600;">Asunto:</td>
                        <td style="color: #333333;">${ticket.subject}</td>
                      </tr>
                      <tr>
                        <td style="color: #8B4513; font-weight: 600;">Prioridad:</td>
                        <td style="color: #333333;">${getPriorityLabel(ticket.priority)}</td>
                      </tr>
                      <tr>
                        <td style="color: #8B4513; font-weight: 600;">Estado:</td>
                        <td style="color: #333333;">${getStatusLabel(ticket.status)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #e65100; font-size: 14px; line-height: 1.6;">
                  <strong>💡 Importante:</strong> Guarda este número de ticket para futuras referencias. 
                  Puedes responder directamente a este email y tu mensaje se agregará automáticamente al ticket.
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Nos esforzamos por responder a todos los tickets dentro de las próximas 24 horas. 
                Te notificaremos por email cuando haya actualizaciones en tu ticket.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/soporte/tickets/${ticket.id}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Ver Ticket
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                ¿Tienes preguntas? Responde a este email o contáctanos en:
              </p>
              <p style="margin: 0; color: #8B4513; font-size: 14px; font-weight: 600;">
                contacto@daluzconsciente.com
              </p>
              <p style="margin: 15px 0 0 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} OPTTIUS CONSCIENTE. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
OPTTIUS CONSCIENTE - Tu ticket de soporte ha sido creado

Hola${ticket.customer_name ? ` ${ticket.customer_name}` : ""},

Hemos recibido tu solicitud de soporte y nuestro equipo está trabajando en ella.

Detalles del ticket:
- Número de Ticket: #${ticket.ticket_number}
- Asunto: ${ticket.subject}
- Prioridad: ${getPriorityLabel(ticket.priority)}
- Estado: ${getStatusLabel(ticket.status)}

Nos esforzamos por responder a todos los tickets dentro de las próximas 24 horas.

Ver ticket: ${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/soporte/tickets/${ticket.id}

¿Tienes preguntas? Responde a este email o contáctanos en contacto@daluzconsciente.com

© ${new Date().getFullYear()} OPTTIUS CONSCIENTE
  `;

  return sendEmail({
    to: ticket.customer_email,
    subject,
    html,
    text,
    replyTo: "soporte@opttius.cl",
  });
}

/**
 * Send new response notification to customer
 */
export async function sendNewResponseEmail(
  ticket: SupportTicket,
  message: TicketMessage,
) {
  const subject = `Nueva respuesta en tu ticket #${ticket.ticket_number}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Respuesta</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">OPTTIUS CONSCIENTE</h1>
              <p style="margin: 10px 0 0 0; color: #f0e6d2; font-size: 14px;">Soporte al Cliente</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #8B4513; font-size: 24px; font-weight: 600;">
                Nueva respuesta de soporte
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Hola${ticket.customer_name ? ` ${ticket.customer_name}` : ""},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Nuestro equipo de soporte ha respondido a tu ticket <strong>#${ticket.ticket_number}</strong>.
              </p>
              
              <!-- Ticket Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
                <tr>
                  <td style="padding: 15px 20px; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #8B4513; font-weight: 600; font-size: 14px;">Ticket: ${ticket.subject}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; background-color: #ffffff;">
                    <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Respuesta del equipo:</p>
                    <div style="color: #333333; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${message.message}</div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Si necesitas agregar más información, puedes responder directamente a este email 
                o visitar el ticket en nuestro portal de soporte.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/soporte/tickets/${ticket.id}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Ver Ticket Completo
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                ¿Tienes preguntas? Responde a este email o contáctanos en:
              </p>
              <p style="margin: 0; color: #8B4513; font-size: 14px; font-weight: 600;">
                soporte@opttius.cl
              </p>
              <p style="margin: 15px 0 0 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} OPTTIUS CONSCIENTE. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
OPTTIUS CONSCIENTE - Nueva respuesta en tu ticket

Hola${ticket.customer_name ? ` ${ticket.customer_name}` : ""},

Nuestro equipo de soporte ha respondido a tu ticket #${ticket.ticket_number}.

Ticket: ${ticket.subject}

Respuesta del equipo:
${message.message}

Ver ticket completo: ${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/soporte/tickets/${ticket.id}

© ${new Date().getFullYear()} OPTTIUS CONSCIENTE
  `;

  return sendEmail({
    to: ticket.customer_email,
    subject,
    html,
    text,
    replyTo: "soporte@opttius.cl",
  });
}

/**
 * Send status change notification to customer
 */
export async function sendStatusChangeEmail(
  ticket: SupportTicket,
  oldStatus: string,
  newStatus: string,
) {
  const subject = `Actualización de ticket #${ticket.ticket_number}: ${getStatusLabel(newStatus)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estado Actualizado</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">OPTTIUS CONSCIENTE</h1>
              <p style="margin: 10px 0 0 0; color: #f0e6d2; font-size: 14px;">Soporte al Cliente</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #8B4513; font-size: 24px; font-weight: 600;">
                Actualización del estado de tu ticket
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Hola${ticket.customer_name ? ` ${ticket.customer_name}` : ""},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                El estado de tu ticket <strong>#${ticket.ticket_number}</strong> ha cambiado.
              </p>
              
              <!-- Status Change Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px 0; color: #8B4513; font-weight: 600; font-size: 14px;">Ticket: ${ticket.subject}</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" align="center" style="padding: 15px; background-color: #ffebee; border-radius: 6px;">
                          <p style="margin: 0 0 5px 0; color: #c62828; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Estado Anterior</p>
                          <p style="margin: 0; color: #c62828; font-weight: 600; font-size: 16px;">${getStatusLabel(oldStatus)}</p>
                        </td>
                        <td width="40" align="center">
                          <p style="margin: 0; color: #999999; font-size: 20px;">→</p>
                        </td>
                        <td width="50%" align="center" style="padding: 15px; background-color: #e8f5e9; border-radius: 6px;">
                          <p style="margin: 0 0 5px 0; color: #2e7d32; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Nuevo Estado</p>
                          <p style="margin: 0; color: #2e7d32; font-weight: 600; font-size: 16px;">${getStatusLabel(newStatus)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${
                newStatus === "resolved" || newStatus === "closed"
                  ? `
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px; line-height: 1.6;">
                  <strong>✅ Ticket ${newStatus === "resolved" ? "resuelto" : "cerrado"}:</strong> 
                  ${
                    newStatus === "resolved"
                      ? "Tu problema ha sido resuelto. Si necesitas ayuda adicional, puedes responder a este ticket."
                      : "Este ticket ha sido cerrado. Si necesitas ayuda adicional, puedes crear un nuevo ticket."
                  }
                </p>
              </div>
              `
                  : ""
              }
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/soporte/tickets/${ticket.id}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Ver Ticket
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                ¿Tienes preguntas? Responde a este email o contáctanos en:
              </p>
              <p style="margin: 0; color: #8B4513; font-size: 14px; font-weight: 600;">
                soporte@opttius.cl
              </p>
              <p style="margin: 15px 0 0 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} OPTTIUS CONSCIENTE. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
OPTTIUS CONSCIENTE - Actualización del estado de tu ticket

Hola${ticket.customer_name ? ` ${ticket.customer_name}` : ""},

El estado de tu ticket #${ticket.ticket_number} ha cambiado.

Ticket: ${ticket.subject}
Estado anterior: ${getStatusLabel(oldStatus)}
Nuevo estado: ${getStatusLabel(newStatus)}

Ver ticket: ${process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl"}/soporte/tickets/${ticket.id}

© ${new Date().getFullYear()} OPTTIUS CONSCIENTE
  `;

  return sendEmail({
    to: ticket.customer_email,
    subject,
    html,
    text,
    replyTo: "soporte@opttius.cl",
  });
}

// Helper functions
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: "Abierto",
    in_progress: "En Progreso",
    pending_customer: "Esperando Cliente",
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

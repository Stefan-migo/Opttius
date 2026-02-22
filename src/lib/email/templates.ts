import { emailConfig } from "./client";

// Types for template data
export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  total: number;
  paymentMethod: string;
  orderDate: string;
  estimatedDelivery?: string;
}

export interface PaymentNotificationData {
  orderNumber: string;
  customerName: string;
  amount: number;
  status: "success" | "failed" | "pending";
  paymentMethod: string;
  transactionId?: string;
}

export interface MembershipWelcomeData {
  customerName: string;
  membershipType: string;
  accessUrl: string;
  duration: string;
  startDate: string;
}

// Utility function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

// Base email layout
function createBaseLayout(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #8B5A2B 0%, #D4A574 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 300;
    }
    .content {
      padding: 30px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #8B5A2B;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .button:hover {
      background: #7A4D23;
    }
    .order-details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .item-row:last-child {
      border-bottom: none;
      font-weight: bold;
      margin-top: 10px;
      padding-top: 15px;
      border-top: 2px solid #8B5A2B;
    }
    @media (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OPTTIUS CONSCIENTE</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Biocosmética & Bienestar Holístico</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>OPTTIUS CONSCIENTE</strong></p>
      <p>Argentina | contacto@opttius.cl</p>
      <p style="margin-top: 15px;">
        <a href="${emailConfig.domain}" style="color: #8B5A2B;">Visitar sitio web</a> |
        <a href="${emailConfig.domain}/contacto" style="color: #8B5A2B;">Contacto</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Order confirmation email template
export function createOrderConfirmationEmail(data: OrderConfirmationData): {
  html: string;
  text: string;
  subject: string;
} {
  const itemsHtml = data.items
    .map(
      (item) => `
    <div class="item-row">
      <span>${item.name} (x${item.quantity})</span>
      <span>${formatCurrency(item.price * item.quantity)}</span>
    </div>
  `,
    )
    .join("");

  const content = `
    <h2>¡Gracias por tu pedido, ${data.customerName}!</h2>
    <p>Hemos recibido tu pedido <strong>#${data.orderNumber}</strong> y lo estamos procesando.</p>
    
    <div class="order-details">
      <h3 style="margin-top: 0; color: #8B5A2B;">Detalles del pedido</h3>
      ${itemsHtml}
      <div class="item-row">
        <span>Total</span>
        <span>${formatCurrency(data.total)}</span>
      </div>
    </div>

    <p><strong>Método de pago:</strong> ${data.paymentMethod}</p>
    <p><strong>Fecha del pedido:</strong> ${data.orderDate}</p>
    ${data.estimatedDelivery ? `<p><strong>Entrega estimada:</strong> ${data.estimatedDelivery}</p>` : ""}

    <p>Te enviaremos actualizaciones sobre el estado de tu pedido a esta dirección de correo.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${emailConfig.domain}/mi-cuenta/pedidos" class="button">Ver detalles del pedido</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos respondiendo a este correo.
    </p>
  `;

  const text = `
¡Gracias por tu pedido, ${data.customerName}!

Hemos recibido tu pedido #${data.orderNumber} y lo estamos procesando.

Detalles del pedido:
${data.items.map((item) => `${item.name} (x${item.quantity}): ${formatCurrency(item.price * item.quantity)}`).join("\n")}

Total: ${formatCurrency(data.total)}
Método de pago: ${data.paymentMethod}
Fecha del pedido: ${data.orderDate}
${data.estimatedDelivery ? `Entrega estimada: ${data.estimatedDelivery}` : ""}

Ver detalles: ${emailConfig.domain}/mi-cuenta/pedidos

OPTTIUS CONSCIENTE
Argentina | contacto@opttius.cl
  `;

  return {
    html: createBaseLayout(content, "Confirmación de pedido"),
    text,
    subject: `Confirmación de pedido #${data.orderNumber} - OPTTIUS CONSCIENTE`,
  };
}

// Payment success email template
export function createPaymentSuccessEmail(data: PaymentNotificationData): {
  html: string;
  text: string;
  subject: string;
} {
  const content = `
    <h2>¡Pago confirmado, ${data.customerName}!</h2>
    <p>Tu pago ha sido procesado exitosamente.</p>
    
    <div class="order-details">
      <h3 style="margin-top: 0; color: #8B5A2B;">Detalles del pago</h3>
      <div class="item-row">
        <span>Pedido</span>
        <span>#${data.orderNumber}</span>
      </div>
      <div class="item-row">
        <span>Monto</span>
        <span>${formatCurrency(data.amount)}</span>
      </div>
      <div class="item-row">
        <span>Método de pago</span>
        <span>${data.paymentMethod}</span>
      </div>
      ${
        data.transactionId
          ? `
      <div class="item-row">
        <span>ID de transacción</span>
        <span>${data.transactionId}</span>
      </div>
      `
          : ""
      }
    </div>

    <p>Tu pedido está siendo preparado y te notificaremos cuando esté listo para el envío.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${emailConfig.domain}/mi-cuenta/pedidos" class="button">Ver mi pedido</a>
    </div>
  `;

  const text = `
¡Pago confirmado, ${data.customerName}!

Tu pago ha sido procesado exitosamente.

Detalles del pago:
Pedido: #${data.orderNumber}
Monto: ${formatCurrency(data.amount)}
Método de pago: ${data.paymentMethod}
${data.transactionId ? `ID de transacción: ${data.transactionId}` : ""}

Tu pedido está siendo preparado y te notificaremos cuando esté listo para el envío.

Ver mi pedido: ${emailConfig.domain}/mi-cuenta/pedidos

OPTTIUS CONSCIENTE
Argentina | contacto@opttius.cl
  `;

  return {
    html: createBaseLayout(content, "Pago confirmado"),
    text,
    subject: `Pago confirmado - Pedido #${data.orderNumber}`,
  };
}

// Payment failed email template
export function createPaymentFailedEmail(data: PaymentNotificationData): {
  html: string;
  text: string;
  subject: string;
} {
  const content = `
    <h2>Problema con el pago, ${data.customerName}</h2>
    <p>No pudimos procesar el pago para tu pedido <strong>#${data.orderNumber}</strong>.</p>
    
    <div class="order-details">
      <h3 style="margin-top: 0; color: #8B5A2B;">Detalles</h3>
      <div class="item-row">
        <span>Pedido</span>
        <span>#${data.orderNumber}</span>
      </div>
      <div class="item-row">
        <span>Monto</span>
        <span>${formatCurrency(data.amount)}</span>
      </div>
      <div class="item-row">
        <span>Método de pago</span>
        <span>${data.paymentMethod}</span>
      </div>
    </div>

    <p><strong>¿Qué puedes hacer?</strong></p>
    <ul>
      <li>Verificar que tu tarjeta tenga fondos suficientes</li>
      <li>Intentar con otro método de pago</li>
      <li>Contactarnos si necesitas ayuda</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${emailConfig.domain}/checkout?order=${data.orderNumber}" class="button">Intentar nuevamente</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      Tu pedido se mantendrá reservado por 24 horas. Si necesitas ayuda, contáctanos.
    </p>
  `;

  const text = `
Problema con el pago, ${data.customerName}

No pudimos procesar el pago para tu pedido #${data.orderNumber}.

Detalles:
Pedido: #${data.orderNumber}
Monto: ${formatCurrency(data.amount)}
Método de pago: ${data.paymentMethod}

¿Qué puedes hacer?
- Verificar que tu tarjeta tenga fondos suficientes
- Intentar con otro método de pago
- Contactarnos si necesitas ayuda

Intentar nuevamente: ${emailConfig.domain}/checkout?order=${data.orderNumber}

Tu pedido se mantendrá reservado por 24 horas.

OPTTIUS CONSCIENTE
Argentina | contacto@opttius.cl
  `;

  return {
    html: createBaseLayout(content, "Problema con el pago"),
    text,
    subject: `Problema con el pago - Pedido #${data.orderNumber}`,
  };
}

// Membership welcome email template
export function createMembershipWelcomeEmail(data: MembershipWelcomeData): {
  html: string;
  text: string;
  subject: string;
} {
  const content = `
    <h2>¡Bienvenida a tu transformación, ${data.customerName}!</h2>
    <p>Es un honor acompañarte en este viaje de 7 meses hacia una versión más consciente y radiante de ti misma.</p>
    
    <div class="order-details">
      <h3 style="margin-top: 0; color: #8B5A2B;">Detalles de tu membresía</h3>
      <div class="item-row">
        <span>Programa</span>
        <span>${data.membershipType}</span>
      </div>
      <div class="item-row">
        <span>Duración</span>
        <span>${data.duration}</span>
      </div>
      <div class="item-row">
        <span>Inicio</span>
        <span>${data.startDate}</span>
      </div>
    </div>

    <p><strong>¿Qué incluye tu membresía?</strong></p>
    <ul>
      <li>7 módulos de transformación personal</li>
      <li>Ejercicios y meditaciones guiadas</li>
      <li>Recursos descargables exclusivos</li>
      <li>Acceso a la comunidad privada</li>
      <li>Sesiones de preguntas y respuestas</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.accessUrl}" class="button">Acceder a mi área privada</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      Guarda este correo para futuras referencias. Tu área privada estará disponible 24/7 durante toda tu membresía.
    </p>
  `;

  const text = `
¡Bienvenida a tu transformación, ${data.customerName}!

Es un honor acompañarte en este viaje de 7 meses hacia una versión más consciente y radiante de ti misma.

Detalles de tu membresía:
Programa: ${data.membershipType}
Duración: ${data.duration}
Inicio: ${data.startDate}

¿Qué incluye tu membresía?
- 7 módulos de transformación personal
- Ejercicios y meditaciones guiadas
- Recursos descargables exclusivos
- Acceso a la comunidad privada
- Sesiones de preguntas y respuestas

Acceder a mi área privada: ${data.accessUrl}

Guarda este correo para futuras referencias.

OPTTIUS CONSCIENTE
Argentina | contacto@opttius.cl
  `;

  return {
    html: createBaseLayout(content, "Bienvenida a tu transformación"),
    text,
    subject: `¡Bienvenida a tu transformación! - OPTTIUS CONSCIENTE`,
  };
}

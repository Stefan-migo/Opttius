---
name: emails-optical-supabase
description: Expert guide for building and maintaining the email management system for optical shops with Supabase. Use when working on emails, plantillas de email, EmailNotificationService, Resend, system_email_templates, email templates, notificaciones por correo, confirmaciones de cita, presupuestos enviados, work order ready, or optical email workflows. Covers multi-tenant architecture, template loading, variables, layout, and optical-specific email patterns.
---

# Email Management para Ópticas con Supabase

Guía para desarrollar y mantener el sistema de emails de Opttius: plantillas, envío, variables y flujos para óptica (B2C) y SaaS (B2B).

## Cuándo Usar Este Skill

- Módulo `/admin/saas-management/emails` (SaaS) o `/admin/system` tab Email (Óptica)
- Plantillas `system_email_templates`
- `EmailNotificationService`, `sendEmail`, `loadEmailTemplate`
- Confirmaciones de pedido, cita, presupuesto, trabajo listo
- Notificaciones SaaS (welcome, trial, payment)
- Resend, variables `{{variable}}`, layout de emails

## Arquitectura del Sistema

### Capas

| Capa           | Componente           | Responsabilidad                                                            |
| -------------- | -------------------- | -------------------------------------------------------------------------- |
| **Cliente**    | `client.ts`          | Resend SDK, `sendEmail`, `sendBatchEmails`, normalización de destinatarios |
| **Plantillas** | `template-loader.ts` | Cargar desde DB por `type` + `organization_id`, fallback a sistema         |
| **Variables**  | `template-utils.ts`  | `replaceTemplateVariables`, `getDefaultVariables`, formateo de items       |
| **Layout**     | `layout.ts`          | `wrapInModernLayout` con branding de organización                          |
| **Servicio**   | `notifications.ts`   | `EmailNotificationService` con métodos estáticos por tipo                  |

### Estrategia Multi-Tenant

1. **Óptica (B2C):** Plantillas con `organization_id` o `organization_id IS NULL` (default sistema)
2. **SaaS (B2B):** Plantillas con `category = 'saas'` y `organization_id IS NULL`
3. **Prioridad:** Org específica > default sistema

```typescript
// template-loader.ts: org primero, luego default
query.or(`organization_id.eq.${orgId},organization_id.is.null`);
query.order("organization_id", { ascending: false, nullsFirst: false });
```

## Patrones de Código

### Envío de Email (Patrón Estándar)

```typescript
// 1. Cargar plantilla
const template = await loadEmailTemplate(
  "order_confirmation",
  true,
  organizationId,
);
if (!template) return { success: false, error: "Template not found" };

// 2. Preparar variables
const variables = {
  ...getDefaultVariables({
    name: orgInfo?.name,
    support_email: orgInfo?.metadata?.support_email,
  }),
  customer_name: order.customer_name || "Cliente",
  order_number: order.order_number,
  // ...
};

// 3. Reemplazar y envolver en layout
const subject = replaceTemplateVariables(template.subject, variables);
let html = replaceTemplateVariables(template.content, variables);
html = wrapInModernLayout(html, {
  organizationName: orgInfo?.name || "Nuestra Óptica",
  organizationColor: orgInfo?.metadata?.primary_color || "#1e40af",
  previewText: "Confirmación de tu orden",
});

// 4. Generar texto plano
const text = html
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, "")
  .replace(/\n\s*\n/g, "\n")
  .trim();

// 5. Enviar
const result = await sendEmail({ to, subject, html, text, replyTo });
if (result.success) await incrementTemplateUsage(template.id);
```

### Variables Disponibles

| Variable                | Contexto           | Ejemplo               |
| ----------------------- | ------------------ | --------------------- |
| `{{organization_name}}` | Óptica/SaaS        | Nombre de la óptica   |
| `{{customer_name}}`     | Óptica             | Nombre del cliente    |
| `{{order_number}}`      | Pedidos            | ORD-12345             |
| `{{appointment_date}}`  | Citas              | 21 de febrero de 2026 |
| `{{quote_number}}`      | Presupuestos       | COT-001               |
| `{{work_order_number}}` | Órdenes de trabajo | OT-456                |
| `{{support_email}}`     | Footer             | soporte@opttius.cl    |
| `{{website_url}}`       | Links              | https://opttius.cl    |

## Configuración de Dominio (B2C Ópticas)

- **From (remitente):** `RESEND_FROM_EMAIL` = `noreply@opttius.cl` (global, dominio verificado en Resend)
- **Reply-To:** Por organización vía `organizations.metadata.support_email`; fallback `contacto@opttius.cl`
- **Estrategia:** Todas las ópticas envían desde `opttius.cl`. Las respuestas van a la óptica vía `replyTo`.
- **Dominio propio por óptica:** Opción futura (requiere verificar dominio en Resend por cada org)

## Tipos de Plantilla (Óptica)

| type                       | Uso                       |
| -------------------------- | ------------------------- |
| `order_confirmation`       | Confirmación de pedido    |
| `order_shipped`            | Pedido enviado            |
| `order_delivered`          | Pedido entregado          |
| `appointment_confirmation` | Cita confirmada           |
| `appointment_reminder`     | Recordatorio 24h          |
| `appointment_reminder_2h`  | Recordatorio 2h           |
| `appointment_cancelation`  | Cita cancelada            |
| `prescription_ready`       | Receta lista              |
| `prescription_expiring`    | Receta por vencer         |
| `quote_sent`               | Presupuesto enviado       |
| `work_order_ready`         | Trabajo listo para retiro |
| `account_welcome`          | Bienvenida cliente        |
| `low_stock_alert`          | Alerta stock bajo         |
| `payment_success`          | Pago exitoso              |
| `payment_failed`           | Pago fallido              |

## Tipos de Plantilla (SaaS)

| type                        | Uso                      |
| --------------------------- | ------------------------ |
| `saas_welcome`              | Bienvenida administrador |
| `saas_trial_ending`         | Trial por terminar       |
| `saas_subscription_success` | Suscripción activa       |
| `saas_payment_failed`       | Pago fallido             |
| `saas_payment_reminder`     | Recordatorio de pago     |
| `saas_security_alert`       | Alerta de seguridad      |
| `saas_onboarding`           | Onboarding               |
| `saas_maintenance`          | Mantenimiento programado |

## Control de Acceso

- **Óptica:** Admin de organización ve plantillas org + defaults. Solo puede editar/crear las propias.
- **SaaS:** Solo `root` o `dev` acceden a `/admin/saas-management/emails`.
- **Sistema:** Plantillas `is_system = true` no se pueden modificar; crear custom en su lugar.

## Mejores Prácticas

1. **Siempre** pasar `organizationId` al enviar emails de óptica para branding correcto.
2. **Siempre** generar `text` (plain text) además de `html` para clientes de correo sin HTML.
3. **Usar** `wrapInModernLayout` para consistencia visual y responsive.
4. **Validar** email del destinatario antes de enviar.
5. **No fallar** el flujo principal si el email falla; loguear y retornar `{ success: false }`.
6. **Incrementar** `usage_count` solo tras envío exitoso.
7. **Resend dev:** Con dominio `resend.dev`, todos los emails se redirigen al inbox verificado.

## Configuración

```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@opttius.cl   # Dominio verificado en Resend (opttius.cl)
# Reply-To por óptica: organizations.metadata.support_email (ej. contacto@opticaandina.cl)
# Fallback Reply-To: contacto@opttius.cl
```

## Referencias

- Documentación detallada: [docs/email/EMAIL_SYSTEM.md](../../docs/email/EMAIL_SYSTEM.md)
- Estado de implementación: [docs/email/EMAIL_IMPLEMENTATION_STATUS.md](../../docs/email/EMAIL_IMPLEMENTATION_STATUS.md)
- Notificaciones: skill `notifications-optical-supabase`
- SaaS Management: skill `saas-management-optical-supabase`

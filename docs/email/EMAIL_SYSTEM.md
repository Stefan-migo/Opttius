# Sistema de Manejo de Emails - Opttius

Documentación detallada del sistema de emails para ópticas. Base de la arquitectura y guía de desarrollo.

**Última actualización:** 2026-02-21  
**Versión:** 1.0

---

## 1. Resumen Ejecutivo

El sistema de emails de Opttius es un módulo multi-tenant que gestiona comunicaciones por correo electrónico para:

- **Ópticas (B2C):** Confirmaciones de pedido, citas, presupuestos, órdenes de trabajo, recetas, alertas de stock
- **SaaS (B2B):** Bienvenida, trial, suscripciones, pagos, mantenimiento, soporte

**Stack:** Resend como proveedor, plantillas en Supabase (`system_email_templates`), layout HTML responsive, variables `{{variable}}`.

---

## 2. Arquitectura

### 2.1 Estructura de Archivos

```
src/lib/email/
├── client.ts              # Cliente Resend, sendEmail, sendBatchEmails
├── layout.ts              # wrapInModernLayout (branding, responsive)
├── notifications.ts        # EmailNotificationService (métodos estáticos)
├── template-loader.ts      # loadEmailTemplate, incrementTemplateUsage
├── template-utils.ts       # replaceTemplateVariables, getDefaultVariables
├── templates.ts            # Re-exportaciones
└── templates/
    ├── optica.ts           # Funciones específicas óptica (12 plantillas)
    ├── saas.ts             # Plantillas SaaS
    ├── saas-support.ts     # Soporte B2B
    └── support.ts          # Soporte general
```

### 2.2 Flujo de Envío

```
Evento (ej: pedido creado)
    → EmailNotificationService.sendOrderConfirmation(order)
    → loadEmailTemplate("order_confirmation", true, organizationId)
    → getDefaultVariables() + variables específicas
    → replaceTemplateVariables(subject, variables)
    → replaceTemplateVariables(content, variables)
    → wrapInModernLayout(html, options)
    → sendEmail({ to, subject, html, text })
    → incrementTemplateUsage(templateId)
```

### 2.3 Base de Datos

**Tabla:** `system_email_templates`

| Columna                | Tipo        | Descripción                                   |
| ---------------------- | ----------- | --------------------------------------------- |
| id                     | UUID        | PK                                            |
| name                   | TEXT        | Nombre legible                                |
| type                   | TEXT        | Tipo (order_confirmation, saas_welcome, etc.) |
| subject                | TEXT        | Asunto con variables                          |
| content                | TEXT        | HTML con variables                            |
| variables              | JSONB       | Lista de variables usadas                     |
| is_active              | BOOLEAN     | Si está activa                                |
| is_system              | BOOLEAN     | No editable por org                           |
| category               | TEXT        | 'organization' \| 'saas'                      |
| organization_id        | UUID        | NULL = sistema, UUID = org específica         |
| usage_count            | INT         | Contador de uso                               |
| last_used_at           | TIMESTAMPTZ | Último uso                                    |
| created_by             | UUID        | Creador                                       |
| created_at, updated_at | TIMESTAMPTZ | Auditoría                                     |

**RLS:** Organizaciones ven plantillas propias + defaults. Root/dev ven todo.

---

## 3. Componentes Principales

### 3.1 Cliente Resend (`client.ts`)

- Inicializa Resend solo si `RESEND_API_KEY` está definido
- `sendEmail()`: envía un email, retorna `{ success, id? }` o `{ success: false, error }`
- `sendBatchEmails()`: envía varios con delay de 100ms entre cada uno
- `normalizeRecipient()`: en dominio `resend.dev`, redirige todos los emails al inbox verificado

### 3.2 Cargador de Plantillas (`template-loader.ts`)

- `loadEmailTemplate(type, useServiceRole, organizationId?)`: busca plantilla activa
- Estrategia: org específica primero, luego default (`organization_id IS NULL`)
- `incrementTemplateUsage(templateId)`: incrementa `usage_count` y `last_used_at`

### 3.3 Utilidades (`template-utils.ts`)

- `replaceTemplateVariables(template, variables)`: reemplaza `{{key}}` por valor
- `getDefaultVariables(organization?)`: `organization_name`, `website_url`, `support_email`, etc.
- `formatOrderItemsHTML(items)`, `formatOrderItemsText(items)`: formateo de items de pedido

### 3.4 Layout (`layout.ts`)

- `wrapInModernLayout(content, options)`: envuelve HTML en estructura responsive
- Opciones: `organizationName`, `organizationColor`, `previewText`, `organizationLogo`, `footerContent`
- Estilos inline para compatibilidad con clientes de correo

### 3.5 Servicio de Notificaciones (`notifications.ts`)

`EmailNotificationService` con métodos estáticos:

| Método                      | Tipo plantilla                       | Uso                    |
| --------------------------- | ------------------------------------ | ---------------------- |
| sendOrderConfirmation       | order_confirmation                   | Pedido creado          |
| sendShippingNotification    | order_shipped                        | Pedido enviado         |
| sendDeliveryConfirmation    | order_delivered                      | Pedido entregado       |
| sendPaymentSuccess          | payment_success / order_confirmation | Pago recibido          |
| sendPaymentFailed           | payment_failed                       | Pago fallido           |
| sendAppointmentConfirmation | appointment_confirmation             | Cita agendada          |
| sendAppointmentReminder     | appointment_reminder                 | Recordatorio 24h       |
| sendQuoteSent               | quote_sent                           | Presupuesto enviado    |
| sendWorkOrderReady          | work_order_ready                     | Trabajo listo          |
| sendPrescriptionReady       | prescription_ready                   | Receta lista           |
| sendAccountWelcome          | account_welcome                      | Bienvenida cliente     |
| sendLowStockAlert           | low_stock_alert                      | Stock bajo             |
| sendPasswordReset           | password_reset                       | Restablecer contraseña |
| sendSaaSNotification        | (tipo dinámico)                      | Notificaciones SaaS    |
| sendMarketingEmail          | (por ID)                             | Campañas marketing     |
| sendContactFormNotification | (hardcoded)                          | Formulario contacto    |

---

## 4. Rutas y UI

### 4.1 API

| Método | Ruta                                        | Acceso    | Descripción                     |
| ------ | ------------------------------------------- | --------- | ------------------------------- |
| GET    | /api/admin/system/email-templates           | Admin org | Lista plantillas org + defaults |
| POST   | /api/admin/system/email-templates           | Admin org | Crear plantilla                 |
| GET    | /api/admin/system/email-templates/[id]      | Admin org | Obtener plantilla               |
| PUT    | /api/admin/system/email-templates/[id]      | Admin org | Actualizar (no is_system)       |
| DELETE | /api/admin/system/email-templates/[id]      | Admin org | Eliminar (no is_system)         |
| POST   | /api/admin/system/email-templates/[id]/test | Admin org | Enviar email de prueba          |
| GET    | /api/admin/saas-management/email-templates  | Root/Dev  | Lista plantillas SaaS           |
| POST   | /api/admin/saas-management/email-templates  | Root/Dev  | Crear plantilla SaaS            |

### 4.2 Páginas

- **Óptica:** `/admin/system` → tab "Email" (EmailTemplatesManager mode="organization")
- **SaaS:** `/admin/saas-management/emails` (EmailTemplatesManager mode="saas")

### 4.3 Componentes

- `EmailTemplatesManager`: Lista, filtros, crear, editar, preview, test
- `EmailTemplateEditor`: Editor de plantilla (nombre, tipo, asunto, contenido)
- `AutomaticEmailsInfo`: Lista de emails automáticos en tab Email de system

---

## 5. Variables de Plantilla

### 5.1 Comunes (getDefaultVariables)

| Variable                   | Valor por defecto    |
| -------------------------- | -------------------- |
| organization_name          | Opttius / nombre org |
| organization_email         | contacto@opttius.com |
| organization_support_email | soporte@opttius.com  |
| support_email              | soporte@opttius.com  |
| website_url                | NEXT_PUBLIC_APP_URL  |
| company_name               | Opttius / nombre org |
| contact_email              | contacto@opttius.com |

### 5.2 Óptica (por contexto)

**Pedidos:** customer_name, order_number, order_date, order_total, order_items, order_items_text, payment_method

**Citas:** customer_name, appointment_date, appointment_time, professional_name, branch_name, branch_address, branch_phone

**Presupuestos:** customer_name, quote_number, quote_date, quote_total, quote_expiry, quote_items

**Órdenes de trabajo:** customer_name, work_order_number

**Recetas:** customer_name, prescription_date, prescription_number, expiry_date

### 5.3 SaaS

admin_first_name, organization_name, dashboard_url, support_url, trial_end_date, days_remaining

---

## 6. Configuración

### 6.1 Variables de Entorno

```bash
RESEND_API_KEY=re_xxxxx           # Obligatorio para envío
RESEND_FROM_EMAIL=noreply@opttius.com  # Remitente (default: noreply@opttius.com)
NEXT_PUBLIC_APP_URL=https://opttius.com  # Para links en emails
```

### 6.2 Dominio Resend.dev (Testing)

- Con dominio `resend.dev`, Resend solo permite enviar al email verificado
- `normalizeRecipient()` redirige todos los destinatarios al `RESEND_FROM_EMAIL`
- Límite gratuito: 50 emails/día

### 6.3 Producción

- Verificar dominio en Resend
- Configurar DKIM/SPF
- Usar dominio propio en `RESEND_FROM_EMAIL`

---

## 7. Análisis del Estado Actual

### 7.1 Fortalezas

| Aspecto                   | Estado                                |
| ------------------------- | ------------------------------------- |
| Arquitectura multi-tenant | ✅ Org + SaaS bien separados          |
| Plantillas en DB          | ✅ Editables sin deploy               |
| Variables dinámicas       | ✅ Sistema {{variable}} funcional     |
| Layout responsive         | ✅ wrapInModernLayout consistente     |
| Fallback org → sistema    | ✅ template-loader correcto           |
| RLS y permisos            | ✅ Org ve solo lo suyo, root ve SaaS  |
| Test de plantillas        | ✅ Endpoint /test disponible          |
| Uso de Resend             | ✅ Cliente configurado, batch support |

### 7.2 Debilidades y Oportunidades

| Área                               | Observación                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inconsistencia API                 | EmailTemplatesManager en mode="saas" usa GET saas-management pero PUT/DELETE/test usan system/email-templates. Las plantillas SaaS no tienen [id] en saas-management. |
| Test email sin layout              | El endpoint test envía HTML crudo sin wrapInModernLayout; el preview no refleja el email real.                                                                        |
| Métricas hardcodeadas              | La página SaaS emails muestra "1,234" y "42.5%" estáticos; no hay integración con Resend Analytics.                                                                   |
| Historial vacío                    | Tab "Historial" muestra "próximamente"; no hay tabla de envíos ni integración con webhooks Resend.                                                                    |
| sendContactFormNotification        | HTML hardcodeado, no usa plantilla DB.                                                                                                                                |
| Algunos métodos sin organizationId | sendPaymentFailed, sendMembershipWelcome, sendLowStockAlert no reciben organizationId; branding inconsistente.                                                        |
| Currency fija                      | formatCurrency usa ARS; ópticas en Chile/otros países necesitan moneda configurable.                                                                                  |
| Falta rate limiting                | sendBatchEmails tiene delay fijo; no hay backoff ante errores de Resend.                                                                                              |
| Logging                            | console.warn/console.error en lugar de appLogger en varios puntos.                                                                                                    |

---

## 8. Mejoras Propuestas

### 8.1 Prioridad Alta

1. **Unificar API de plantillas SaaS**
   - Crear rutas `/api/admin/saas-management/email-templates/[id]` para PUT, DELETE, GET
   - O hacer que EmailTemplatesManager en mode="saas" use siempre system/email-templates con `category=saas` en el filtro
   - Documentar claramente qué API usar en cada modo

2. **Test email con layout real**
   - En `/api/admin/system/email-templates/[id]/test`, aplicar `wrapInModernLayout` al content antes de enviar
   - Pasar variables de organización si la plantilla es de org

3. **Logging estructurado**
   - Reemplazar `console.warn`/`console.error` por `appLogger` en client.ts, template-loader.ts, notifications.ts
   - Incluir templateId, organizationId, recipient (hash) en logs

### 8.2 Prioridad Media

4. **Tabla de envíos (email_logs)**
   - Crear tabla para registrar cada envío: template_id, recipient_hash, subject, status, resend_id, created_at
   - Webhook Resend para actualizar status (delivered, bounced, etc.)
   - Poblar tab Historial con datos reales

5. **Moneda configurable**
   - Añadir `currency` a organization metadata o system_config
   - Pasar currency a formatCurrency o crear `formatCurrencyForOrg(amount, orgId)`

6. **Pasar organizationId a todos los métodos**
   - Refactorizar sendPaymentFailed, sendLowStockAlert, sendMembershipWelcome para recibir organizationId
   - Usar getOrganizationInfo y wrapInModernLayout con branding

7. **Plantilla para contact form**
   - Crear tipo `contact_form_admin` en system_email_templates
   - Migrar sendContactFormNotification a usar loadEmailTemplate

### 8.3 Prioridad Baja

8. **Métricas reales**
   - Integrar Resend Analytics API (si disponible) o webhooks para abrir/clicks
   - Mostrar total enviados, tasa apertura en dashboard SaaS emails

9. **Rate limiting y retry**
   - Implementar exponential backoff en sendEmail ante 429
   - Cola de envíos para batch muy grandes

10. **A/B testing de asuntos**
    - Campo `subject_b` en plantillas, envío aleatorio, tracking de conversión

---

## 9. Referencias

- [EMAIL_IMPLEMENTATION_STATUS.md](./EMAIL_IMPLEMENTATION_STATUS.md) - Estado consolidado
- [NOTIFICATIONS_SYSTEM.md](../NOTIFICATIONS_SYSTEM.md) - Sistema de notificaciones in-app
- Skill: `.cursor/skills/emails-optical-supabase/SKILL.md`
- Resend Docs: https://resend.com/docs

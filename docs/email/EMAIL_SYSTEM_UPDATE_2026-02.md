# Sistema de Emails Opttius - Actualización Febrero 2026

**Fecha:** 2026-02-21  
**Plan implementado:** mejoras_sistema_emails_ad137231

Este documento consolida las modificaciones implementadas y el estado actual. Reemplaza documentación duplicada anterior.

---

## 1. Resumen de Modificaciones Implementadas

### Fase 1: Correcciones Críticas (401, API, Layout) ✅

| Cambio                                          | Archivo(s)                                                                   | Estado                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Corregir 401 en SaaS email-templates            | `api/admin/saas-management/email-templates/route.ts`                         | ✅ Refactor a `requireRoot(request)`, auth por cookies |
| Unificar API SaaS                               | `api/admin/saas-management/email-templates/[id]/route.ts` (GET, PUT, DELETE) | ✅ Creado                                              |
| Ruta test SaaS                                  | `api/admin/saas-management/email-templates/[id]/test/route.ts`               | ✅ Creado                                              |
| EmailTemplatesManager usa API correcta por mode | `EmailTemplatesManager.tsx`                                                  | ✅ `templatesApiBase` según mode                       |
| EmailTemplateEditor recibe mode y apiBase       | `EmailTemplateEditor.tsx`                                                    | ✅                                                     |
| Reordenar tab Email (B2C)                       | `admin/system/page.tsx`                                                      | ✅ Primero plantillas, luego AutomaticEmailsInfo       |

### Fase 2: Contenido y Triggers B2C ✅

| Cambio                                   | Archivo(s)                                | Estado                                                                                            |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Actualizar AutomaticEmailsInfo           | `AutomaticEmailsInfo.tsx`                 | ✅ order_shipped/delivered bloqueados; recordatorio cita, presupuesto expirar, bienvenida activos |
| Bloquear order_shipped y order_delivered | `api/admin/orders/[id]/route.ts`          | ✅ Comentados con TODO                                                                            |
| Cron alertas stock bajo                  | `api/cron/low-stock-alerts/route.ts`      | ✅ Diario 7:00 UTC                                                                                |
| Cron recordatorio cita                   | `api/cron/appointment-reminders/route.ts` | ✅ Diario 6:00 UTC                                                                                |
| Cron presupuesto por expirar             | `api/cron/quote-expiring/route.ts`        | ✅ Diario 6:00 UTC                                                                                |
| Bienvenida al crear cliente              | `api/admin/customers/route.ts`            | ✅ sendAccountWelcome tras crear cliente con email                                                |

### Fase 3: Editor y UX ✅

| Cambio                                  | Archivo(s)                                             | Estado                       |
| --------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| Paleta Epoch en plantillas predefinidas | `EmailTemplateEditor.tsx`                              | ✅ #1A2B23, #C5A059, #F9F7F2 |
| Sustituir window.confirm por Dialog     | `EmailTemplatesManager.tsx`                            | ✅ AlertDialog para eliminar |
| Test email con wrapInModernLayout       | `api/admin/system/.../test/route.ts` y saas-management | ✅                           |
| Tooltip selector de tipo                | `EmailTemplateEditor.tsx`                              | ✅                           |

### Fase 4: Navegación SaaS ✅

| Cambio                      | Archivo(s)                              | Estado |
| --------------------------- | --------------------------------------- | ------ |
| Botón "Volver al dashboard" | `admin/saas-management/emails/page.tsx` | ✅     |

### Fase 5: Asistente IA en Editor ✅

| Cambio                     | Archivo(s)                                     | Estado                                                               |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| Endpoint AI assist         | `api/admin/email-templates/ai-assist/route.ts` | ✅ POST { type, organizationId?, userPrompt } → { subject, content } |
| Botón "Asistir con IA"     | `EmailTemplateEditor.tsx`                      | ✅ Modal con textarea                                                |
| Propagación organizationId | `EmailTemplatesManager`, `system/page.tsx`     | ✅                                                                   |

---

## 2. Crons Registrados (vercel.json)

| Ruta                              | Horario (UTC) | Función                                                      |
| --------------------------------- | ------------- | ------------------------------------------------------------ |
| `/api/cron/low-stock-alerts`      | 7:00 diario   | Envía alertas a admins cuando quantity ≤ low_stock_threshold |
| `/api/cron/appointment-reminders` | 6:00 diario   | Recordatorio 24h para citas de mañana (scheduled/confirmed)  |
| `/api/cron/quote-expiring`        | 6:00 diario   | Presupuestos que expiran en 24-48h con status=sent           |

**Auth:** Requieren header `Authorization: Bearer CRON_SECRET` o `x-cron-secret: CRON_SECRET`.

---

## 3. Triggers de Email Activos

| Trigger                     | Método                      | Cuándo                                  |
| --------------------------- | --------------------------- | --------------------------------------- |
| Crear cita                  | sendAppointmentConfirmation | Al confirmar cita                       |
| Enviar presupuesto          | sendQuoteSent               | Al enviar cotización                    |
| Work order ready_for_pickup | sendWorkOrderReady          | Al marcar listo para retiro             |
| Crear pedido/POS            | sendOrderConfirmation       | Al confirmar venta                      |
| Cron diario stock           | sendLowStockAlert           | 7:00 UTC, respeta auto_low_stock_alerts |
| Cron recordatorio 24h       | sendAppointmentReminder     | 6:00 UTC                                |
| Cron quote expiring         | sendQuoteExpiring           | 6:00 UTC                                |
| Crear cliente               | sendAccountWelcome          | Al crear cliente con email              |

### Bloqueados (no implementados)

- **order_shipped** – Flujo de envío no implementado
- **order_delivered** – Flujo de entrega no implementado

### Deprecado

- **prescription_ready** – Consolidado en work_order_ready (lentes listo para retiro)

---

## 4. Pendientes (Fase 6 - Baja prioridad)

| Item                              | Descripción                                    |
| --------------------------------- | ---------------------------------------------- |
| Historial de envíos               | Tabla `email_logs`, webhook Resend para status |
| Métricas reales                   | Integrar Resend Analytics o usar email_logs    |
| Habilitar order_shipped/delivered | Cuando flujo de envío esté implementado        |

---

## 5. Archivos Principales Modificados

```
src/app/api/admin/saas-management/email-templates/route.ts
src/app/api/admin/saas-management/email-templates/[id]/route.ts
src/app/api/admin/saas-management/email-templates/[id]/test/route.ts
src/app/api/admin/email-templates/ai-assist/route.ts
src/app/api/cron/low-stock-alerts/route.ts
src/app/api/cron/appointment-reminders/route.ts
src/app/api/cron/quote-expiring/route.ts
src/app/admin/system/page.tsx
src/app/admin/saas-management/emails/page.tsx
src/app/api/admin/customers/route.ts
src/app/api/admin/orders/[id]/route.ts
src/components/admin/AutomaticEmailsInfo.tsx
src/components/admin/EmailTemplatesManager.tsx
src/components/admin/EmailTemplateEditor.tsx
vercel.json
```

---

## 6. Configuración de Dominio y Ópticas B2C (2026-02)

### Dominio de envío

| Elemento                  | Valor                                  |
| ------------------------- | -------------------------------------- |
| **Dominio**               | `opttius.cl` (Resend + Cloudflare)     |
| **From**                  | `noreply@opttius.cl`                   |
| **Reply-To (global)**     | `contacto@opttius.cl`                  |
| **Reply-To (por óptica)** | `organizations.metadata.support_email` |

### Ópticas B2C

- Todas las ópticas envían desde `noreply@opttius.cl`.
- Las respuestas de clientes van a la óptica vía `replyTo` = `metadata.support_email`.
- Configurar `metadata.support_email` por organización (ej. `contacto@opticaandina.cl`).
- Dominio propio por óptica: opción futura (requiere verificar dominio en Resend por cada org).

### Variables de entorno

```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@opttius.cl
```

---

## 7. Referencias

- **Arquitectura base:** `docs/email/EMAIL_SYSTEM.md`
- **Plan original:** `c:\Users\El Mismisimo\.cursor\plans\mejoras_sistema_emails_ad137231.plan.md`

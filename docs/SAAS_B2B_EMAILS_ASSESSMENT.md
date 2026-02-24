# Evaluación: Emails B2B SaaS y Flujo Óptica ↔ Soporte Opttius

**Fecha:** 23 de febrero de 2026  
**Fuentes:** NotebookLM (Cerebro + Extendido), skills emails-optical-supabase, saas-management-optical-supabase, nlm-skill, análisis de código

---

## 1. Resumen Ejecutivo

El sistema de emails B2B de Opttius tiene **dos capas separadas**:

| Capa               | Ubicación                                | Plantillas en DB | Editable desde panel |
| ------------------ | ---------------------------------------- | ---------------- | -------------------- |
| **SaaS lifecycle** | `system_email_templates` (category=saas) | **Solo 2**       | ✅ Sí                |
| **Soporte B2B**    | `saas-support.ts` (hardcoded)            | 0                | ❌ No                |

**Conclusión:** Hay una brecha significativa entre lo diseñado (11+ tipos SaaS) y lo implementado (2 plantillas en DB). El flujo de soporte B2B funciona con emails hardcodeados y no es editable desde el panel.

---

## 2. Estado Actual: Plantillas SaaS en `system_email_templates`

### 2.1 Plantillas insertadas en migraciones

Según `20260204200000_redesign_email_system.sql`, **solo 2 plantillas** se insertan:

| type                | name                   | Variables                               |
| ------------------- | ---------------------- | --------------------------------------- |
| `saas_welcome`      | Bienvenida SaaS        | user_name, organization_name            |
| `saas_trial_ending` | Fin de Prueba Gratuita | user_name, organization_name, days_left |

### 2.2 Funciones implementadas en `lib/email/templates/saas.ts`

El código tiene **11 funciones** listas para enviar:

| Función                       | Template type             | ¿Existe en DB? | ¿Trigger activo?      |
| ----------------------------- | ------------------------- | -------------- | --------------------- |
| `sendSaaSWelcome`             | saas_welcome              | ✅ Sí          | ✅ Crear organización |
| `sendSaaSTrialEnding`         | saas_trial_ending         | ✅ Sí          | ❌ No (falta cron)    |
| `sendSaaSSubscriptionSuccess` | saas_subscription_success | ❌ **No**      | ✅ Pago exitoso       |
| `sendSaaSPaymentFailed`       | saas_payment_failed       | ❌ No          | ❌ No                 |
| `sendSaaSPaymentReminder`     | saas_payment_reminder     | ❌ No          | ❌ No                 |
| `sendSaaSSecurityAlert`       | saas_security_alert       | ❌ No          | ❌ No                 |
| `sendSaaSOnboardingStep`      | saas_onboarding           | ❌ No          | ❌ No                 |
| `sendSaaSTermsUpdate`         | saas_terms_update         | ❌ No          | ❌ No                 |
| `sendSaaSMaintenanceNotice`   | saas_maintenance          | ❌ No          | ❌ No                 |
| `sendSaaSUsageAlert`          | saas_usage_alert          | ❌ No          | ❌ No                 |
| `sendSaaSFeatureAnnouncement` | saas_feature_announcement | ❌ No          | ❌ No                 |

**Problema crítico:** `sendSaaSSubscriptionSuccess` se invoca desde `payment-service.ts` pero la plantilla **no existe en DB**. El envío falla silenciosamente.

### 2.3 API y panel de gestión

- **Ruta:** `/admin/saas-management/emails`
- **API:** `GET/POST/PUT/DELETE /api/admin/saas-management/email-templates`
- **Acceso:** Solo `root` o `dev`
- **EmailTemplatesManager:** Filtro de tipos muestra solo 3 opciones (saas_welcome, saas_trial_ending, saas_subscription_success)
- **Métricas:** Placeholder (1,234 enviados, 42.5% apertura) — no conectadas a Resend

---

## 3. Flujo de Soporte B2B (Óptica ↔ Opttius)

### 3.1 Arquitectura

```
Óptica (dueño/admin)  ←→  Soporte Opttius (root/dev)
         │                            │
         │  Ticket creado              │  Respuesta
         │  Respuesta equipo            │  Asignación
         │  Ticket resuelto             │
         ▼                            ▼
    saas_support_tickets    admin_notifications (in-app)
    saas_support_messages
```

### 3.2 Emails de soporte (saas-support.ts)

| Función                       | Cuándo se envía                | Destinatario    | ¿Usa DB templates? |
| ----------------------------- | ------------------------------ | --------------- | ------------------ |
| `sendSaasTicketCreatedEmail`  | Crear ticket (público o admin) | requester_email | ❌ Hardcoded       |
| `sendSaasNewResponseEmail`    | Soporte responde al ticket     | requester_email | ❌ Hardcoded       |
| `sendSaasTicketAssignedEmail` | Asignar ticket a root/dev      | assignedToEmail | ❌ Hardcoded       |
| `sendSaasTicketResolvedEmail` | Ticket resuelto/cerrado        | requester_email | ❌ Hardcoded       |

**Triggers implementados:**

- `create-ticket/route.ts` → sendSaasTicketCreatedEmail
- `support/tickets/[id]/messages/route.ts` → sendSaasNewResponseEmail (cuando soporte responde)
- `support/tickets/[id]/route.ts` → sendSaasTicketAssignedEmail, sendSaasTicketResolvedEmail

### 3.3 Notificaciones in-app (NotificationService)

- `notifySaasSupportTicketNew` → root/dev (nuevo ticket)
- `notifySaasSupportTicketAssigned` → usuario asignado
- `notifySaasSupportNewMessage` → root/dev (nueva respuesta del cliente)

Estas son **solo in-app**, no envían email.

---

## 4. Gaps para Diálogo Fluido Óptica ↔ Soporte

### 4.1 Lo que falta para robustecer el diálogo

| Gap                                         | Impacto                                               | Prioridad |
| ------------------------------------------- | ----------------------------------------------------- | --------- |
| **Plantillas de soporte no editables**      | No se puede personalizar tono, branding, CTAs         | Alta      |
| **saas_subscription_success sin plantilla** | Email de confirmación de pago no llega                | Crítica   |
| **Sin plantilla "primer respuesta"**        | No hay email específico cuando soporte toma el ticket | Media     |
| **Sin plantilla "esperando respuesta"**     | No se notifica al cliente que debe responder          | Media     |
| **Sin plantilla "cierre de ticket"**        | sendSaasTicketResolvedEmail existe pero es hardcoded  | Media     |
| **Métricas de email no reales**             | Panel muestra datos estáticos                         | Baja      |
| **Historial de envíos**                     | "Próximamente" — no hay trazabilidad                  | Media     |

### 4.2 Flujo ideal para diálogo fluido

```
1. Cliente crea ticket     → Email: "Recibimos tu solicitud" (actual ✓)
2. Soporte asigna          → Email interno a asignado (actual ✓)
3. Soporte primera respuesta → Email: "Hemos tomado tu caso" (parcial)
4. Cliente responde        → Notificación in-app a root (actual ✓)
5. Soporte responde        → Email: "Nueva respuesta" (actual ✓)
6. Ticket resuelto         → Email: "Tu ticket fue resuelto" (actual ✓)
7. Reapertura (si existe)  → Email: "Ticket reabierto" (no implementado)
```

---

## 5. Overall Assessment por Módulo

### 5.1 Módulo Emails B2B (system_email_templates + saas.ts)

| Aspecto                 | Estado       | Notas                                                             |
| ----------------------- | ------------ | ----------------------------------------------------------------- |
| **Infraestructura**     | ✅ Completa  | Resend, template-loader, variables, layout                        |
| **Plantillas en DB**    | ⚠️ Parcial   | Solo 2 de 11+ tipos insertados                                    |
| **Triggers**            | ⚠️ Parcial   | saas_welcome ✓, saas_subscription_success ✓ (pero template falta) |
| **Panel de gestión**    | ✅ Funcional | CRUD, filtros, editor con IA                                      |
| **Consistencia visual** | ⚠️ Parcial   | saas-support usa colores distintos a Epoch                        |

**Funcionalidad:** ~40% — Base sólida, pero la mayoría de plantillas no existen o no tienen triggers.

### 5.2 Módulo Soporte B2B (saas-support.ts + tickets)

| Aspecto                   | Estado       | Notas                              |
| ------------------------- | ------------ | ---------------------------------- |
| **Flujo de tickets**      | ✅ Completo  | Crear, asignar, mensajes, resolver |
| **Emails al cliente**     | ✅ Funcional | 4 tipos enviados correctamente     |
| **Edición de plantillas** | ❌ No        | Todo hardcoded en saas-support.ts  |
| **Notificaciones in-app** | ✅ Completo  | root/dev reciben push              |
| **Portal público**        | ✅ Existe    | /support, create-ticket            |

**Funcionalidad:** ~75% — El flujo opera bien, pero las plantillas no son editables.

### 5.3 Módulo SaaS Management (organizaciones, suscripciones)

| Aspecto                     | Estado      | Notas                                                              |
| --------------------------- | ----------- | ------------------------------------------------------------------ |
| **Crear organización**      | ✅ Completo | Envía saas_welcome                                                 |
| **Pago exitoso**            | ⚠️ Parcial  | Intenta enviar saas_subscription_success pero falla (sin template) |
| **Trial ending**            | ❌ No       | Función existe, sin cron ni template en uso                        |
| **Payment failed/reminder** | ❌ No       | Sin triggers                                                       |

**Funcionalidad:** ~50% — Bienvenida OK; ciclo de suscripción incompleto.

---

## 6. Recomendaciones para Robustecer el Diálogo

### 6.1 Corto plazo (1–2 sprints)

1. **Insertar plantilla `saas_subscription_success`** en migración — crítica para que el pago exitoso envíe email.
2. **Migrar plantillas de soporte a `system_email_templates`** con nuevos tipos:
   - `saas_support_ticket_created`
   - `saas_support_new_response`
   - `saas_support_ticket_assigned`
   - `saas_support_ticket_resolved`
3. **Refactorizar `saas-support.ts`** para usar `loadEmailTemplate` + `replaceTemplateVariables` en lugar de HTML hardcoded.

### 6.2 Medio plazo

4. **Insertar plantillas faltantes** (saas_payment_failed, saas_payment_reminder, saas_trial_ending con trigger).
5. **Cron para trial ending** — notificar X días antes del fin de prueba.
6. **Integrar Resend webhooks** para métricas reales (apertura, clics).

### 6.3 Largo plazo

7. **Plantillas adicionales:** saas_onboarding, saas_maintenance, saas_feature_announcement.
8. **Historial de envíos** desde Resend API o tabla propia.
9. **A/B testing** de asuntos para mejorar apertura.

---

## 7. Referencias de Código

| Componente                     | Ruta                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| Plantillas SaaS (funciones)    | `src/lib/email/templates/saas.ts`                                          |
| Plantillas Soporte (hardcoded) | `src/lib/email/templates/saas-support.ts`                                  |
| Template loader                | `src/lib/email/template-loader.ts`                                         |
| Notifications service          | `src/lib/email/notifications.ts` (sendSaaSNotification)                    |
| API email templates SaaS       | `src/app/api/admin/saas-management/email-templates/`                       |
| Crear ticket                   | `src/app/api/support/create-ticket/route.ts`                               |
| Mensajes ticket                | `src/app/api/admin/saas-management/support/tickets/[id]/messages/route.ts` |
| Actualizar ticket              | `src/app/api/admin/saas-management/support/tickets/[id]/route.ts`          |
| Migración plantillas           | `supabase/migrations/20260204200000_redesign_email_system.sql`             |

---

## 8. Conclusión

El sistema tiene **buena base arquitectónica** pero **implementación incompleta**:

- **Emails SaaS lifecycle:** 2 plantillas en DB, 1 trigger funcional (welcome), 1 fallando (subscription_success).
- **Emails Soporte B2B:** 4 flujos implementados y operativos, pero con plantillas hardcoded y no editables.

Para lograr un **diálogo fluido** entre dueños de óptica y soporte Opttius, se recomienda priorizar:

1. Corregir `saas_subscription_success` (insertar plantilla).
2. Migrar plantillas de soporte a DB y hacerlas editables.
3. Completar el ciclo de suscripción (trial ending, payment failed/reminder).

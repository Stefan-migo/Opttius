# Sistema de Notificaciones - Opttius

Documentación del sistema de notificaciones para ópticas.

**Última actualización:** 2026-02-21

---

## 1. Resumen Ejecutivo

El sistema proporciona:

- **Notificaciones in-app** para administradores (admin_notifications)
- **Configuración granular** por tipo, prioridad y alcance (org/branch)
- **Notificaciones por email** a clientes (confirmaciones, presupuestos, citas, trabajos listos)
- **Aislamiento multi-tenant** por organización y sucursal
- **Soporte SaaS** para tickets B2B (visible solo root/dev)
- **Supabase Realtime** para actualizaciones instantáneas
- **Filtrado por sucursal** cuando el usuario tiene una sucursal seleccionada

---

## 2. Modificaciones Implementadas (2026-02-21)

### 2.1 Constantes Compartidas

- **Creado** `src/lib/notifications/constants.ts` con:
  - `NOTIFICATION_ICONS`: mapeo completo de todos los tipos (quote_new, work_order_new, appointment_new, etc.)
  - `NOTIFICATION_TYPE_LABELS`: labels en español para todos los tipos
  - `PRIORITY_LABELS`, `PRIORITY_COLORS`, `PRIORITY_BADGE_COLORS`: tokens admin (admin-error, admin-warning, admin-info)
  - `formatTimeSince(date)`: función compartida para tiempo relativo
- AdminNotificationDropdown, NotificationsPage y NotificationSettings usan estas constantes.

### 2.2 Multi-Tenant y Filtrado por Sucursal

- **API** `/api/admin/notifications`: acepta query param `branch_id`. Cuando se envía, filtra solo notificaciones de esa sucursal.
- **Reglas:**
  - Organización: nunca mezclar entre organizaciones (RLS).
  - Sucursal: con sucursal seleccionada → solo esa sucursal.
  - Vista global (super_admin): todas las sucursales de su organización.
  - Root users: ven solo notificaciones SaaS (no pasan branch_id).
- **Frontend:** AdminNotificationDropdown y NotificationsPage usan `useBranch()` y `useRoot()`, envían `branch_id` cuando aplica.
- **BranchSelector** en NotificationsPage para super admins de org.

### 2.3 Documentación de Emails Automáticos

- **Componente** `AutomaticEmailsInfo` en tab "Email" de `/admin/system`.
- Lista de emails que se envían automáticamente a clientes (confirmación pedido, presupuesto enviado, cita, trabajo listo, envío, entrega).
- Sección de plantillas disponibles pero no integradas (recordatorio cita, presupuesto por expirar, bienvenida).
- Enlace en tab "Notificaciones" hacia el tab Email.

### 2.4 Supabase Realtime

- AdminNotificationDropdown y NotificationsPage se suscriben a `postgres_changes` en `admin_notifications` (evento INSERT).
- Filtro `branch_id` cuando hay sucursal seleccionada.
- Polling reducido a 60s como fallback.
- **Requisito:** tabla `admin_notifications` debe estar en la publicación de Realtime (Supabase Dashboard → Database → Replication).

### 2.5 notifyAppointmentCancelled

- Método `notifyAppointmentCancelled` en NotificationService.
- Llamado en `appointments/[id]/route.ts` cuando status cambia a "cancelled".

### 2.6 Cleanup Automático

- **API** `/api/cron/cleanup-notifications` protegida con CRON_SECRET.
- Cron diario a las 4:00 UTC en `vercel.json`.
- Ejecuta `cleanup_old_notifications()`: borra expiradas, archiva leídas > 90 días.

---

## 3. Pendientes

| Prioridad | Item                                                                | Estado                       |
| --------- | ------------------------------------------------------------------- | ---------------------------- |
| Baja      | Umbral de stock configurable (product.low_stock_threshold o config) | Trigger usa 5 unidades fijas |
| Baja      | order_status_change: definir si aplica al flujo actual              | Sin integración              |
| Baja      | Bordes rounded-none (design system)                                 | Opcional, no implementado    |
| Baja      | Notificaciones push (PWA)                                           | No implementado              |

---

## 4. Arquitectura

### 4.1 Componentes

| Componente                | Ubicación                                     |
| ------------------------- | --------------------------------------------- |
| AdminNotificationDropdown | src/components/admin/                         |
| NotificationsPage         | src/app/admin/notifications/                  |
| NotificationSettings      | src/components/admin/                         |
| AutomaticEmailsInfo       | src/components/admin/                         |
| constants                 | src/lib/notifications/constants.ts            |
| NotificationService       | src/lib/notifications/notification-service.ts |
| EmailNotificationService  | src/lib/email/notifications.ts                |

### 4.2 API

| Método        | Ruta                              | Params                                          |
| ------------- | --------------------------------- | ----------------------------------------------- |
| GET           | /api/admin/notifications          | limit, offset, unread_only, type, **branch_id** |
| PATCH         | /api/admin/notifications          | notificationId, markAllRead                     |
| GET/PUT/PATCH | /api/admin/notifications/settings | organization_id, branch_id                      |

### 4.3 Cron

| Ruta                            | Schedule                       | Descripción                         |
| ------------------------------- | ------------------------------ | ----------------------------------- |
| /api/cron/cleanup-notifications | 0 4 \* \* \* (diario 4:00 UTC) | Limpieza de notificaciones antiguas |

---

## 5. Referencias

- Skill: `.cursor/skills/notifications-optical-supabase/SKILL.md`

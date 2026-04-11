---
name: notifications-optical-supabase
description: Expert guide for building and maintaining a high-quality notification system for optical shops with Supabase. Use when working on notificaciones, admin_notifications, notification_settings, real-time alerts, email notifications, low stock alerts, work order notifications, quote notifications, or optical shop notification workflows. Covers multi-tenant architecture, RLS, organization/branch scoping, and optical-specific notification types.
---

# Sistema de Notificaciones para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de notificaciones de alta calidad para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Notificaciones admin (admin_notifications)
- Configuración de notificaciones (notification_settings)
- Alertas en tiempo real (dropdown, página de notificaciones)
- Notificaciones por email (EmailNotificationService)
- Notificaciones óptica-específicas (presupuestos, trabajos, citas, stock)
- Soporte SaaS (tickets B2B, root/dev visibility)
- Triggers de base de datos para notificaciones automáticas

## Arquitectura Core

### Capas del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  UI: AdminNotificationDropdown, NotificationsPage, NotificationSettings  │
├─────────────────────────────────────────────────────────────────┤
│  API: /api/admin/notifications, /api/admin/notifications/settings │
├─────────────────────────────────────────────────────────────────┤
│  Services: NotificationService (in-app), EmailNotificationService (email) │
├─────────────────────────────────────────────────────────────────┤
│  DB: admin_notifications, notification_settings, triggers       │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de Notificación (admin_notification_type)

| Categoría      | Tipos                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Óptica**     | quote_new, quote_status_change, quote_converted, work_order_new, work_order_status_change, work_order_completed, appointment_new, appointment_cancelled |
| **General**    | new_customer, sale_new, order_new, order_status_change                                                                                                  |
| **Inventario** | low_stock, out_of_stock                                                                                                                                 |
| **Pagos**      | payment_received, payment_failed                                                                                                                        |
| **Soporte**    | support_ticket_new, support_ticket_update                                                                                                               |
| **Sistema**    | system_alert, system_update, security_alert, custom                                                                                                     |

### Prioridades

- `low`: Informativa
- `medium`: Aviso estándar
- `high`: Importante (nuevo presupuesto, trabajo completado)
- `urgent`: Crítico (stock agotado, pago fallido)

## Multi-Tenant y RLS

### Scoping Obligatorio

1. **organization_id**: Notificaciones óptica → organización. NULL para SaaS (target_admin_role=root).
2. **branch_id**: Opcional. Si existe, filtra por sucursales accesibles del usuario.
3. **target_admin_id**: Notificación dirigida a un admin específico.
4. **target_admin_role**: `root` = visible solo para root/dev (SaaS).

### Resolución de Settings

`get_notification_setting_effective(type, org_id, branch_id)` resuelve en orden:

- branch > org > global (NULL, NULL)

### Creación de Notificación

- **branchId**: Obligatorio para óptica. Null para SaaS.
- **organizationId**: Auto-detectado desde branch o related entity si no se provee.
- **targetAdminRole: "root"**: Para SaaS; organizationId y branchId deben ser NULL.
- Siempre usar `NotificationService.createNotification()` o helpers específicos.

## Reglas Óptica-Específicas

### 1. Triggers de Negocio

| Evento                    | Método                                    | Cuándo                   |
| ------------------------- | ----------------------------------------- | ------------------------ |
| Nuevo presupuesto         | notifyNewQuote                            | POST /api/admin/quotes   |
| Cambio estado presupuesto | notifyQuoteStatusChange                   | PATCH status             |
| Presupuesto convertido    | notifyQuoteConverted + notifyNewWorkOrder | Convert                  |
| Nuevo trabajo             | notifyNewWorkOrder                        | Crear work order         |
| Cambio estado trabajo     | notifyWorkOrderStatusChange               | PATCH status             |
| Trabajo entregado         | notifyWorkOrderCompleted                  | Deliver                  |
| Nueva cita                | notifyNewAppointment                      | Crear cita               |
| Nuevo cliente             | notifyNewCustomer                         | Crear cliente            |
| Nueva venta               | notifyNewSale                             | POS process-sale, orders |

### 2. Email vs In-App

- **In-app**: Siempre vía NotificationService (admin_notifications).
- **Email**: EmailNotificationService (Resend). Templates: order_confirmation, quote_sent, appointment_confirmation, work_order_ready, etc.
- No confundir con `lib/services/notificationService.ts` (toast/Sonner para UI).

### 3. Stock Bajo

- Trigger `notify_admin_low_stock` en products (inventory_quantity).
- Umbral hardcodeado en trigger (5 unidades). Considerar usar product.low_stock_threshold o config.
- out_of_stock cuando quantity = 0.

### 4. SaaS Support

- notifySaasSupportTicketNew → target_admin_role: "root"
- notifySaasSupportTicketAssigned → target_admin_id
- notifySaasSupportNewMessage → target_admin_role: "root" si fromCustomer

## API Endpoints

| Método | Ruta                              | Descripción                                 |
| ------ | --------------------------------- | ------------------------------------------- |
| GET    | /api/admin/notifications          | Lista con limit, offset, unread_only, type  |
| PATCH  | /api/admin/notifications          | mark as read (notificationId) o markAllRead |
| GET    | /api/admin/notifications/settings | Settings por org/branch                     |
| PATCH  | /api/admin/notifications/settings | Actualizar múltiples settings               |

## Componentes UI

| Componente                | Ubicación                | Uso                                     |
| ------------------------- | ------------------------ | --------------------------------------- |
| AdminNotificationDropdown | layout admin             | Campana con badge, lista reciente       |
| NotificationsPage         | /admin/notifications     | Panel completo con filtros y paginación |
| NotificationSettings      | Sistema > Notificaciones | Activar/desactivar tipos, prioridad     |

## Mejores Prácticas

1. **Siempre verificar settings**: NotificationService usa `get_notification_setting_effective` antes de insertar.
2. **Action URL consistente**: `/admin/quotes/{id}`, `/admin/work-orders/{id}`, etc.
3. **Metadata útil**: Incluir IDs, números, nombres para debugging y analytics.
4. **No duplicar lógica**: Usar helpers (notifyNewQuote, notifyWorkOrderStatusChange) en lugar de createNotification directo.
5. **Polling vs Real-time**: Dropdown hace polling cada 30s. Supabase Realtime se puede añadir para push instantáneo.

## Referencia

- Documentación detallada: [docs/NOTIFICATIONS_SYSTEM.md](../docs/NOTIFICATIONS_SYSTEM.md)

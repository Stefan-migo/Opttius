# Sistema de Soporte Opttius

**Versión:** 1.1  
**Última actualización:** 2026-02-20  
**Estado:** Documentación actualizada post-mejoras 2026-02

---

## Changelog 2026-02-20 (Mejoras Implementadas)

### Modificaciones realizadas

| Cambio                                    | Archivo(s)                                                                | Descripción                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **response_time_minutes**                 | `supabase/migrations/20260220100000_add_optical_support_time_metrics.sql` | Trigger actualizado: al insertar el primer mensaje en un ticket, se calcula y guarda `response_time_minutes` (minutos desde creación hasta primera respuesta). |
| **resolution_time_minutes**               | `src/app/api/admin/optical-support/tickets/[id]/route.ts`                 | Al cambiar status a `resolved` o `closed`, se calcula y guarda `resolution_time_minutes` (minutos desde creación hasta resolución).                            |
| **Manejo root en GET/PATCH**              | `src/app/api/admin/optical-support/tickets/[id]/route.ts`                 | Usuarios root/dev sin `organization_id` usan `NEXT_PUBLIC_ROOT_ORG_ID` para acceder a tickets (testing).                                                       |
| **Limpieza console.log**                  | `src/app/admin/support/tickets/[id]/page.tsx`, `tickets/new/page.tsx`     | Eliminados todos los `console.log` de depuración.                                                                                                              |
| **Analytics - soporte root**              | `src/app/api/admin/analytics/dashboard/route.ts`                          | Cuando `organizationId` es null con branch seleccionada, se obtiene de la sucursal.                                                                            |
| **Analytics - trends**                    | `src/app/api/admin/analytics/dashboard/route.ts`                          | Agregado `supportTickets` al objeto `trends` para consistencia.                                                                                                |
| **Help texts**                            | `src/lib/analytics-help.ts`                                               | Nuevas entradas: `supportTicketsTotal`, `supportTicketsResolved`, `avgResolutionTime`.                                                                         |
| **Renombrado a "Registro de Incidentes"** | `src/app/admin/layout.tsx`, `src/app/admin/support/page.tsx`              | Label, título, descripción y diálogo de creación actualizados.                                                                                                 |

### Pendiente (Roadmap)

Ver sección 7 para prioridades. Resumen: adjuntos y notificaciones primero; deprecar `/admin/support/tickets/new`; insights con IA al final.

---

## 1. Introducción

El sistema de soporte de Opttius opera en **dos capas** que cubren distintos flujos de comunicación y registro:

| Capa    | Relación                                | Propósito                                                                    | Quién crea tickets                            |
| ------- | --------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| **B2B** | SaaS ↔ Óptica                          | Soporte que Opttius entrega a la óptica (técnico, ventas, facturación)       | Dueño, admin o usuario principal              |
| **B2C** | Óptica ↔ Cliente (mediado por Opttius) | Registro interno de problemas/incidentes con clientes para análisis y mejora | Usuarios de la óptica (empleados, vendedores) |

Esta documentación se centra en el **Sistema de Soporte B2C** (óptica → cliente), que es el módulo de registro de incidentes interno.

---

## 2. Rutas API - Mapa de Tablas y Uso

| Sistema                       | Tabla DB                           | Rutas API                                                                                                                           | Uso                                                                                      | Estado                         |
| ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| **Legacy**                    | `support_tickets`                  | `/api/admin/support/tickets`, `/api/admin/support/tickets/[id]`, `/api/admin/support/categories`                                    | Antiguo sistema genérico. Usado por `/admin/support/tickets/new`.                        | **Deprecar** - Redirigir a B2C |
| **B2B (SaaS)**                | `saas_support_tickets`             | `/api/support/create-ticket`, `/api/support/ticket/[ticketNumber]`, `/api/admin/saas-management/support/*`                          | Óptica → Opttius. Portal público y panel root.                                           | Activo                         |
| **B2C (Registro Incidentes)** | `optical_internal_support_tickets` | `/api/admin/optical-support/tickets`, `/api/admin/optical-support/tickets/[id]`, `/api/admin/optical-support/tickets/[id]/messages` | Óptica → Cliente (registro interno). Usado por `/admin/support` (lista + diálogo crear). | Activo                         |

**Nota:** La ruta `/admin/support/tickets/new` utiliza el sistema legacy (`support_tickets`). Debe redirigirse a `/admin/support`, que ya incluye el diálogo de creación B2C.

---

## 3. Capa 1: Soporte B2B (SaaS → Óptica)

### 3.1 Descripción

El soporte B2B es el canal por el cual la óptica como organización se comunica con Opttius. Incluye:

- Soporte técnico
- Facturación y suscripciones
- Solicitud de funcionalidades
- Reporte de bugs
- Gestión de cuenta
- Ventas y onboarding

### 3.2 Componentes

| Componente     | Ubicación                                                | Descripción                                 |
| -------------- | -------------------------------------------------------- | ------------------------------------------- |
| Tabla          | `saas_support_tickets`                                   | Tickets creados por la óptica hacia Opttius |
| Portal público | `/support`                                               | Formulario para crear ticket sin login      |
| Gestión (root) | `/admin/saas-management/support`                         | Panel para root/dev gestionar tickets       |
| API            | `/api/support/*`, `/api/admin/saas-management/support/*` | CRUD de tickets y mensajes                  |

### 3.3 Formato de ticket

- **Número:** `SAAS-YYYYMMDD-XXXXX`
- **Categorías:** technical, billing, feature_request, bug_report, account, other
- **Estados:** open, assigned, in_progress, waiting_customer, resolved, closed

---

## 4. Capa 2: Soporte B2C (Óptica → Cliente)

### 4.1 Descripción

El soporte B2C es un **sistema de registro interno** donde la óptica documenta problemas, conflictos e incidentes relacionados con sus clientes. **No es un canal de soporte al cliente final** (el cliente no crea tickets). Los usuarios de la óptica registran:

- Problemas con lentes, marcos, recetas
- Incidencias de entrega
- Problemas de pago
- Quejas de clientes
- Problemas con citas
- Cualquier situación que requiera seguimiento y análisis

**Objetivo:** Recolectar datos estructurados para:

1. Análisis de patrones
2. Insights con IA
3. Recomendaciones de mejora en servicio
4. Métricas de resolución y tiempos

### 4.2 Modelo de datos

#### 4.2.1 Tabla: `optical_internal_support_tickets`

| Campo                                         | Tipo              | Descripción                                                                                                                             |
| --------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| id                                            | UUID              | PK                                                                                                                                      |
| ticket_number                                 | TEXT              | Único, formato OPT-YYYYMMDD-XXXXX                                                                                                       |
| organization_id                               | UUID              | FK organizations, obligatorio                                                                                                           |
| branch_id                                     | UUID              | FK branches, opcional                                                                                                                   |
| customer_id                                   | UUID              | FK customers, opcional                                                                                                                  |
| customer_name, customer_email, customer_phone | TEXT              | Caché del cliente                                                                                                                       |
| related_order_id                              | UUID              | FK orders                                                                                                                               |
| related_work_order_id                         | UUID              | FK lab_work_orders                                                                                                                      |
| related_appointment_id                        | UUID              | FK appointments                                                                                                                         |
| related_quote_id                              | UUID              | FK quotes                                                                                                                               |
| created_by_user_id                            | UUID              | FK admin_users                                                                                                                          |
| created_by_name, created_by_role              | TEXT              | Caché del creador                                                                                                                       |
| subject                                       | TEXT              | Asunto                                                                                                                                  |
| description                                   | TEXT              | Descripción detallada                                                                                                                   |
| category                                      | TEXT              | lens_issue, frame_issue, prescription_issue, delivery_issue, payment_issue, appointment_issue, customer_complaint, quality_issue, other |
| priority                                      | TEXT              | low, medium, high, urgent                                                                                                               |
| status                                        | TEXT              | open, assigned, in_progress, waiting_customer, resolved, closed                                                                         |
| assigned_to                                   | UUID              | FK admin_users                                                                                                                          |
| assigned_at                                   | TIMESTAMPTZ       |                                                                                                                                         |
| resolution                                    | TEXT              | Descripción de la resolución                                                                                                            |
| resolution_notes                              | TEXT              | Notas adicionales                                                                                                                       |
| resolved_at, resolved_by                      | TIMESTAMPTZ, UUID |                                                                                                                                         |
| first_response_at, last_response_at           | TIMESTAMPTZ       | Métricas (actualizadas por trigger y PATCH)                                                                                             |
| response_time_minutes                         | INTEGER           | **Calculado por trigger** al insertar primer mensaje                                                                                    |
| resolution_time_minutes                       | INTEGER           | **Calculado por PATCH** al cambiar status a resolved/closed                                                                             |
| metadata                                      | JSONB             | Datos adicionales (fotos, docs)                                                                                                         |
| created_at, updated_at                        | TIMESTAMPTZ       |                                                                                                                                         |

#### 4.2.2 Tabla: `optical_internal_support_messages`

| Campo                                  | Tipo        | Descripción                                          |
| -------------------------------------- | ----------- | ---------------------------------------------------- |
| id                                     | UUID        | PK                                                   |
| ticket_id                              | UUID        | FK optical_internal_support_tickets                  |
| message                                | TEXT        | Contenido                                            |
| is_internal                            | BOOLEAN     | Nota interna (no visible al cliente)                 |
| sender_id                              | UUID        | FK admin_users                                       |
| sender_name, sender_email, sender_role | TEXT        | Caché                                                |
| message_type                           | TEXT        | message, note, status_change, assignment, resolution |
| attachments                            | JSONB       | Array de URLs/metadata                               |
| created_at, updated_at                 | TIMESTAMPTZ |                                                      |

### 4.3 Ciclo de vida del ticket

```
[open] → [assigned] → [in_progress] → [waiting_customer] ⇄ [in_progress]
    ↓           ↓              ↓                    ↓
[resolved] ←─────────────────────────────────────────
    ↓
[closed]
```

- **open:** Recién creado, sin asignar
- **assigned:** Asignado a un empleado/admin
- **in_progress:** En trabajo activo
- **waiting_customer:** Esperando respuesta o acción del cliente
- **resolved:** Problema resuelto
- **closed:** Ticket cerrado definitivamente

### 4.4 API

| Método | Ruta                                               | Descripción                                            |
| ------ | -------------------------------------------------- | ------------------------------------------------------ |
| GET    | `/api/admin/optical-support/tickets`               | Listar con filtros y paginación                        |
| POST   | `/api/admin/optical-support/tickets`               | Crear ticket                                           |
| GET    | `/api/admin/optical-support/tickets/[id]`          | Detalle de ticket                                      |
| PATCH  | `/api/admin/optical-support/tickets/[id]`          | Actualizar (status, priority, assigned_to, resolution) |
| GET    | `/api/admin/optical-support/tickets/[id]/messages` | Listar mensajes                                        |
| POST   | `/api/admin/optical-support/tickets/[id]/messages` | Crear mensaje                                          |

#### Parámetros GET /tickets

- `branch_id`, `customer_id`, `status`, `priority`, `category`, `assigned_to`
- `search` (busca en subject, description, ticket_number)
- `page`, `limit` (default 20)
- `sort_by` (created_at, updated_at, priority, status)
- `sort_order` (asc, desc)

### 4.5 Seguridad (RLS)

- **SELECT:** Usuarios ven solo tickets de su organización. Super admin ve todos los de la org. Admin/employee ve solo tickets de sus branches accesibles.
- **INSERT:** Solo usuarios de la org pueden crear. branch_id debe ser de la org.
- **UPDATE:** Misma lógica que SELECT.

### 4.6 Rutas de UI

| Ruta                          | Descripción                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `/admin/support`              | Lista de tickets, filtros, crear (dialog), stats. **Nombre en menú:** "Registro de Incidentes" |
| `/admin/support/tickets/[id]` | Detalle, mensajes, actualizar estado, asignar, resolver                                        |

---

## 5. Integración con Analytics

**Estado:** Implementada. Tab "Incidentes" en dashboard de analíticas.

### 5.1 Métricas implementadas

| Métrica                    | Fórmula                                                          | Ubicación    |
| -------------------------- | ---------------------------------------------------------------- | ------------ |
| Total tickets              | count en período                                                 | KPI card     |
| Tickets abiertos           | count(status IN (open, assigned, in_progress, waiting_customer)) | KPI card     |
| Tickets resueltos          | count(status IN (resolved, closed))                              | KPI card     |
| Tiempo promedio resolución | AVG(resolution_time_minutes)                                     | KPI card     |
| Por categoría              | GROUP BY category                                                | Pie chart    |
| Por estado                 | GROUP BY status                                                  | Pie chart    |
| Tendencia tickets/día      | count(created_at) por día                                        | Column chart |

### 5.2 Fuente de datos para IA

Los tickets resueltos con `resolution` y `resolution_notes` son insumos valiosos para:

- Análisis de causas raíz
- Recomendaciones de mejora
- Detección de patrones recurrentes
- Training de modelos de clasificación

---

## 6. Nomenclatura de la sección B2C

**Implementado:** Se adoptó **"Registro de Incidentes"** (2026-02-20).

---

## 7. Roadmap

**Prioridades (orden sugerido):**

1. [ ] **Adjuntos** (fotos, documentos) en tickets
2. [ ] **Notificaciones** cuando ticket asignado o resuelto
3. [ ] Exportar reportes de incidentes por categoría/período
4. [ ] Plantillas de resolución reutilizables
5. [ ] Deprecar/redirigir `/admin/support/tickets/new` a `/admin/support`
6. [ ] Insights con IA sobre patrones de resolución (postergar)

**Completado:**

- [x] Integrar métricas de soporte en dashboard de analytics (2026-02-20)

---

## 8. Checklist de Pruebas Manuales

Ver `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md` para la lista completa.

---

## 9. Referencias

- Skill: `.cursor/skills/support-optical-supabase/SKILL.md`
- Migración base: `supabase/migrations/20260201000002_create_optical_internal_support.sql`
- Migración métricas: `supabase/migrations/20260220100000_add_optical_support_time_metrics.sql`
- API: `src/app/api/admin/optical-support/`
- UI: `src/app/admin/support/`
- Analytics: `src/app/api/admin/analytics/dashboard/route.ts`

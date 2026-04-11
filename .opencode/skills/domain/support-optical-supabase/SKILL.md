---
name: support-optical-supabase
description: Expert guide for building and maintaining a high-quality support system for optical shops with Supabase. Use when working on soporte, tickets, support B2B, support B2C, optical internal support, incidentes, resolución de problemas, customer issues, or optical retail support workflows. Covers two-layer architecture (SaaS B2B + Optical B2C), multi-tenant RLS, branch-scoped visibility, and analytics-ready incident tracking.
---

# Sistema de Soporte para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de soporte de alta gama para ópticas usando Supabase y Next.js, siguiendo las mejores prácticas del módulo de analíticas.

## Cuándo Usar Este Skill

- Sistema de tickets de soporte (B2B SaaS, B2C óptica)
- Soporte interno de la óptica (registro de incidentes, problemas con clientes)
- Gestión de conflictos, quejas, issues de lentes/entregas/pagos
- Integración soporte ↔ analytics, insights, IA
- Métricas de resolución, tiempos de respuesta, categorías recurrentes

## Arquitectura de Dos Capas

### Capa 1: Soporte B2B (SaaS → Óptica)

**Propósito:** Comunicación entre Opttius (SaaS) y la óptica como organización.

- **Tabla:** `saas_support_tickets`
- **Quién crea:** Dueño, admin o usuario principal de la óptica
- **Casos de uso:** Soporte técnico, facturación, solicitud de funcionalidades, bugs, gestión de cuenta
- **Rutas:** `/support` (público), `/admin/saas-management/support` (root/dev)

### Capa 2: Soporte B2C (Óptica → Cliente, mediado por Opttius)

**Propósito:** Registro interno de problemas, conflictos e incidentes que la óptica gestiona con sus clientes. Los tickets los crean usuarios de la óptica (no el cliente). Objetivo: recolectar datos para análisis, insights y mejoras con IA.

- **Tabla:** `optical_internal_support_tickets`
- **Quién crea:** Empleados, vendedores, admins de la óptica
- **Casos de uso:** Problemas con lentes, marcos, entregas, pagos, citas, quejas, calidad
- **Rutas:** `/admin/support` (lista, crear, detalle)

## Modelo de Datos Óptico B2C

### Tablas Core

```
optical_internal_support_tickets
  - organization_id, branch_id (multi-tenant, branch-scoped)
  - customer_id, customer_name, customer_email, customer_phone
  - related_order_id, related_work_order_id, related_appointment_id, related_quote_id
  - created_by_user_id, assigned_to, resolved_by
  - category, priority, status
  - resolution, resolution_notes, metadata (JSONB)
  - first_response_at, last_response_at, response_time_minutes, resolution_time_minutes

optical_internal_support_messages
  - ticket_id, message, is_internal
  - sender_id, sender_name, sender_email, sender_role
  - message_type: message | note | status_change | assignment | resolution
  - attachments (JSONB)
```

### Categorías Óptica-Específicas

| Slug               | Descripción          |
| ------------------ | -------------------- |
| lens_issue         | Problema con lente   |
| frame_issue        | Problema con marco   |
| prescription_issue | Problema con receta  |
| delivery_issue     | Problema con entrega |
| payment_issue      | Problema con pago    |
| appointment_issue  | Problema con cita    |
| customer_complaint | Queja del cliente    |
| quality_issue      | Problema de calidad  |
| other              | Otros                |

### Estados del Ciclo de Vida

| Estado           | Descripción                     |
| ---------------- | ------------------------------- |
| open             | Abierto, sin asignar            |
| assigned         | Asignado a empleado/admin       |
| in_progress      | En progreso                     |
| waiting_customer | Esperando respuesta del cliente |
| resolved         | Resuelto                        |
| closed           | Cerrado                         |

## Multi-Tenant y Branch

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización.
2. **branch_id**: Tickets pueden ser por sucursal o global (branch_id NULL).
3. **Super admin**: Ve tickets de todas las sucursales de la org.
4. **Admin/Employee**: Ve solo tickets de sus branches accesibles.

### Lógica de Visibilidad

```typescript
// Usuario normal: solo su org
query = query.eq("organization_id", organizationId);

// Branch: si hay branch_id en request, filtrar
if (branchId) query = query.eq("branch_id", branchId);

// Super admin sin branch: vista global (todas las sucursales)
if (isSuperAdmin && !branchId && orgBranchIds.length > 0) {
  query = query.in("branch_id", orgBranchIds);
}
```

### Headers

- `x-branch-id`: Sucursal seleccionada (opcional).
- Sin header: según contexto del usuario.

## Mejores Prácticas (alineadas con Analytics)

### 1. Respuestas Estandarizadas

Usar `createApiSuccessResponse` y `createApiErrorResponse` para consistencia con el resto del sistema.

### 2. Validación con Zod

- `createOpticalInternalSupportTicketSchema`
- `updateOpticalInternalSupportTicketSchema`
- `createOpticalInternalSupportMessageSchema`
- `opticalInternalSupportTicketFiltersSchema`

### 3. Logging con requestId

```typescript
const requestId = crypto.randomUUID();
logger.debug("Optical support ticket created", { ticketId, requestId });
```

### 4. Métricas para Analytics

Los tickets resueltos son fuente de datos para:

- **Tiempo promedio de resolución:** `resolution_time_minutes`
- **Categorías más frecuentes:** Agrupar por `category`
- **Tasa de resolución por sucursal:** Resueltos / Total por branch
- **Tendencias:** Tickets creados por día (para gráficos)

### 5. Integración con Analytics

Extender el dashboard de analíticas con:

- KPI: Total tickets abiertos, resueltos este período
- Trend: Tickets por día (creados, resueltos)
- Top categorías con más incidentes
- Tiempo promedio de resolución

### 6. Relaciones con Entidades

Siempre verificar que `customer_id`, `related_order_id`, etc. pertenezcan a la organización antes de insertar/actualizar.

## API y Estructura

### Endpoints Óptico B2C

| Método | Ruta                                               | Descripción                                 |
| ------ | -------------------------------------------------- | ------------------------------------------- |
| GET    | `/api/admin/optical-support/tickets`               | Listar con filtros, paginación              |
| POST   | `/api/admin/optical-support/tickets`               | Crear ticket                                |
| GET    | `/api/admin/optical-support/tickets/[id]`          | Detalle                                     |
| PATCH  | `/api/admin/optical-support/tickets/[id]`          | Actualizar (estado, asignación, resolución) |
| GET    | `/api/admin/optical-support/tickets/[id]/messages` | Listar mensajes                             |
| POST   | `/api/admin/optical-support/tickets/[id]/messages` | Crear mensaje                               |

### Parámetros de Filtro (GET tickets)

- `branch_id`, `customer_id`, `status`, `priority`, `category`, `assigned_to`
- `search` (subject, description, ticket_number)
- `page`, `limit`, `sort_by`, `sort_order`

### Estructura de Respuesta

```typescript
// GET tickets
{ tickets: Ticket[], pagination: { total, page, limit, totalPages } }

// POST ticket
{ success: true, ticket: Ticket }

// PATCH ticket
{ success: true, ticket: Ticket }

// POST message
{ success: true, message: Message }
```

## Checklist de Calidad

- [ ] Filtro `organization_id` en todas las queries.
- [ ] Verificación de `branch_id` y `customer_id` contra la org.
- [ ] Validación Zod en todos los inputs.
- [ ] Logging con requestId en APIs.
- [ ] Respuestas estandarizadas (createApiSuccessResponse cuando aplique).
- [ ] RLS policies activas en `optical_internal_support_tickets` y `optical_internal_support_messages`.
- [ ] Índices en (organization_id, created_at), (branch_id, status), (customer_id).

## Escalabilidad

- **Paginación:** Siempre usar `limit` y `offset` en listados.
- **Índices:** Asegurar índices en columnas de filtro frecuente.
- **Evitar N+1:** Usar selects con joins (customer, branch, assigned_to_user).
- **Métricas agregadas:** Para dashboards, considerar vistas materializadas o caché si el volumen crece.

## Nomenclatura para la Sección B2C

**Recomendación:** Usar un nombre que comunique claramente el propósito de "registrar problemas para análisis y mejora".

Opciones sugeridas:

- **"Registro de Incidentes"** – Técnico, claro para análisis posterior.
- **"Incidentes y Resolución"** – Enfatiza el ciclo completo.
- **"Gestión de Problemas"** – Simple, directo.
- **"Centro de Incidentes"** – Suena a sistema formal de tracking.

Evitar "Soporte Interno" si genera confusión con soporte técnico IT.

## Referencias

- Migración: `supabase/migrations/20260201000002_create_optical_internal_support.sql`
- API: `src/app/api/admin/optical-support/tickets/`
- Página: `src/app/admin/support/page.tsx`
- Schemas: `src/lib/api/validation/zod-schemas.ts` (opticalInternalSupport\*)
- Skill relacionado: `analytics-optical-supabase` para métricas e insights (`.cursor/skills/analytics-optical-supabase/SKILL.md`)

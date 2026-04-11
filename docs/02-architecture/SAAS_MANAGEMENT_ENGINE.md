# 🛰️ SaaS Management Engine

Documentación técnica del módulo SaaS Management Engine para Opttius.

## Resumen Ejecutivo

El **SaaS Management Engine** es un módulo independiente del panel de administración de Opttius, diseñado específicamente para usuarios con rol `root` o `dev`. Proporciona una interfaz dedicada para la gestión centralizada de todas las organizaciones (ópticas), suscripciones, usuarios globales y configuraciones del SaaS.

### Estado: ✅ FUNCIONANDO

El módulo fue reestructurado completamente para ofrecer una experiencia de usuario independiente del panel de administración de ópticas.

---

## 🎯 Objetivos del Proyecto

1. **Analizar** la base de datos del sistema SaaS management
2. **Reorganizar** la estructura y unificar lógicas
3. **Crear** nuevo sidebar para usuario root (sin datos de Opttius genérico)
4. **Desarrollar** interfaz intuitiva y funcional de SaaS Management Engine

---

## 📊 Análisis de Base de Datos

### Tablas Principales

| Tabla                    | Propósito                    | Estado    |
| ------------------------ | ---------------------------- | --------- |
| `organizations`          | Ópticas/tenants del SaaS     | ✅ Activa |
| `subscriptions`          | Suscripciones Stripe         | ✅ Activa |
| `subscription_tiers`     | Planes (Basic, Pro, Premium) | ✅ Activa |
| `saas_support_tickets`   | Tickets B2B                  | ✅ Activa |
| `saas_support_messages`  | Mensajes en tickets          | ✅ Activa |
| `saas_support_templates` | Plantillas de tickets        | ✅ Activa |
| `tier_change_audit`      | Historial de cambios de tier | ✅ Activa |
| `saas_backups`           | Sistema de backups           | ✅ Activa |
| `telemetry_config`       | Telemetría                   | ✅ Activa |
| `demo_requests`          | Solicitudes de demo          | ✅ Activa |
| `email_templates`        | Plantillas de email SaaS     | ✅ Activa |

### Arquitectura de Relaciones

```
organizations (1) ──────< subscriptions (N)
      │
      ├──────< branches (N)
      ├──────< admin_users (N)
      │
      └──────< subscription_tiers (referencia)
```

### Políticas RLS

- **Organizaciones**: Acceso para super_admin y usuarios de la organización
- **Suscripciones**: Solo super_admin puede gestionar
- **Subscription Tiers**: Todos los usuarios activos pueden ver; solo super_admin puede modificar

### Índices Existentes

- `idx_organizations_slug` - Búsqueda por slug
- `idx_organizations_status` - Filtrado por status
- `idx_organizations_tier` - Filtrado por tier
- `idx_subscriptions_org` - JOINs con organizaciones
- `idx_subscriptions_status` - Filtrado por status

---

## 🎨 Diseño e Interfaz

### Sidebar SaaS Engine

**Ubicación:** `src/components/admin/saas-management/SaasManagementSidebar.tsx`

#### Características

| Característica | Descripción                                |
| -------------- | ------------------------------------------ |
| Fondo          | `#0D1117` (oscuro profesional)             |
| Logo           | Rayo dorado `#C5A059` - "SaaS Engine"      |
| Quick Stats    | Organizaciones totales y activas en header |
| Persistencia   | localStorage para estados expandidos       |

#### Grupos de Navegación

1. **Principal** - Dashboard, Analíticas
2. **Gestión de Clientes** - Organizaciones, Usuarios Globales, Sucursales
3. **Suscripciones** - Suscripciones, Planes, Pagos
4. **Soporte** - Tickets, Demos
5. **Configuración** - Sistema, Emails, Backups, WhatsApp

### Dashboard

**Ubicación:** `src/app/admin/saas-management/dashboard/page.tsx`

#### Estilo Visual

- Fondo de página: `#0D1117`
- Cards: `bg-white/5 border-white/10`
- Textos: `text-white`, `text-white/50`, `text-white/70`
- Iconos: `#C5A059` (dorado)
- Hover: `hover:bg-white/10`

---

## 📁 Estructura de Archivos

### Componentes Nuevos

```
src/components/admin/saas-management/
└── SaasManagementSidebar.tsx  ← Sidebar del SaaS Engine
```

### Layouts Modificados

```
src/app/admin/
├── layout.tsx              ← Wrapper detection para rutas SaaS
└── AdminShell.tsx          ← Exclusión de rutas SaaS

src/app/admin/saas-management/
├── layout.tsx              ← Layout principal con sidebar
├── page.tsx                ← Redirect a dashboard
└── dashboard/
    └── page.tsx            ← Dashboard con estilos dark
```

---

## 🔧 Configuración Técnica

### Verificación de Rol

El acceso al SaaS Management está restringido a usuarios con rol `root` o `dev`:

```typescript
// src/app/admin/saas-management/layout.tsx
const isRoot = adminUser?.role === "root" || adminUser?.role === "dev";
if (!isRoot) {
  redirect("/admin");
}
```

### Detección de Ruta en AdminShell

Para evitar que el AdminShell de Opttius envuelva las páginas del SaaS Management:

```typescript
// src/app/admin/AdminShell.tsx
const pathname = usePathname();

if (pathname.startsWith("/admin/saas-management")) {
  return <>{children}</>;
}
```

---

## ✅ Estado de Completado

### Fase 1: Análisis

| Tarea                               | Estado |
| ----------------------------------- | ------ |
| Analizar base de datos local/remota | ✅     |
| Identificar tablas, relaciones, RLS | ✅     |
| Analizar estructura frontend        | ✅     |
| Documentar estado actual            | ✅     |

### Fase 2: Desarrollo Frontend

| Componente              | Estado |
| ----------------------- | ------ |
| Sidebar SaaS Engine     | ✅     |
| Layout principal        | ✅     |
| Dashboard (estilo dark) | ✅     |
| Corrección AdminShell   | ✅     |

### Fase 3: Integración

| Problema                 | Solución                       |
| ------------------------ | ------------------------------ |
| AdminShell envolvía SaaS | Detección de ruta implementada |
| Diseño mixto             | Layout independiente           |
| Sidebar incorrecto       | Sidebar propio                 |

### Fase 4: Actualización de Páginas (En Progreso)

| Página         | Estado       |
| -------------- | ------------ |
| Dashboard      | ✅ Listo     |
| Organizations  | ✅ Listo     |
| Users          | ✅ Listo     |
| Subscriptions  | ✅ Listo     |
| Support        | ✅ Listo     |
| Tiers          | ⏳ Pendiente |
| Config         | ⏳ Pendiente |
| Emails         | ⏳ Pendiente |
| Backups        | ⏳ Pendiente |
| Analytics      | ⏳ Pendiente |
| WhatsApp       | ⏳ Pendiente |
| New Users Flow | ⏳ Pendiente |
| Payments       | ⏳ Pendiente |

---

## 📋 Pendientes (Fase 4)

- [ ] Organizations - Actualizar estilo dark
- [ ] Users - Actualizar estilo dark
- [ ] Subscriptions - Actualizar estilo dark
- [ ] Support - Actualizar estilo dark
- [ ] Tiers - Actualizar estilo dark
- [ ] Config - Actualizar estilo dark
- [ ] Emails - Actualizar estilo dark
- [ ] Backups - Actualizar estilo dark
- [ ] Analytics - Actualizar estilo dark
- [ ] WhatsApp - Actualizar estilo dark
- [ ] Payments - Actualizar estilo dark

---

## 🚀 Lead Management Pipeline (Nuevo)

**Documentación:** `docs/02-architecture/SAAS_LEAD_MANAGEMENT_PIPELINE.md`

### Estado: ✅ EN PRODUCCIÓN (FASE 1-2)

| Módulo                             | Estado        | Prioridad |
| ---------------------------------- | ------------- | --------- |
| Fase 1: Fundamentos (Kanban, APIs) | ✅ COMPLETADO | Alta      |
| Fase 2: Actividades y Scoring      | ✅ COMPLETADO | Alta      |
| Fase 3: Emails y Tracking          | ✅ COMPLETADO | Media     |
| Fase 4: Inteligencia Artificial    | ✅ COMPLETADO | Media     |
| Fase 5: Analytics                  | ⏳ Pendiente  | Baja      |

### Funcionalidades Implementadas

- **Kanban visual** con vista Kanban/Table toggle
- **Lead scoring** automatizado con 15 reglas
- **Prioridad de leads** (Hot/Warm/Cold/At Risk)
- **Historial de actividades** con timeline
- **Panel de detalle** con tabs de información y actividad
- **Email manual** con plantillas predefinidas
- **Generación de emails con IA** - 5 tipos de generación

### Archivos Creados

```
- supabase/migrations/20260331000000_create_lead_management_system.sql
- src/app/api/admin/saas-management/leads/[id]/activities/route.ts
- src/app/api/admin/saas-management/leads/[id]/score/route.ts
- src/app/api/admin/saas-management/leads/[id]/email/generate/route.ts
- src/app/api/admin/saas-management/leads/[id]/email/send/route.ts
- src/components/admin/saas-management/leads/LeadKanbanBoard.tsx
- src/components/admin/saas-management/leads/LeadActivityTimeline.tsx
- src/components/admin/saas-management/leads/LeadDetailPanel.tsx
- src/components/admin/saas-management/leads/LeadEmailModal.tsx
- src/components/admin/saas-management/leads/LeadAIGeneratorModal.tsx
```

- **Dashboard analítico** del funnel

---

## 🚀 Acceso al Sistema

1. Iniciar sesión con usuario que tenga rol `root` o `dev` en la tabla `admin_users`
2. Acceder a `/admin/saas-management/dashboard`
3. Se mostrará el nuevo diseño oscuro independiente

---

## 📅 Información

- **Fecha de inicio:** 2026-03-30
- **Última actualización:** 2026-03-30
- **Responsable:** Equipo de Desarrollo Opttius

---

## Tags

`saas-management` `root` `multi-tenant` `admin` `dashboard` `architecture`

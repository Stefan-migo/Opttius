---
name: saas-management-optical-supabase
description: Expert guide for building and maintaining the SaaS management module for optical shop platforms with Supabase. Use when working on saas-management, organizations, subscriptions, tiers, root/dev admin, multi-tenant B2B, optical SaaS, billing, support B2B, backups, telemetry config, or platform administration. Covers root-only access, organization lifecycle, subscription tiers, and optical-specific SaaS patterns.
---

# SaaS Management para Plataforma Óptica con Supabase

Guía para desarrollar y mantener el módulo de gestión SaaS de Opttius: administración de organizaciones, suscripciones, usuarios globales, soporte B2B y configuración de plataforma.

## Cuándo Usar Este Skill

- Módulo `/admin/saas-management/*`
- Gestión de organizaciones (CRUD, suspend, activate, change tier)
- Suscripciones y tiers (basic, pro, premium)
- Usuarios globales del SaaS (admin_users con organization_id)
- Soporte B2B (saas_support_tickets)
- Backups, telemetría, configuración SaaS
- Cualquier feature que requiera rol `root` o `dev`

## Control de Acceso: Root/Dev Únicamente

**CRÍTICO:** Todo el módulo SaaS management es exclusivo para usuarios con rol `root` o `dev` en `admin_users`.

```typescript
// Layout: src/app/admin/saas-management/layout.tsx
// Verifica role === "root" || role === "dev" antes de renderizar

// API: Todas las rutas usan requireRoot(request)
import { requireRoot } from "@/lib/api/root-middleware";
await requireRoot(request); // Lanza AuthorizationError si no es root/dev
```

- **Layout:** Redirige a `/admin` si no es root
- **API Routes:** `requireRoot()` en cada handler GET/POST/PATCH/DELETE
- **No usar** `isSuperAdmin` o `isAdmin` para SaaS management; solo root/dev

## Arquitectura del Módulo

### Estructura de Rutas

```
/admin/saas-management/
├── dashboard          # Métricas globales, KPIs, acceso rápido
├── organizations      # Lista, crear, filtros, bulk actions
├── organizations/[id] # Detalle, branches, users, subscriptions
├── users              # Usuarios globales (admin_users)
├── users/[id]         # Detalle usuario
├── subscriptions      # Lista suscripciones, filtros
├── subscriptions/[id]  # Detalle suscripción
├── tiers              # Planes (basic, pro, premium)
├── support            # Tickets B2B, búsqueda rápida
├── support/tickets/[id]
├── config             # Parámetros SaaS (trial default, etc.)
├── emails             # Plantillas de email SaaS
├── payments           # Pasarelas habilitadas
├── backups            # Disaster recovery, descarga SQL
└── analytics          # Telemetría y métricas de uso
```

### Entidades Core

| Entidad      | Tabla                  | Descripción                                                 |
| ------------ | ---------------------- | ----------------------------------------------------------- |
| Organization | `organizations`        | Óptica/tenant. Tiene owner_id, subscription_tier, status    |
| Branch       | `branches`             | Sucursal de una organización                                |
| Subscription | `subscriptions`        | Suscripción activa/trial. organization_id, status, períodos |
| Admin User   | `admin_users`          | Usuario del sistema. organization_id, role, branch_id       |
| Tier         | `subscription_tiers`   | Plan (basic, pro, premium). price_monthly, features         |
| SaaS Ticket  | `saas_support_tickets` | Ticket B2B (óptica → Opttius)                               |

### Estados de Organización

| Status    | Descripción                |
| --------- | -------------------------- |
| active    | Operativa, acceso completo |
| suspended | Temporalmente bloqueada    |
| cancelled | Cancelada, sin acceso      |

### Estados de Suscripción

| Status     | Descripción       |
| ---------- | ----------------- |
| trialing   | Período de prueba |
| active     | Activa, pagando   |
| past_due   | Pago vencido      |
| cancelled  | Cancelada         |
| incomplete | Pago incompleto   |

## Patrones de Código

### API: Validación y Respuesta

```typescript
// Validar inputs con mensajes claros
if (!name || !slug) {
  return NextResponse.json(
    { error: "Nombre y slug son requeridos" },
    { status: 400 },
  );
}

// Slug: solo a-z, 0-9, guiones
const slugRegex = /^[a-z0-9-]+$/;
if (!slugRegex.test(slug)) {
  return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
}

// Usar createServiceRoleClient para bypass RLS (root opera sobre todo)
const supabaseServiceRole = createServiceRoleClient();
```

### Frontend: Consistencia UI

- Usar `Card`, `Badge`, `Button`, `Dialog` de shadcn/ui
- Colores de tier: basic=gray, pro=blue, premium=purple
- Confirmaciones destructivas: Dialog con descripción detallada, no `window.confirm`
- Paginación: page, limit, totalPages en respuesta API

### Eliminación de Organización

**IRREVERSIBLE.** Elimina en cascada: branches, admin_users, subscriptions, products, customers, orders, quotes, work_orders, payments. Siempre:

1. Dialog de confirmación con lista de datos a eliminar
2. Body `{ confirm: true }` en DELETE
3. Validar `confirm === true` en API antes de ejecutar

## Integración con Resto del Sistema

- **admin_users:** Los usuarios de óptica tienen `organization_id`. Root gestiona desde SaaS management.
- **Branches:** Pertenecen a organization. CRUD en `/organizations/[id]` tab Branches.
- **Subscriptions:** Una org puede tener varias; típicamente una activa. Tier en `organizations.subscription_tier`.
- **Soporte B2B:** `saas_support_tickets` vs `optical_internal_support_tickets` (B2C óptica). SaaS support = óptica habla con Opttius.

## Mejores Prácticas

1. **Siempre requireRoot** en APIs de saas-management
2. **Service role** para queries; RLS no aplica a root
3. **Logging** con `appLogger` en operaciones críticas (create, delete, suspend)
4. **Emails SaaS:** Usar `EmailNotificationService.sendSaaSNotification` para welcome, etc.
5. **Validar tier** contra `subscription_tiers` existentes
6. **Bulk actions:** Endpoint dedicado `/bulk-actions` con array de organization_ids

## Referencias

- Documentación detallada: [docs/SAAS_MANAGEMENT_SYSTEM.md](../../docs/SAAS_MANAGEMENT_SYSTEM.md)
- Soporte B2B: skill `support-optical-supabase`
- Admin users: skill `admin-users-optical-supabase`

# Sistema de Gestión SaaS - Opttius

**Versión:** 1.1  
**Última actualización:** 2026-02-21

---

## 1. Resumen Ejecutivo

El módulo **SaaS Management** es el panel de administración de plataforma exclusivo para usuarios con rol `root` o `dev`. Permite gestionar organizaciones (ópticas tenant), suscripciones, usuarios globales, soporte B2B, backups, telemetría y configuración del SaaS.

### Alcance

- **Quién accede:** Solo `admin_users` con `role = 'root'` o `role = 'dev'`
- **Qué gestiona:** Organizaciones, sucursales, suscripciones, usuarios, tickets B2B, tiers, config, emails, pagos, backups
- **Dónde vive:** `/admin/saas-management/*`

---

## 2. Arquitectura

### 2.1 Control de Acceso

```
Usuario autenticado
       │
       ▼
Layout saas-management
       │
       ├─► Consulta admin_users.role (service role)
       │
       ├─► role === 'root' || role === 'dev'  → Renderiza children
       │
       └─► role !== root/dev  → redirect("/admin")
```

**API Routes:** Todas las rutas bajo `/api/admin/saas-management/*` invocan `requireRoot(request)` al inicio. Si el usuario no es root/dev, se retorna 403.

### 2.2 Estructura de Archivos

```
src/
├── app/
│   └── admin/
│       └── saas-management/
│           ├── layout.tsx              # Guard root/dev
│           ├── page.tsx                 # Redirect a dashboard
│           ├── dashboard/page.tsx       # Dashboard principal
│           ├── organizations/
│           │   ├── page.tsx             # Lista + crear
│           │   └── [id]/page.tsx        # Detalle + tabs (branches, users, overview con resumen suscripción)
│           ├── users/
│           │   ├── page.tsx
│           │   └── [id]/page.tsx
│           ├── subscriptions/
│           │   ├── page.tsx
│           │   └── [id]/page.tsx
│           ├── tiers/page.tsx
│           ├── support/
│           │   ├── page.tsx             # Tickets + búsqueda
│           │   └── tickets/[id]/page.tsx
│           ├── config/page.tsx
│           ├── emails/page.tsx
│           ├── payments/page.tsx
│           ├── backups/page.tsx
│           └── analytics/page.tsx
│
└── app/api/admin/saas-management/
    ├── organizations/
    │   ├── route.ts                     # GET, POST
    │   ├── bulk-actions/route.ts        # POST bulk
    │   └── [id]/
    │       ├── route.ts                  # GET, PATCH, DELETE
    │       ├── actions/route.ts          # POST suspend/activate/change_tier
    │       ├── branches/route.ts         # GET, POST
    │       ├── branches/[branchId]/route.ts
    │       ├── users/route.ts            # GET, POST
    │       └── subscriptions/route.ts    # GET (resumen; gestión en /subscriptions)
    ├── users/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       └── actions/route.ts
    ├── subscriptions/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       └── actions/route.ts         # cancel, reactivate, extend
    ├── tiers/route.ts
    ├── analytics/route.ts
    ├── telemetry-config/route.ts
    ├── support/
    │   ├── tickets/route.ts
    │   ├── tickets/[id]/route.ts
    │   ├── tickets/[id]/messages/route.ts
    │   ├── search/route.ts
    │   ├── metrics/route.ts
    │   ├── export/route.ts
    │   └── templates/...
    ├── email-templates/route.ts
    ├── backups/route.ts
    ├── payments/route.ts
    ├── reset-demo/route.ts
    └── ...
```

---

## 3. Modelo de Datos

### 3.1 Organizaciones

| Campo                  | Tipo        | Descripción                       |
| ---------------------- | ----------- | --------------------------------- |
| id                     | uuid        | PK                                |
| name                   | text        | Nombre de la óptica               |
| slug                   | text        | Identificador único (a-z, 0-9, -) |
| owner_id               | uuid        | FK a profiles (opcional)          |
| subscription_tier      | text        | basic, pro, premium               |
| status                 | text        | active, suspended, cancelled      |
| metadata               | jsonb       | Datos adicionales                 |
| created_at, updated_at | timestamptz |                                   |

**Relaciones:**

- `organization_id` en `branches`, `admin_users`, `subscriptions`, `saas_support_tickets`
- `owner_id` → profiles

### 3.2 Suscripciones

| Campo                   | Tipo        | Descripción                                       |
| ----------------------- | ----------- | ------------------------------------------------- |
| id                      | uuid        | PK                                                |
| organization_id         | uuid        | FK organizations                                  |
| status                  | text        | trialing, active, past_due, cancelled, incomplete |
| current_period_start    | timestamptz |                                                   |
| current_period_end      | timestamptz |                                                   |
| cancel_at               | timestamptz | Fecha de cancelación programada                   |
| gateway_subscription_id | text        | ID en Stripe/pasarela                             |
| gateway_customer_id     | text        | ID cliente en pasarela                            |
| created_at, updated_at  | timestamptz |                                                   |

### 3.3 Subscription Tiers

| Campo         | Tipo    | Descripción         |
| ------------- | ------- | ------------------- |
| name          | text    | basic, pro, premium |
| price_monthly | numeric | Precio mensual      |
| features      | jsonb   | Límites, features   |

### 3.4 Admin Users (SaaS Users)

| Campo                  | Tipo        | Descripción                                       |
| ---------------------- | ----------- | ------------------------------------------------- |
| id                     | uuid        | PK, mismo que auth.users                          |
| organization_id        | uuid        | FK organizations                                  |
| branch_id              | uuid        | FK branches (opcional)                            |
| role                   | text        | root, dev, super_admin, admin, employee, vendedor |
| is_active              | boolean     |                                                   |
| permissions            | jsonb       | Permisos granulares                               |
| created_at, updated_at | timestamptz |                                                   |

**Nota:** `root` y `dev` son roles globales sin organization_id obligatorio para operaciones SaaS.

### 3.5 SaaS Support Tickets (B2B)

| Campo                  | Tipo        | Descripción                                                     |
| ---------------------- | ----------- | --------------------------------------------------------------- |
| id                     | uuid        | PK                                                              |
| organization_id        | uuid        | FK organizations                                                |
| ticket_number          | text        | Número legible (ej. SAAS-001)                                   |
| subject                | text        |                                                                 |
| category               | text        | technical, billing, feature_request, bug_report, account, other |
| priority               | text        | low, medium, high, urgent                                       |
| status                 | text        | open, assigned, in_progress, waiting_customer, resolved, closed |
| created_by_user_id     | uuid        |                                                                 |
| assigned_to_user_id    | uuid        |                                                                 |
| created_at, updated_at | timestamptz |                                                                 |

---

## 4. Flujos Principales

### 4.1 Crear Organización

1. POST `/api/admin/saas-management/organizations`
2. Validar: name, slug (regex), tier, status
3. Verificar slug único
4. Insertar en `organizations`
5. Si hay owner_id: actualizar admin_users.organization_id
6. Opcional: enviar email welcome con `EmailNotificationService.sendSaaSNotification("saas_welcome", ...)`

### 4.2 Eliminar Organización

1. Usuario confirma en Dialog (lista de datos a eliminar)
2. DELETE `/api/admin/saas-management/organizations/[id]` con `{ confirm: true }`
3. API valida `confirm === true`
4. Eliminar en orden (respetar FKs): work_orders, orders, quotes, products, branches, admin_users, subscriptions, organization

### 4.3 Crear Suscripción (Trial)

1. POST `/api/admin/saas-management/subscriptions`
2. Body: `{ organization_id, status: "trialing", trial_days: 7 }`
3. Calcular current_period_start/end según trial_days
4. Insertar en `subscriptions`

### 4.4 Acciones sobre Organización

- **suspend:** status → suspended
- **activate:** status → active
- **cancel:** status → cancelled
- **change_tier:** subscription_tier → value (basic/pro/premium)

Endpoint: POST `/api/admin/saas-management/organizations/[id]/actions`  
Body: `{ action: "suspend" | "activate" | "cancel" | "change_tier", value?: string }`

### 4.5 Acciones sobre Suscripción

- **cancel:** Marcar para cancelar al final del período
- **reactivate:** Reactivar si estaba cancelada
- **extend:** Extender período (value: días o fecha)

Endpoint: POST `/api/admin/saas-management/subscriptions/[id]/actions`

---

## 5. Dashboard y Métricas

### 5.1 Métricas del Dashboard

- Total / activas organizaciones
- Total / activos usuarios
- Total / activas suscripciones
- Ingresos mensuales y anuales (calculados desde subscriptions activas + tier prices)
- Crecimiento de organizaciones (últimos 30 días)
- Tasa de conversión de trials
- Distribución por tier
- Organizaciones creadas últimos 30 días

### 5.2 API Analytics

GET `/api/admin/saas-management/analytics` retorna:

```json
{
  "metrics": {
    "totalOrganizations": 10,
    "activeOrganizations": 8,
    "totalUsers": 45,
    "activeUsers": 42,
    "totalSubscriptions": 10,
    "activeSubscriptions": 7,
    "monthlyRevenue": 1500000,
    "annualRevenue": 18000000,
    "organizationGrowth": 12.5,
    "trialConversionRate": 65.2,
    "tierDistribution": { "basic": 5, "pro": 3, "premium": 2 },
    "organizationsLast30Days": 2
  }
}
```

---

## 6. Soporte B2B

### 6.1 Tickets SaaS

- **Origen:** Óptica (organización) contacta a Opttius
- **Tabla:** `saas_support_tickets`
- **Categorías:** technical, billing, feature_request, bug_report, account, other
- **Estados:** open → assigned → in_progress → waiting_customer → resolved → closed

### 6.2 Búsqueda Rápida

GET `/api/admin/saas-management/support/search?q=...`  
Busca en organizaciones (name, slug) y usuarios (email, nombre). Retorna `{ organizations: [], users: [] }`.

---

## 7. Configuración y Utilidades

### 7.1 Telemetría

- GET/PUT `/api/admin/saas-management/telemetry-config`
- Control global de recolección de métricas

### 7.2 Reset Demo

- POST `/api/admin/saas-management/reset-demo`
- Restaura la base de datos de la Óptica Demo al estado inicial (solo dev)

### 7.3 Backups

- Gestión de respaldos del servidor
- Descarga de volcados SQL
- Triple capa: backups por org (diarios), integrales (semanales), cifrado AES-256

---

## 8. Integración con Otros Módulos

| Módulo        | Relación                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------ |
| Admin Users   | admin_users.organization_id; roles root/dev para SaaS                                      |
| Branches      | branches.organization_id; CRUD en org detail                                               |
| Subscriptions | subscriptions.organization_id; tier en organizations                                       |
| Support B2C   | optical_internal_support_tickets (óptica→cliente) vs saas_support_tickets (óptica→Opttius) |
| System Config | Configuración global vs branch-scoped; SaaS config es global                               |
| Analytics     | Telemetría y métricas de uso del sistema                                                   |

---

## 9. Mejores Prácticas de Desarrollo

### 9.1 API

- Siempre `requireRoot(request)` al inicio
- Usar `createServiceRoleClient()` para bypass RLS
- Validar inputs (Zod o manual) con mensajes claros
- Logging con `appLogger` en operaciones críticas
- Respuestas consistentes: `{ data?, error?, pagination? }`

### 9.2 Frontend

- Confirmaciones destructivas con Dialog, no `window.confirm`
- Paginación en listas grandes (limit 20 por defecto)
- Filtros: tier, status, search
- Bulk actions cuando aplique (organizaciones)
- Usar `extractDataFromResponse` y `extractPaginationFromResponse` para respuestas API

### 9.3 Seguridad

- Nunca exponer rutas SaaS management sin verificación root
- No confiar en client-side checks; validar en API
- Eliminaciones con confirm explícito

---

## 10. Roadmap y Mejoras Sugeridas

- [x] Validación con Zod en APIs principales (organizations, branches, subscriptions, users) — 2026-02
- [x] Tests de integración para flujos críticos (crear org, eliminar org, crear suscripción) — 2026-02
- [ ] Webhooks para eventos de suscripción (Stripe/pasarela)
- [ ] Auditoría de acciones root (quién hizo qué, cuándo)
- [ ] Rate limiting en endpoints sensibles
- [ ] Documentación OpenAPI para APIs SaaS management

**Nota:** Ver `SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md` para el detalle de cambios implementados en febrero 2026.

# Sistema de Gestión de Tiers de Suscripción - Opttius

**Versión:** 1.1  
**Última actualización:** 2026-03-01  
**Base documental:** Este documento es la fuente de verdad para el sistema de tiers. Toda la documentación del programa se irá desarrollando a partir de esta estructura.

**Changelog 1.1 (2026-03-01):** Implementadas mejoras 7.1-7.4, 7.6, 7.7, 7.10: fuente DB en tier-validator, mapeo NULL/0, downgrade programado, Zod PATCH, labels centralizados, auditoría, tests.

---

## 1. Resumen Ejecutivo

El sistema de tiers de Opttius define los planes de suscripción (Basic, Pro, Premium) que determinan los límites operativos y las funcionalidades disponibles para cada organización (óptica) en la plataforma. Es un componente crítico del modelo SaaS multi-tenant.

### Alcance

- **Qué gestiona:** Planes (basic, pro, premium), precios, límites (branches, users, customers, products), features (chat_ia, analytics, api_access, branding)
- **Dónde vive:** Tabla `subscription_tiers`, módulo `/admin/saas-management/tiers`, APIs de validación
- **Quién modifica:** Usuarios root/dev (gestión), super_admin de org (cambio de plan)

---

## 2. Modelo de Datos

### 2.1 Tabla subscription_tiers

| Campo           | Tipo          | Descripción                         |
| --------------- | ------------- | ----------------------------------- |
| id              | UUID          | PK, generado                        |
| name            | TEXT          | basic, pro, premium (UNIQUE, CHECK) |
| price_monthly   | DECIMAL(10,2) | Precio mensual en CLP               |
| max_branches    | INTEGER       | Máx. sucursales (NULL = ilimitado)  |
| max_users       | INTEGER       | Máx. usuarios activos               |
| max_customers   | INTEGER       | Máx. clientes (NULL = ilimitado)    |
| max_products    | INTEGER       | Máx. productos (NULL = ilimitado)   |
| features        | JSONB         | Feature flags por plan              |
| gateway_plan_id | TEXT          | ID plan Mercado Pago (opcional)     |
| created_at      | TIMESTAMPTZ   |                                     |

### 2.2 Relación con organizations

- `organizations.subscription_tier` almacena el tier actual (basic/pro/premium)
- CHECK constraint: `subscription_tier IN ('basic','pro','premium')`
- No hay FK a subscription_tiers; es referencia por nombre

### 2.3 Valores por defecto (seed)

| Tier    | Precio  | Branches | Users | Customers | Products |
| ------- | ------- | -------- | ----- | --------- | -------- |
| basic   | 49.000  | 1        | 2     | 500       | 100      |
| pro     | 99.000  | 3        | 5     | 2.000     | 500      |
| premium | 299.000 | 20       | 50    | ∞         | ∞        |

### 2.4 Features (JSONB)

```json
{
  "pos": true,
  "appointments": true,
  "quotes": true,
  "work_orders": true,
  "chat_ia": false,
  "advanced_analytics": false,
  "api_access": false,
  "custom_branding": false
}
```

---

## 3. Arquitectura de Componentes

### 3.1 Fuentes de Configuración

| Componente        | Ubicación                        | Propósito                                        |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| Base de datos     | `subscription_tiers`             | Fuente de verdad para precios, límites, features |
| tier-config.ts    | `src/lib/saas/tier-config.ts`    | Tipos y fallback cuando DB falla                 |
| tier-validator.ts | `src/lib/saas/tier-validator.ts` | Validaciones server-side; lee de DB primero      |
| tier-constants.ts | `src/lib/saas/tier-constants.ts` | Labels de features y nombres de display          |

**Implementado (v1.1):** tier-validator usa `getTierConfigFromDb()` como fuente primaria; fallback a tier-config si la DB falla.

### 3.2 APIs

| Endpoint                                              | Método | Acceso          | Descripción                         |
| ----------------------------------------------------- | ------ | --------------- | ----------------------------------- |
| /api/admin/saas-management/tiers                      | GET    | root/dev        | Lista tiers con estadísticas        |
| /api/admin/saas-management/tiers                      | PATCH  | root/dev        | Actualiza tier (name en body)       |
| /api/landing/tiers                                    | GET    | Público         | Tiers para landing/pricing          |
| /api/admin/subscription/change-plan                   | POST   | super_admin org | Cambio de plan (newTier, immediate) |
| /api/admin/saas-management/organizations/[id]/actions | POST   | root/dev        | change_tier (action, value)         |

### 3.3 Validaciones de Límites

Se invoca `validateTierLimit(organizationId, limitType)` en:

- `branches/route.ts` — antes de crear sucursal
- `admin-users/register/route.ts` — antes de registrar usuario
- `customers/route.ts` — antes de crear cliente
- `products/route.ts` — antes de crear producto

### 3.4 Validaciones de Features

Se invoca `validateFeature(organizationId, feature)` en:

- `chat/route.ts` — feature "chat_ia"
- `analytics/dashboard/route.ts` — feature "advanced_analytics"

---

## 4. Flujos Principales

### 4.1 Cambio de Tier (root/dev)

1. Root accede a `/admin/saas-management/organizations/[id]`
2. Selecciona acción "Cambiar tier"
3. POST `/api/admin/saas-management/organizations/[id]/actions`
4. Body: `{ action: "change_tier", value: "pro" }`
5. API valida value ∈ {basic, pro, premium}
6. Actualiza `organizations.subscription_tier`
7. Cambio efectivo inmediato

### 4.2 Cambio de Plan (super_admin de org)

1. Usuario en su organización accede a configuración de suscripción
2. POST `/api/admin/subscription/change-plan`
3. Body: `{ newTier: "pro", immediate?: false }`
4. Lógica:
   - **Upgrade:** Cambio inmediato
   - **Downgrade:** Programado al final del período (scheduled_tier, scheduled_tier_effective_at). Aplicación lazy en getOrganizationTier.

### 4.3 Edición de Tiers (root)

1. Root accede a `/admin/saas-management/tiers`
2. Clic en "Editar" en un tier
3. Modifica precio, límites, features
4. PATCH `/api/admin/saas-management/tiers` con `name` y campos a actualizar (validación Zod)
5. DB se actualiza; tier-validator lee de DB, validaciones reflejan cambios

---

## 5. Mejores Prácticas para un SaaS Óptico

### 5.1 Diseño de Tiers

1. **Escalabilidad progresiva:** Basic → Pro → Premium con incrementos claros de valor
2. **Límites ópticos:** max_branches refleja realidad de ópticas (1-3 sucursales típico, 20 para cadenas)
3. **Features diferenciadores:** Chat IA y analytics en Pro; API y branding en Premium
4. **Precios en CLP:** Mantener coherencia con mercado chileno

### 5.2 Código Limpio

1. **Una fuente de verdad:** Preferir DB sobre config hardcodeada
2. **Validación server-side:** Siempre en API, nunca confiar en frontend
3. **Tipos TypeScript:** Usar `SubscriptionTier`, `TierFeature`, `TierLimits` de tier-config
4. **Mensajes claros:** Usar `getTierUpgradeMessage()` para UX consistente

### 5.3 Lógica Efectiva

1. **Validar antes de insertar:** Llamar `validateTierLimit` en cada creación de recurso limitado
2. **Feature gating:** Verificar `validateFeature` antes de exponer módulos premium
3. **Logging:** Registrar cambios de tier con organizationId, fromTier, toTier
4. **Auditoría:** Tabla `tier_change_audit` registra cada cambio (source: root, org_user, checkout, scheduled_job)

### 5.4 Integración con Pagos

- `gateway_plan_id` en subscription_tiers vincula con Mercado Pago PreApproval
- Tras pago exitoso, `payment-service.ts` actualiza `organizations.subscription_tier`
- Checkout usa tiers para mostrar planes y crear preapproval

---

## 6. Estado Actual y Devolución

### 6.1 Lo que funciona bien

- ✅ Estructura de tabla subscription_tiers clara
- ✅ CHECK constraints en DB para tier names
- ✅ RLS en subscription_tiers (lectura autenticada, escritura super_admin)
- ✅ API de tiers con estadísticas (orgs por tier, ingresos estimados)
- ✅ UI de edición de tiers funcional
- ✅ validateTierLimit usado en branches, users, customers, products
- ✅ validateFeature usado en chat y analytics
- ✅ Landing tiers lee de DB (siempre precios actuales)
- ✅ Colores consistentes (basic=gray, pro=blue, premium=purple)
- ✅ getTierUpgradeMessage para mensajes de upgrade

### 6.2 Áreas de mejora identificadas

Ver sección 7 para el detalle de mejoras propuestas.

---

## 7. Mejoras Propuestas

### 7.1-7.4, 7.6, 7.7, 7.10 — IMPLEMENTADAS (v1.1)

- **7.1 Fuente única de verdad:** tier-validator usa `getTierConfigFromDb()`; fallback a tier-config.
- **7.2 NULL vs 0:** API PATCH convierte 0/null a NULL; UI envía null para ilimitado.
- **7.3 Downgrade programado:** scheduled_tier, scheduled_tier_effective_at; aplicación lazy en getOrganizationTier.
- **7.4 Zod PATCH:** tierUpdateSchema en zod-schemas; parseAndValidateBody en tiers route.
- **7.6 Feature labels:** tier-constants.ts con TIER_FEATURE_LABELS, TIER_DISPLAY_NAMES.
- **7.7 Auditoría:** tabla tier_change_audit; recordTierChange en actions, change-plan, payment-service, tier-validator.
- **7.10 Tests:** tiers.test.ts (integración), tier-validator.test.ts (unit).

---

### 7.5 Ruta PATCH por nombre

**Problema:** PATCH actual envía `name` en body. Sería más RESTful usar `/tiers/[name]` para PATCH.

**Solución:** Crear `route.ts` en `tiers/[name]/` con PATCH que recibe params.name. Mantener compatibilidad con body.name si se prefiere.

**Prioridad:** Baja

---

### 7.8 FK organizations → subscription_tiers

**Problema:** organizations.subscription_tier es TEXT con CHECK, no FK. Si se renombra un tier en subscription_tiers, las orgs quedarían inconsistentes.

**Solución:** Mantener CHECK por simplicidad (los nombres de tier son estables). Si se requiere mayor integridad, añadir FK y migración. Evaluar costo/beneficio.

**Prioridad:** Baja

---

### 7.9 Sincronización tier-config con DB

**Problema:** tier-config.ts tiene valores duplicados. Cualquier cambio en DB requiere cambio manual en código.

**Solución (alternativa a 7.1):** Si se mantiene tier-config como fallback, crear script o seed que lea de DB y genere/actualice tier-config.ts. O eliminar tier-config y leer siempre de DB.

**Prioridad:** Depende de 7.1

---

## 8. Referencias

- [SAAS_MANAGEMENT_SYSTEM.md](./SAAS_MANAGEMENT_SYSTEM.md) — Módulo SaaS completo
- [.cursor/skills/tiers-optical-supabase/SKILL.md](../.cursor/skills/tiers-optical-supabase/SKILL.md) — Skill para agentes
- Migración: `supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql`
- Migración gateway: `supabase/migrations/20260207000001_add_gateway_plan_id_to_subscription_tiers.sql`
- Migración scheduled_tier: `supabase/migrations/20260308000000_add_scheduled_tier_to_organizations.sql`
- Migración auditoría: `supabase/migrations/20260308000001_create_tier_change_audit.sql`

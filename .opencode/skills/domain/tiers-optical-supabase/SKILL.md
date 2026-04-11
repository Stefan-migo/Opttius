---
name: tiers-optical-supabase
description: Expert guide for building and maintaining the subscription tiers system for optical shop SaaS with Supabase. Use when working on tiers, subscription_tiers, tier limits, feature gating, validateTierLimit, tier-config, change tier, upgrade/downgrade, max_branches, max_users, max_customers, max_products, or optical subscription plans.
---

# Gestión de Tiers de Suscripción - SaaS Óptico con Supabase

Guía para desarrollar y mantener el sistema de tiers de suscripción de Opttius: planes (basic, pro, premium), límites, features, validaciones y flujos de cambio de plan.

## Cuándo Usar Este Skill

- Módulo `/admin/saas-management/tiers`
- API `/api/admin/saas-management/tiers`
- API `/api/landing/tiers`
- API `/api/admin/subscription/change-plan`
- Acción `change_tier` en organizations
- `tier-config.ts`, `tier-validator.ts`
- Validaciones de límites (branches, users, customers, products)
- Feature gating (chat_ia, advanced_analytics, field_operations, agreements, whatsapp)
- Checkout y preapproval con tier

## Referencia Principal

**Documentación detallada:** [docs/TIERS_SYSTEM.md](../../docs/TIERS_SYSTEM.md)

## Control de Acceso

| Contexto                | Quién                 | Requisito                               |
| ----------------------- | --------------------- | --------------------------------------- |
| Gestión de tiers (CRUD) | root/dev              | `requireRoot(request)`                  |
| Cambio de plan (org)    | super_admin de la org | Usuario autenticado con organization_id |
| Landing tiers           | Público               | Sin auth (read-only)                    |

## Arquitectura de Tiers

### Fuente de Verdad

- **Base de datos:** `subscription_tiers` es la fuente de verdad para precios, límites y features.
- **tier-validator:** Usa `getTierConfigFromDb()` como fuente primaria; fallback a tier-config si la DB falla.
- **tier-config.ts:** Tipos TypeScript y fallback de resiliencia.
- **tier-constants.ts:** `TIER_FEATURE_LABELS`, `TIER_DISPLAY_NAMES` para UI.

### Tabla subscription_tiers

```sql
subscription_tiers (
  id UUID,
  name TEXT UNIQUE CHECK (name IN ('basic','pro','premium')),
  price_monthly DECIMAL(10,2),
  max_branches INTEGER,
  max_users INTEGER,
  max_customers INTEGER,  -- NULL = unlimited
  max_products INTEGER,   -- NULL = unlimited
  features JSONB,
  gateway_plan_id TEXT,   -- Mercado Pago PreApproval Plan
  created_at TIMESTAMPTZ
)
```

### Features por Tier (JSONB)

| Feature            | Basic | Pro | Premium |
| ------------------ | ----- | --- | ------- |
| pos                | ✓     | ✓   | ✓       |
| appointments       | ✓     | ✓   | ✓       |
| quotes             | ✓     | ✓   | ✓       |
| work_orders        | ✓     | ✓   | ✓       |
| prescriptions      | ✓     | ✓   | ✓       |
| custom_branding    | ✓     | ✓   | ✓       |
| chat_ia            | ✗     | ✓   | ✓       |
| advanced_analytics | ✗     | ✓   | ✓       |
| field_operations   | ✗     | ✓   | ✓       |
| agreements         | ✗     | ✓   | ✓       |
| whatsapp           | ✗     | ✓   | ✓       |

## Patrones de Código

### Validar límite antes de crear

```typescript
import { validateTierLimit } from "@/lib/saas/tier-validator";

const result = await validateTierLimit(organizationId, "branches");
if (!result.allowed) {
  return NextResponse.json({ error: result.reason }, { status: 403 });
}
```

### Validar feature antes de acceder

```typescript
import { validateFeature } from "@/lib/saas/tier-validator";

const hasChatIa = await validateFeature(organizationId, "chat_ia");
if (!hasChatIa) {
  return NextResponse.json(
    { error: "Upgrade a Pro para usar Chat IA" },
    { status: 403 },
  );
}
```

### Obtener tier de una organización

```typescript
// Desde tier-validator (usa DB para org, tier-config para límites)
const tier = await getOrganizationTier(organizationId);

// O desde organizations directamente
const { data } = await supabase
  .from("organizations")
  .select("subscription_tier")
  .eq("id", organizationId)
  .single();
```

### Cambio de tier (root)

```typescript
// POST /api/admin/saas-management/organizations/[id]/actions
// Body: { action: "change_tier", value: "pro" }
```

### Cambio de plan (org super_admin)

```typescript
// POST /api/admin/subscription/change-plan
// Body: { newTier: "pro", immediate?: boolean }
```

## Reglas de Negocio

1. **Upgrade:** Cambio inmediato. El usuario paga la diferencia.
2. **Downgrade:** Idealmente programado al final del período. Si `immediate=true`, cambio inmediato.
3. **Unlimited:** En DB se usa `NULL` para ilimitado. En tier-config se usa `"unlimited"`.
4. **Límites:** Siempre validar server-side antes de insertar (branch, user, customer, product).

## Mejores Prácticas

1. **Siempre validar en API:** No confiar en checks del frontend.
2. **Leer de DB:** Para validaciones dinámicas, usar `subscription_tiers` como fuente.
3. **Sincronizar tier-config:** Si se usa tier-config como fallback, mantenerlo alineado con la DB.
4. **Colores UI:** basic=gray, pro=blue, premium=purple.
5. **Mensajes de upgrade:** Usar `getTierUpgradeMessage(tier, limitType)` para UX consistente.
6. **Logging:** Registrar cambios de tier con `appLogger.info`.

## Integración con Otros Módulos

| Módulo           | Cómo usa tiers                                         |
| ---------------- | ------------------------------------------------------ |
| Branches         | `validateTierLimit(orgId, "branches")` antes de crear  |
| Admin Users      | `validateTierLimit(orgId, "users")` antes de registrar |
| Customers        | `validateTierLimit(orgId, "customers")` antes de crear |
| Products         | `validateTierLimit(orgId, "products")` antes de crear  |
| Chat IA          | `validateFeature(orgId, "chat_ia")`                    |
| Analytics        | `validateFeature(orgId, "advanced_analytics")`         |
| Field Operations | `validateFeature(orgId, "field_operations")`           |
| Agreements       | `validateFeature(orgId, "agreements")`                 |
| WhatsApp         | `validateFeature(orgId, "whatsapp")`                   |
| check-status     | Retorna `tierFeatures` para filtrado de sidebar        |
| AdminShell       | Filtra nav items por `tierFeatures`                    |
| Checkout         | `subscription_tiers` para precios y gateway_plan_id    |
| Payment Service  | Actualiza `organizations.subscription_tier` tras pago  |

## Referencias

- Documentación detallada: [docs/TIERS_SYSTEM.md](../../docs/TIERS_SYSTEM.md)
- SaaS Management: skill `saas-management-optical-supabase`
- Payment Workflow: skill `payment-workflow-optical-supabase`

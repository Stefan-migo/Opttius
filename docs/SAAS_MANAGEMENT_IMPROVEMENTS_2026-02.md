# Módulo SaaS Management — Mejoras Implementadas (2026-02)

**Versión:** 1.0  
**Fecha:** 2026-02-21

---

## 1. Resumen Ejecutivo

Se implementó el plan de mejoras del módulo SaaS Management: corrección del bug de suscripción vencida, consolidación de suscripciones, migración al Design System Epoch, reemplazo de `window.confirm` por Dialogs, validación Zod en APIs, optimización N+1 y tests de integración.

---

## 2. Modificaciones Implementadas

### 2.1 Fase 1 — Bugs Críticos

#### Bug: Mensaje de suscripción vencida no aparecía en óptica

**Problema:** Cuando root desactivaba/cancelaba la suscripción en saas-management, los usuarios de la óptica no veían "Período de prueba finalizado" o "Suscripción vencida" al acceder a `/admin`.

**Solución aplicada:**

- **`src/lib/saas/subscription-status.ts`**: Se añadió consulta a `organizations` para obtener `status`. Si `organization.status` es `suspended` o `cancelled` → `isExpired: true`. El estado `past_due` se trata como expirado. Si `status === "cancelled"` y `canceled_at` está definido → bloqueo inmediato.
- **`src/components/admin/SubscriptionGuard.tsx`**: Exclusión explícita de la ruta `/admin/saas-management` para evitar llamadas innecesarias cuando el usuario es root.

#### Consolidación: Un solo manejo de suscripciones

**Problema:** Duplicación entre tab "Suscripciones" en detalle de organización y página dedicada `/admin/saas-management/subscriptions`.

**Solución aplicada:**

- **`organizations/[id]/page.tsx`**: Se eliminó el tab "Suscripciones" completo (CRUD, estado, handlers, diálogos). En el tab "Resumen" se muestra un bloque compacto con la suscripción activa y botón "Gestionar suscripciones" que navega a `/admin/saas-management/subscriptions?organization_id={orgId}`.
- **`subscriptions/page.tsx`**: Soporte de `organization_id` en URL como query param para pre-filtrar al navegar desde el detalle de organización.

### 2.2 Fase 2 — Design System Epoch

#### Tokens legacy (Fase 2.1)

| Archivo                  | Tokens reemplazados                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `backups/page.tsx`       | `text-azul-profundo` → `text-epoch-primary`, `text-tierra-media` → `text-muted-foreground` |
| `emails/page.tsx`        | `text-azul-profundo`, `text-tierra-media`, `text-verde-suave` → `text-admin-success`       |
| `config/page.tsx`        | `text-azul-profundo`, `text-tierra-media`                                                  |
| `users/[id]/page.tsx`    | `text-azul-profundo`, `text-tierra-media`                                                  |
| `tiers/page.tsx`         | `text-azul-profundo`, `text-tierra-media`                                                  |
| `organizations/page.tsx` | `text-azul-profundo`, `text-tierra-media`                                                  |

#### admin-card y rounded-none (Fase 2.2 y 2.3)

- **Admin-card**: Aplicada a todas las Cards en dashboard, organizations, organizations/[id], subscriptions, users, users/[id], tiers, config, emails, backups, payments, analytics.
- **rounded-none**: Aplicada a Cards, SelectTrigger e Input en páginas principales de saas-management.

#### Tipografía Epoch (Fase 3.1)

- Títulos principales: `font-display font-bold text-epoch-primary tracking-tight`. Aplicado en: dashboard, organizations, organizations/[id], subscriptions, subscriptions/[id], users, users/[id], tiers, config, emails, backups, analytics, payments, support/tickets/[id].

### 2.3 Fase 3 — UX y Validación

#### Reemplazo de window.confirm por Dialog (Fase 3.2)

- **`organizations/[id]/page.tsx`**: Delete branch y delete user con Dialogs de confirmación (estado `deleteBranchConfirmId`, `deleteUserConfirmId`).
- **`backups/page.tsx`**: Create backup y delete backup con Dialogs (estado `createBackupConfirmOpen`, `deleteBackupConfirmFileName`).

#### Validación con Zod en APIs (Fase 3.3)

**Schemas añadidos en `src/lib/api/validation/zod-schemas.ts`:**

- `createOrganizationSchema`, `updateOrganizationSchema`
- `createBranchSchema`
- `createSubscriptionSchema`, `updateSubscriptionSchema`
- `createOrgUserSchema`, `updateSaasUserSchema`

**APIs actualizadas:**

- POST/PATCH `organizations/route.ts`, `organizations/[id]/route.ts`
- POST `organizations/[id]/branches/route.ts`
- POST/PATCH `subscriptions/route.ts`, `subscriptions/[id]/route.ts`
- POST `organizations/[id]/users/route.ts`
- PATCH `users/[id]/route.ts`

### 2.4 Fase 4 — Optimización y Tests

#### Optimización N+1 (Fase 4.1)

- **`organizations/route.ts` GET**: En lugar de `Promise.all` por cada organización (4 queries × N orgs), ahora se ejecutan 4 queries en batch: usuarios activos, branches, owners (profiles), suscripciones activas. Los resultados se agrupan en memoria.

#### Tests de integración (Fase 4.2)

- **`src/__tests__/integration/api/saas-management/organizations-subscriptions.test.ts`**: Tests para crear organización, eliminar organización con confirmación, crear suscripción. Requieren Supabase local y servidor Next.js en ejecución.

---

## 3. Pendiente (Backlog)

- [ ] **Webhooks para eventos de suscripción**: Integración con Stripe/pasarela para eventos automáticos.
- [ ] **Auditoría de acciones root**: Log de quién hizo qué y cuándo en operaciones SaaS.
- [ ] **Rate limiting**: En endpoints sensibles (organizations, subscriptions).
- [ ] **Documentación OpenAPI**: Para APIs de saas-management.
- [ ] **Tokens legacy en más archivos**: Algunos módulos (products/bulk, cash-register, etc.) aún pueden tener tokens legacy.

---

## 4. Archivos Clave Modificados

| Archivo                                                     | Cambios                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/saas/subscription-status.ts`                       | Check organization.status, past_due como expirado            |
| `src/components/admin/SubscriptionGuard.tsx`                | Exclusión ruta saas-management                               |
| `src/app/admin/saas-management/organizations/[id]/page.tsx` | Tab Suscripciones eliminado, Dialogs para delete branch/user |
| `src/app/admin/saas-management/subscriptions/page.tsx`      | Query param organization_id                                  |
| `src/app/admin/saas-management/backups/page.tsx`            | Dialogs para create/delete backup                            |
| `src/app/admin/saas-management/**/page.tsx`                 | admin-card, rounded-none, tipografía Epoch                   |
| `src/lib/api/validation/zod-schemas.ts`                     | Schemas SaaS                                                 |
| `src/app/api/admin/saas-management/organizations/route.ts`  | Zod, optimización N+1                                        |

---

## 5. Referencia: Documentación Base

- **SAAS_MANAGEMENT_SYSTEM.md**: Documentación base del módulo (arquitectura, modelo de datos, flujos). Actualizada para reflejar que el tab Suscripciones ya no existe en organizations/[id]; la gestión se hace exclusivamente en `/admin/saas-management/subscriptions`.

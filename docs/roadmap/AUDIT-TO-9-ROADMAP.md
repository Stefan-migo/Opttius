# 🗺️ Opttius — Roadmap: 5.3 → 9.0

**Audit baseline:** 2026-06-30 | **Target:** Overall 9/10

---

## How SDD Cycles Map to the Goal

Cada SDD change aborda findings específicos del audit y produce un delta medible. Al final de cada fase, corremos `sdd-verify` para confirmar que el score subió.

| Target    | Score      | Cuando     |
| --------- | ---------- | ---------- |
| 5.3 → 6.5 | Fase 0 + 1 | Semana 1   |
| 6.5 → 7.5 | Fase 2     | Semana 2-3 |
| 7.5 → 8.5 | Fase 3     | Semana 3-5 |
| 8.5 → 9.0 | Fase 4     | Semana 5-6 |

---

## Fase 0 — Emergency Patch (Día 1)

> Findings críticos que son agujeros de seguridad activos o riesgo de negocio.

### SDD: `apply-pending-migrations`

**Qué:** Aplicar migrations 09, 10, 11 al ambiente local y remoto.
**Findings:** C4 (migration drift), C2 (org_id en order_items/payments)
**Duración:** 30 min
**Riesgo:** Ninguno (solo agrega columnas + RLS + GRANTs)

Tasks:

- `supabase db push` en local
- Verificar que `idx_order_items_organization_id` existe
- Verificar que `cron_role` existe y tiene GRANTs
- Push a remote

### SDD: `fix-payment-gateways-config-rls`

**Qué:** Reemplazar política `USING (true)` en `payment_gateways_config` con RLS org-scoped.
**Findings:** C10 (RLS pública), C2 (multi-tenant leak)
**Duración:** 1-2h

Tasks:

- Agregar `organization_id` a `payment_gateways_config`
- Crear policy org-scoped (reemplazar `USING true`)
- Migration `00012_fix_payment_gateways_config_rls.sql`

### SDD: `setup-ci-pipeline`

**Qué:** Crear GitHub Actions workflow que corra `test:ci` en push y PR.
**Findings:** C5 (no CI)
**Duración:** 1-2h

Tasks:

- `.github/workflows/ci.yml` con `npm run test:ci`
- `.github/workflows/pr-checks.yml` con lint + type-check + test
- Verificar que corre en PR y push

### SDD: `eliminate-duplicate-zod-helpers`

**Qué:** Eliminar `src/lib/api/validation/zod-helpers.ts` y redirigir imports.
**Findings:** C9 (duplicación de infra)
**Duración:** 1h

Tasks:

- Identificar todos los imports de `@/lib/api/validation/zod-helpers`
- Migrar a `@/lib/validation/zod-helpers`
- Barrel re-export si es necesario
- Eliminar archivo duplicado
- Verificar build

---

## Fase 1 — Secure the Perimeter (Semana 1)

> Webhooks, CSRF, rate limiting, security headers — las defensas perimetrales.

### SDD: `webhook-signature-verification`

**Qué:** Agregar verificación de firma a PayPal y Resend webhooks.
**Findings:** C3 (PayPal), C4 (Resend), H7 (Flow)
**Duración:** 4-6h

Tasks:

- PayPal: implementar verify-webhook-signature via REST API
- Resend: implementar verificación Svix (standard de Resend)
- Flow: hacer signature OBLIGATORIA en producción
- Migration para `webhook_events` si es necesario
- Tests unitarios para cada webhook verification

### SDD: `add-csrf-protection`

**Qué:** Agregar CSRF protection a state-changing API routes.
**Findings:** H1 (no CSRF)
**Duración:** 4h

Tasks:

- Verificar SameSite=Lax en cookies Supabase SSR
- Agregar Origin/Referer validation middleware
- Middleware wrapper para rutas POST/PUT/DELETE
- Tests de CSRF protection

### SDD: `unify-rate-limiting`

**Qué:** Eliminar Map in-memory, unificar en Redis middleware central.
**Findings:** H2 (3 rate limiters), F10 (fail-open)
**Duración:** 4h

Tasks:

- Eliminar `withRateLimit` de `src/lib/api/middleware.ts`
- Wire Redis-based middleware a todas las rutas API
- Configurar límites diferenciados (webhooks: alto, auth: medio, API: default)
- Fail-closed cuando Redis caiga en producción
- Tests de rate limiting

### SDD: `wire-security-headers`

**Qué:** Aplicar `withSecurityHeaders()` a todas las respuestas via middleware central.
**Findings:** H3 (headers no conectados), F11 (CSP débil)
**Duración:** 2h

Tasks:

- Integrar en `middleware.ts` o response wrapper
- Verificar CSP en producción (sin unsafe-inline si es posible)
- HSTS, X-Frame-Options, Permissions-Policy

---

## Fase 2 — Code Quality & Organization (Semana 2)

> Deuda técnica estructural — God files, duplicación, console.log, tipos.

### SDD: `split-god-files-wave-1`

**Qué:** Dividir los 11 archivos > 1000 líneas, empezando por los de mayor impacto.
**Findings:** C8 (11 God files), C7 (AdminShell)
**Duración:** 3-4 días

Tasks (por prioridad):

1. `src/types/supabase.ts` (8530 líneas) → types por dominio
2. `AdminShell.tsx` (1031) → server layout + lazy client hydration
3. `CreateAppointmentForm.tsx` (1272) → 4+ subcomponentes
4. `SystemAdminContent.tsx` (1396) → lazy-loaded tabs
5. `WorkOrderDetailContent.tsx` (1257) → subcomponentes por sección

Cada archivo debe quedar < 300 líneas. Usar SRP estricto.

### SDD: `unify-error-hierarchy`

**Qué:** Unificar `src/lib/errors/comprehensive-handler.ts` y `src/lib/api/errors.ts`.
**Findings:** H5 (jerarquía duplicada)
**Duración:** 3h

Tasks:

- `api/errors.ts` pasa a re-exportar desde `errors/comprehensive-handler.ts`
- Verificar todos los imports
- Tests de error handling unificado

### SDD: `ban-console-log`

**Qué:** Reemplazar console.log/error/warn con `appLogger` en producción.
**Findings:** H6 (159 archivos con console.log)
**Duración:** 2 días

Tasks:

- Agregar regla `no-console` a ESLint con warning
- Migrar 30 archivos/día por lotes (pueden ser SDDs paralelos)
- Tests: mantener console.log en tests (setup.ts los mockea)

### SDD: `fix-ts-ignore-types`

**Qué:** Eliminar `@ts-ignore` y reducir `any`en producción.
**Findings:** M1, M16 (tipos rotos)
**Duración:** 3h

Tasks:

- Reemplazar 4 `@ts-ignore` con type guards o `as`
- Agregar `SupabaseClient<Database>` generic al browser client
- Revisar y tipar `createClientFromRequest` (actualmente `unknown`)

---

## Fase 3 — Data & Performance (Semana 3-4)

> DB, RLS, performance, React Query.

### SDD: `fix-rls-org-scope-wave-1`

**Qué:** Agregar scoping org a las tablas con RLS org-blind identificadas.
**Findings:** C2, H7 (profiles, chat, lens_purchases, inventory_movements, memory_facts, product_option_fields)
**Duración:** 4-5 días

Tasks:

1. `profiles` — política org-scoped via join a `admin_users.organization_id`
2. `chat_messages/sessions` — org scope via `chat_sessions.organization_id`
3. `customer_lens_purchases` — org scope via `customers.organization_id`
4. `inventory_movements` — org scope via `product_branch_stock.branch_id → branches.organization_id`
5. `memory_facts` — org scope
6. `product_option_fields/values` — org scope
7. Tests de RLS para cada tabla

### SDD: `dashboard-api-optimization`

**Qué:** Mover agregación de dashboard a PostgreSQL con materialized views y paginación.
**Findings:** C6 (dashboard 756 líneas), H9 (analytics 996), H14 (sin paginación)
**Duración:** 2 días

Tasks:

- Crear materialized views para KPIs diarios
- Dashboard API: SQL aggregation con `date_trunc()`, `COUNT(*)`
- Paginación en list endpoints (`.limit()`, offset)
- Cache con `unstable_cache` y TTL de 5 min
- `dashboard/route.ts` < 200 líneas de orquestación

### SDD: `react-query-migration`

**Qué:** Migrar CustomersContent, WorkOrdersContent, QuotesContent a React Query.
**Findings:** H10 (raw fetch + useState), FC1 (sin caché)
**Duración:** 2-3 días

Tasks:

- Crear hooks `useCustomers()`, `useWorkOrders()`, `useQuotes()`
- Configurar staleTime global a 5 min
- Migrar cada content component
- Loading skeletons + error states nativos de React Query
- Eliminar estados manuales (loading/error/data useState)

### SDD: `split-monolithic-content-components`

**Qué:** Dividir los content components monolíticos en server + client islands.
**Findings:** H9 ("use client" monolíticos)
**Duración:** 2 días

Tasks:

- Cada admin page: server section (header, breadcrumbs, SEO) + client island
- Pre-render initial data en server component
- Dynamic import para secciones pesadas

---

## Fase 4 — Security & Infrastructure (Semana 4-5)

> Service role reduction, CSP hardening, bundle optimization.

### SDD: `service-role-reduction-webhooks`

**Qué:** Migrar webhooks de service_role a scoped cron client.
**Findings:** C1 (service role en 100+ ubicaciones), F1 (webhooks con service role)
**Duración:** 3 días

Tasks:

- Crear `createScopedClient(orgId)` que toma `organization_id` y lo pasa como header
- Migrar webhooks (Mercado Pago, Flow, PayPal, NOWPayments, Resend, WhatsApp)
- Migrar billing adapters
- Agregar linter rule `no-restricted-imports` para `@/utils/supabase/server` en `src/app/api/`
- Tests de auth scoping

### SDD: `service-role-reduction-ai-agent`

**Qué:** Migrar AI Agent y tools de service_role a tenant-scoped client.
**Findings:** F14 (AI Agent con service role)
**Duración:** 2 días

Tasks:

- Implementar tenant-scoped Supabase client para AI agent
- Reemplazar `createServiceRoleClient()` en `agent.ts`, tools, memory manager
- Application-level org guards antes de cada DB call

### SDD: `csp-hardening`

**Qué:** Migrar CSP de `unsafe-inline` a nonces con Next.js middleware.
**Findings:** H3 (CSP débil), F11 (unsafe-inline)
**Duración:** 2 días

Tasks:

- Implementar nonce generation en middleware
- Configurar strict CSP
- Verificar compatibilidad con Next.js chunks
- Tests de security headers

### SDD: `bundle-optimization`

**Qué:** Eliminar oversized deps del bundle crítico.
**Findings:** F3 (recharts 500KB), F4 (framer-motion 200KB)
**Duración:** 2 días

Tasks:

- Dynamic import `DashboardCharts` (recharts) con `ssr: false`
- Reemplazar framer-motion en BlurText con CSS transition
- Agregar script `ANALYZE=true next build`
- Ejecutar bundle analyzer y documentar resultado
- Re-enable TypeScript + ESLint en build

---

## Fase 5 — Testing & Debt (Semana 5-6)

> Cobertura, CI enforcement, code quality hardening.

### SDD: `add-unit-tests-billing-errors-middleware`

**Qué:** Agregar tests a billing, errors, middleware, notifications.
**Findings:** H8 (críticos sin tests)
**Duración:** 3 días

Tasks:

- `billing/BillingFactory.ts`, `pdf-generator.ts`, adapters
- `errors/comprehensive-handler.ts`
- `middleware/error-handler.ts`, `enhanced-error-handler.ts`
- `notifications/notification-service.ts`

### SDD: `add-unit-tests-api-services`

**Qué:** Agregar tests a los 10 API services sin coverage.
**Findings:** H8 (10/16 services untested)
**Duración:** 2 días

Tasks:

- agreementService, contactLensEncargoService, contactLensFamilyService
- contactLensInventoryService, contactLensMatrixService
- errorService, lensFamilyService, notificationService
- quoteSettingsService, products/

### SDD: `add-unit-tests-remaining-modules`

**Qué:** Cobertura para analytics, email, utils, whatsapp, security, logger.
**Findings:** H8 (módulos restantes sin tests)
**Duración:** 3 días

Tasks:

- analytics/analytics-service.ts
- email/client.ts, template-loader.ts, send-\*.ts, notifications/
- utils/ (branch, chatExport, date-timezone, formatting, slug-generator)
- whatsapp/ (webhook handling, message formatting)
- security/ (threat-detection, behavioral-analytics, monitoring)
- logger/ (formatting, transport)

### SDD: `fix-core-functionality-test`

**Qué:** Re-escribir o eliminar `core-functionality.test.ts` (392 líneas de falso confianza).
**Findings:** H12 (tests que testean mocks)
**Duración:** 1h

**Decisión:** Re-escribir como tests reales de integración o eliminar.

### SDD: `set-coverage-threshold`

**Qué:** Habilitar enforce de cobertura en CI.
**Findings:** L1 (coverage_threshold: 0)
**Duración:** 1h

Tasks:

- Setear `coverage_threshold: 60` en openspec/config.yaml
- Agregar coverage check a CI pipeline
- Excluir archivos legacy (supabase.ts types, etc.)

### SDD: `cleanup-deprecated-dead-code`

**Qué:** Resolver 34 `@deprecated` markers y 9 TODOs en producción.
**Findings:** M2 (deprecated shipping), M10, M11
**Duración:** 2 días

Tasks:

- `agent.ts` (1039 líneas deprecated) — decidir: migrar o quitar marker
- Eliminar `src/tests/security/phase2-security.test.ts` (orphan)
- 9 TODOs → implementar, lanzar error claro, o eliminar
- 34 @deprecated → auditar y resolver
- `NEXTAUTH_SECRET` muerta de env.example

---

## Score Progresión Estimada

| Fase     | Score | Áreas que suben                        |
| -------- | ----- | -------------------------------------- |
| Hoy      | 5.3   | —                                      |
| + Fase 0 | 6.0   | Seguridad +3, Tests +2, DB +1          |
| + Fase 1 | 6.5   | Seguridad +7, Performance +1           |
| + Fase 2 | 7.5   | Calidad Código +8, Organización +8     |
| + Fase 3 | 8.3   | DB +9, Performance +7, Tests +2        |
| + Fase 4 | 8.8   | Seguridad +9, Performance +5, Infra +8 |
| + Fase 5 | 9.0   | Tests +9, Calidad Código +9            |

---

## Cómo Empezamos

Propongo arrancar con **Fase 0 (Emergency Patch)** ahora mismo:

1. **`/sdd-new apply-pending-migrations`** — aplicar 09/10/11
2. **`/sdd-new fix-payment-gateways-config-rls`** — cerrar el leak más crítico
3. **`/sdd-new setup-ci-pipeline`** — CI para tests
4. **`/sdd-new eliminate-duplicate-zod-helpers`** — quick win de código

¿Querés que arranquemos con esos 4? Cada uno es un SDD cycle completo: proposal → spec → design → tasks → apply → verify → archive.

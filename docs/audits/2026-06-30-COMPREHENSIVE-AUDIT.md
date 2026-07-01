# 🔍 Opttius — Auditoría Integral 2026-06-30

**Proyecto:** Opttius B2B SaaS para ópticas (Chile)
**Stack:** Next.js 14 + TypeScript 5 + Supabase + Vitest + Playwright
**Archivos:** 2,196 | **Graph nodes:** 13,219 | **SDD changes:** 7

---

## Scoreboard General

| Dimensión             | Score      | Agente Auditor |
| --------------------- | ---------- | -------------- |
| **Calidad de Código** | **5.5/10** | Code Quality   |
| **Organización**      | **4/10**   | Code Quality   |
| **Seguridad**         | **5/10**   | Security       |
| **Base de Datos**     | **6.5/10** | Database       |
| **Tests**             | **5/10**   | Tests & QA     |
| **Performance**       | **5.5/10** | Performance    |
| **Promedio General**  | **5.3/10** |                |

---

## 🔴 CRITICAL — Acción Inmediata

### C1. Service Role Key sobreexpuesto — 100+ ubicaciones bypass RLS

**Dónde:** `src/utils/supabase/server.ts` (definición) + 100+ call sites
**Severidad:** 🔴 CRITICAL | **Seguridad**

Cada webhook, billing adapter, AI agent, y middleware que usa `createServiceRoleClient()` bypassa TODAS las RLS. Si una sola ruta se compromete, toda la DB multi-tenant está expuesta. El refactor `service-role-reduction` comenzó (swap cron key) pero los webhooks y AI agent siguen usando service role.

**Fix:** Auditar cada call site. Webhooks → scoped cron client. User-scoped ops → authenticated client. AI agent → tenant-scoped client con `request.org_id`.

---

### C2. RLS multi-tenant leaks — perfiles, payments config, chat, lens purchases

**Dónde:** `profiles`, `payment_gateways_config`, `order_items`, `chat_messages`, `customer_lens_purchases`, `inventory_movements`, `memory_facts`
**Severidad:** 🔴 CRITICAL | **Base de Datos**

Varias políticas RLS otorgan acceso global sin filtro `organization_id`:

- `payment_gateways_config`: `USING (true)` — cualquier usuario autenticado lee API keys de TODOS los tenants
- `profiles`: cualquier admin activo ve perfiles de TODAS las organizaciones (datos médicos incluidos)
- `order_items`: sin filtro org — cualquier admin ve items de TODAS las órdenes

**Fix:** Aplicar migrations 09/10/11 pendientes (orden_items/payments org_id). Reemplazar políticas org-blind con scoped policies. `payment_gateways_config` necesita columna `organization_id` urgente.

---

### C3. PayPal webhook — SIN verificación de firma

**Dónde:** `src/lib/payments/paypal/gateway.ts:148-150`
**Severidad:** 🔴 CRITICAL | **Seguridad**

El comentario lo admite: _"PayPal webhook signature verification should be added for production"_. Cualquiera que haga POST a `/api/webhooks/paypal` puede falsificar confirmaciones de pago.

**Fix:** Implementar verificación via PayPal's verify-webhook-signature API.

---

### C4. Resend webhook — SIN verificación de firma

**Dónde:** `src/app/api/webhooks/resend/route.ts:36-85`
**Severidad:** 🔴 CRITICAL | **Seguridad**

Resend envía `webhook-signature` header con standard Svix — no se valida.

**Fix:** Implementar verificación con `svix` library.

---

### C5. No hay CI pipeline para tests

**Dónde:** `.github/workflows/` (vacío)
**Severidad:** 🔴 CRITICAL | **Tests**

Los tests existen (101 files, ~3,015 assertions) pero **nunca se ejecutan en CI**. No corren en push, PR, ni deploy. `openspec/config.yaml` especifica `test_command` pero nada lo enforcea. Los tests pueden romperse y nadie lo sabe.

**Fix:** Crear GitHub Action workflow con `npm run test:ci` en push y PR.

---

### C6. Dashboard API route (756 lines) — agrega en memoria TODOS los datos

**Dónde:** `src/app/api/admin/dashboard/route.ts:1-756`
**Severidad:** 🔴 CRITICAL | **Performance**

La ruta fetch TODOS los orders, products, customers, closures, stock, appointments, work orders, y quotes — SIN paginación — y hace agregación en JavaScript. Para una óptica con 10k+ órdenes, esto significa 10k+ rows transferidas y procesadas en memoria.

**Fix:** Mover agregación a PostgreSQL (materialized views, `date_trunc()`, `COUNT(*)` en SQL). Agregar `.limit()` a todas las queries.

---

### C7. Monolithic AdminShell (1031 lines) — renderizado en CADA admin page

**Dónde:** `src/app/admin/AdminShell.tsx:1-1031`
**Severidad:** 🔴 CRITICAL | **Performance**

Componente `"use client"` con ~30+ useState hooks, ~15 imports de lucide-react, 4 useEffect con fetch calls. Wrapea TODAS las admin pages. Todo este JS debe descargarse, parsearse y ejecutarse antes de que cualquier admin page sea interactiva.

**Fix:** Split server layout shell + lazy-loaded client hydration. Mover data fetching a per-page providers. Admin-role-check server-side.

---

### C8. 11 archivos > 1000 líneas (God components/files)

**Dónde:** Múltiples (ver tabla)
**Severidad:** 🔴 CRITICAL | **Calidad de Código**

| Archivo                          | Líneas |
| -------------------------------- | ------ |
| `src/types/supabase.ts`          | 8,530  |
| `SystemAdminContent.tsx`         | 1,396  |
| `OrganizationDetailsContent.tsx` | 1,360  |
| `CreateAppointmentForm.tsx`      | 1,272  |
| `WorkOrderDetailContent.tsx`     | 1,257  |
| `AppointmentsContent.tsx`        | 1,232  |
| `AnalyticsContent.tsx`           | 1,208  |
| `ProfilePageContent.tsx`         | 1,194  |
| `cash-register/close/route.ts`   | 1,041  |
| `ai/agent/agent.ts`              | 1,039  |
| `AdminShell.tsx`                 | 1,031  |

**Fix:** Dividir por responsabilidad (< 300 lines cada uno). `supabase.ts` → types por dominio. `CreateAppointmentForm.tsx` → 4+ subcomponentes.

---

### C9. Duplicación de infraestructura — zod-helpers idénticos

**Dónde:** `src/lib/validation/zod-helpers.ts` + `src/lib/api/validation/zod-helpers.ts` (373 lines c/u)
**Severidad:** 🔴 CRITICAL | **Calidad de Código**

Dos archivos casi idénticos. Difieren solo en import path. Bug esperando suceder.

**Fix:** Eliminar `src/lib/api/validation/zod-helpers.ts` y redirigir imports.

---

### C10. `payment_gateways_config` — RLS pública (USING true)

**Dónde:** Política RLS en tabla `payment_gateways_config`
**Severidad:** 🔴 CRITICAL | **Base de Datos**

Cualquier usuario autenticado puede leer configuraciones de todas las pasarelas de pago (API keys, secrets, endpoints).

**Fix:** Reemplazar con política org-scoped. Agregar columna `organization_id`.

---

## 🟠 HIGH

### H1. No hay protección CSRF

**Dónde:** Todas las rutas API + middleware
**Severidad:** 🟠 HIGH | **Seguridad**

No hay CSRF tokens. Las rutas POST/PUT/DELETE en sesiones cookie-based son vulnerables.

**Fix:** Validar Origin/Referer header. Usar SameSite=Lax (verificar default Supabase SSR).

---

### H2. 3 sistemas de rate limiting, ninguno completamente aplicado

**Dónde:** `src/lib/api/middleware.ts` (Map in-memory) + `src/lib/rate-limiting/` (Redis) + `redis-rate-limiter.ts`
**Severidad:** 🟠 HIGH | **Seguridad/Arquitectura**

El Map in-memory no funciona en serverless (cada cold start tiene su propio Map). Redis solo se usa en 1 ruta (agent chat). Webhooks y auth endpoints sin rate limiting.

**Fix:** Unificar en Redis-based middleware central. Eliminar el Map in-memory. Aplicar a todas las rutas.

---

### H3. `withSecurityHeaders()` no conectado a producción

**Dónde:** `src/lib/api/middleware.ts:311-412` (definido), solo usado en `/api/test-headers`
**Severidad:** 🟠 HIGH | **Seguridad**

CSP, HSTS, X-Frame-Options, etc. definidos pero nunca aplicados en producción.

**Fix:** Aplicar en middleware.ts central o response wrapper.

---

### H4. Flow webhook signature OPIONAL

**Dónde:** `src/lib/payments/flow/gateway.ts:155-172`
**Severidad:** 🟠 HIGH | **Seguridad**

`if (signature) { ... }` — si el atacante omite `s` parameter, la verificación se salta silenciosamente.

**Fix:** Hacer firma obligatoria en producción.

---

### H5. Duplicación de jerarquía de errores

**Dónde:** `src/lib/errors/comprehensive-handler.ts` + `src/lib/api/errors.ts`
**Severidad:** 🟠 HIGH | **Calidad de Código**

Ambos definen `ValidationError`, `AuthenticationError`, `AuthorizationError`. Service layer usa uno, API routes usan otro — errores necesitan conversión manual.

**Fix:** Unificar bajo `lib/errors/comprehensive-handler.ts`, re-exportar desde `lib/api/errors.ts`.

---

### H6. Console.log en producción — 159 archivos

**Dónde:** ~159 archivos en `src/` (excluyendo tests)
**Severidad:** 🟠 HIGH | **Calidad de Código**

`console.log/error/warn` en vez de `appLogger` (pino). El proyecto tiene logger configurado pero no se usa.

**Fix:** Regla ESLint `no-console` + migración progresiva.

---

### H7. RLS leaks — perfiles, chat, lens purchases sin filtro org

**Dónde:** `profiles`, `chat_messages`/`chat_sessions`, `customer_lens_purchases`, `inventory_movements`, `lab_work_order_status_history`, `memory_facts`, `product_option_fields/values`
**Severidad:** 🟠 HIGH | **Base de Datos**

Todas estas tablas tienen políticas RLS que permiten a cualquier admin leer datos de TODAS las organizaciones.

**Fix:** Agregar scoping org mediante joins a `admin_users.organization_id` o desnormalizar `organization_id`.

---

### H8. Cobertura de tests nula en módulos críticos

**Dónde:** `billing/`, `errors/comprehensive-handler.ts`, `middleware/`, `notifications/`, `email/` (9+ files), `analytics/`, `api/services/` (10/16 untested), `whatsapp/`, `redis/`, `security/` (per-module)
**Severidad:** 🟠 HIGH | **Tests**

Módulos críticos sin coverage: billing factory y PDF generator, global error handler, notification orchestration, email sending, WhatsApp integration, analytics service, y 10 API services.

**Fix:** Agregar unit tests siguiendo el patrón existente en `posService.test.ts`, `quoteService.test.ts`.

---

### H9. Monolithic "use client" content components

**Dónde:** `AdminDashboardContent.tsx`, `WorkOrdersContent.tsx`, `QuotesContent.tsx`, `CustomersContent.tsx`
**Severidad:** 🟠 HIGH | **Performance**

Cada admin page sigue el patrón: Server page → `"use client"` content component monolítico. Sin server-rendered static sections. SSR inicial vacío.

**Fix:** Split server section (header/breadcrumbs/SEO) + smaller client island. Pre-render initial data server-side.

---

### H10. React Query staleTime 1 min — inconsistente, muchas páginas usan raw fetch()

**Dónde:** `src/lib/react-query/QueryProvider.tsx:14` + `CustomersContent`, `WorkOrdersContent`, `QuotesContent`
**Severidad:** 🟠 HIGH | **Performance**

staleTime global de 60 segundos. CustomersContent, WorkOrdersContent, QuotesContent NO usan React Query — usan `fetch()` + `useState` directo. Sin caché, sin dedup, sin retry automático.

**Fix:** Aumentar staleTime a 5 min. Migrar fetch() calls a React Query hooks. Crear hooks compartidos por dominio.

---

### H11. TypeScript y ESLint ignorados durante build

**Dónde:** `next.config.js:11-12`
**Severidad:** 🟠 HIGH | **Infraestructura**

`eslint.ignoreDuringBuilds: true` Y `typescript.ignoreBuildErrors: true`. Errores de tipos y lint no fallan el build.

**Fix:** Re-enable TypeScript checking. Fix errors. Re-enable ESLint.

---

### H12. Archivo `core-functionality.test.ts` — tests que testean mocks, no código

**Dónde:** `src/__tests__/integration/core-functionality.test.ts` (392 lines)
**Severidad:** 🟠 HIGH | **Tests**

Mocks `global.fetch` y assertea `response.ok === true` cuando recién lo seteó. Performance test mide mock resolution speed, no real performance.

**Fix:** Rewrite como tests reales o eliminar. 392 líneas de falso confianza.

---

### H13. Analytics dashboard route (996 lines) — duplica dashboard logic

**Dónde:** `src/app/api/admin/analytics/dashboard/route.ts:1-996`
**Severidad:** 🟠 HIGH | **Performance**

Duplica ~60% de la lógica del dashboard route. Fetch de 10+ tablas, agregación en JS.

**Fix:** DRY con dashboard route. Extraer lógica compartida. Push aggregation a PostgreSQL views.

---

### H14. Paginación ausente en list endpoints

**Dónde:** Dashboard API, list endpoints
**Severidad:** 🟠 HIGH | **Performance**

Dashboard API fetch `orders`, `products`, `customers` SIN LIMIT. `customers.query` es `.select("*")` sin paginación.

**Fix:** Agregar `.limit()` a todas las queries. Dashboard solo necesita registros recientes.

---

## 🟡 MEDIUM

### M1. `@ts-ignore` en producción (4 ubicaciones)

**Dónde:** `agent/config.ts:168`, `analyzeMarketTrends.ts:107`, `useMobileView.ts:55`, AI tools
**Fix:** Reemplazar con type guards o `as` casts.

### M2. `@deprecated` shipping in production (34 markers)

**Dónde:** Archivo `agent.ts` (1039 lines) marcado como deprecated pero es el core Agent class
**Fix:** O eliminar, o reemplazar, o quitar el marker si no hay migration path.

### M3. `SECURITY DEFINER` innecesario en `get_user_organization_id()`

**Dónde:** Migración schema_complete.sql
**Fix:** Cambiar a `SECURITY INVOKER`.

### M4. Rate limiting fail-open en error

**Dónde:** `rate-limiting/middleware.ts:136-140`
**Fix:** En producción, fail-closed con deny-list local.

### M5. CSP `unsafe-inline` para scripts

**Dónde:** `middleware.ts:352`
**Fix:** Implementar nonces con Next.js.

### M6. Security monitoring middleware — dead code

**Dónde:** `src/lib/security/integration.ts`
**Fix:** Wire a middleware chain o eliminar.

### M7. Config `NEXTAUTH_SECRET` muerta en env.example

**Fix:** Eliminar, es legacy de NextAuth migration a Supabase Auth.

### M8. Sentry source maps sin verificar

**Fix:** Agregar step en CI/CD.

### M9. Migración única de 745KB (16,294 lines)

**Dónde:** `supabase/migrations/20260701000000_schema_complete.sql`
**Fix:** Dividir en migrations lógicas por dominio.

### M10. `consolidated/` SQL files huérfanos

**Dónde:** `supabase/consolidated/` (5 files)
**Fix:** Wire a migration pipeline o archivar.

### M11. RLS policies duplicadas en `profiles` y `admin_users`

**Fix:** Consolidar.

### M12. `src/types/database.ts` stale (3 tables vs 97 reales)

**Fix:** Eliminar o regenerar. Verificar imports.

### M13. Tipos DB sin generación automática

**Fix:** Agregar script `gen:types` a package.json.

### M14. Text fields sin enums (appointments.status, customers.gender, etc.)

**Fix:** Migrar text → enum.

### M15. Missing indexes en FK columns (created_by, updated_by)

**Fix:** Agregar B-tree indexes.

### M16. Browser client sin tipo Database generic

**Dónde:** `src/utils/supabase/client.ts`
**Fix:** Agregar `createBrowserClient<Database>(...)`.

### M17. framer-motion (~200KB) para UN componente (BlurText)

**Fix:** Reemplazar con CSS transition + Intersection Observer.

### M18. Imports de recharts sin dynamic import (~500KB gzipped)

**Dónde:** `DashboardCharts.tsx`
**Fix:** `next/dynamic` con `ssr: false`.

### M19. force-dynamic en TODAS las admin pages — sin ISR

**Fix:** Usar `revalidate` para páginas semi-estáticas.

### M20. Redis no warmeado en startup

**Fix:** Llamar `initializeRedis()` en `instrumentation.ts`.

### M21. seed.sql con fixed UUID + stock sin varianza real

**Fix:** Generar UUID dinámicamente. Agregar varianza en seed.

---

## 🔵 LOW

- **TODO/FIXME sprawl** — 9 TODOs en producción, algunos en POS con placeholders
- **16 root config files** — Sentry alone agrega 3 archivos
- **29 barrel files** — OK pero monitorear
- **4 any type usages** en producción
- **Test setup.ts silencia TODO console** — dificulta debugging
- **coverage_threshold: 0** — configurado pero sin enforce
- **orphan `src/tests/security/phase2-security.test.ts`** fuera de **tests**
- **test:all scripts apuntan a archivos que quizás no existen**
- **webpack-bundle-analyzer en devDeps pero nunca usado** — no hay script ANALYZE

---

## ✅ Lo que está BIEN (Shout-outs)

| Área                           | Logros                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| **RLS**                        | 98 tablas protegidas, `get_user_organization_id()` consistente |
| **Middleware**                 | Usa `getUser()` (no `getSession()`) como recomienda Supabase   |
| **Mercado Pago webhook**       | HMAC validation con timestamp drift check                      |
| **NOWPayments webhook**        | HMAC-SHA512 verification                                       |
| **Webhook idempotency**        | Tabla `webhook_events` evita duplicados                        |
| **Error masking**              | `createErrorResponse()` oculta detalles en prod                |
| **Security headers definidos** | CSP, HSTS, COOP, CORP — aunque no conectados                   |
| **Schema**                     | Normalizado, FKs con ON DELETE apropiados, 418 índices         |
| **Enums**                      | Buen uso para support statuses, notification types             |
| **Payment tests**              | 4 gateways cubiertos con SDK mocking                           |
| **AI tools tests**             | 11 test files, mock builders, Supabase mock patterns           |
| **Characterization tests**     | POS flows, process-sale, cash register bien cubiertos          |
| **Service-level tests**        | quoteService, posService, customerService con patrones limpios |
| **Schema validation tests**    | Exhaustivos edge cases, safeParse patterns                     |
| **Hybrid artifact store**      | OpenSpec + Engram                                              |
| **Strict TDD mode**            | Configurado en openspec/config.yaml                            |
| **TypeScript strict**          | Modo estricto global habilitado                                |
| **Lint-stage + husky**         | Pre-commit hooks                                               |
| **Error pages**                | 3 niveles: root, admin, global-error                           |
| **Loading skeletons**          | Dashboard, spinners                                            |
| **Security phase tests**       | Rate limiting, infrastructure coverage                         |

---

## Plan de Acción Recomendado (Priorizado)

### Fase 0 — Hoy/Esta Semana (Riesgo Inmediato)

1. ⚡ Aplicar migrations 09/10/11 — cierra el leak de `order_items`/`order_payments`
2. ⚡ Bloquear `payment_gateways_config` RLS — `USING (true)` en API keys es crítica
3. ⚡ Crear GitHub Action CI para tests — sin esto, los tests no valen nada
4. ⚡ Eliminar zod-helpers duplicado — bug esperando suceder

### Fase 1 — Esta Semana (Alto Impacto)

5. Arreglar PayPal + Resend webhook verification
6. Unificar jerarquía de errores (comprehensive-handler + api/errors)
7. Agregar regla ESLint `no-console` + migración
8. Re-enable TypeScript checking en build

### Fase 2 — Próxima Semana (Estructural)

9. Split AdminShell (1031 lines → server + lazy client)
10. Mover dashboard aggregation a SQL (materialized views)
11. Migrar Customers/WorkOrders/Quotes content a React Query hooks
12. Agregar tests a módulos critical sin coverage (billing, errors, middleware)

### Fase 3 — Próximo Sprint (Deuda Técnica)

13. Dividir 11 God files > 1000 lines
14. Service role reduction — webhooks + AI agent (continuar refactor)
15. Unificar rate limiting (eliminar Map in-memory, Redis central)
16. Wire `withSecurityHeaders()` a producción
17. RLS org-scope para profiles, chat, lens purchases, inventory_movements
18. Migrar force-dynamic → revalidate en páginas semi-estáticas
19. Dynamic import recharts + eliminar framer-motion si es solo BlurText
20. Agregar script `gen:types` + regenerar database types

---

## Stats resumen

| Métrica                  | Valor        |
| ------------------------ | ------------ |
| Archivos TS/TSX          | 1,261        |
| Líneas totales TS/TSX    | 82,908       |
| Archivos > 1000 líneas   | 11           |
| Console.log (prod files) | ~159         |
| `@ts-ignore` producción  | 4            |
| `@deprecated` markers    | 34           |
| Test files               | 101          |
| Test assertions          | ~3,015       |
| Tablas DB                | 98           |
| Índices                  | 418          |
| RLS policies             | 301          |
| Import cycles            | 2            |
| CI pipeline              | ❌ NO EXISTE |

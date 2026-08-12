---
name: testing-optical-supabase
description: Expert guide for manual and automated testing of the Opttius optical shop SaaS system with Supabase. Use when working on testing, QA, checklists, test flows, E2E, backup validation, regression testing, or optical shop quality assurance. Covers multi-tenant testing, critical user flows, module checklists, and integration with other optical skills.
---

# Testing Opttius — Guía para QA y Testing

Skill para tareas de testing manual y automatizado del sistema SaaS multi-tenant para ópticas.

## Cuándo usar esta skill

- Testing manual, QA, regresión
- Checklists por módulo
- Flujos críticos a verificar
- Tests E2E (Playwright/Vitest)
- Validación desde backup
- Integración con skills: pos, quotes, appointments, crm, admin-users, etc.

---

## 1. Documentación principal

- **Guía completa:** `docs/TESTING_GUIDE.md`
- **Plan de implementación:** `docs/PLAN_TESTING_IMPLEMENTATION.md`
- **Roadmap E2E Playwright:** `docs/07-testing/PLAYWRIGHT_E2E_ROADMAP.md`
- **Guía E2E:** `docs/07-testing/E2E_TESTING.md`
- **Checklists por módulo:**
  - `docs/ADMIN_USERS_TEST_CHECKLIST.md`
  - `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`
  - `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md`
  - `docs/DEMO_OPTICA_MASTER_CHECKLIST.md`

---

## 2. Flujo de onboarding (usuario recién registrado)

```
Registro → /onboarding/choice → Probar Demo | Crear Org
    → assign-demo | activate-real-org
    → admin_branch_access (branch_id=null = super_admin)
    → /admin
```

**API:** `/api/admin/check-status`, `assign-demo`, `activate-real-org`

---

## 3. Flujos críticos a verificar

| Flujo               | Pasos clave                                     | Tablas afectadas                            |
| ------------------- | ----------------------------------------------- | ------------------------------------------- |
| **Onboarding**      | Registro → choice → demo/org → /admin           | profiles, admin_users, admin_branch_access  |
| **Cita guest**      | Crear cita sin customer*id, guest*\*            | appointments                                |
| **Presupuesto→POS** | Quote → cargar al POS → process-sale            | quotes, orders, order_items, order_payments |
| **Split payment**   | Efectivo + tarjeta en una venta                 | order_payments (múltiples)                  |
| **Saldo pendiente** | Pago parcial → PendingBalanceDialog → completar | order_payments, orders.payment_status       |
| **Reset Demo**      | SaaS Management → Restaurar Demo                | seed_demo_organization_data()               |

---

## 4. Tests automatizados

### Ubicación y comandos

| Tipo        | Ruta                                         | Comando                    |
| ----------- | -------------------------------------------- | -------------------------- |
| Unit        | `src/__tests__/unit/`                        | `npm run test:unit`        |
| Integration | `src/__tests__/integration/`                 | `npm run test:integration` |
| API         | `src/__tests__/integration/api/`             | `npm run test:api`         |
| Security    | `src/__tests__/security/`                    | `npm run test:security`    |
| E2E         | `e2e/` (Playwright, NO `src/__tests__/e2e/`) | `npm run test:e2e`         |

**Proyectos Playwright** (`playwright.config.ts`): `setup` (genera storage state admin), `public` (auth + onboarding, sin login), `admin` (resto, depende de setup). Workers=1, solo Chromium.

```bash
npx playwright test --project=setup      # regenera .playwright/.auth/admin.json
npx playwright test --project=public     # auth + onboarding (sin credenciales)
npx playwright test --project=admin      # suite autenticada (depende de setup)
npx playwright test e2e/auth.spec.ts     # un archivo
npx playwright test --grep "POS"         # por nombre
npx playwright test --ui                 # UI interactiva para debug
```

### E2E Playwright — Data Contract (MANDATORY)

Opttius NO ejecuta E2E contra datos de desarrollo ni producción. Toda corrida arranca de un estado conocido:

1. **Organización E2E dedicada** con admin fijo: credenciales canónicas `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` en `.env.e2e` (no commitear). Los tests NUNCA dependen de `DEMO_ADMIN_*` ni de la sesión del dev.
2. **Storage state generado**: `global.setup.ts` hace login por UI y escribe `.playwright/.auth/admin.json`. Nunca commitear ni editar a mano.
3. **Seed/fixture determinístico**: crear datos base con nombres únicos por corrida; no asumir registros existentes.
4. **Base URL**: `127.0.0.1`/`localhost` local (auto-start del dev server); `PLAYWRIGHT_BASE_URL` explícito para preview/remote.

### Arquitectura de capas E2E

Los specs se construyen en capas apilables. Cada capa debe estar estable antes de crecer; NUNCA saltarse capas:

| Capa                    | Qué cubre                                                                         | Proyecto | Archivo(s)                                                  |
| ----------------------- | --------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| **0. Auth**             | login válido → `/onboarding/choice` → `/admin`; login inválido muestra error      | public   | `e2e/auth.spec.ts`                                          |
| **1. Data contract**    | org/admin/seed determinísticos (infra, no test)                                   | setup    | `e2e/global.setup.ts`                                       |
| **2. Public smoke**     | login page carga, `/onboarding/choice` → login si no auth, landing CTA o redirect | public   | `e2e/onboarding.spec.ts`                                    |
| **3. Navigation smoke** | rutas de `src/config/admin-navigation.ts` cargan sin console/page errors          | admin    | `admin-navigation.spec.ts`                                  |
| **4. Workflows**        | flujos de negocio con asserts de resultados y estado persistido                   | admin    | `pos-checkout.spec.ts`, `quote-workorder-pos.spec.ts`, etc. |
| **5+ (futuro)**         | citas, inventario, convenios, pagos, cross-browser, CI                            | admin    | por módulo                                                  |

**Regla clave**: cada sección nueva agrega su **Capa 4** workflow reutilizando la MISMA Capa 1 (misma org E2E, mismo admin, mismo seed). No se crea un Data Contract por módulo.

**Rutas admin reales** (fuente: `src/config/admin-navigation.ts`): `/admin`, `/admin/pos`, `/admin/work-orders`, `/admin/appointments`, `/admin/quotes`, `/admin/customers`, `/admin/products`, `/admin/products/bulk` (import, NO `/admin/products/import`), `/admin/prescriptions`, `/admin/analytics`, `/admin/support`, `/admin/system`, `/admin/admin-users`.

**Contrato de login real**: `/login` → `router.replace("/onboarding/choice")` → si tiene org redirige a `/admin`, si no muestra opciones (demo/crear). Un test que asuma redirect directo a `/admin` está mal modelado.

**Reglas de asserts**: verificar resultados de negocio visibles y estado persistido (totales, estados, identificadores), NO solo URL o ausencia de error. Waits por estado/locator, nunca sleeps arbitrarios.

### Validación desde backup

- **Script básico:** `scripts/test-backup-isolation.js` — verifica customers, lista storage.
- **Extensión sugerida:** `scripts/validate-backup-data.js` — validar conteos por `organization_id` en tablas: organizations, branches, customers, orders, quotes, lab_work_orders, products.
- **BackupService:** `src/lib/backup-service.ts` — TABLES_CONFIG con ~35 tablas filtradas por org.
- **SaasBackupService:** `src/lib/saas-backup-service.ts` — pg_dump full, saas_backups.

---

## 5. Patrones de validación

### Por organization_id

Todas las tablas operativas deben filtrar por `organization_id` o `branch_id` (con anchor a branches → organization_id).

### Criterios de éxito en restore

- Conteos por org coherentes
- Sin registros huérfanos (FKs válidas)
- order_payments alineados con orders
- product_branch_stock por branch

### Restricciones

- No ejecutar tests que modifiquen datos de producción
- Usar org demo: `00000000-0000-0000-0000-000000000001`
- Branch 1: `00000000-0000-0000-0000-000000000002`, Branch 2: `00000000-0000-0000-0000-000000000003`

---

## 6. Integración con otros skills

| Skill                               | Uso en testing                                   |
| ----------------------------------- | ------------------------------------------------ |
| `pos-optical-supabase`              | Flujos POS, split payment, caja, presupuesto→POS |
| `quotes-optical-supabase`           | Presupuestos, conversión a work order / POS      |
| `appointments-optical-supabase`     | Citas guest, disponibilidad, tipos               |
| `crm-optical-supabase`              | Clientes, prescripciones, RUT                    |
| `admin-users-optical-supabase`      | Roles, permisos, validación org                  |
| `work-orders-optical-supabase`      | Órdenes de trabajo, Cash-First                   |
| `payment-workflow-optical-supabase` | pending-balance/pay, process-sale, gateways      |

---

## 7. Checklist rápido por módulo

- **Onboarding:** Registro, Demo, Crear Org
- **Admin Users:** Paginación, búsqueda, 403 org, último admin
- **CRM:** Cliente, prescripción, multi-sucursal
- **Citas:** Con cliente, guest, disponibilidad
- **Presupuestos:** Crear, enviar, convertir
- **POS:** Caja, venta, split, saldo pendiente
- **Soporte:** Ticket, estados, analytics
- **Sistema:** Backup, restore, mantenimiento

---

## Referencia

- `docs/TESTING_GUIDE.md` — Guía completa
- `docs/DEMO_OPTICA_README.md` — Credenciales y datos demo

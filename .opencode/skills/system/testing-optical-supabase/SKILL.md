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

| Tipo        | Ruta                             | Comando                    |
| ----------- | -------------------------------- | -------------------------- |
| Unit        | `src/__tests__/unit/`            | `npm run test:unit`        |
| Integration | `src/__tests__/integration/`     | `npm run test:integration` |
| API         | `src/__tests__/integration/api/` | `npm run test:api`         |
| Security    | `src/__tests__/security/`        | `npm run test:security`    |
| E2E         | (pendiente) `src/__tests__/e2e/` | `npm run test:e2e`         |

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

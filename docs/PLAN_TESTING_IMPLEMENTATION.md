# Plan de Implementación: Guía de Testing Opttius

**Fecha:** 2026-02-22  
**Estado:** En ejecución

---

## Resumen ejecutivo

Este plan implementa la guía de testing manual y automatizado para Opttius: documentación unificada, skill para agentes, tests E2E/backup y subida a NotebookLM.

---

## Fase 1: Investigación (completada)

### 1.1 Código

| Área           | Hallazgos                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tests**      | Vitest + jsdom. Unit: `src/__tests__/unit/`. Integration: `src/__tests__/integration/`. No existe carpeta `e2e` (script `test:e2e` apunta a ruta vacía). |
| **Scripts**    | `test-backup-isolation.js`: básico (verifica customers, lista storage). `scripts/run-tests.sh` incluye test:e2e.                                         |
| **Backup**     | Dos servicios: `SaasBackupService` (pg_dump full) y `BackupService` (backup/restore por org). Restore vía `/admin/system` → Mantenimiento.               |
| **Checklists** | `ADMIN_USERS_TEST_CHECKLIST.md`, `PAYMENT_WORKFLOW_TEST_CHECKLIST.md`, `SUPPORT_SYSTEM_TEST_CHECKLIST.md`, `DEMO_OPTICA_MASTER_CHECKLIST.md`.            |

### 1.2 NotebookLM

- **Onboarding:** Registro → `/onboarding/choice` → `assign-demo` o `activate-real-org` → `admin_branch_access` → `/admin`.
- **Backups:** Triple capa (diario org, semanal full, AES-256). GitHub Actions 04:00 UTC. Restore en Sistema → Mantenimiento.
- **Tablas críticas:** organizations, branches, customers, orders, quotes, lab_work_orders, products, saas_backups.

### 1.3 Base de datos

- Tablas clave: `organizations`, `branches`, `customers`, `orders`, `quotes`, `lab_work_orders`, `products`, `product_branch_stock`, `saas_backups`.
- `BackupService.TABLES_CONFIG`: ~35 tablas con filtro por `organization_id` o anchor.

### 1.4 Skills

- 22 skills en `.cursor/skills/`. Patrón: `name`, `description`, triggers, secciones por dominio.
- Ejemplo: `admin-users-optical-supabase/SKILL.md`.

---

## Fase 2: Tareas de implementación

### 2.1 Documentación

| Tarea                 | Archivo                        | Esfuerzo | Dependencias  |
| --------------------- | ------------------------------ | -------- | ------------- |
| Crear guía principal  | `docs/TESTING_GUIDE.md`        | 2h       | -             |
| Opcional: modularizar | `docs/TESTING_CHECKLISTS/*.md` | 1h       | TESTING_GUIDE |

### 2.2 Skill de testing

| Tarea       | Archivo                                            | Esfuerzo | Dependencias  |
| ----------- | -------------------------------------------------- | -------- | ------------- |
| Crear skill | `.cursor/skills/testing-optical-supabase/SKILL.md` | 1.5h     | TESTING_GUIDE |

### 2.3 Tests automatizados

| Tarea               | Descripción                                                                                                                   | Esfuerzo | Dependencias |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| Configurar E2E      | Crear `src/__tests__/e2e/` o `e2e/`. Vitest browser o Playwright standalone.                                                  | 2h       | -            |
| E2E onboarding      | Test flujo `/onboarding/choice` → demo/org.                                                                                   | 2h       | Config E2E   |
| E2E cita guest      | Test crear cita sin cliente.                                                                                                  | 1.5h     | Config E2E   |
| E2E presupuesto→POS | Test quote → convert to POS.                                                                                                  | 2h       | Config E2E   |
| E2E split payment   | Test venta con 2 métodos de pago.                                                                                             | 1.5h     | Config E2E   |
| Validación backup   | Extender `scripts/test-backup-isolation.js` o crear `scripts/validate-backup-data.js`. Validar conteos por `organization_id`. | 2h       | -            |

### 2.4 NotebookLM

| Tarea           | Descripción                                   | Esfuerzo | Dependencias         |
| --------------- | --------------------------------------------- | -------- | -------------------- |
| Añadir fuentes  | TESTING_GUIDE.md + skill testing al Extendido | 0.5h     | TESTING_GUIDE, skill |
| Actualizar sync | Incluir en `sync-notebooklm-extended.sh`      | 0.25h    | Fuentes              |
| Actualizar guía | `docs/NOTEBOOKLM_CUADERNOS_GUIA.md` si aplica | 0.25h    | -                    |

---

## Orden de ejecución recomendado

```
1. docs/TESTING_GUIDE.md
2. .cursor/skills/testing-optical-supabase/SKILL.md
3. Actualizar sync-notebooklm-extended.sh
4. Ejecutar nlm source add (subir a Extendido)
5. scripts/validate-backup-data.js (opcional)
6. Configurar E2E + tests críticos (fase posterior)
```

---

## Riesgos y dependencias

| Riesgo                                    | Mitigación                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| E2E requiere servidor corriendo           | Usar `beforeAll` para levantar `npm run dev` o usar Playwright con `webServer`. |
| test-backup-isolation usa org hardcodeada | Parametrizar `ORG_ID` vía env.                                                  |
| Sesión nlm expira ~20 min                 | Ejecutar `nlm login --check` antes de sync.                                     |
| Windows encoding                          | Usar `export PYTHONIOENCODING=utf-8` antes de nlm.                              |

---

## Criterios de éxito

- [ ] `docs/TESTING_GUIDE.md` completo y alineado con NotebookLM/código
- [ ] Skill `testing-optical-supabase` usable por agentes
- [ ] Plan de tests E2E y backup documentado y ejecutable
- [ ] Fuentes en cuaderno Extendido
- [ ] `docs/NOTEBOOKLM_CUADERNOS_GUIA.md` actualizado si aplica

---

## Referencias

- `docs/ADMIN_USERS_TEST_CHECKLIST.md`
- `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`
- `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md`
- `docs/DEMO_OPTICA_MASTER_CHECKLIST.md`
- `src/lib/backup-service.ts` (TABLES_CONFIG)
- `scripts/test-backup-isolation.js`
- `docs/NOTEBOOKLM_CUADERNOS_GUIA.md`

# Sincronización con NotebookLM

**Cuadernos del proyecto:**

| Cuaderno                | ID                                     | Uso                                  |
| ----------------------- | -------------------------------------- | ------------------------------------ |
| Cerebro (principal)     | `e071bebc-ce79-4b32-a040-61a6a9c331a3` | Sistemas, arquitectura, flujos       |
| Documentación Extendida | `17302d9d-7d70-4c8d-a774-49fbfca3c09d` | Análisis, implementación, changelogs |

**Guía de uso:** Ver [NOTEBOOKLM_CUADERNOS_GUIA.md](./NOTEBOOKLM_CUADERNOS_GUIA.md) para saber cuándo usar cada cuaderno.

---

## Fuentes que deben mantenerse actualizadas

| Documento                                        | Título en NotebookLM                      | Cuándo actualizar                                     |
| ------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------- |
| `docs/SYSTEM_CONFIGURATION.md`                   | SYSTEM_CONFIGURATION                      | Tras cambios en módulo Sistema, API config, scope     |
| `docs/SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md` | SYSTEM_CONFIGURATION_CHANGELOG            | Tras mejoras o correcciones del módulo Sistema        |
| `docs/FRONTEND_IDENTITY.md`                      | Frontend Identity Documentation - Opttius | Tras cambios en paleta Epoch, componentes, tokens     |
| `docs/FRONTEND_RESPONSIVITY.md`                  | FRONTEND_RESPONSIVITY                     | Tras cambios en responsividad, breakpoints, patrones  |
| `docs/FRONTEND_RESPONSIVE_UPDATE_2026-02.md`     | FRONTEND_RESPONSIVE_UPDATE_2026-02        | Changelog de implementación mobile-first 2026-02      |
| `docs/SAAS_MANAGEMENT_SYSTEM.md`                 | SAAS_MANAGEMENT_SYSTEM                    | Tras cambios en arquitectura o flujos del módulo SaaS |
| `docs/SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md`   | SAAS_MANAGEMENT_IMPROVEMENTS_2026-02      | Tras nuevas mejoras o correcciones en SaaS Management |
| `docs/USER_PROFILE_SYSTEM.md`                    | USER_PROFILE_SYSTEM                       | Tras cambios en perfil, RLS, preferencias             |
| `docs/USER_PROFILE_IMPROVEMENTS_2026-02.md`      | USER_PROFILE_IMPROVEMENTS_2026-02         | Tras nuevas mejoras o correcciones en User Profile    |
| `docs/PAYMENT_WORKFLOW_SYSTEM.md`                | PAYMENT_WORKFLOW_SYSTEM                   | Tras cambios en checkout, POS, cron, pasarelas        |
| `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`        | PAYMENT_WORKFLOW_TEST_CHECKLIST           | Checklist de pruebas manuales del payment workflow    |

---

## Comandos para sincronizar

### Requisito previo

```bash
nlm login --check
```

Si la sesión ha expirado:

```bash
nlm login
```

### Opción 1: Scripts automáticos

**Cuaderno principal (Cerebro):**

```bash
npm run notebooklm:sync
# o: bash scripts/sync-notebooklm-sources.sh
```

**Cuaderno extendido:**

```bash
npm run notebooklm:sync-extended
# o: bash scripts/sync-notebooklm-extended.sh
```

### Opción 2: Comandos manuales

```bash
export PYTHONIOENCODING=utf-8  # Windows: evita error de encoding con ✓

nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/SYSTEM_CONFIGURATION.md --title "SYSTEM_CONFIGURATION"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md --title "SYSTEM_CONFIGURATION_CHANGELOG"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/FRONTEND_IDENTITY.md --title "Frontend Identity Documentation - Opttius"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/SAAS_MANAGEMENT_SYSTEM.md --title "SAAS_MANAGEMENT_SYSTEM"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md --title "SAAS_MANAGEMENT_IMPROVEMENTS_2026-02"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/USER_PROFILE_SYSTEM.md --title "USER_PROFILE_SYSTEM"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/USER_PROFILE_IMPROVEMENTS_2026-02.md --title "USER_PROFILE_IMPROVEMENTS_2026-02"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/PAYMENT_WORKFLOW_SYSTEM.md --title "PAYMENT_WORKFLOW_SYSTEM"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md --title "PAYMENT_WORKFLOW_TEST_CHECKLIST"
```

**Nota sobre duplicados User Profile:** Si ya existe USER_PROFILE_SYSTEM en el notebook, eliminar la fuente antigua antes de añadir la actualizada:

```bash
nlm source list e071bebc-ce79-4b32-a040-61a6a9c331a3  # Buscar source-id de USER_PROFILE_SYSTEM
nlm source delete <source-id> --confirm
```

---

## Frecuencia sugerida

- **Tras cambios en docs de Sistema o Frontend:** ejecutar el script o los comandos manuales
- **Antes de sesiones con NotebookLM:** verificar que las fuentes estén actualizadas con `nlm source list <notebook-id>`

---

## Nota sobre duplicados y límite

- **Límite:** NotebookLM Standard tiene 50 fuentes por notebook. **Estado actual (2026-02-21):** 50/50 fuentes — límite alcanzado.
- **Fuentes añadidas en sync completo (2026-02-21):** AI_SYSTEM, QUOTES_SYSTEM, SUPPORT_MODULE_IMPROVEMENTS_2026-02, IDENTITY_RECONCILIATION, SYSTEM_CONFIGURATION_ANALYSIS.
- **Duplicados eliminados (2026-02-21):** Opttius CRM Documentation (→ CRM_SYSTEM.md), Integración Presupuestos-Trabajos (→ QUOTE_WORK_ORDER_INTEGRATION.md), Sistema de Citas y Agendas (→ APPOINTMENTS_SYSTEM.md).
- **Limpieza Extendido (2026-02-22):** Ejecutar `bash scripts/notebooklm-cleanup-duplicates.sh` para eliminar ~22 fuentes duplicadas antes de añadir documentación nueva.
- **Duplicados:** `nlm source add` con el mismo título puede crear fuentes duplicadas. Eliminar fuentes antiguas con:

```bash
nlm source delete <source-id> --confirm
```

- **Listar fuentes:** `nlm source list e071bebc-ce79-4b32-a040-61a6a9c331a3`
- **Estrategia de sync:** Eliminar duplicados antes de añadir versiones actualizadas para no superar el límite.

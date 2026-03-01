# Sincronización con NotebookLM

**Cuadernos del proyecto:**

| Cuaderno                | ID                                     | Uso                                                          |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Cerebro (principal)     | `e071bebc-ce79-4b32-a040-61a6a9c331a3` | Sistemas, arquitectura, flujos (50/50 lleno)                 |
| Documentación Extendida | `17302d9d-7d70-4c8d-a774-49fbfca3c09d` | Análisis, implementación, changelogs, docs nuevas            |
| Docs Anexo              | `19de09c1-37ae-4832-a17b-dd326c613ce3` | Overflow, referencias AI                                     |
| Docs Anexo 2            | `2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff` | Overflow adicional: SEO, marketing (cuando Anexo está lleno) |

**Guía de uso:** Ver [NOTEBOOKLM_CUADERNOS_GUIA.md](./NOTEBOOKLM_CUADERNOS_GUIA.md) para saber cuándo usar cada cuaderno.

---

## Fuentes que deben mantenerse actualizadas

| Documento                                                  | Título en NotebookLM                      | Cuándo actualizar                                     |
| ---------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `docs/SYSTEM_CONFIGURATION.md`                             | SYSTEM_CONFIGURATION                      | Tras cambios en módulo Sistema, API config, scope     |
| `docs/SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md`           | SYSTEM_CONFIGURATION_CHANGELOG            | Tras mejoras o correcciones del módulo Sistema        |
| `docs/FRONTEND_IDENTITY.md`                                | Frontend Identity Documentation - Opttius | Tras cambios en paleta Epoch, componentes, tokens     |
| `docs/FRONTEND_RESPONSIVITY.md`                            | FRONTEND_RESPONSIVITY                     | Tras cambios en responsividad, breakpoints, patrones  |
| `docs/FRONTEND_RESPONSIVE_UPDATE_2026-02.md`               | FRONTEND_RESPONSIVE_UPDATE_2026-02        | Changelog de implementación mobile-first 2026-02      |
| `docs/SAAS_MANAGEMENT_SYSTEM.md`                           | SAAS_MANAGEMENT_SYSTEM                    | Tras cambios en arquitectura o flujos del módulo SaaS |
| `docs/SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md`             | SAAS_MANAGEMENT_IMPROVEMENTS_2026-02      | Tras nuevas mejoras o correcciones en SaaS Management |
| `docs/USER_PROFILE_SYSTEM.md`                              | USER_PROFILE_SYSTEM                       | Tras cambios en perfil, RLS, preferencias             |
| `docs/USER_PROFILE_IMPROVEMENTS_2026-02.md`                | USER_PROFILE_IMPROVEMENTS_2026-02         | Tras nuevas mejoras o correcciones en User Profile    |
| `docs/PAYMENT_WORKFLOW_SYSTEM.md`                          | PAYMENT_WORKFLOW_SYSTEM                   | Tras cambios en checkout, POS, cron, pasarelas        |
| `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`                  | PAYMENT_WORKFLOW_TEST_CHECKLIST           | Checklist de pruebas manuales del payment workflow    |
| `docs/OPTTIUS_SKILLS_INDEX.md`                             | OPTTIUS_SKILLS_INDEX                      | Índice consolidado de 25 skills (.cursor/skills)      |
| `docs/WHATSAPP_AI_AGENT.md`                                | Módulo WhatsApp + Agente IA               | Tras cambios en módulo WhatsApp, webhook, Agent       |
| `.cursor/skills/whatsapp-ai-agent-optical/SKILL.md`        | Skill WhatsApp AI Agent Óptico            | Tras cambios en guía del skill WhatsApp               |
| `docs/WHATSAPP_AGENT_TRAINING.md`                          | Entrenamiento Agente WhatsApp             | Tras cambios en guía de entrenamiento                 |
| `docs/ai/AI_IMPLEMENTATION_STATUS.md`                      | AI_IMPLEMENTATION_STATUS                  | Estado consolidado del módulo IA (sync-extended)      |
| `docs/ai/AI_MODULE_IMPROVEMENTS_2026-03.md`                | AI_MODULE_IMPROVEMENTS_2026-03            | Tras mejoras en chat, tools, upload, UX               |
| `docs/ai/AGENT_TOOLS_REFERENCE.md`                         | AGENT_TOOLS_REFERENCE                     | Referencia de tools del agente (sync-anexo)           |
| `.cursor/skills/whatsapp-agent-training-optical/SKILL.md`  | Skill Entrenamiento Agente WhatsApp       | Tras cambios en skill de entrenamiento                |
| `docs/WHATSAPP_IMPLEMENTATION_PROMPT.md`                   | Prompt Implementación WhatsApp            | Prompt para agente que crea plan de implementación    |
| `docs/VERCEL_DEPLOYMENT_2026-02.md`                        | VERCEL_DEPLOYMENT_2026-02                 | Tras cambios en crons, deploy o plan Vercel           |
| `docs/MANUAL_TESTING_GUIDE_COMPLETE.md`                    | Guía de Testing Manual Completa           | Tras cambios en flujos de testing o checklists        |
| `docs/VIDEOTUTORIALES_MAP.md`                              | Mapa de Videotutoriales                   | Tras cambios en prioridades o videos sugeridos        |
| `docs/marketing/MARKETING_IDENTITY_STRATEGY.md`            | MARKETING_IDENTITY_STRATEGY               | Tras cambios en estrategia, narrativa o identidad     |
| `docs/marketing/SEO_AIO_DISCOVERY_STRATEGY.md`             | Estrategia SEO AIO Descubrimiento         | Tras cambios en estrategia SEO + AIO                  |
| `docs/marketing/SEO_AIO_TECHNICAL_REFERENCE.md`            | Referencia Técnica SEO AIO                | Tras cambios en implementación técnica SEO            |
| `docs/marketing/SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md` | Estado SEO AIO y Mejoras                  | Tras auditorías o mejoras de SEO                      |

**Nota:** Los docs de marketing y SEO se añaden a Extendido, Anexo o Anexo 2 según disponibilidad.

**Evitar duplicados en NotebookLM:** Si ya existen fuentes con estos títulos, elimínalas antes de volver a sincronizar (`nlm source delete <source-id> --confirm`). El script `add_source` siempre añade; no actualiza fuentes existentes.

**Cada documento debe estar en un solo script de sync:** `sync-sources` (Extendido/Anexo), `sync-extended` (Extendido) o `sync-anexo` (Anexo). Los docs WhatsApp principales están en sync-sources; sync-extended solo añade complementos (skills, WHATSAPP_IMPLEMENTATION_PROMPT).

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

**Nota:** Los scripts usan fallback en cascada: Extendido → Anexo → Anexo 2 → Anexo 3 → Anexo 4 → Anexo 5.

```bash
npm run notebooklm:sync          # Docs clave → Extendido/Anexo/Anexo 2-5
npm run notebooklm:sync-extended # Archive, implementación → Extendido/Anexo/Anexo 2-5
npm run notebooklm:sync-anexo    # Referencias AI → Anexo/Anexo 2-5
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
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/WHATSAPP_AI_AGENT.md --title "Módulo WhatsApp + Agente IA"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/WHATSAPP_AGENT_TRAINING.md --title "Entrenamiento Agente WhatsApp"
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
- **Fuentes añadidas en sync completo (2026-02-21):** AI_SYSTEM, QUOTES_SYSTEM, SUPPORT_MODULE_IMPROVEMENTS_2026-02, SYSTEM_CONFIGURATION_ANALYSIS. (IDENTITY_RECONCILIATION eliminado 2026-02-22 — contenido consolidado en IDENTITY.md e IDENTITY_AUDIT.md)
- **Duplicados eliminados (2026-02-21):** Opttius CRM Documentation (→ CRM_SYSTEM.md), Integración Presupuestos-Trabajos (→ QUOTE_WORK_ORDER_INTEGRATION.md), Sistema de Citas y Agendas (→ APPOINTMENTS_SYSTEM.md).
- **Limpieza Extendido (2026-02-22):** Ejecutar `bash scripts/notebooklm-cleanup-duplicates.sh` para eliminar ~22 fuentes duplicadas antes de añadir documentación nueva.
- **Duplicados:** `nlm source add` con el mismo título puede crear fuentes duplicadas. Eliminar fuentes antiguas con:

```bash
nlm source delete <source-id> --confirm
```

- **Listar fuentes:** `nlm source list e071bebc-ce79-4b32-a040-61a6a9c331a3`
- **Estrategia de sync:** Eliminar duplicados antes de añadir versiones actualizadas para no superar el límite.
